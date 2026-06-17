#!/usr/bin/env python3
"""Compress embedded GLB images while preserving file names and paths.

This is a conservative deployment helper for SCA-2 models. It rewrites only
embedded image bufferViews, leaves mesh/accessor data untouched, and emits a
valid single-buffer GLB.
"""

from __future__ import annotations

import argparse
import io
import json
import shutil
import struct
from pathlib import Path

from PIL import Image


ALIGN = 4


def pad4(data: bytes, byte: bytes = b"\x00") -> bytes:
    pad = (-len(data)) % ALIGN
    return data + byte * pad


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67 or version != 2 or length != len(data):
        raise ValueError(f"{path} is not a GLB v2 file")

    offset = 12
    gltf = None
    bin_chunk = None
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<I4s", data, offset)
        offset += 8
        chunk = data[offset : offset + chunk_length]
        offset += chunk_length
        if chunk_type == b"JSON":
            gltf = json.loads(chunk.decode("utf-8").rstrip("\x00 \n\r\t"))
        elif chunk_type == b"BIN\x00":
            bin_chunk = chunk

    if gltf is None or bin_chunk is None:
        raise ValueError(f"{path} is missing JSON or BIN chunk")
    return gltf, bin_chunk


def encode_image(raw: bytes, max_size: int, jpeg_quality: int) -> tuple[bytes, str, tuple[int, int], tuple[int, int]]:
    image = Image.open(io.BytesIO(raw))
    original_size = image.size
    image.load()

    if max(image.size) > max_size:
        image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

    has_alpha = image.mode in ("RGBA", "LA") or (
        image.mode == "P" and "transparency" in image.info
    )

    out = io.BytesIO()
    if has_alpha:
        image.save(out, format="PNG", optimize=True)
        return out.getvalue(), "image/png", original_size, image.size

    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(out, format="JPEG", quality=jpeg_quality, optimize=True, progressive=True)
    return out.getvalue(), "image/jpeg", original_size, image.size


def compress_glb(path: Path, backup_dir: Path, max_size: int, jpeg_quality: int) -> tuple[int, int, int]:
    original_bytes = path.stat().st_size
    gltf, bin_chunk = read_glb(path)

    buffer_views = gltf.get("bufferViews", [])
    image_buffer_views = {
        image.get("bufferView")
        for image in gltf.get("images", [])
        if image.get("bufferView") is not None
    }

    replacements: dict[int, tuple[bytes, str]] = {}
    changed_images = 0

    for image in gltf.get("images", []):
        bv_index = image.get("bufferView")
        if bv_index is None:
            continue
        bv = buffer_views[bv_index]
        start = bv.get("byteOffset", 0)
        end = start + bv["byteLength"]
        raw = bin_chunk[start:end]

        try:
            encoded, mime_type, original_size, new_size = encode_image(
                raw, max_size=max_size, jpeg_quality=jpeg_quality
            )
        except Exception as exc:
            print(f"  ! skipped image bufferView {bv_index}: {exc}")
            continue

        if len(encoded) < len(raw):
            replacements[bv_index] = (encoded, mime_type)
            image["mimeType"] = mime_type
            changed_images += 1
            print(
                f"  image bv {bv_index}: {len(raw)/1e6:.2f}MB -> "
                f"{len(encoded)/1e6:.2f}MB, {original_size[0]}x{original_size[1]} -> "
                f"{new_size[0]}x{new_size[1]}, {mime_type}"
            )

    if not replacements:
        return original_bytes, original_bytes, 0

    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / path.name
    if not backup_path.exists():
        shutil.copy2(path, backup_path)

    new_bin_parts: list[bytes] = []
    offset = 0
    for index, bv in enumerate(buffer_views):
        start = bv.get("byteOffset", 0)
        end = start + bv["byteLength"]
        payload = replacements.get(index, (bin_chunk[start:end], None))[0]

        if index in image_buffer_views and index in replacements:
            bv.pop("byteStride", None)
            bv.pop("target", None)

        bv["byteOffset"] = offset
        bv["byteLength"] = len(payload)
        new_bin_parts.append(payload)
        padded = pad4(payload)
        offset += len(padded)
        if len(padded) != len(payload):
            new_bin_parts.append(padded[len(payload) :])

    new_bin = b"".join(new_bin_parts)
    gltf["buffers"][0]["byteLength"] = len(new_bin)

    json_chunk = pad4(
        json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8"),
        b" ",
    )
    bin_chunk_out = pad4(new_bin, b"\x00")
    total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk_out)

    out = bytearray()
    out += struct.pack("<III", 0x46546C67, 2, total_length)
    out += struct.pack("<I4s", len(json_chunk), b"JSON")
    out += json_chunk
    out += struct.pack("<I4s", len(bin_chunk_out), b"BIN\x00")
    out += bin_chunk_out

    tmp_path = path.with_suffix(".glb.tmp")
    tmp_path.write_bytes(out)
    tmp_path.replace(path)

    return original_bytes, path.stat().st_size, changed_images


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--backup-dir", type=Path, required=True)
    parser.add_argument("--max-size", type=int, default=1024)
    parser.add_argument("--jpeg-quality", type=int, default=68)
    args = parser.parse_args()

    for path in args.paths:
        print(path)
        before, after, count = compress_glb(
            path,
            backup_dir=args.backup_dir,
            max_size=args.max_size,
            jpeg_quality=args.jpeg_quality,
        )
        print(f"  {before/1e6:.2f}MB -> {after/1e6:.2f}MB, images changed: {count}\n")


if __name__ == "__main__":
    main()
