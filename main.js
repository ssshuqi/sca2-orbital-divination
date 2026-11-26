const houses = window.houseLibrary;
const trajectories = window.trajectoryLibrary;
const FateEngine = window.FateEngine;

if (!Array.isArray(houses) || !Array.isArray(trajectories) || !FateEngine) {
  throw new Error("SCA-2 core files did not load. Keep index.html, data.js, fate-engine.js, main.js, style.css, and assets/ in the same folder.");
}

const HOUSE_COUNT = 16;
// Match the previous launch speed (3 / 6200) while extending the slower tail.
const SCAN_DURATION = 6200 * 5 / 3;
const RESULT_DURATION = 9000;
const IDLE_TIMEOUT = 5 * 60 * 1000;
const TAU = Math.PI * 2;
const ICON_VERSION = "cards-r3-20261018";
const WHEEL_CONFIG = {
  cardCount: 16,
  ringRadiusPx: 760,
  xTiltDeg: -12,
  dragSensitivity: 0.22,
  inertia: 0.92,
  spinTurns: 2,
  longPressMs: 1400,
  focusScale: 1.12,
  focusBorderWidth: 1.25,
  minUnfocusedAlpha: 0.16,
  maxUnfocusedAlpha: 0.62
};

// 01–16 icon mapping. Keep this order aligned with data.js / houses.
const HOUSE_ICON_PATHS = Array.from(
  { length: HOUSE_COUNT },
  (_, index) => `${houses[index].artwork}?v=${ICON_VERSION}`
);

const state = {
  digits: [0, 0, 0, 0],
  mode: "idle",
  selectedHouseIndex: -1,
  activeHouseIndex: -1,
  targetHouseIndex: -1,
  selectedTrajectoryIndex: 0,
  targetPointIndex: 0,
  scanStartedAt: 0,
  result: null,
  lastInteractionAt: Date.now(),
  lastDigitSoundAt: 0,
  animationStart: performance.now(),
  wheelRotation: 0,
  wheelVelocity: 0,
  wheelDragging: false,
  wheelPointerId: null,
  wheelStartX: 0,
  wheelStartY: 0,
  wheelLastX: 0,
  wheelLastTime: 0,
  wheelMoved: false,
  wheelZoom: 1,
  pinchStartDistance: 0,
  pinchStartZoom: 1,
  gestureMode: "none",
  pressStartAt: 0,
  pressIndex: -1,
  pressProgress: 0,
  focusedCardIndex: 0,
  selectedFlight: null,
  particles: [],
  drawCount: 0,
  interactionEntropy: 0,
  lastFateIndex: -1,
  currentFateIndex: -1,
  orbitMinuteOfDay: 0,
  isCalculating: false,
  wheelSpin: null,
  fateHistory: [],
  timeEngineState: "idle",
  capturedMoment: null,
  timeStatusTimer: 0,
  lastClockMinute: -1
};

const canvas = document.querySelector("#orbitalCanvas");
const ctx = canvas.getContext("2d");
const digitButtons = [...document.querySelectorAll(".digit-wheel")];
const sectionSelector = document.querySelector("#sectionSelector");
const launchButton = document.querySelector("#launch-button");
const enterButton = document.querySelector("#enterObservatory");
const backToCoverButton = document.querySelector("#backToCoverButton");
const timeReadout = document.querySelector("#timeReadout");
const timeTrigger = document.querySelector("#timeTrigger");
const timeStatus = document.querySelector("#timeStatus");
const timeAction = document.querySelector("#timeAction");
const hourTicks = document.querySelector("#hourTicks");
const signalState = document.querySelector("#signalState");
const resultName = document.querySelector("#resultName");
const resultIcon = document.querySelector("#resultIcon");
const resultInterpretation = document.querySelector("#resultInterpretation");
const resultKeywords = document.querySelector("#resultKeywords");
const resultAdvice = document.querySelector("#resultAdvice");
const saveJournalButton = document.querySelector("#saveJournalButton");
const systemStatusText = document.querySelector("#system-status-text");
const stateLabel = document.querySelector("#state-label");
const nextAlignment = document.querySelector("#nextAlignment");
const recentReadings = document.querySelector("#recent-readings");
const aboutPopover = document.querySelector("#aboutPopover");
const helpPopover = document.querySelector("#helpPopover");

const stars = createStars(190);
const iconGlyphs = ["✦", "◇", "△", "◯", "∿", "⌁", "◐", "✧", "◌", "·", "⌯", "⁕", "⊙", "↺", "▽", "◎"];
const activeWheelPointers = new Map();
const cardTextureCache = new Map();
const cardRenderSurface = document.createElement("canvas");
const modelImages = Array.from({ length: HOUSE_COUNT }, (_, index) => {
  const image = new Image();
  image.src = getModelImagePath(index);
  image.onload = () => {
    image.dataset.loaded = "true";
  };
  return image;
});

// Complete 70 x 100 mm printed card faces, kept in the same 01-16 order.
const CARD_FACE_VERSION = "print-faces-transparent-20261020";
function getCardFacePath(index) {
  return `assets/card-faces-print/house${String(index + 1).padStart(2, "0")}.svg?v=${CARD_FACE_VERSION}`;
}
const cardFaceImages = Array.from({ length: HOUSE_COUNT }, (_, index) => {
  const image = new Image();
  image.onload = () => { image.dataset.loaded = "true"; };
  image.src = getCardFacePath(index);
  return image;
});

init();

function init() {
  buildHourTicks();
  renderSectionSelector();
  bindEvents();
  updateDigitDisplay();
  setTimeEngineState("idle");
  renderIdleResult();
  renderRecentReadings();
  resizeCanvas();
  requestAnimationFrame(animate);
}

function bindEvents() {
  new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener("resize", resizeCanvas);
  document.addEventListener("pointerdown", markInteraction, { passive: true });
  document.addEventListener("keydown", markInteraction);

  enterButton?.addEventListener("click", () => {
    markInteraction();
    document.body.classList.remove("intro-active");
  });

  backToCoverButton?.addEventListener("click", () => {
    document.body.classList.add("intro-active");
  });

  timeTrigger.addEventListener("click", startDivination);
  timeTrigger.addEventListener("pointerenter", () => {
    if (state.timeEngineState === "idle") timeAction.textContent = "CAPTURE MOMENT";
  });
  timeTrigger.addEventListener("pointerleave", () => {
    if (state.timeEngineState === "idle") timeAction.textContent = "CLICK TO DIVINE";
  });
  launchButton.addEventListener("click", startDivination);
  saveJournalButton.addEventListener("click", saveCurrentReading);
  canvas.addEventListener("pointerdown", handleWheelPointerDown);
  canvas.addEventListener("pointermove", handleWheelPointerMove);
  canvas.addEventListener("pointerup", handleWheelPointerUp);
  canvas.addEventListener("pointercancel", handleWheelPointerUp);
  canvas.addEventListener("lostpointercapture", handleWheelPointerUp);

  digitButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      markInteraction();
      if (state.mode === "scanning") return;
      const index = Number(button.dataset.index);
      const rect = button.getBoundingClientRect();
      const direction = event.clientY < rect.top + rect.height / 2 ? 1 : -1;
      state.digits[index] = (state.digits[index] + direction + 10) % 10;
      addInteractionEntropy((index + 1) * 17.3 + direction * 9.7 + performance.now() % 97);
      playDigitSound();
      updateDigitDisplay(index);
    });
  });

  document.querySelector("#aboutTrigger")?.addEventListener("click", (event) => togglePopover(event, aboutPopover));
  document.querySelector("#coverAboutTrigger")?.addEventListener("click", (event) => togglePopover(event, aboutPopover));
  document.querySelector("#helpTrigger")?.addEventListener("click", (event) => togglePopover(event, helpPopover));
  document.querySelector("#coverHelpTrigger")?.addEventListener("click", (event) => togglePopover(event, helpPopover));
  document.addEventListener("click", (event) => {
    if (!event.target.closest("button") && !event.target.closest(".floating-popover")) {
      closePopovers();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopovers();
  });
}

function togglePopover(event, popover) {
  event.preventDefault();
  event.stopPropagation();
  const willOpen = popover.hidden;
  closePopovers();
  popover.hidden = !willOpen;
}

function closePopovers() {
  aboutPopover.hidden = true;
  helpPopover.hidden = true;
}

function markInteraction() {
  state.lastInteractionAt = Date.now();
}

function playDigitSound() {
  const now = performance.now();
  if (now - state.lastDigitSoundAt < 70) return;
  state.lastDigitSoundAt = now;
  window.SoundManager?.play("digit");
}

function handleWheelPointerDown(event) {
  markInteraction();
  if (state.mode === "scanning") return;
  activeWheelPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (activeWheelPointers.size === 2) {
    state.gestureMode = "pinch";
    state.pinchStartDistance = getPointerDistance();
    state.pinchStartZoom = state.wheelZoom;
    state.pressIndex = -1;
    state.pressProgress = 0;
    state.wheelVelocity = 0;
    canvas.setPointerCapture?.(event.pointerId);
    return;
  }
  const focused = getFocusedCardIndex();
  const hitIndex = hitTestWheelCard(event.clientX, event.clientY);
  state.wheelDragging = true;
  state.gestureMode = "drag";
  state.wheelPointerId = event.pointerId;
  state.wheelStartX = event.clientX;
  state.wheelStartY = event.clientY;
  state.wheelLastX = event.clientX;
  state.wheelLastTime = performance.now();
  state.wheelMoved = false;
  state.wheelVelocity = 0;
  state.pressIndex = hitIndex === focused ? focused : -1;
  state.pressStartAt = state.pressIndex >= 0 ? performance.now() : 0;
  state.pressProgress = 0;
  canvas.setPointerCapture?.(event.pointerId);
}

function handleWheelPointerMove(event) {
  if (activeWheelPointers.has(event.pointerId)) {
    activeWheelPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  }
  if (state.gestureMode === "pinch" && activeWheelPointers.size >= 2) {
    markInteraction();
    updatePinchGesture();
    return;
  }
  if (!state.wheelDragging || state.wheelPointerId !== event.pointerId) return;
  markInteraction();
  const now = performance.now();
  const dx = event.clientX - state.wheelLastX;
  const dt = Math.max(16, now - state.wheelLastTime);
  const totalDx = event.clientX - state.wheelStartX;
  const totalDy = event.clientY - state.wheelStartY;
  const dragStep = degToRad(WHEEL_CONFIG.dragSensitivity);
  const rotationDelta = dx * dragStep;
  addInteractionEntropy(
    Math.abs(dx) * 0.37 +
    Math.abs(totalDy) * 0.013 +
    Math.abs(rotationDelta) * 1.17
  );
  if (Math.abs(totalDx) > 4 || Math.abs(totalDy) > 4) {
    state.wheelMoved = true;
    state.pressProgress = 0;
  }
  // Movement cancels the hold timer. An upward swipe still uses the card touched at the start.
  if (Math.abs(totalDx) >= 36 || totalDy > 4) state.pressIndex = -1;
  if (state.pressIndex >= 0 && totalDy < -54) {
    selectFocusedCard(now);
    state.pressIndex = -1;
    state.pressProgress = 0;
    state.wheelDragging = false;
    state.wheelPointerId = null;
    state.wheelVelocity = 0;
    state.gestureMode = "none";
    return;
  }
  state.wheelRotation += rotationDelta;
  state.wheelVelocity = rotationDelta / (dt / 16.67);
  state.wheelLastX = event.clientX;
  state.wheelLastTime = now;
}

function handleWheelPointerUp(event) {
  if (state.pressStartAt) {
    addInteractionEntropy((performance.now() - state.pressStartAt) * 0.071 + performance.now() % 113);
  }
  activeWheelPointers.delete(event.pointerId);
  if (state.gestureMode === "pinch") {
    state.gestureMode = "none";
    state.pinchStartDistance = 0;
    state.pressIndex = -1;
    state.pressProgress = 0;
    if (activeWheelPointers.size === 1) {
      const [remainingId, point] = activeWheelPointers.entries().next().value;
      state.wheelDragging = true;
      state.gestureMode = "drag";
      state.wheelPointerId = remainingId;
      state.wheelStartX = point.x;
      state.wheelStartY = point.y;
      state.wheelLastX = point.x;
      state.wheelLastTime = performance.now();
      state.wheelVelocity = 0;
    }
    return;
  }
  if (!state.wheelDragging || state.wheelPointerId !== event.pointerId) return;
  state.wheelDragging = false;
  state.wheelPointerId = null;
  state.gestureMode = "none";
  state.pressIndex = -1;
  state.pressStartAt = 0;
  state.pressProgress = 0;
  canvas.releasePointerCapture?.(event.pointerId);
  if (!state.wheelMoved || Math.abs(state.wheelVelocity) < 0.003) {
    snapWheelToNearest();
  }
}

function updatePinchGesture() {
  const distance = getPointerDistance();
  if (!distance || !state.pinchStartDistance) return;
  const nextZoom = state.pinchStartZoom * (distance / state.pinchStartDistance);
  addInteractionEntropy(Math.abs(distance - state.pinchStartDistance) * 0.29);
  state.wheelZoom = clamp(nextZoom, 0.82, 1.22);
}

function getPointerDistance() {
  const points = [...activeWheelPointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function hitTestWheelCard(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const layout = getWheelLayout(rect);
  const cards = getWheelCards(layout);
  for (const card of cards.slice().sort((a, b) => b.depth - a.depth)) {
    // Rear card faces covered by the disc are not interactive.
    if (card.depth < 0 && Math.hypot(x - layout.cx, y - layout.discCenterY) <= layout.occlusionRadius) continue;
    let inside = false;
    const corners = card.corners;
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const a = corners[i];
      const b = corners[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) return card.index;
  }
  return -1;
}

function getFocusedCardIndex() {
  const count = getWheelCardCount();
  const step = TAU / count;
  return (Math.round(-state.wheelRotation / step) % count + count) % count;
}

function snapWheelToNearest() {
  const step = TAU / getWheelCardCount();
  const focused = getFocusedCardIndex();
  state.wheelRotation = -focused * step;
  state.wheelVelocity = 0;
  state.focusedCardIndex = focused;
  setFocusedHouse(focused, false);
}

function setFocusedHouse(index, renderList = true) {
  state.focusedCardIndex = index;
  state.selectedHouseIndex = index;
  state.activeHouseIndex = index;
  if (renderList) renderSectionSelector();
  if (state.currentFateIndex >= 0) renderHouseArchive(index);
}

function selectFocusedCard(now) {
  if (state.selectedFlight) return;
  const index = getFocusedCardIndex();
  setFocusedHouse(index);
  const rect = canvas.getBoundingClientRect();
  const layout = getWheelLayout(rect);
  const card = getWheelCards(layout).find((item) => item.index === index);
  state.selectedFlight = {
    index,
    startedAt: now,
    fromX: card?.x || layout.cx,
    fromY: card?.y || layout.cy,
    fromW: card?.w || layout.cardW,
    fromH: card?.h || layout.cardH,
    toX: layout.width + layout.cardW * 0.4,
    toY: layout.cy - layout.radius * 0.08,
    toW: layout.cardW * 0.54,
    toH: layout.cardH * 0.54
  };
  launchCardFlight(index, card, layout);
  state.particles = createEnergyParticles(index, layout);
  systemStatusText.textContent = "Card drawn into fate slot";
  stateLabel.textContent = "CARD LOCKED";
}

function launchCardFlight(index, card, layout) {
  if (!card || !resultIcon) return;
  const canvasRect = canvas.getBoundingClientRect();
  const targetRect = resultIcon.getBoundingClientRect();
  const flyingCard = document.createElement("div");
  const image = document.createElement("img");
  const startW = Math.max(42, card.w);
  const startH = Math.max(58, card.h);
  const endSize = Math.min(targetRect.width, targetRect.height) * 0.86;

  image.src = getCardFacePath(index);
  image.alt = "";
  flyingCard.className = "flying-oracle-card";
  flyingCard.appendChild(image);
  Object.assign(flyingCard.style, {
    left: `${canvasRect.left + card.x - startW / 2}px`,
    top: `${canvasRect.top + card.y - startH / 2}px`,
    width: `${startW}px`,
    height: `${startH}px`
  });

  resultIcon.classList.remove("is-card-arrived");
  resultIcon.classList.add("is-receiving");
  document.body.appendChild(flyingCard);

  const targetX = targetRect.left + targetRect.width / 2 - endSize / 2;
  const targetY = targetRect.top + targetRect.height / 2 - endSize / 2;
  const lift = Math.min(90, layout.radius * 0.16);
  const animation = flyingCard.animate(
    [
      {
        transform: "translate3d(0, 0, 0) scale(1)",
        opacity: 0.98,
        filter: "grayscale(1) contrast(0.96) brightness(1.04)"
      },
      {
        transform: `translate3d(${(targetX - (canvasRect.left + card.x - startW / 2)) * 0.46}px, ${targetY - (canvasRect.top + card.y - startH / 2) - lift}px, 0) scale(1.08)`,
        opacity: 1,
        filter: "grayscale(1) contrast(1.02) brightness(1.16)"
      },
      {
        transform: `translate3d(${targetX - (canvasRect.left + card.x - startW / 2)}px, ${targetY - (canvasRect.top + card.y - startH / 2)}px, 0) scale(${endSize / startW})`,
        opacity: 0.86,
        filter: "grayscale(1) contrast(0.96) brightness(1.03)"
      }
    ],
    {
      duration: 360,
      easing: "cubic-bezier(0.18, 0.82, 0.22, 1)",
      fill: "forwards"
    }
  );

  animation.onfinish = () => {
    flyingCard.remove();
    resultIcon.classList.remove("is-receiving");
    resultIcon.classList.add("is-card-arrived");
    window.setTimeout(() => resultIcon.classList.remove("is-card-arrived"), 360);
  };
  animation.oncancel = () => {
    flyingCard.remove();
    resultIcon.classList.remove("is-receiving");
  };
}

function captureDivinationMoment() {
  return {
    capturedAt: Date.now(),
    performanceTime: performance.now(),
    currentRotation: state.wheelRotation,
    interactionEntropy: state.interactionEntropy,
    drawCount: state.drawCount + 1
  };
}

function startDivination() {
  if (state.isCalculating || state.mode === "scanning") return;
  markInteraction();
  state.selectedFlight = null;
  state.particles = [];
  const moment = captureDivinationMoment();
  state.drawCount = moment.drawCount;
  state.capturedMoment = moment;
  const capturedDate = new Date(moment.capturedAt);
  const inputTimeCode = `${String(capturedDate.getHours()).padStart(2, "0")}${String(capturedDate.getMinutes()).padStart(2, "0")}`;
  state.digits = inputTimeCode.split("").map(Number);
  setTimeEngineState("captured", moment);

  const fate = FateEngine.calculateFate({
    count: HOUSE_COUNT,
    timestamp: moment.capturedAt,
    performanceTime: moment.performanceTime,
    rotation: moment.currentRotation,
    interactionEntropy: moment.interactionEntropy,
    drawCount: moment.drawCount,
    lastFateIndex: state.lastFateIndex,
    orbitalData: {
      timeCode: inputTimeCode,
      trajectoryCount: trajectories.length
    }
  });
  const codeText = inputTimeCode;
  const code = Number(codeText);
  const houseIndex = fate.fateIndex;
  const sample = findTrajectorySampleForFate(houseIndex, fate.trajectoryValue, fate.pointValue);
  const { trajectoryIndex, trajectory, pointIndex, point } = sample;
  const house = houses[houseIndex];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 650 : SCAN_DURATION;
  const step = TAU / getWheelCardCount();
  const targetRotation = -houseIndex * step;
  const phaseDelta = ((targetRotation - state.wheelRotation) % TAU + TAU) % TAU;
  const finalRotation = state.wheelRotation + (reducedMotion ? 0 : WHEEL_CONFIG.spinTurns * TAU) + phaseDelta;

  state.lastFateIndex = houseIndex;
  state.currentFateIndex = houseIndex;
  state.isCalculating = true;
  state.wheelSpin = {
    startedAt: performance.now(),
    duration,
    easingPower: reducedMotion ? 3 : 5,
    revealProgress: reducedMotion ? 1 : 0.8,
    startRotation: state.wheelRotation,
    finalRotation,
    targetIndex: houseIndex
  };
  state.fateHistory.push({ seed: fate.seed, fateIndex: houseIndex, timestamp: fate.timestamp });

  state.mode = "scanning";
  state.scanStartedAt = state.wheelSpin.startedAt;
  state.selectedTrajectoryIndex = trajectoryIndex;
  state.targetPointIndex = pointIndex;
  state.targetHouseIndex = houseIndex;
  state.result = {
    codeText,
    code,
    trajectory,
    trajectoryIndex,
    pointIndex,
    point,
    houseIndex,
    house,
    fateSeed: fate.seed,
    alignmentValue: fate.alignmentValue,
    signalId: fate.seed % 1000
  };

  window.clearTimeout(state.timeStatusTimer);
  state.timeStatusTimer = window.setTimeout(() => {
    if (state.isCalculating) setTimeEngineState("calculating", moment);
  }, 180);
  launchButton.disabled = true;
  launchButton.innerHTML = "ALIGNING ORBIT<br><span>轨道对齐中</span>";
  systemStatusText.textContent = "Reading historical trajectory...";
  stateLabel.textContent = "SCANNING";
  signalState.textContent = `SIGNAL ID: #${String(state.result.signalId).padStart(3, "0")} · RECEIVING`;
}

function completeDivination() {
  const completedIndex = state.targetHouseIndex;
  state.mode = "result";
  state.isCalculating = false;
  state.wheelSpin = null;
  state.activeHouseIndex = completedIndex;
  state.selectedHouseIndex = completedIndex;
  state.focusedCardIndex = completedIndex;
  state.wheelRotation = -completedIndex * (TAU / getWheelCardCount());
  state.wheelVelocity = 0;
  setTimeEngineState("locked", state.capturedMoment, completedIndex);
  window.clearTimeout(state.timeStatusTimer);
  state.timeStatusTimer = window.setTimeout(() => {
    state.capturedMoment = null;
    setTimeEngineState("idle");
    launchButton.disabled = false;
    launchButton.innerHTML = "SYNC WITH ORBIT<br><span>同步轨道</span>";
  }, 250);
  systemStatusText.textContent = "All systems nominal";
  stateLabel.textContent = "STABLE";
  renderResult(state.result);
  renderSectionSelector();
}

async function revealResultPanel() {
  const panel = document.querySelector(".result-panel");
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    panel.classList.remove("is-concealed");
    return;
  }
  panel.inert = true;
  try {
    await panel.animate(
      [{ transform: "perspective(1200px) rotateY(0deg)" }, { transform: "perspective(1200px) rotateY(90deg)" }],
      { duration: 180, easing: "ease-in", fill: "forwards" }
    ).finished;
    panel.classList.remove("is-concealed");
    const opening = panel.animate(
      [{ transform: "perspective(1200px) rotateY(-90deg)" }, { transform: "perspective(1200px) rotateY(0deg)" }],
      { duration: 240, easing: "ease-out", fill: "forwards" }
    );
    await opening.finished;
  } finally {
    panel.getAnimations().forEach(animation => animation.cancel());
    panel.classList.remove("is-concealed");
    panel.inert = false;
  }
}

function renderResult(result) {
  revealResultPanel();
  const { house, houseIndex, pointIndex, codeText, trajectory } = result;
  const keywords = house.keywords || house.symbol.split("、");
  resultName.textContent = `第${houseIndex + 1}宿 / ${house.name}`;
  resultIcon.innerHTML = createResultIconMarkup(houseIndex);
  resultInterpretation.textContent = house.oracleText || house.oracle;
  resultKeywords.innerHTML = keywords.map((keyword) => `<li>${keyword}</li>`).join("");
  resultAdvice.textContent = house.advice || `采样点 ${String(pointIndex).padStart(2, "0")} 已映射至「${house.name}」。请记录信号，再决定下一步轨道。`;
  signalState.textContent = `SIGNAL ID: #${String(result.signalId ?? Number(codeText) % 1000).padStart(3, "0")} · RECEIVED`;
  document.querySelector("#coordinateReadout").textContent = `${trajectory.period} · SAMPLE ${String(pointIndex).padStart(2, "0")}`;
  saveReading(result);
  renderRecentReadings();
}

function renderIdleResult() {
  document.querySelector(".result-panel").classList.add("is-concealed");
  resultName.textContent = "AWAITING ALIGNMENT";
  resultIcon.innerHTML = "";
  resultInterpretation.textContent = "点击 LOCAL TIME 捕获此刻，系统将以该瞬间生成时间种子并映射到十六宿分区。";
  resultKeywords.innerHTML = "<li>Moment</li><li>Seed</li><li>Orbit</li>";
  resultAdvice.textContent = "CAPTURE A MOMENT TO DIVINE";
  signalState.textContent = "SIGNAL ID: — · STANDBY";
}

function renderSectionSelector() {
  sectionSelector.innerHTML = houses
    .map((house, index) => {
      const isActive = index === state.selectedHouseIndex || index === state.activeHouseIndex;
      return `
        <button class="section-chip${isActive ? " is-active" : ""}" data-index="${index}" type="button" title="第${index + 1}宿 / ${house.name}" aria-label="第${index + 1}宿 / ${house.name}" aria-pressed="${isActive}">
          ${createIconMarkup(index, isActive)}
          <strong>${String(index + 1).padStart(2, "0")}</strong>
          <span class="lodge-name">${house.name}</span>
        </button>
      `;
    })
    .join("");

  sectionSelector.querySelectorAll(".section-chip").forEach((button) => {
    button.addEventListener("click", () => {
      markInteraction();
      if (state.isCalculating) return;
      const index = Number(button.dataset.index);
      state.wheelRotation = -index * (TAU / getWheelCardCount());
      state.wheelVelocity = 0;
      state.selectedFlight = null;
      setFocusedHouse(index, false);
      renderSectionSelector();
    });
  });
}

function renderHouseArchive(index) {
  const house = houses[index];
  const keywords = house.keywords || house.symbol.split("、");
  resultName.textContent = `第${index + 1}宿 / ${house.name}`;
  resultIcon.innerHTML = createResultIconMarkup(index);
  resultInterpretation.textContent = house.oracleText || house.oracle;
  resultKeywords.innerHTML = keywords.map((keyword) => `<li>${keyword}</li>`).join("");
  resultAdvice.textContent = house.advice || "记录此宿的象征，将它作为下一次同步轨道前的观察线索。";
  signalState.textContent = `ORBITAL SECTION: ${String(index + 1).padStart(2, "0")} · ARCHIVE`;
}

function createResultIconMarkup(index) {
  return `
    <span class="lodge-model-frame is-active">
      <img class="lodge-model" src="assets/result-diagrams/house${String(index + 1).padStart(2, "0")}.svg?v=wide-grid-20261020" alt="${houses[index].name} 卡牌图案" />
    </span>
  `;
}

function createIconMarkup(index, active) {
  return `
    <span class="lodge-model-frame${active ? " is-active" : ""}" aria-hidden="true">
      <img class="lodge-model" src="${getModelImagePath(index)}" alt="" loading="eager" />
    </span>
  `;
}

function getModelImagePath(index) {
  return HOUSE_ICON_PATHS[index];
}

function describeIconPath(index) {
  const a = (index / HOUSE_COUNT) * TAU;
  const b = a + Math.PI * 0.72;
  const x1 = 40 + Math.cos(a) * 29;
  const y1 = 40 + Math.sin(a) * 29;
  const x2 = 40 + Math.cos(b) * 29;
  const y2 = 40 + Math.sin(b) * 29;
  const c1x = 40 + Math.cos(a + 1.1) * 14;
  const c1y = 40 + Math.sin(a + 1.1) * 14;
  const c2x = 40 + Math.cos(b - 1.1) * 14;
  const c2y = 40 + Math.sin(b - 1.1) * 14;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function updateDigitDisplay(changedIndex = -1) {
  digitButtons.forEach((button, index) => {
    button.querySelector("strong").textContent = state.digits[index];
    button.classList.toggle("is-updated", index === changedIndex);
  });
  const code = state.digits.join("");
  const hour = code.slice(0, 2).padStart(2, "0");
  const minute = code.slice(2, 4).padStart(2, "0");
  const safeHour = String(Number(hour) % 24).padStart(2, "0");
  const safeMinute = String(Number(minute) % 60).padStart(2, "0");
  timeReadout.textContent = `${safeHour}:${safeMinute}`;
  if (changedIndex >= 0) {
    window.setTimeout(() => digitButtons.forEach((button) => button.classList.remove("is-updated")), 420);
  }
}

function setTimeEngineState(nextState, moment = state.capturedMoment, fateIndex = -1) {
  state.timeEngineState = nextState;
  timeTrigger.classList.toggle("is-captured", nextState !== "idle");
  timeTrigger.classList.toggle("is-calculating", nextState === "calculating");
  timeTrigger.classList.toggle("is-locked", nextState === "locked");
  timeTrigger.disabled = nextState !== "idle";

  if (nextState === "idle") {
    timeStatus.textContent = "LOCAL TIME";
    timeAction.textContent = "CLICK TO DIVINE";
    timeTrigger.setAttribute("aria-label", "Capture local time and begin divination");
    updateRealtimeClock(true);
    return;
  }

  if (moment) updateTimeDial(moment.capturedAt, true);
  if (nextState === "captured") {
    timeStatus.textContent = "MOMENT CAPTURED";
    timeAction.textContent = "TIME LOCKED";
  } else if (nextState === "calculating") {
    timeStatus.textContent = "ALIGNING ORBIT";
    timeAction.textContent = "TEMPORAL SEED ACTIVE";
  } else if (nextState === "locked") {
    timeStatus.textContent = `LOCKED / ${String(fateIndex + 1).padStart(2, "0")}`;
    timeAction.textContent = "ALIGNMENT COMPLETE";
  }
}

function updateTimeDial(timestamp, includeMilliseconds = false) {
  const date = new Date(timestamp);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const millisecond = String(date.getMilliseconds()).padStart(3, "0");
  timeReadout.textContent = includeMilliseconds
    ? `${hour}:${minute}:${second}.${millisecond}`
    : `${hour}:${minute}`;
}

function updateRealtimeClock(force = false) {
  if (state.timeEngineState !== "idle") return;
  const now = Date.now();
  const minuteKey = Math.floor(now / 60000);
  if (!force && minuteKey === state.lastClockMinute) return;
  state.lastClockMinute = minuteKey;
  updateTimeDial(now);
}

function buildHourTicks() {
  if (!hourTicks) return;
  hourTicks.innerHTML = "";
  for (let hour = 0; hour < 24; hour += 2) {
    const angle = -Math.PI / 2 + (hour / 24) * TAU;
    const x = 110 + Math.cos(angle) * 86;
    const y = 110 + Math.sin(angle) * 86;
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x.toFixed(1));
    text.setAttribute("y", y.toFixed(1));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "middle");
    text.textContent = String(hour).padStart(2, "0");
    hourTicks.appendChild(text);
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function animate(now) {
  updateRealtimeClock();
  if (state.mode === "scanning") {
    const duration = state.wheelSpin?.duration || SCAN_DURATION;
    const progress = Math.min((now - state.scanStartedAt) / duration, 1);
    // Skip the imperceptible final tail (under 0.35 degrees) before revealing.
    if (progress >= (state.wheelSpin?.revealProgress ?? 1)) completeDivination();
  }
  if (!document.body.classList.contains("intro-active") && Date.now() - state.lastInteractionAt > IDLE_TIMEOUT) {
    document.body.classList.add("intro-active");
  }
  drawOrbitalMap(now);
  updateNextAlignment();
  requestAnimationFrame(animate);
}

function drawOrbitalMap(now) {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  updateWheelPhysics(now);
  drawTarotWheel(rect, now);
}

function updateWheelPhysics(now) {
  const step = TAU / getWheelCardCount();
  if (state.mode === "scanning" && state.wheelSpin) {
    const progress = clamp((now - state.wheelSpin.startedAt) / state.wheelSpin.duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, state.wheelSpin.easingPower);
    state.wheelRotation = lerp(state.wheelSpin.startRotation, state.wheelSpin.finalRotation, eased);
    state.focusedCardIndex = getFocusedCardIndex();
    state.pressIndex = -1;
    state.pressProgress = 0;
    return;
  }
  if (state.wheelDragging) {
    if (state.pressIndex >= 0 && !state.wheelMoved) {
      state.pressProgress = Math.min((now - state.pressStartAt) / WHEEL_CONFIG.longPressMs, 1);
      if (state.pressProgress >= 1) {
        selectFocusedCard(now);
        state.pressIndex = -1;
        state.pressProgress = 0;
      }
    }
    state.focusedCardIndex = getFocusedCardIndex();
    return;
  }

  if (Math.abs(state.wheelVelocity) > 0.001) {
    state.wheelRotation += state.wheelVelocity;
    state.wheelVelocity *= WHEEL_CONFIG.inertia;
  } else {
    const focused = getFocusedCardIndex();
    const targetRotation = -focused * step;
    const delta = shortestAngle(targetRotation - state.wheelRotation);
    state.wheelRotation += delta * 0.14;
    state.wheelVelocity = 0;
    if (Math.abs(delta) < 0.002 && focused !== state.activeHouseIndex) {
      state.wheelRotation = targetRotation;
      setFocusedHouse(focused);
    } else {
      state.focusedCardIndex = focused;
    }
  }
}

function drawTarotWheel(rect, now) {
  const layout = getWheelLayout(rect);
  const t = (now - state.animationStart) / 1000;
  const focused = getFocusedCardIndex();
  const cards = getWheelCards(layout).sort((a, b) => a.depth - b.depth);

  // The rear half passes behind the physical disc, including its CSS rim.
  // Clip it to the disc exterior so it cannot show through the outer annulus.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, layout.width, layout.height);
  ctx.moveTo(layout.cx + layout.occlusionRadius, layout.discCenterY);
  ctx.arc(layout.cx, layout.discCenterY, layout.occlusionRadius, 0, TAU);
  ctx.clip("evenodd");
  cards.filter(card => card.depth < 0).forEach(card => drawWheelCard(card, false, t));
  ctx.restore();

  drawWheelBackdrop(layout, t);
  const frontCards = cards.filter(card => card.depth >= 0);
  drawWheelGrounding(layout, frontCards);
  drawFateSlot(layout, focused, t);
  frontCards.forEach(card => drawWheelCard(card, card.index === focused, t));
  drawEnergyRing(layout, focused, now);
  drawFlyingSelection(layout, now);
  drawWheelLabels(layout, focused);
}

function getWheelLayout(rect) {
  const size = Math.min(rect.width, rect.height);
  const zoom = state.wheelZoom;
  const cardW = size * 0.178 * zoom;
  const cardH = size * 0.2495 * zoom;
  const plateRadius = size * 0.43;
  const cameraPitch = Math.abs(degToRad(WHEEL_CONFIG.xTiltDeg));
  // Reserve enough canvas space for the perspective expansion at the sides.
  const availableRadius = rect.width / 2 - cardW * 0.24 - size * 0.012;
  const ringRx = Math.min(availableRadius / 1.05, plateRadius * 1.72 * zoom);
  const cameraDistance = ringRx * 3.6;
  const frontPerspective = cameraDistance / (cameraDistance - ringRx * Math.cos(cameraPitch));
  const cy = rect.height * 0.49;
  return {
    width: rect.width,
    height: rect.height,
    cx: rect.width / 2,
    cy,
    radius: plateRadius,
    starplateRadius: plateRadius,
    discCenterY: rect.height / 2,
    occlusionRadius: size / 2,
    ringCenterY: size * 0.565 - ringRx * Math.sin(cameraPitch) * frontPerspective,
    ringRx,
    cameraPitch,
    cameraDistance,
    frontPerspective,
    cardW,
    cardH
  };
}

// One camera projects every card center and corner, including its depth.
function projectWheelPoint(layout, x, y, z) {
  const sinPitch = Math.sin(layout.cameraPitch);
  const cosPitch = Math.cos(layout.cameraPitch);
  const depth = z * cosPitch + y * sinPitch;
  const perspective = layout.cameraDistance / (layout.cameraDistance - depth);
  return {
    x: layout.cx + x * perspective,
    y: layout.ringCenterY + (z * sinPitch - y * cosPitch) * perspective,
    depth,
    perspective
  };
}

function getWheelCards(layout) {
  const count = getWheelCardCount();
  const step = TAU / count;
  return houses.slice(0, count).map((house, index) => {
    const angle = state.wheelRotation + index * step;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const worldX = sin * layout.ringRx;
    const worldZ = cos * layout.ringRx;
    const center = projectWheelPoint(layout, worldX, 0, worldZ);
    const focusBoost = 1 + (WHEEL_CONFIG.focusScale - 1) * Math.pow(Math.max(0, cos), 12);
    const worldScale = 1.08 * focusBoost / layout.frontPerspective;
    const halfW = layout.cardW * worldScale / 2;
    const halfH = layout.cardH * worldScale / 2;
    // Cards stand tangent to the circular track. Both faces stay readable.
    const facing = cos * layout.cameraDistance * Math.cos(layout.cameraPitch) >= layout.ringRx ? 1 : -1;
    const tangentX = cos * facing;
    const tangentZ = -sin * facing;
    const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]].map(([u, v]) =>
      projectWheelPoint(layout,
        worldX + tangentX * halfW * u,
        halfH * v,
        worldZ + tangentZ * halfW * u)
    );
    return {
      index,
      house,
      angle,
      depth: center.depth,
      scale: center.perspective / layout.frontPerspective,
      x: center.x,
      y: center.y,
      w: Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x)),
      h: Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y)),
      corners,
      nearness: (cos + 1) / 2,
      shade: (1 - (cos + 1) / 2) * 0.24
    };
  });
}

function drawWheelBackdrop(layout, t) {
  const plateRadius = layout.starplateRadius;

  const gradient = ctx.createRadialGradient(layout.cx, layout.discCenterY, plateRadius * 0.08, layout.cx, layout.discCenterY, plateRadius * 0.92);
  gradient.addColorStop(0, "#78828d");
  gradient.addColorStop(0.7, "#66717d");
  gradient.addColorStop(1, "#58636f");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(layout.cx, layout.discCenterY, plateRadius, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(layout.cx, layout.discCenterY, plateRadius * 0.96, 0, TAU);
  ctx.clip();
  stars.forEach((star, index) => {
    const alpha = 0.14 + Math.sin(t * 0.8 + index) * 0.07;
    ctx.fillStyle = `rgba(248,244,234,${Math.max(0.05, alpha)})`;
    ctx.beginPath();
    ctx.arc(layout.cx + star.x * plateRadius, layout.discCenterY + star.y * plateRadius, star.r * 0.9, 0, TAU);
    ctx.fill();
  });
  ctx.restore();

  ctx.lineWidth = 1;
  [
    { scale: 0.26, alpha: 0.12 },
    { scale: 0.42, alpha: 0.16 },
    { scale: 0.58, alpha: 0.14 },
    { scale: 0.74, alpha: 0.11 },
    { scale: 0.88, alpha: 0.08 }
  ].forEach(({ scale, alpha }) => {
    ctx.strokeStyle = `rgba(248,244,234,${alpha})`;
    ctx.beginPath();
    ctx.arc(layout.cx, layout.discCenterY, plateRadius * scale, 0, TAU);
    ctx.stroke();
  });
}

// Soft contact shadows seat the cards on the disc without a visible track.
function drawWheelGrounding(layout, cards) {
  ctx.save();
  cards.forEach(card => {
    if (card.w < 2) return;
    const [, , br, bl] = card.corners;
    const x = (br.x + bl.x) / 2;
    const y = (br.y + bl.y) / 2 + 5;
    ctx.filter = "blur(7px)";
    ctx.fillStyle = `rgba(26,36,47,${0.02 + 0.14 * Math.pow(card.nearness, 2)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, card.w * 0.44, Math.max(2, card.h * 0.025), 0, 0, TAU);
    ctx.fill();
    ctx.filter = "none";
  });
  ctx.restore();
}

function drawFateSlot(layout, focused, t) {
  const slotW = layout.cardW * 0.92;
  const slotH = layout.cardH * 0.28;
  const x = layout.cx - slotW / 2;
  const y = layout.cy + layout.radius * 0.64;
  ctx.save();
  ctx.strokeStyle = "rgba(248,244,234,.42)";
  ctx.fillStyle = "rgba(248,244,234,.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, slotW, slotH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(248,244,234,.5)";
  ctx.font = "9px Inter, Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    state.selectedFlight ? "CARD IN TRANSIT" : `FATE SLOT / ${String(focused + 1).padStart(2, "0")}`,
    layout.cx,
    y + slotH / 2
  );
  ctx.restore();
}

function getCardTexture(index, focused) {
  const image = cardFaceImages[index];
  if (image?.dataset.loaded !== "true") return null;
  const key = `${index}:${focused}`;
  if (cardTextureCache.has(key)) return cardTextureCache.get(key);
  const texture = document.createElement("canvas");
  texture.width = 512;
  texture.height = 718;
  const paint = texture.getContext("2d");
  // Keep the original rounded silhouette and cream/gray card stock.
  paint.beginPath();
  paint.roundRect(0, 0, 512, 718, 48);
  paint.clip();
  paint.fillStyle = focused ? "#faf8f4" : "#c8cdd1";
  paint.fillRect(0, 0, 512, 718);
  // The print artwork has a transparent background; only its face is applied.
  paint.drawImage(image, 0, 0, 512, 718);
  cardTextureCache.set(key, texture);
  return texture;
}

function drawTexturedTriangle(texture, source, target, context) {
  const ctx = context;
  const [a, b, c] = source;
  const [p, q, r] = target;
  const determinant = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  const m11 = ((q.x - p.x) * (c.y - a.y) - (r.x - p.x) * (b.y - a.y)) / determinant;
  const m12 = ((q.y - p.y) * (c.y - a.y) - (r.y - p.y) * (b.y - a.y)) / determinant;
  const m21 = ((r.x - p.x) * (b.x - a.x) - (q.x - p.x) * (c.x - a.x)) / determinant;
  const m22 = ((r.y - p.y) * (b.x - a.x) - (q.y - p.y) * (c.x - a.x)) / determinant;
  ctx.save();
  // Overlap rasterized triangle edges slightly to prevent hairline seams.
  const center = { x: (p.x + q.x + r.x) / 3, y: (p.y + q.y + r.y) / 3 };
  const clipPoints = [p, q, r].map(point => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const factor = 1 + 0.6 / Math.max(0.01, Math.hypot(dx, dy));
    return { x: center.x + dx * factor, y: center.y + dy * factor };
  });
  ctx.beginPath();
  ctx.moveTo(clipPoints[0].x, clipPoints[0].y);
  ctx.lineTo(clipPoints[1].x, clipPoints[1].y);
  ctx.lineTo(clipPoints[2].x, clipPoints[2].y);
  ctx.closePath();
  ctx.clip();
  ctx.transform(m11, m12, m21, m22, p.x - m11 * a.x - m21 * a.y, p.y - m12 * a.x - m22 * a.y);
  ctx.drawImage(texture, 0, 0);
  ctx.restore();
}

function drawWheelCard(card, focused, t) {
  const texture = getCardTexture(card.index, focused);
  if (!texture || card.w < 0.5) return;
  const [tl, tr, br, bl] = card.corners;
  // Composite each card once, so its blur and opacity do not expose mesh seams.
  const padding = 12;
  const left = Math.floor(Math.min(...card.corners.map(p => p.x))) - padding;
  const top = Math.floor(Math.min(...card.corners.map(p => p.y))) - padding;
  const renderScale = Math.min(window.devicePixelRatio || 1, 2);
  cardRenderSurface.width = Math.ceil((card.w + padding * 2 + 2) * renderScale);
  cardRenderSurface.height = Math.ceil((card.h + padding * 2 + 2) * renderScale);
  const ctx = cardRenderSurface.getContext("2d");
  ctx.setTransform(renderScale, 0, 0, renderScale, -left * renderScale, -top * renderScale);
  // Short strips approximate the projective texture mapping without stretching
  // one half of the card differently from the other half.
  const slices = 8;
  const pointAt = (a, b, u) => {
    const wa = (1 - u) / a.perspective;
    const wb = u / b.perspective;
    return { x: (a.x * wa + b.x * wb) / (wa + wb), y: (a.y * wa + b.y * wb) / (wa + wb) };
  };
  ctx.save();
  // Clip both the artwork and depth shading to rounded projected corners.
  const corners = [tl, tr, br, bl];
  const radius = Math.min(card.w, card.h) * (48 / 512);
  const along = (from, to) => {
    const fraction = Math.min(0.45, radius / Math.max(0.01, Math.hypot(to.x - from.x, to.y - from.y)));
    return { x: lerp(from.x, to.x, fraction), y: lerp(from.y, to.y, fraction) };
  };
  ctx.beginPath();
  corners.forEach((corner, i) => {
    const entry = along(corner, corners[(i + 3) % 4]);
    const exit = along(corner, corners[(i + 1) % 4]);
    if (i === 0) ctx.moveTo(entry.x, entry.y);
    else ctx.lineTo(entry.x, entry.y);
    ctx.quadraticCurveTo(corner.x, corner.y, exit.x, exit.y);
  });
  ctx.closePath();
  ctx.clip();
  for (let slice = 0; slice < slices; slice += 1) {
    const u0 = slice / slices;
    const u1 = (slice + 1) / slices;
    const top0 = pointAt(tl, tr, u0);
    const top1 = pointAt(tl, tr, u1);
    const bottom0 = pointAt(bl, br, u0);
    const bottom1 = pointAt(bl, br, u1);
    const x0 = u0 * texture.width;
    const x1 = u1 * texture.width;
    drawTexturedTriangle(texture,
      [{x:x0,y:0}, {x:x1,y:0}, {x:x1,y:texture.height}],
      [top0, top1, bottom1], ctx);
    drawTexturedTriangle(texture,
      [{x:x0,y:0}, {x:x1,y:texture.height}, {x:x0,y:texture.height}],
      [top0, bottom1, bottom0], ctx);
  }
  // Opaque card faces and camera-depth ordering provide real occlusion.
  if (!focused) {
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    [tr, br, bl].forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = `rgba(103,115,128,${0.08 + (1 - card.nearness) * 0.52})`;
    ctx.fill();
  }
  ctx.restore();
  const nearness = card.nearness;
  const output = canvas.getContext("2d");
  output.save();
  output.globalAlpha = focused ? 1 : 0.16 + 0.70 * Math.pow(nearness, 1.8);
  output.filter = focused ? "none" : `blur(${(1 - nearness) * (1 - nearness) * 1.6}px)`;
  output.drawImage(cardRenderSurface, left, top, cardRenderSurface.width / renderScale, cardRenderSurface.height / renderScale);
  output.restore();
}

function drawEnergyRing(layout, focused, now) {
  if (state.pressIndex !== focused || state.pressProgress <= 0) return;
  const card = getWheelCards(layout).find((item) => item.index === focused);
  if (!card) return;
  const progress = state.pressProgress;
  const particles = 18;
  ctx.save();
  ctx.translate(card.x, card.y);
  ctx.strokeStyle = `rgba(248,244,234,${0.25 + progress * 0.55})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, card.w * (0.72 + progress * 0.16), card.h * (0.54 + progress * 0.18), now * 0.002, 0, TAU * progress);
  ctx.stroke();
  for (let i = 0; i < particles; i += 1) {
    const a = i / particles * TAU + now * 0.004;
    const rX = card.w * (0.72 + progress * 0.2);
    const rY = card.h * (0.54 + progress * 0.16);
    ctx.fillStyle = `rgba(248,244,234,${0.16 + progress * 0.72})`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rX, Math.sin(a) * rY, 1.2 + progress * 1.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlyingSelection(layout, now) {
  if (!state.selectedFlight) return;
  const flight = state.selectedFlight;
  const progress = Math.min((now - flight.startedAt) / 360, 1);
  const eased = easeOutCubic(progress);
  const x = lerp(flight.fromX, flight.toX, eased);
  const y = lerp(flight.fromY, flight.toY, eased);
  ctx.save();
  ctx.globalAlpha = 1 - progress * 0.62;
  ctx.fillStyle = "rgba(248,244,234,.9)";
  ctx.beginPath();
  ctx.arc(x, y, Math.max(2, flight.fromW * 0.035 * (1 - progress * 0.4)), 0, TAU);
  ctx.fill();
  ctx.restore();
  if (progress >= 1) {
    state.selectedFlight = null;
    systemStatusText.textContent = "All systems nominal";
    stateLabel.textContent = "STABLE";
  }
}

function drawWheelLabels(layout, focused) {
  ctx.save();
  ctx.fillStyle = "rgba(248,244,234,.68)";
  ctx.font = "10px Inter, Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("3D FATE WHEEL / DRAG · PINCH · SWIPE UP", layout.cx, layout.cy - layout.radius * 0.72);
  ctx.fillStyle = "rgba(248,244,234,.58)";
  ctx.font = "10px Inter, Helvetica Neue, Arial, sans-serif";
  ctx.fillText(
    `FOCUS ${String(focused + 1).padStart(2, "0")} / HOLD 1.4S OR SWIPE UP TO DRAW`,
    layout.cx,
    layout.cy + layout.radius * 0.87
  );
  ctx.restore();
}

function createEnergyParticles(index, layout) {
  return Array.from({ length: 24 }, (_, i) => ({
    index,
    angle: (i / 24) * TAU,
    radius: layout.cardW * (0.6 + (i % 5) * 0.08),
    speed: 0.018 + (i % 7) * 0.002
  }));
}

function shortestAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function addInteractionEntropy(value) {
  if (!Number.isFinite(value)) return;
  state.interactionEntropy = (state.interactionEntropy + Math.abs(value)) % 1000000000;
}

function findTrajectorySampleForFate(fateIndex, trajectoryValue, pointValue) {
  const preferredTrajectoryIndex = Math.min(
    trajectories.length - 1,
    Math.floor(trajectoryValue * trajectories.length)
  );
  const orderedIndexes = Array.from(
    { length: trajectories.length },
    (_, offset) => (preferredTrajectoryIndex + offset) % trajectories.length
  );

  for (const trajectoryIndex of orderedIndexes) {
    const trajectory = trajectories[trajectoryIndex];
    const candidates = trajectory.points
      .map((point, pointIndex) => ({ point, pointIndex }))
      .filter(({ point }) => getHouseIndexFromAngle(point.angle) === fateIndex);

    if (candidates.length) {
      const candidateIndex = Math.min(candidates.length - 1, Math.floor(pointValue * candidates.length));
      return { trajectoryIndex, trajectory, ...candidates[candidateIndex] };
    }
  }

  const trajectoryIndex = preferredTrajectoryIndex;
  const trajectory = trajectories[trajectoryIndex];
  const pointIndex = Math.min(trajectory.points.length - 1, Math.floor(pointValue * trajectory.points.length));
  return { trajectoryIndex, trajectory, pointIndex, point: trajectory.points[pointIndex] };
}

function getHouseIndexFromAngle(angle) {
  const normalizedAngle = ((angle % TAU) + TAU) % TAU;
  return Math.floor(normalizedAngle / (TAU / HOUSE_COUNT));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

function getWheelCardCount() {
  return Math.min(WHEEL_CONFIG.cardCount, houses.length);
}

function getCircularDistance(index, focusedIndex, count) {
  const direct = Math.abs(index - focusedIndex);
  return Math.min(direct, count - direct);
}

function drawOrbitBackground(cx, cy, radius) {
  const gradient = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  gradient.addColorStop(0, "#6f7a86");
  gradient.addColorStop(0.72, "#65717d");
  gradient.addColorStop(1, "#515b66");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "rgba(248,244,234,.68)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + i * 5, 0, TAU);
    ctx.stroke();
  }
}

function drawStars(cx, cy, radius, t) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.96, 0, TAU);
  ctx.clip();
  stars.forEach((star, index) => {
    const alpha = 0.2 + Math.sin(t * 0.9 + index) * 0.11;
    ctx.fillStyle = `rgba(248,244,234,${Math.max(0.08, alpha)})`;
    ctx.beginPath();
    ctx.arc(cx + star.x * radius, cy + star.y * radius, star.r, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

function drawGrid(cx, cy, radius) {
  ctx.strokeStyle = "rgba(255,255,255,.16)";
  ctx.lineWidth = 1;
  [0.2, 0.38, 0.56, 0.74, 0.9].forEach((scale) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius * scale, 0, TAU);
    ctx.stroke();
  });
  for (let i = 0; i < HOUSE_COUNT; i += 1) {
    const angle = -Math.PI / 2 + (i / HOUSE_COUNT) * TAU;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius * 0.94, cy + Math.sin(angle) * radius * 0.94);
    ctx.stroke();
  }
}

function drawHouseSectors(cx, cy, radius, activeIndex, t) {
  for (let i = 0; i < HOUSE_COUNT; i += 1) {
    const start = -Math.PI / 2 + (i / HOUSE_COUNT) * TAU;
    const end = start + TAU / HOUSE_COUNT;
    if (i === activeIndex) {
      const pulse = 0.16 + Math.sin(t * 2.3) * 0.05;
      ctx.fillStyle = `rgba(248,244,234,${pulse})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius * 0.94, start, end);
      ctx.closePath();
      ctx.fill();
    }
    const labelAngle = start + (end - start) / 2;
    ctx.fillStyle = i === activeIndex ? "rgba(248,244,234,.92)" : "rgba(248,244,234,.42)";
    ctx.font = "10px Inter, Helvetica Neue, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(i + 1).padStart(2, "0"), cx + Math.cos(labelAngle) * radius * 0.82, cy + Math.sin(labelAngle) * radius * 0.82);
  }
}

function drawTrajectories(cx, cy, radius, scanProgress) {
  trajectories.forEach((trajectory, index) => {
    const isSelected = index === state.selectedTrajectoryIndex;
    ctx.strokeStyle = isSelected ? "rgba(248,244,234,.72)" : "rgba(255,255,255,.14)";
    ctx.lineWidth = isSelected ? 1.6 : 0.8;
    ctx.beginPath();
    trajectory.points.forEach((point, pointIndex) => {
      const x = cx + point.x * radius * 0.78;
      const y = cy + point.y * radius * 0.78;
      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  if (!state.result) return;
  const point = getTrajectoryPointAt(state.result.trajectory, scanProgress);
  const x = cx + point.x * radius * 0.78;
  const y = cy + point.y * radius * 0.78;
  ctx.fillStyle = "rgba(248,244,234,.95)";
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "rgba(248,244,234,.45)";
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, TAU);
  ctx.stroke();
}

function drawSatellite(cx, cy, radius, progress, t) {
  const activeTrajectory = state.result?.trajectory || trajectories[0];
  const point = getTrajectoryPointAt(activeTrajectory, progress);
  const x = cx + point.x * radius * 0.78;
  const y = cy + point.y * radius * 0.78;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.25);
  ctx.fillStyle = "rgba(238,236,230,.92)";
  ctx.strokeStyle = "rgba(64,66,70,.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-15, -10, 30, 20, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-43, -7, 24, 14);
  ctx.fillRect(19, -7, 24, 14);
  ctx.strokeRect(-43, -7, 24, 14);
  ctx.strokeRect(19, -7, 24, 14);
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawCurrentIcon(cx, cy, radius, houseIndex, t) {
  if (houseIndex < 0) return;
  const house = houses[houseIndex];
  const y = cy - radius * 0.02 + Math.sin(t * 1.4) * 3;
  const image = modelImages[houseIndex];
  ctx.save();
  ctx.globalAlpha = 0.92 + Math.sin(t * 2) * 0.05;
  ctx.fillStyle = "rgba(248,244,234,.16)";
  ctx.strokeStyle = "rgba(255,255,255,.46)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, y, 42, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (image?.dataset.loaded === "true") {
    const size = 86;
    ctx.drawImage(image, cx - size / 2, y - size / 2, size, size);
  } else {
    ctx.font = "28px Georgia, Times New Roman, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(248,244,234,.9)";
    ctx.fillText(iconGlyphs[houseIndex], cx, y - 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(248,244,234,.86)";
  ctx.font = "11px Inter, Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(house.name, cx, y + 30);
  ctx.restore();
}

function drawCompass(cx, cy, radius) {
  ctx.fillStyle = "rgba(248,244,234,.62)";
  ctx.font = "11px Inter, Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("N", cx, cy - radius + 24);
  ctx.fillText("S", cx, cy + radius - 18);
  ctx.fillText("E", cx + radius - 22, cy + 4);
  ctx.fillText("W", cx - radius + 22, cy + 4);
}

function getTrajectoryPointAt(trajectory, progress) {
  const points = trajectory.points;
  const index = Math.min(points.length - 1, Math.max(0, Math.floor(progress * (points.length - 1))));
  return points[index];
}

function createStars(count) {
  return Array.from({ length: count }, (_, index) => {
    const r = Math.sqrt(((index * 37) % count) / count) * 0.92;
    const a = (index * 2.399963229728653) % TAU;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, r: 0.5 + ((index * 17) % 4) * 0.18 };
  });
}

function saveCurrentReading() {
  if (!state.result) return;
  saveReading(state.result);
  renderRecentReadings();
  systemStatusText.textContent = "Journal record saved";
}

function saveReading(result) {
  const house = result.house;
  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    time: result.codeText,
    section: result.houseIndex + 1,
    sectionName: house.name,
    edition: house.edition,
    interpretation: house.oracleText || house.oracle,
    keywords: house.keywords || house.symbol.split("、"),
    seed: result.fateSeed ?? null
  };
  const records = readReadings().filter((item) => item.time !== record.time || item.section !== record.section);
  records.unshift(record);
  localStorage.setItem("sca2-orbital-readings", JSON.stringify(records.slice(0, 3)));
}

function readReadings() {
  try {
    return JSON.parse(localStorage.getItem("sca2-orbital-readings") || "[]");
  } catch {
    return [];
  }
}

function renderRecentReadings() {
  if (!recentReadings) return;

  const records = readReadings();
  recentReadings.innerHTML = records.length
    ? records.map((record) => `<li><strong>${String(record.section).padStart(2, "0")} / ${record.sectionName}</strong><span>${record.time}</span></li>`).join("")
    : "<li><strong>NO RECORD</strong><span>Awaiting first synchronization</span></li>";
}

function updateNextAlignment() {
  const now = new Date();
  const seconds = 7800 - ((now.getMinutes() * 60 + now.getSeconds()) % 7800);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  nextAlignment.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
