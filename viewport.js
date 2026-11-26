// Reference screenshot: 3024 × 1646 physical pixels at 2× density.
// An isolated CSS viewport keeps media queries, canvas geometry and pointer
// coordinates in the same 1512 × 823 design space on every display.
(() => {
  const frame = document.getElementById("observatory");
  const designWidth = 1512;
  const designHeight = 823;
  function fitComposition() {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const scale = Math.min(width / designWidth, height / designHeight);
    frame.style.transform = `scale(${scale})`;
    frame.style.left = `${(width - designWidth * scale) / 2}px`;
    frame.style.top = `${(height - designHeight * scale) / 2}px`;
  }
  fitComposition();
  new ResizeObserver(fitComposition).observe(document.documentElement);
  window.addEventListener("resize", fitComposition);
})();
