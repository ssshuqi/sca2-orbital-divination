import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { houseLibrary, trajectoryLibrary } from "./data.js";

const HOUSE_COUNT = 16;
const SCAN_DURATION = 5200;
const REVEAL_DURATION = 1800;
const RESULT_DURATION = 9500;
const RETURN_DURATION = 1700;
const MODEL_RADIUS = 3.9;
const PLATE_SIZE = 9.55;
const ACTIVE_LIFT = 0.58;
const ACTIVE_SCALE = 0.22;
const HOUSE_SCALE_MULTIPLIERS = [
  1,
  2,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1
];

const sceneRoot = document.querySelector("#scene-root");
const sceneStatus = document.querySelector("#scene-status");
const stateLabel = document.querySelector("#state-label");
const systemStatusText = document.querySelector("#system-status-text");
const resultList = document.querySelector("#result-list");
const oracleCardWrap = document.querySelector("#oracleCardWrap");
const oracleCard = document.querySelector("#oracleCard");
const oracleBackTitle = document.querySelector("#oracleBackTitle");
const oracleBackText = document.querySelector("#oracleBackText");
const oracleBackHint = document.querySelector("#oracleBackHint");
const launchButton = document.querySelector("#launch-button");
const returnButton = document.querySelector("#return-button");
const digitButtons = [...document.querySelectorAll(".digit-wheel")];
const archiveList = document.querySelector("#house-archive");
const digitOmens = document.querySelector("#digitOmens");
const recentReadingsList = document.querySelector("#recent-readings");
const weatherCode = document.querySelector("#weather-code");
const weatherTitle = document.querySelector("#weather-title");
const weatherText = document.querySelector("#weather-text");
const inspectOverlay = document.querySelector("#inspectOverlay");
const backToChartButton = document.querySelector("#backToChartButton");
const inspectLodgeName = document.querySelector("#inspectLodgeName");
const inspectOrbitId = document.querySelector("#inspectOrbitId");
const inspectKeywords = document.querySelector("#inspectKeywords");
const lodgeHoverTooltip = document.querySelector("#lodgeHoverTooltip");

const digits = [0, 0, 0, 0];
const digitRoles = ["Signal", "Orbit", "Shadow", "Gate"];
let digitFeedbackTimer = null;
let lastDigitSoundTime = 0;
const digitMeaningTable = [
  [
    "静默信号，适合等待第一束回波。",
    "细微信号正在抬升，先听见再回应。",
    "信号分裂为两路，请保留第二种解释。",
    "短波抵达，适合发出明确请求。",
    "信号稳定，但不宜过度放大。",
    "远端回声增强，可追踪旧线索。",
    "信号被遮蔽，先排除噪声。",
    "同步窗口打开，适合建立连接。",
    "信号过亮，先验证再相信。",
    "尾波未散，答案藏在余震里。"
  ],
  [
    "近圆轨道，适合维持现状。",
    "轨道轻抬，推进一小步即可。",
    "轨道偏心，注意资源分配。",
    "轨道交会，适合安排会面。",
    "轨道复测，回看旧记录。",
    "轨道下沉，先卸掉多余负载。",
    "轨道绕行，答案需要多一圈。",
    "轨道加速，行动窗口较短。",
    "轨道漂移，请重新校准坐标。",
    "轨道闭合，适合整理成果。"
  ],
  [
    "阴影很浅，疑虑多半来自习惯。",
    "阴影在边缘，别急着命名它。",
    "阴影成双，选择前先比较代价。",
    "阴影穿过中心，请暂停判断。",
    "阴影可测量，问题已经变清楚。",
    "阴影拉长，延迟是重要线索。",
    "阴影遮蔽核心，暂不公开结论。",
    "阴影即将退去，保持低速观察。",
    "阴影制造幻象，优先核验事实。",
    "阴影回落，旧担忧正在失效。"
  ],
  [
    "门尚未开，请先完成校准。",
    "窄门可入，缩小问题。",
    "侧门显现，换一种路径。",
    "门槛升高，提高标准但别加码。",
    "门内有镜，先复核自己的读数。",
    "门后静默，答案需要封存片刻。",
    "门缝有光，选择一个可验证方向。",
    "门与轨道重合，适合立刻行动。",
    "门后有雾，避免被图像诱导。",
    "门将闭合，把决定写成记录。"
  ]
];
const weatherStates = [
  {
    title: "LOW NOISE WINDOW",
    text: "今日轨道噪声较低，适合复核旧问题，把尚未命名的感受整理成可观测的线索。"
  },
  {
    title: "COPPER TRANSIT",
    text: "今日轨道带有轻微推进相位，适合做一个小而明确的决定，避免一次性改变太多参数。"
  },
  {
    title: "SHADOW PASS",
    text: "今日读数可能出现遮蔽，适合延后定论，先观察问题的边缘和反复出现的细节。"
  },
  {
    title: "SIGNAL LOCK",
    text: "今日信号容易成形，适合开启问签、确认方向，或把零散线索锁定成下一步行动。"
  },
  {
    title: "RETURN ARC",
    text: "今日适合回看旧轨迹。曾经被忽略的采样点，可能正好解释现在的偏差。"
  }
];
const islandSlots = [];
const orbitLines = [];
const starplateLabels = [];
const selectableObjects = [];
const lodgeMeshObjects = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const modelLoadStatus = {
  loaded: 0,
  failed: 0
};
let activeHouseIndex = -1;
let selectedIslandIndex = -1;
let activeStartedAt = 0;
let currentState = "idle";
let stateStartedAt = performance.now();
let divinationResult = null;
let isDraggingIsland = false;
let dragStartX = 0;
let dragStartRotation = 0;
let pointerMoved = false;
let isInspectMode = false;
let inspectedLodgeIndex = -1;
let preInspectState = null;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneRoot.clientWidth, sceneRoot.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
sceneRoot.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x120f0d);

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(0, 7.9, 9.7);
camera.lookAt(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xfff0dc, 1.05);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff4df, 2.15);
keyLight.position.set(3.8, 7.2, 4.8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xebdec6, 0.55);
fillLight.position.set(-2.8, 3.2, 5.4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xb57743, 1.28);
rimLight.position.set(-5.6, 3.4, -3.2);
scene.add(rimLight);

const baseLightIntensities = {
  key: keyLight.intensity,
  rim: rimLight.intensity
};

const plateGroup = new THREE.Group();
scene.add(plateGroup);

const islandGroup = new THREE.Group();
scene.add(islandGroup);

const satellite = createSatellitePoint();
scene.add(satellite);

const scanPoint = createScanPoint();
plateGroup.add(scanPoint);

const lockReticle = createLockReticle();
plateGroup.add(lockReticle);

createPlate();
createTrajectoryLines();
createStarplateLabels();
createHouseSlots();
populateArchive();
bindInterface();
renderTodayWeather();
renderRecentReadings();
resizeRenderer();
animate();

window.activateHouse = activateHouse;

function setSystemStatus(message) {
  if (systemStatusText) {
    systemStatusText.textContent = message;
  }
}

function createPlate() {
  const loader = new THREE.TextureLoader();

  loader.load(
    "assets/starplate.png",
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      addPlateMesh(texture);
    },
    undefined,
    () => {
      addPlateMesh(createFallbackPlateTexture());
      sceneStatus.textContent = "fallback starplate";
      setSystemStatus("INITIALIZING ORBITAL FIELD...");
    }
  );
}

function addPlateMesh(texture) {
  const geometry = new THREE.PlaneGeometry(PLATE_SIZE, PLATE_SIZE, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.98,
    side: THREE.DoubleSide
  });
  const plate = new THREE.Mesh(geometry, material);
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = -0.04;
  plateGroup.add(plate);
}

function createFallbackPlateTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 420;

  const plateGradient = ctx.createRadialGradient(cx, cy, 40, cx, cy, radius * 1.12);
  plateGradient.addColorStop(0, "rgba(235, 222, 198, 0.18)");
  plateGradient.addColorStop(0.42, "rgba(53, 46, 42, 0.72)");
  plateGradient.addColorStop(1, "rgba(18, 15, 13, 0.92)");
  ctx.fillStyle = plateGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(181, 119, 67, 0.045)";
  for (let i = 0; i < HOUSE_COUNT; i += 2) {
    const start = -Math.PI / 2 + (i / HOUSE_COUNT) * Math.PI * 2;
    const end = start + (Math.PI * 2) / HOUSE_COUNT;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, end);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(235, 222, 198, 0.24)";
  ctx.lineWidth = 1;

  for (let i = 1; i <= 5; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * (i / 5), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(181, 119, 67, 0.30)";
  ctx.lineWidth = 1.5;
  [0.32, 0.58, 0.82, 1].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * scale, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(235, 222, 198, 0.26)";
  ctx.lineWidth = 1;
  for (let i = 0; i < HOUSE_COUNT; i += 1) {
    const angle = -Math.PI / 2 + (i / HOUSE_COUNT) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(235, 222, 198, 0.46)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(181, 119, 67, 0.48)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(235, 222, 198, 0.58)";
  ctx.font = '20px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < HOUSE_COUNT; i += 1) {
    const angle = -Math.PI / 2 + ((i + 0.5) / HOUSE_COUNT) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(angle) * 352, cy + Math.sin(angle) * 352);
    ctx.rotate(angle + Math.PI / 2);
    drawSpacedCanvasText(ctx, `L-${String(i + 1).padStart(2, "0")}`, 0, 0, 2.2);
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawSpacedCanvasText(ctx, text, x, y, letterSpacing) {
  const letters = [...text];
  const width = letters.reduce((total, letter, index) => {
    return total + ctx.measureText(letter).width + (index < letters.length - 1 ? letterSpacing : 0);
  }, 0);
  let cursor = x - width / 2;

  for (const letter of letters) {
    const metrics = ctx.measureText(letter);
    ctx.fillText(letter, cursor + metrics.width / 2, y);
    cursor += metrics.width + letterSpacing;
  }
}

function createTrajectoryLines() {
  trajectoryLibrary.forEach((trajectory, index) => {
    const points = trajectory.points.map((point) => {
      const r = point.radius * (PLATE_SIZE * 0.45);
      return new THREE.Vector3(Math.cos(point.angle) * r, 0.015 + index * 0.004, Math.sin(point.angle) * r);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
      dashSize: 0.16,
      gapSize: 0.18
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    orbitLines.push(line);
    plateGroup.add(line);
  });
}

function createStarplateLabels() {
  for (let index = 0; index < HOUSE_COUNT; index += 1) {
    const label = `L-${String(index + 1).padStart(2, "0")}`;
    const normalMap = createStarplateLabelTexture(label, false);
    const activeMap = createStarplateLabelTexture(label, true);
    const material = new THREE.SpriteMaterial({
      map: normalMap,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    const angle = -Math.PI / 2 + ((index + 0.5) / HOUSE_COUNT) * Math.PI * 2;
    const labelRadius = PLATE_SIZE * 0.41;
    sprite.position.set(Math.cos(angle) * labelRadius, 0.1, Math.sin(angle) * labelRadius);
    sprite.scale.set(0.45, 0.14, 1);
    sprite.renderOrder = 3;
    plateGroup.add(sprite);
    starplateLabels.push({ sprite, normalMap, activeMap });
  }
}

function createStarplateLabelTexture(text, isActive) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '300 24px Georgia, "Times New Roman", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = isActive ? "rgba(235, 222, 198, 0.9)" : "rgba(235, 222, 198, 0.42)";
  if (isActive) {
    ctx.shadowColor = "rgba(181, 119, 67, 0.35)";
    ctx.shadowBlur = 12;
  }
  drawSpacedCanvasText(ctx, text, canvas.width / 2, canvas.height / 2, 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHouseSlots() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  for (let index = 0; index < HOUSE_COUNT; index += 1) {
    const angle = -Math.PI / 2 + (index / HOUSE_COUNT) * Math.PI * 2;
    const position = new THREE.Vector3(
      Math.cos(angle) * MODEL_RADIUS,
      0.34,
      Math.sin(angle) * MODEL_RADIUS
    );

    const slot = new THREE.Group();
    slot.position.copy(position);
    slot.rotation.y = -angle + Math.PI;
    islandGroup.add(slot);

    const ring = createActivationRing();
    ring.visible = false;
    slot.add(ring);

    const pickVolume = createPickVolume(index);
    slot.add(pickVolume);
    selectableObjects.push(pickVolume);

    const metadata = {
      slot,
      ring,
      pickVolume,
      model: null,
      basePosition: position.clone(),
      phase: index * 0.73,
      angle,
      targetLift: 0,
      currentLift: 0,
      baseScale: HOUSE_SCALE_MULTIPLIERS[index] || 1,
      modelBaseRotation: 0,
      manualRotation: 0
    };
    slot.userData.index = index;
    slot.userData.basePosition = metadata.basePosition.clone();
    slot.userData.baseRotation = slot.rotation.y;
    slot.userData.baseScale = metadata.baseScale;
    islandSlots.push(metadata);

    const fileName = `models/house${String(index + 1).padStart(2, "0")}.glb`;
    loader.load(
      fileName,
      (gltf) => {
        const model = gltf.scene;
        prepareModel(model);
        registerIslandModel(model, metadata, index);
        slot.add(model);
        metadata.model = model;
        modelLoadStatus.loaded += 1;
        updateModelLoadStatus();
      },
      undefined,
      (error) => {
        console.warn(`Failed to load ${fileName}`, error);
        const fallback = createFallbackIsland(index);
        registerIslandModel(fallback, metadata, index);
        slot.add(fallback);
        metadata.model = fallback;
        modelLoadStatus.failed += 1;
        updateModelLoadStatus();
      }
    );
  }
}

function updateModelLoadStatus() {
  if (modelLoadStatus.loaded === HOUSE_COUNT) {
    sceneStatus.textContent = "lodges aligned";
    if (currentState === "idle") {
      setSystemStatus("INITIALIZING ORBITAL FIELD...");
    }
    return;
  }

  if (modelLoadStatus.loaded + modelLoadStatus.failed === HOUSE_COUNT && modelLoadStatus.failed > 0) {
    sceneStatus.textContent = `lodge field partial ${modelLoadStatus.failed}/16`;
    setSystemStatus("INITIALIZING ORBITAL FIELD...");
  }
}

function prepareModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(0.88 / maxAxis);
  model.position.sub(center.multiplyScalar(0.88 / maxAxis));
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.material = new THREE.MeshStandardMaterial({
      color: 0xbeb6a6,
      roughness: 0.7,
      metalness: 0.05,
      emissive: 0xb57743,
      emissiveIntensity: 0.11,
      transparent: true,
      opacity: 1
    });
  });
  addModelOutlines(model);
}

function addModelOutlines(model) {
  const outlineEntries = [];

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    try {
      const edges = new THREE.EdgesGeometry(child.geometry, 28);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: 0xebdec6,
          transparent: true,
          opacity: 0,
          depthWrite: false
        })
      );
      line.userData.isOutline = true;
      outlineEntries.push({ child, line });
    } catch (error) {
      console.warn("Outline skipped for a model mesh", error);
    }
  });

  outlineEntries.forEach(({ child, line }) => {
    child.add(line);
  });
}

function registerIslandModel(model, metadata, index) {
  metadata.modelBaseRotation = model.rotation.y;
  metadata.lodgeId = index + 1;
  model.userData.index = index;
  model.userData.lodgeId = index + 1;
  model.userData.basePosition = metadata.basePosition.clone();
  model.userData.baseRotation = metadata.modelBaseRotation;
  model.userData.baseScale = metadata.baseScale;

  model.traverse((child) => {
    child.userData.index = index;
    child.userData.lodgeId = index + 1;
    child.userData.basePosition = metadata.basePosition.clone();
    child.userData.baseRotation = metadata.modelBaseRotation;
    child.userData.baseScale = metadata.baseScale;
    if (child.isMesh || child.isLine || child.isLineSegments) {
      selectableObjects.push(child);
      if (child.isMesh && !child.userData.isPickVolume) {
        lodgeMeshObjects.push(child);
      }
      if (child.material) {
        forEachMaterial(child.material, (material) => {
          material.transparent = true;
        });
      }
    }
  });
}

function createFallbackIsland(index) {
  const group = new THREE.Group();
  const geometry = new THREE.IcosahedronGeometry(0.34 + (index % 3) * 0.035, 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0xbeb6a6,
    roughness: 0.76,
    metalness: 0.02,
    emissive: 0xb57743,
    emissiveIntensity: 0.1,
    transparent: true,
    opacity: 1
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(1.28, 0.36, 0.92);
  mesh.position.y = 0.12;
  group.add(mesh);

  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xebdec6, transparent: true, opacity: 0.16 })
  );
  wire.userData.isOutline = true;
  wire.scale.copy(mesh.scale);
  wire.position.copy(mesh.position);
  group.add(wire);
  return group;
}

function createActivationRing() {
  const curve = new THREE.EllipseCurve(0, 0, 0.64, 0.64, 0, Math.PI * 2);
  const points = curve.getPoints(96).map((point) => new THREE.Vector3(point.x, 0.004, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0
  });
  const ring = new THREE.LineLoop(geometry, material);
  return ring;
}

function createScanPoint() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 18, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 18, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08
    })
  );
  group.add(halo, core);
  group.visible = false;
  return group;
}

function createLockReticle() {
  const group = new THREE.Group();
  const outer = createReticleRing(0.9, 0.18);
  const inner = createReticleRing(0.42, 0.32);
  const crossMaterial = new THREE.LineBasicMaterial({
    color: 0xebdec6,
    transparent: true,
    opacity: 0
  });
  const crossGeometryA = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.82, 0.028, 0),
    new THREE.Vector3(0.82, 0.028, 0)
  ]);
  const crossGeometryB = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.029, -0.82),
    new THREE.Vector3(0, 0.029, 0.82)
  ]);
  const crossA = new THREE.Line(crossGeometryA, crossMaterial.clone());
  const crossB = new THREE.Line(crossGeometryB, crossMaterial.clone());
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 18, 8),
    new THREE.MeshBasicMaterial({
      color: 0xebdec6,
      transparent: true,
      opacity: 0
    })
  );
  core.position.y = 0.04;
  group.add(outer, inner, crossA, crossB, core);
  group.visible = false;
  return group;
}

function createReticleRing(radius, opacity) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2);
  const points = curve.getPoints(128).map((point) => new THREE.Vector3(point.x, 0.026, point.y));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xb57743,
    transparent: true,
    opacity
  });
  return new THREE.LineLoop(geometry, material);
}

function createPickVolume(index) {
  const geometry = new THREE.SphereGeometry(0.62, 16, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.24;
  mesh.userData.index = index;
  mesh.userData.lodgeId = index + 1;
  mesh.userData.isPickVolume = true;
  return mesh;
}

function createSatellitePoint() {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 24, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 24, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12
    })
  );
  group.add(halo, core);
  group.position.set(0, 0.54, MODEL_RADIUS);
  return group;
}

function activateHouse(index) {
  exitIslandSelection(false);
  activeHouseIndex = ((index % HOUSE_COUNT) + HOUSE_COUNT) % HOUSE_COUNT;
  activeStartedAt = performance.now();
  currentState = "revealing";
  stateStartedAt = performance.now();
  lockReticle.visible = false;
  sceneStatus.textContent = `active house ${String(activeHouseIndex + 1).padStart(2, "0")}`;
  stateLabel.textContent = "REVEALING";
  setSystemStatus("LOCKING SIGNAL...");
  keyLight.intensity = baseLightIntensities.key * 1.18;
  rimLight.intensity = baseLightIntensities.rim * 1.35;

  islandSlots.forEach((slot, slotIndex) => {
    slot.ring.visible = slotIndex === activeHouseIndex;
  });
}

function resetActivation() {
  currentState = "idle";
  activeHouseIndex = -1;
  divinationResult = null;
  satellite.userData.target = null;
  scanPoint.visible = false;
  keyLight.intensity = baseLightIntensities.key;
  rimLight.intensity = baseLightIntensities.rim;
  sceneStatus.textContent = "standby";
  stateLabel.textContent = "IDLE";
  setSystemStatus("INITIALIZING ORBITAL FIELD...");
  launchButton.disabled = false;
  launchButton.textContent = "发射信号";
  returnButton.hidden = true;
  resultList.classList.remove("is-visible");
  digitButtons.forEach((button) => button.classList.remove("is-scanning"));
  lockReticle.visible = false;

  islandSlots.forEach((slot) => {
    slot.ring.visible = false;
  });

  orbitLines.forEach((line) => {
    line.material.opacity = 0.12;
    line.material.dashSize = 0.16;
    line.material.gapSize = 0.18;
  });

  renderIdleResult();
}

function bindInterface() {
  digitButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      if (isInspectMode) return;
      if (currentState === "scanning" || currentState === "revealing" || currentState === "returning") return;
      const index = Number(button.dataset.index);
      const rect = button.getBoundingClientRect();
      const direction = event.clientY < rect.top + rect.height / 2 ? 1 : -1;
      digits[index] = (digits[index] + direction + 10) % 10;
      playDigitSoundThrottled();
      updateDigitDisplay(index);
    });
  });

  launchButton.addEventListener("click", startDivination);
  oracleCard?.addEventListener("click", () => {
    if (isInspectMode) return;
    if (!oracleCard.classList.contains("is-ready")) return;
    oracleCard.classList.add("is-flipped");
  });
  returnButton.addEventListener("click", () => {
    exitIslandSelection(true);
  });
  backToChartButton?.addEventListener("click", () => {
    exitInspectMode();
  });
  renderer.domElement.addEventListener("pointerdown", handlePointerDown);
  renderer.domElement.addEventListener("pointermove", handlePointerMove);
  renderer.domElement.addEventListener("pointerup", handlePointerUp);
  renderer.domElement.addEventListener("pointerleave", handlePointerUp);
  window.addEventListener("resize", resizeRenderer);
  updateDigitDisplay();
  renderIdleResult();
}

function startDivination() {
  if (isInspectMode) return;
  exitIslandSelection(false);
  satellite.userData.target = null;
  scanPoint.visible = true;
  lockReticle.visible = false;

  const codeText = digits.join("");
  const code = Number(codeText);
  const trajectoryIndex = code % trajectoryLibrary.length;
  const trajectory = trajectoryLibrary[trajectoryIndex];
  const pointIndex = code % trajectory.points.length;
  const point = trajectory.points[pointIndex];
  const normalizedAngle = ((point.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const houseIndex = Math.floor(normalizedAngle / ((Math.PI * 2) / HOUSE_COUNT));
  const house = houseLibrary[houseIndex];

  divinationResult = { codeText, trajectory, trajectoryIndex, pointIndex, point, houseIndex, house, archiveSaved: false };
  activeHouseIndex = houseIndex;
  activeStartedAt = performance.now();
  currentState = "scanning";
  stateStartedAt = performance.now();
  stateLabel.textContent = "SCANNING";
  sceneStatus.textContent = "trajectory scan";
  setSystemStatus("READING HISTORICAL TRAJECTORY...");
  launchButton.disabled = true;
  launchButton.textContent = "READING ORBITAL SIGNAL";
  setOracleCardState("receiving");
  digitButtons.forEach((button) => button.classList.add("is-scanning"));

  orbitLines.forEach((line, index) => {
    line.material.opacity = index === trajectoryIndex ? 0.34 : 0.05;
    line.material.dashSize = index === trajectoryIndex ? 0.22 : 0.16;
    line.material.gapSize = index === trajectoryIndex ? 0.12 : 0.22;
  });
}

function playSound(name) {
  window.SoundManager?.play(name);
}

function playDigitSoundThrottled() {
  const now = performance.now();
  if (now - lastDigitSoundTime < 70) return;
  lastDigitSoundTime = now;
  playSound("digit");
}

function moveSatelliteToHouse(index) {
  const slot = islandSlots[index];
  if (!slot) return;
  satellite.userData.target = slot.basePosition.clone().add(new THREE.Vector3(0.18, 0.68, 0.18));
}

function updateDigitDisplay(changedIndex = -1) {
  digitButtons.forEach((button, index) => {
    button.querySelector("strong").textContent = digits[index];
    button.classList.toggle("is-updated", index === changedIndex);
  });
  renderDigitOmens(changedIndex);

  if (changedIndex >= 0) {
    window.clearTimeout(digitFeedbackTimer);
    digitFeedbackTimer = window.setTimeout(() => {
      digitButtons.forEach((button) => button.classList.remove("is-updated"));
      digitOmens?.querySelectorAll(".digit-omen").forEach((card) => card.classList.remove("is-updated"));
    }, 760);
  }
}

function handlePointerDown(event) {
  if (isInspectMode) return;
  if (currentState === "scanning" || currentState === "revealing" || currentState === "returning") return;
  hideLodgeHoverTooltip();
  const hitIndex = getModelIslandIndexFromPointer(event);

  isDraggingIsland = true;
  pointerMoved = false;
  dragStartX = event.clientX;
  selectedIslandIndex = hitIndex;
  dragStartRotation = hitIndex === -1 ? 0 : islandSlots[hitIndex].manualRotation;
  renderer.domElement.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (isInspectMode) {
    hideLodgeHoverTooltip();
    return;
  }
  if (!isDraggingIsland) {
    const hitIndex = getModelIslandIndexFromPointer(event);
    renderer.domElement.style.cursor = hitIndex === -1 ? "" : "pointer";
    updateLodgeHoverTooltip(event, hitIndex);
    return;
  }
  hideLodgeHoverTooltip();
  const deltaX = event.clientX - dragStartX;
  if (Math.abs(deltaX) > 2) pointerMoved = true;
}

function handlePointerUp(event) {
  hideLodgeHoverTooltip();
  if (!isDraggingIsland) return;
  const hitIndex = selectedIslandIndex;
  isDraggingIsland = false;
  selectedIslandIndex = -1;
  if (renderer.domElement.hasPointerCapture(event.pointerId)) {
    renderer.domElement.releasePointerCapture(event.pointerId);
  }
  if (!pointerMoved && hitIndex !== -1) {
    enterInspectMode(hitIndex);
  }
}

function updateLodgeHoverTooltip(event, hitIndex) {
  if (!lodgeHoverTooltip) return;
  if (hitIndex === -1) {
    hideLodgeHoverTooltip();
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  lodgeHoverTooltip.textContent = "进入此宿 / ENTER THIS LODGE";
  lodgeHoverTooltip.style.left = `${event.clientX - rect.left + 14}px`;
  lodgeHoverTooltip.style.top = `${event.clientY - rect.top + 14}px`;
  lodgeHoverTooltip.classList.add("is-visible");
}

function hideLodgeHoverTooltip() {
  lodgeHoverTooltip?.classList.remove("is-visible");
}

function getModelIslandIndexFromPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(lodgeMeshObjects, false);
  if (!hits.length) return -1;
  return typeof hits[0].object.userData.index === "number" ? hits[0].object.userData.index : -1;
}

function enterInspectMode(index) {
  const slot = islandSlots[index];
  if (!slot || !slot.model || isInspectMode) return;
  exitIslandSelection(false);

  preInspectState = {
    currentState,
    activeHouseIndex,
    selectedIslandIndex,
    divinationResult,
    sceneStatus: sceneStatus.textContent,
    stateLabel: stateLabel.textContent,
    systemStatus: systemStatusText.textContent,
    cameraPosition: camera.position.clone(),
    lightState: {
      ambient: ambientLight.intensity,
      key: keyLight.intensity,
      fill: fillLight.intensity,
      rim: rimLight.intensity
    },
    plateVisible: plateGroup.visible,
    satelliteVisible: satellite.visible,
    scanPointVisible: scanPoint.visible,
    islandStates: islandSlots.map((item) => ({
      position: item.slot.position.clone(),
      rotation: item.slot.rotation.clone(),
      scale: item.slot.scale.clone(),
      visible: item.slot.visible,
      ringVisible: item.ring.visible,
      currentLift: item.currentLift,
      targetLift: item.targetLift,
      manualRotation: item.manualRotation
    }))
  };

  isInspectMode = true;
  inspectedLodgeIndex = index;
  currentState = "inspect";
  selectedIslandIndex = -1;
  activeHouseIndex = -1;
  isDraggingIsland = false;
  renderer.domElement.style.cursor = "";
  document.body.classList.add("inspect-mode");
  hideLodgeHoverTooltip();
  inspectOverlay?.classList.remove("hidden");
  inspectOverlay?.setAttribute("aria-hidden", "false");
  sceneStatus.textContent = `entering lodge ${String(index + 1).padStart(2, "0")}`;
  stateLabel.textContent = "LODGE ENTRY";
  setSystemStatus("ENTERING LODGE FIELD.");
  launchButton.disabled = true;

  const house = houseLibrary[index];
  const keywords = house.keywords || house.symbol.split("、");
  if (inspectLodgeName) inspectLodgeName.textContent = `第${index + 1}宿｜${house.name}`;
  if (inspectOrbitId) inspectOrbitId.textContent = `Orbit Fragment: ${String(index + 1).padStart(2, "0")}`;
  if (inspectKeywords) inspectKeywords.textContent = `关键词：${keywords.join(" / ")}`;

  plateGroup.visible = false;
  satellite.visible = false;
  scanPoint.visible = false;
  ambientLight.intensity = 1.22;
  keyLight.intensity = 2.65;
  fillLight.intensity = 0.74;
  rimLight.intensity = 1.72;

  islandSlots.forEach((item, itemIndex) => {
    item.slot.visible = itemIndex === index;
    item.ring.visible = false;
    item.currentLift = 0;
    item.targetLift = 0;
    item.manualRotation = 0;
  });

  const selected = islandSlots[index];
  selected.slot.position.set(0, 0.08, 0);
  selected.slot.rotation.set(0, 0, 0);
  selected.slot.scale.setScalar(Math.min(selected.baseScale * 2.85, 4.2));
  camera.position.copy(preInspectState.cameraPosition);
  resizeRenderer();
  requestAnimationFrame(resizeRenderer);
}

function exitInspectMode() {
  if (!isInspectMode) return;

  isInspectMode = false;
  inspectedLodgeIndex = -1;
  document.body.classList.remove("inspect-mode");
  inspectOverlay?.classList.add("hidden");
  inspectOverlay?.setAttribute("aria-hidden", "true");
  renderer.domElement.style.cursor = "";
  launchButton.disabled = false;

  if (preInspectState) {
    currentState = preInspectState.currentState === "inspect" ? "idle" : preInspectState.currentState;
    activeHouseIndex = preInspectState.activeHouseIndex;
    selectedIslandIndex = preInspectState.selectedIslandIndex;
    divinationResult = preInspectState.divinationResult;
    sceneStatus.textContent = preInspectState.sceneStatus || "standby";
    stateLabel.textContent = preInspectState.stateLabel || "IDLE";
    setSystemStatus(preInspectState.systemStatus || "INITIALIZING ORBITAL FIELD...");
    camera.position.copy(preInspectState.cameraPosition);
    camera.lookAt(0, 0, 0);
    ambientLight.intensity = preInspectState.lightState.ambient;
    keyLight.intensity = preInspectState.lightState.key;
    fillLight.intensity = preInspectState.lightState.fill;
    rimLight.intensity = preInspectState.lightState.rim;
    plateGroup.visible = preInspectState.plateVisible;
    satellite.visible = preInspectState.satelliteVisible;
    scanPoint.visible = preInspectState.scanPointVisible;

    islandSlots.forEach((item, itemIndex) => {
      const state = preInspectState.islandStates[itemIndex];
      item.slot.position.copy(state.position);
      item.slot.rotation.copy(state.rotation);
      item.slot.scale.copy(state.scale);
      item.slot.visible = state.visible;
      item.ring.visible = state.ringVisible;
      item.currentLift = state.currentLift;
      item.targetLift = state.targetLift;
      item.manualRotation = state.manualRotation;
    });
  }

  preInspectState = null;
  resizeRenderer();
  requestAnimationFrame(resizeRenderer);
}

function selectIsland(index) {
  selectedIslandIndex = index;
  activeHouseIndex = -1;
  divinationResult = null;
  activeStartedAt = performance.now();
  currentState = "selected";
  sceneStatus.textContent = `selected house ${String(index + 1).padStart(2, "0")}`;
  stateLabel.textContent = "SELECTED";
  setSystemStatus("SCANNING SIXTEEN LODGES...");
  returnButton.hidden = false;
  launchButton.disabled = false;
  satellite.userData.target = null;

  islandSlots.forEach((slot, slotIndex) => {
    slot.ring.visible = slotIndex === selectedIslandIndex;
  });

  orbitLines.forEach((line) => {
    line.material.opacity = 0.06;
  });

  renderHouseSelection(houseLibrary[index], index);
}

function exitIslandSelection(shouldRenderIdle) {
  if (selectedIslandIndex === -1) return;
  selectedIslandIndex = -1;
  isDraggingIsland = false;
  islandSlots.forEach((slot) => {
    slot.manualRotation = 0;
  });
  currentState = activeHouseIndex === -1 ? "idle" : currentState;
  sceneStatus.textContent = activeHouseIndex === -1 ? "standby" : sceneStatus.textContent;
  stateLabel.textContent = activeHouseIndex === -1 ? "IDLE" : stateLabel.textContent;
  returnButton.hidden = true;
  resultList.classList.remove("is-visible");

  islandSlots.forEach((slot) => {
    slot.ring.visible = false;
  });

  orbitLines.forEach((line) => {
    line.material.opacity = 0.12;
  });

  if (shouldRenderIdle) {
    renderIdleResult();
  }
}

function renderIdleResult() {
  setOracleCardState("sealed");
  fillOracleFront({
    id: "--",
    name: "宿名",
    keywords: ["等待轨道时间码"],
    oracleText: "轨道已显影，签文正在生成。",
    meaning: "",
    advice: "",
    orbitFragment: "--",
    code: "----"
  });
}

function renderResult({ codeText, trajectory, pointIndex, house }) {
  showOracleCard({
    id: houseLibrary.indexOf(house) + 1,
    name: house.name,
    keywords: house.keywords || house.symbol.split("、"),
    oracleText: house.oracleText || house.oracle,
    meaning: house.meaning || house.oracle || "",
    advice: house.advice || buildSuggestion(house, pointIndex),
    orbitFragment: String(pointIndex).padStart(2, "0"),
    code: codeText,
    trajectoryName: trajectory.name
  });
}

function renderHouseSelection(house, index) {
  showOracleCard({
    id: index + 1,
    name: house.name,
    keywords: house.keywords || house.symbol.split("、"),
    oracleText: house.oracleText || house.oracle,
    meaning: house.meaning || house.oracle || "",
    advice: "左右轻拖宿岛，感受此宿位的形态、重心与象征回声。",
    orbitFragment: String(index + 1).padStart(2, "0"),
    code: "ENTRY"
  });
}

function buildSuggestion(house, pointIndex) {
  return `采样点 ${String(pointIndex).padStart(2, "0")} 已映射至「${house.name}」。请以「${house.symbol}」作为本次观测关键词，先记录信号，再决定下一步轨道。`;
}

function showOracleCard(result) {
  fillOracleFront(result);
  setOracleCardState("ready");
}

function fillOracleFront(result) {
  const lodgeLabel = result.id === "--" ? `第X宿｜${result.name}` : `第${result.id}宿｜${result.name}`;
  const keywords = Array.isArray(result.keywords) ? result.keywords.join(" / ") : String(result.keywords || "");
  const codeText = result.code === "ENTRY" ? "ENTRY" : String(result.code || "").padStart(4, "0");

  document.querySelector(".oracle-lodge-name").textContent = lodgeLabel;
  document.querySelector(".oracle-keywords").textContent = `关键词：${keywords}`;
  document.querySelector(".oracle-text").textContent = result.oracleText || result.text || "轨道已显影，签文正在生成。";
  document.querySelector(".oracle-meaning").textContent = result.meaning || "";
  document.querySelector(".oracle-advice").textContent = result.advice || "";
  document.querySelector(".oracle-meta").innerHTML =
    `<span>Orbit Fragment: ${result.orbitFragment || String(result.id || "").padStart(2, "0")}</span><span>Code: ${codeText}</span>`;
}

function setOracleCardState(nextState) {
  oracleCard?.classList.remove("is-sealed", "is-receiving", "is-ready", "is-flipped");
  oracleCard?.classList.add(`is-${nextState}`);
  oracleCardWrap?.classList.add("is-visible");
  resultList.classList.add("is-visible");

  if (nextState === "sealed") {
    oracleBackTitle.textContent = "ORACLE SEALED";
    oracleBackText.textContent = "签文尚未启封";
    oracleBackHint.textContent = "请先校准轨道口令";
    return;
  }

  if (nextState === "receiving") {
    oracleBackTitle.textContent = "SIGNAL RECEIVING";
    oracleBackText.textContent = "轨道信号接收中";
    oracleBackHint.textContent = "正在锁定宿岛";
    return;
  }

  if (nextState === "ready") {
    oracleBackTitle.textContent = "ORACLE READY";
    oracleBackText.textContent = "签文已生成";
    oracleBackHint.textContent = "点击翻开";
  }
}

function populateArchive() {
  archiveList.innerHTML = houseLibrary
    .map((house, index) => `<li><strong>${String(index + 1).padStart(2, "0")} / ${house.name}</strong><span>${house.symbol}</span></li>`)
    .join("");
}

function renderDigitOmens(changedIndex = -1) {
  if (!digitOmens) return;
  digitOmens.innerHTML = digits
    .map((digit, index) => {
      const role = digitRoles[index];
      const text = digitMeaningTable[index][digit];
      const stateClass = index === changedIndex ? " is-updated" : "";
      return `<article class="digit-omen${stateClass}"><span>${role}</span><strong>${digit}</strong><p>${text}</p></article>`;
    })
    .join("");
}

function renderTodayWeather() {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const seed = [...dateKey].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const state = weatherStates[seed % weatherStates.length];
  const code = String((seed * 37) % 1000).padStart(3, "0");

  if (weatherCode) weatherCode.textContent = `WX-${code}`;
  if (weatherTitle) weatherTitle.textContent = state.title;
  if (weatherText) weatherText.textContent = state.text;
}

function saveReading(result) {
  const houseNumber = result.houseIndex + 1;
  const record = {
    codeText: result.codeText,
    houseName: result.house.name,
    houseNumber,
    trajectoryName: result.trajectory.name,
    pointIndex: result.pointIndex,
    timestamp: new Date().toISOString()
  };
  const records = readRecentReadings();
  const nextRecords = [record, ...records].slice(0, 3);

  try {
    localStorage.setItem("sca2RecentReadings", JSON.stringify(nextRecords));
  } catch (error) {
    console.warn("Unable to save recent orbital reading.", error);
  }

  renderRecentReadings(nextRecords);
}

function readRecentReadings() {
  try {
    const parsed = JSON.parse(localStorage.getItem("sca2RecentReadings") || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch (error) {
    console.warn("Unable to read recent orbital readings.", error);
    return [];
  }
}

function renderRecentReadings(records = readRecentReadings()) {
  if (!recentReadingsList) return;

  if (!records.length) {
    recentReadingsList.innerHTML = `<li class="is-empty"><strong>NO ARCHIVE YET</strong><span>完成一次轨道问签后，这里会保存最近 3 次结果。</span></li>`;
    return;
  }

  recentReadingsList.innerHTML = records
    .map((record) => {
      const date = new Date(record.timestamp);
      const timeText = Number.isNaN(date.getTime())
        ? "RECORDED"
        : date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      return `
        <li>
          <span>${timeText}</span>
          <strong>${String(record.houseNumber).padStart(2, "0")} / ${record.houseName}</strong>
          <p>Code ${record.codeText} · Sample ${String(record.pointIndex).padStart(2, "0")}</p>
          <small>${record.trajectoryName}</small>
        </li>
      `;
    })
    .join("");
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() * 0.001;
  updateStateMachine();
  const activationProgress = getActivationProgress();
  const scanProgress = getScanProgress();

  islandSlots.forEach((slot, index) => {
    if (isInspectMode) {
      animateInspectSlot(slot, index, now);
      return;
    }

    const isSelected = index === selectedIslandIndex;
    const isActive = index === activeHouseIndex;
    const isHighlighted = isActive || isSelected;
    const scanSweep = getScanSweepStrength(index, scanProgress, now);
    const isDimmed = (selectedIslandIndex !== -1 && !isSelected)
      || (activeHouseIndex !== -1 && !isActive && currentState !== "scanning");
    const float = Math.sin(now * 1.05 + slot.phase) * 0.055;
    const activeBreath = Math.sin(now * 1.35 + slot.phase) * (0.022 + activationProgress * 0.04);
    const breath = isActive ? activeBreath : Math.sin(now * 1.35 + slot.phase) * (isSelected ? 0.034 : 0.016);
    const liftProgress = isActive ? activationProgress : isSelected ? 1 : 0;
    slot.targetLift = isSelected ? 0.48 : ACTIVE_LIFT * liftProgress;
    slot.currentLift += (slot.targetLift - slot.currentLift) * 0.055;
    slot.slot.position.y = slot.basePosition.y + slot.currentLift + float;
    slot.slot.rotation.y += isHighlighted && !isDraggingIsland ? 0.0022 : 0.001;
    const resultBoost = isActive && currentState === "result" ? 0.08 : 0;
    const scaleBoost = isActive ? ACTIVE_SCALE * activationProgress + resultBoost : isSelected ? 0.045 : 0;
    slot.slot.scale.setScalar(slot.baseScale * (1 + breath + scaleBoost));

    if (slot.model) {
      slot.model.rotation.y += (slot.modelBaseRotation + slot.manualRotation - slot.model.rotation.y) * 0.2;
      const pulse = isActive && currentState === "result" ? 0.5 + 0.5 * Math.sin(now * 2.2) : 0;
      setModelVisual(slot.model, {
        emissiveIntensity: isActive
          ? 0.12 + activationProgress * (0.22 + pulse * 0.10)
          : isSelected ? 0.14 : 0.09 + scanSweep * 0.06,
        opacity: isDimmed ? 0.16 : 0.86 + scanSweep * 0.14,
        outlineOpacity: isActive ? 0.14 + activationProgress * (0.42 + pulse * 0.14) : isSelected ? 0.26 : 0.045 + scanSweep * 0.065
      });
    }

    const scanLockProgress = currentState === "scanning" && isActive
      ? easeInOutCubic(constrain01((scanProgress - 0.68) / 0.32))
      : 0;
    slot.ring.visible = slot.ring.visible || scanLockProgress > 0.02;

    if (slot.ring.visible) {
      const ringPulse = 0.5 + 0.5 * Math.sin((performance.now() - activeStartedAt) * 0.004);
      const ringStrength = isActive ? activationProgress : isSelected ? 1 : 0;
      slot.ring.material.opacity = isSelected
        ? 0.46 + ringPulse * 0.14
        : Math.max(scanLockProgress * (0.28 + ringPulse * 0.18), ringStrength * (0.72 + ringPulse * 0.22));
      slot.ring.scale.setScalar(isSelected
        ? 1.1 + ringPulse * 0.045
        : 1 + Math.max(ringStrength, scanLockProgress) * 0.44 + ringPulse * 0.06);
    }
  });

  updateInspectCamera();
  updateStarplateLabels();
  animateOrbitLines(now, scanProgress);
  animateLockReticle(now, scanProgress);
  animateScanPoint(scanProgress);
  animateSatellite(now, scanProgress);
  renderer.render(scene, camera);
}

function animateInspectSlot(slot, index, now) {
  const isInspected = index === inspectedLodgeIndex;
  slot.slot.visible = isInspected;
  if (!isInspected) return;

  const float = Math.sin(now * 1.15 + slot.phase) * 0.045;
  const targetScale = Math.min(slot.baseScale * 2.85, 4.2);
  slot.slot.position.lerp(new THREE.Vector3(0, 0.02 + float, 0), 0.1);
  slot.slot.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);
  slot.slot.rotation.x += (0.08 - slot.slot.rotation.x) * 0.08;
  slot.slot.rotation.y += 0.006;
  slot.slot.rotation.z += (0 - slot.slot.rotation.z) * 0.08;
  if (slot.model) {
    setModelVisual(slot.model, {
      emissiveIntensity: 0.18,
      opacity: 1,
      outlineOpacity: 0.32
    });
  }
}

function updateInspectCamera() {
  if (!isInspectMode) return;
  camera.position.lerp(new THREE.Vector3(0, 2.55, 4.85), 0.06);
  camera.lookAt(0, 0.08, 0);
}

function updateStarplateLabels() {
  starplateLabels.forEach((label, index) => {
    const isActive = index === activeHouseIndex && currentState !== "idle" && currentState !== "returning";
    const scanSweep = getScanSweepStrength(index, getScanProgress(), performance.now() * 0.001);
    const targetOpacity = isActive ? 0.9 : 0.42 + scanSweep * 0.28;
    label.sprite.material.map = isActive ? label.activeMap : label.normalMap;
    label.sprite.material.opacity += (targetOpacity - label.sprite.material.opacity) * 0.12;
    label.sprite.scale.x += ((isActive ? 0.52 : 0.45) - label.sprite.scale.x) * 0.1;
    label.sprite.scale.y += ((isActive ? 0.16 : 0.14) - label.sprite.scale.y) * 0.1;
  });
}

function updateStateMachine() {
  if (isInspectMode) return;
  const elapsed = performance.now() - stateStartedAt;

  if (currentState === "scanning") {
    const progress = constrain01(elapsed / SCAN_DURATION);
    if (progress < 0.2) {
      setSystemStatus("CALIBRATING ORBIT TIME CODE...");
    } else if (progress < 0.48) {
      setSystemStatus("READING HISTORICAL TRAJECTORY...");
    } else if (progress < 0.82) {
      setSystemStatus("SCANNING SIXTEEN LODGES...");
    } else {
      setSystemStatus("LOCKING SIGNAL...");
    }
  }

  if (currentState === "scanning" && elapsed >= SCAN_DURATION) {
    activateHouse(activeHouseIndex);
    moveSatelliteToHouse(activeHouseIndex);
    return;
  }

  if (currentState === "revealing" && elapsed >= REVEAL_DURATION) {
    currentState = "result";
    stateStartedAt = performance.now();
    stateLabel.textContent = "RESULT";
    sceneStatus.textContent = `resolved house ${String(activeHouseIndex + 1).padStart(2, "0")}`;
    setSystemStatus("LODGE REVEALED.");
    launchButton.textContent = "发射信号";
    digitButtons.forEach((button) => button.classList.remove("is-scanning"));
    if (divinationResult) {
      renderResult(divinationResult);
      if (!divinationResult.archiveSaved) {
        saveReading(divinationResult);
        divinationResult.archiveSaved = true;
      }
    }
    return;
  }

  if (currentState === "result" && elapsed >= RESULT_DURATION) {
    currentState = "returning";
    stateStartedAt = performance.now();
    stateLabel.textContent = "RETURNING";
    sceneStatus.textContent = "returning to archive";
    setSystemStatus("SCANNING SIXTEEN LODGES...");
    resultList.classList.remove("is-visible");
    return;
  }

  if (currentState === "returning" && elapsed >= RETURN_DURATION) {
    resetActivation();
  }
}

function getActivationProgress() {
  if (activeHouseIndex === -1) return 0;
  const elapsed = performance.now() - stateStartedAt;

  if (currentState === "scanning") {
    return easeInOutCubic(constrain01(elapsed / SCAN_DURATION)) * 0.18;
  }

  if (currentState === "revealing") {
    return easeInOutCubic(constrain01(elapsed / REVEAL_DURATION));
  }

  if (currentState === "result") {
    return 1;
  }

  if (currentState === "returning") {
    return 1 - easeInOutCubic(constrain01(elapsed / RETURN_DURATION));
  }

  return 0;
}

function getScanProgress() {
  if (currentState !== "scanning") return currentState === "revealing" || currentState === "result" ? 1 : 0;
  return constrain01((performance.now() - stateStartedAt) / SCAN_DURATION);
}

function getScanSweepStrength(index, scanProgress, now) {
  if (currentState !== "scanning") return 0;
  const sweepPosition = scanProgress * (HOUSE_COUNT + 2) - 1;
  const distance = Math.abs(index - sweepPosition);
  const headGlow = constrain01(1 - distance / 1.65);
  const ripple = 0.5 + 0.5 * Math.sin(now * 6 + index * 0.7);
  const targetLock = index === activeHouseIndex ? easeInOutCubic(constrain01((scanProgress - 0.72) / 0.28)) : 0;
  return Math.max(headGlow * (0.55 + ripple * 0.45), targetLock * (0.55 + ripple * 0.22));
}

function setModelVisual(model, { emissiveIntensity, opacity, outlineOpacity }) {
  model.traverse((child) => {
    if (!child.material) return;
    const targetOpacity = child.userData.isOutline ? outlineOpacity : opacity;
    forEachMaterial(child.material, (material) => {
      material.opacity += (targetOpacity - material.opacity) * 0.08;
      if ("emissiveIntensity" in material) {
        material.emissiveIntensity += (emissiveIntensity - material.emissiveIntensity) * 0.05;
      }
    });
  });
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) {
    material.forEach(callback);
    return;
  }
  callback(material);
}

function animateOrbitLines(now, scanProgress) {
  if (!divinationResult) return;
  orbitLines.forEach((line, index) => {
    if (!line.material) return;
    if (currentState === "scanning") {
      const isSelected = index === divinationResult.trajectoryIndex;
      const lockPulse = 0.5 + 0.5 * Math.sin(now * 7.4);
      line.material.opacity += ((isSelected ? 0.44 + lockPulse * 0.16 : 0.045) - line.material.opacity) * 0.12;
      line.material.dashOffset = isSelected ? -scanProgress * 8 - now * 0.6 : 0;
      line.material.dashSize = isSelected ? 0.22 + lockPulse * 0.08 : 0.16;
      line.material.gapSize = isSelected ? 0.1 : 0.22;
      return;
    }

    if (currentState === "revealing" || currentState === "result") {
      const isSelected = index === divinationResult.trajectoryIndex;
      line.material.opacity += ((isSelected ? 0.28 : 0.06) - line.material.opacity) * 0.08;
    }
  });
}

function animateLockReticle(now, scanProgress) {
  if (!divinationResult || currentState !== "scanning") {
    lockReticle.visible = false;
    return;
  }

  const lockProgress = easeInOutCubic(constrain01((scanProgress - 0.62) / 0.38));
  if (lockProgress <= 0) {
    lockReticle.visible = false;
    return;
  }

  const target = getTrajectoryPointVector(divinationResult.point);
  const pulse = 0.5 + 0.5 * Math.sin(now * 8.2);
  lockReticle.visible = true;
  lockReticle.position.lerp(target, 0.22);
  lockReticle.rotation.y = now * 0.45;
  lockReticle.scale.setScalar(1.42 - lockProgress * 0.48 + pulse * 0.035);

  lockReticle.children.forEach((child, index) => {
    if (!child.material) return;
    const baseOpacity = index < 2 ? 0.16 + lockProgress * 0.42 : 0.08 + lockProgress * 0.28;
    child.material.opacity = baseOpacity + pulse * 0.09;
  });
}

function animateScanPoint(scanProgress) {
  if (!divinationResult || currentState !== "scanning") {
    scanPoint.visible = false;
    return;
  }

  const point = getTrajectoryPointAt(divinationResult.trajectory, scanProgress);
  scanPoint.visible = true;
  scanPoint.position.copy(point);
  scanPoint.children[0].material.opacity = 0.08 + Math.sin(performance.now() * 0.012) * 0.025;
}

function animateSatellite(now, scanProgress) {
  if (divinationResult && currentState === "scanning") {
    satellite.position.lerp(getTrajectoryPointAt(divinationResult.trajectory, scanProgress).add(new THREE.Vector3(0, 0.48, 0)), 0.16);
  } else if (satellite.userData.target) {
    satellite.position.lerp(satellite.userData.target, 0.045);
  } else {
    satellite.position.set(Math.cos(now * 0.22) * MODEL_RADIUS, 0.58, Math.sin(now * 0.22) * MODEL_RADIUS);
  }

  satellite.children[1].scale.setScalar(1 + Math.sin(now * 3.1) * 0.08);
}

function getTrajectoryPointAt(trajectory, progress) {
  const points = trajectory.points;
  const index = Math.min(points.length - 1, Math.floor(progress * (points.length - 1)));
  return getTrajectoryPointVector(points[index]);
}

function getTrajectoryPointVector(point) {
  const r = point.radius * (PLATE_SIZE * 0.45);
  return new THREE.Vector3(Math.cos(point.angle) * r, 0.12, Math.sin(point.angle) * r);
}

function constrain01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOutCubic(value) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function resizeRenderer() {
  const width = Math.max(1, sceneRoot.clientWidth);
  const height = Math.max(1, sceneRoot.clientHeight);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
