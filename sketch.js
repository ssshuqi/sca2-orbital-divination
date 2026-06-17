const CANVAS_RATIO = 16 / 9;
const HOUSE_COUNT = 16;
const SCAN_DURATION = 2600;
const RESULT_DURATION = 8000;
const HOUSE_IMAGE_DIR = "16宿图片";

let digits = [0, 0, 0, 0];
let appState = "idle";
let scanStartedAt = 0;
let resultStartedAt = 0;
let divination = null;
let starField = [];
let digitBoxes = [];
let launchButton = null;
let hoverButton = false;
let houseImages = {};

function preload() {
  for (const house of HOUSE_LIBRARY) {
    const path = `${HOUSE_IMAGE_DIR}/${house.name}.png`;
    houseImages[house.id] = loadImage(
      path,
      () => {},
      () => {
        houseImages[house.id] = null;
      }
    );
  }
}

function setup() {
  const canvas = createCanvas(1280, 720);
  canvas.parent("artwork-shell");
  fitCanvasToShell();
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  textFont('"Noto Serif SC", "Source Han Serif SC", "Songti SC", "Microsoft YaHei", serif');
  createStarField();
}

function windowResized() {
  fitCanvasToShell();
  createStarField();
}

function fitCanvasToShell() {
  const shell = document.getElementById("artwork-shell");
  const nextWidth = shell.clientWidth;
  resizeCanvas(nextWidth, nextWidth / CANVAS_RATIO);
}

function draw() {
  updateState();
  drawBackground();
  drawLeftAstrolabe();
  drawRightPanels();
}

function mouseMoved() {
  hoverButton = launchButton && pointInRect(mouseX, mouseY, launchButton);
}

function mousePressed() {
  if (appState !== "idle" && appState !== "result") return;

  for (const box of digitBoxes) {
    if (pointInRect(mouseX, mouseY, box)) {
      const direction = mouseY < box.y + box.h / 2 ? 1 : -1;
      digits[box.index] = (digits[box.index] + direction + 10) % 10;
      return;
    }
  }

  if (launchButton && pointInRect(mouseX, mouseY, launchButton)) {
    startDivination();
  }
}

function startDivination() {
  const code = Number(digits.join(""));

  // Core divination rule: the four-digit code selects one historical orbit
  // and one sampling point, then maps that point's angle into sixteen houses.
  const trajectoryIndex = code % TRAJECTORY_LIBRARY.length;
  const selectedTrajectory = TRAJECTORY_LIBRARY[trajectoryIndex];
  const pointIndex = code % selectedTrajectory.points.length;
  const point = selectedTrajectory.points[pointIndex];
  const normalizedAngle = ((point.angle % TWO_PI) + TWO_PI) % TWO_PI;
  const houseIndex = floor(normalizedAngle / (TWO_PI / HOUSE_COUNT));

  divination = {
    code: digits.join(""),
    trajectoryIndex,
    trajectory: selectedTrajectory,
    pointIndex,
    point,
    houseIndex,
    house: HOUSE_LIBRARY[houseIndex]
  };

  appState = "scanning";
  scanStartedAt = millis();
}

function updateState() {
  if (appState === "scanning" && millis() - scanStartedAt > SCAN_DURATION) {
    appState = "result";
    resultStartedAt = millis();
  }

  if (appState === "result" && millis() - resultStartedAt > RESULT_DURATION) {
    appState = "idle";
    divination = null;
  }
}

function drawBackground() {
  background(2, 7, 19);

  noStroke();
  for (const star of starField) {
    const pulse = 0.45 + 0.55 * sin(frameCount * star.twinkle + star.phase);
    fill(120, 210, 255, star.alpha * pulse);
    circle(star.x * width, star.y * height, star.size);
  }

  stroke(70, 150, 190, 22);
  strokeWeight(1);
  const grid = width / 32;
  for (let x = 0; x <= width; x += grid) line(x, 0, x, height);
  for (let y = 0; y <= height; y += grid) line(0, y, width, y);

  noFill();
  stroke(84, 180, 230, 32);
  for (let i = 0; i < 5; i += 1) {
    const r = min(width, height) * (0.28 + i * 0.13);
    ellipse(width * 0.26, height * 0.52, r * 1.6, r);
  }
}

function drawLeftAstrolabe() {
  const areaW = width * 0.6;
  const cx = areaW * 0.5;
  const cy = height * 0.52;
  const radius = min(areaW * 0.72, height * 0.78) * 0.5;

  drawHouseSectors(cx, cy, radius);
  drawTrajectories(cx, cy, radius * 0.86);
  drawSatellitePoint(cx, cy, radius * 0.86);
  drawAstrolabeFrame(cx, cy, radius);
}

function drawHouseSectors(cx, cy, radius) {
  const activeHouse = divination ? divination.houseIndex : -1;
  const sector = TWO_PI / HOUSE_COUNT;

  // The plate uses Chinese lunar mansion names, while the angular division is
  // intentionally kept simple so real orbital records can be swapped in later.
  for (let i = 0; i < HOUSE_COUNT; i += 1) {
    const start = -HALF_PI + i * sector;
    const end = start + sector;
    const isActive = (appState === "scanning" || appState === "result") && i === activeHouse;

    if (isActive) {
      const age = appState === "result" ? millis() - resultStartedAt : millis() - scanStartedAt;
      const glow = 1 + 0.18 * sin(age * 0.006);
      noStroke();
      fill(83, 205, 255, 32);
      arc(cx, cy, radius * 2.24 * glow, radius * 2.24 * glow, start, end, PIE);
      fill(198, 244, 255, 50);
      arc(cx, cy, radius * 2.02, radius * 2.02, start, end, PIE);
    } else {
      noStroke();
      fill(i % 2 === 0 ? color(8, 28, 48, 68) : color(5, 20, 38, 48));
      arc(cx, cy, radius * 2, radius * 2, start, end, PIE);
    }

    stroke(117, 217, 255, isActive ? 150 : 54);
    strokeWeight(isActive ? 1.8 : 1);
    line(cx, cy, cx + cos(start) * radius, cy + sin(start) * radius);

    const labelAngle = start + sector / 2;
    const lx = cx + cos(labelAngle) * radius * 0.82;
    const ly = cy + sin(labelAngle) * radius * 0.82;
    drawHouseImage(HOUSE_LIBRARY[i], lx, ly, radius * 0.11, isActive);

    noStroke();
    fill(isActive ? color(235, 252, 255) : color(152, 212, 230, 210));
    textAlign(CENTER, CENTER);
    textSize(radius * 0.042);
    text(HOUSE_LIBRARY[i].name, lx, ly + radius * 0.075);
  }
}

function drawHouseImage(house, x, y, size, isActive) {
  const img = houseImages[house.id];
  if (!img || !img.width) return;

  push();
  imageMode(CENTER);
  tint(210, 245, 255, isActive ? 245 : 72);
  if (isActive) {
    noStroke();
    fill(154, 225, 255, 34);
    circle(x, y, size * 1.75 + 10 * sin(frameCount * 0.08));
  }
  image(img, x, y - size * 0.08, isActive ? size * 1.34 : size, isActive ? size * 1.34 : size);
  noTint();
  pop();
}

function drawAstrolabeFrame(cx, cy, radius) {
  noFill();
  strokeWeight(1);
  stroke(147, 225, 255, 110);
  circle(cx, cy, radius * 2);
  stroke(147, 225, 255, 42);
  circle(cx, cy, radius * 1.56);
  circle(cx, cy, radius * 1.12);
  circle(cx, cy, radius * 0.42);

  stroke(203, 242, 255, 150);
  strokeWeight(2);
  circle(cx, cy, radius * 0.08);

  const titleY = cy - radius - height * 0.045;
  noStroke();
  fill(220, 246, 255);
  textAlign(CENTER, CENTER);
  textSize(clampText(28, width));
  text("轨道问签", cx, titleY);
  fill(124, 195, 220, 190);
  textSize(clampText(13, width));
  text("SCA-2 历史飞行轨迹 · 十六宿占卜系统", cx, titleY + 28);
}

function drawTrajectories(cx, cy, scaleRadius) {
  for (let t = 0; t < TRAJECTORY_LIBRARY.length; t += 1) {
    const trajectory = TRAJECTORY_LIBRARY[t];
    const isSelected = divination && divination.trajectoryIndex === t;
    // During scanning, the chosen trajectory is revealed point by point.
    const scanProgress = appState === "scanning" && isSelected
      ? constrain((millis() - scanStartedAt) / SCAN_DURATION, 0, 1)
      : 1;

    noFill();
    strokeWeight(isSelected ? 2.8 : 1.2);
    stroke(isSelected ? color(204, 248, 255, 215) : color(80, 175, 220, 62));
    beginShape();
    const maxPoint = floor((trajectory.points.length - 1) * scanProgress);
    for (let i = 0; i <= maxPoint; i += 1) {
      const p = trajectory.points[i];
      vertex(cx + p.x * scaleRadius, cy + p.y * scaleRadius);
    }
    endShape();
  }

  if (appState === "scanning" && divination) {
    const progress = constrain((millis() - scanStartedAt) / SCAN_DURATION, 0, 1);
    const sweep = -HALF_PI + progress * TWO_PI * 1.35;
    stroke(185, 242, 255, 150);
    strokeWeight(2);
    line(cx, cy, cx + cos(sweep) * scaleRadius * 1.08, cy + sin(sweep) * scaleRadius * 1.08);
  }
}

function drawSatellitePoint(cx, cy, scaleRadius) {
  if (!divination) {
    const idleTrajectory = TRAJECTORY_LIBRARY[floor(frameCount / 180) % TRAJECTORY_LIBRARY.length];
    const p = idleTrajectory.points[floor(frameCount * 0.4) % idleTrajectory.points.length];
    drawGlowPoint(cx + p.x * scaleRadius, cy + p.y * scaleRadius, 4, 130);
    return;
  }

  const p = divination.point;
  const x = cx + p.x * scaleRadius;
  const y = cy + p.y * scaleRadius;
  const power = appState === "scanning" ? 150 + 80 * sin(frameCount * 0.25) : 230;
  drawGlowPoint(x, y, appState === "result" ? 6 : 5, power);
}

function drawGlowPoint(x, y, coreSize, alpha) {
  noStroke();
  for (let i = 4; i >= 1; i -= 1) {
    fill(190, 238, 255, alpha / (i * 4));
    circle(x, y, coreSize * i * 3.2);
  }
  fill(238, 252, 255, 245);
  circle(x, y, coreSize);
}

function drawRightPanels() {
  const panelX = width * 0.63;
  const panelW = width * 0.33;
  drawResultPanel(panelX, height * 0.07, panelW, height * 0.48);
  drawInputPanel(panelX, height * 0.61, panelW, height * 0.31);
}

function drawResultPanel(x, y, w, h) {
  drawPanel(x, y, w, h);

  fill(222, 248, 255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(clampText(22, width));
  text("占卜结果", x + 28, y + 24);

  stroke(126, 213, 255, 65);
  line(x + 28, y + 62, x + w - 28, y + 62);

  if (appState === "scanning") {
    drawScanningText(x, y, w, h);
    return;
  }

  if (appState !== "result" || !divination) {
    fill(136, 202, 225, 180);
    textSize(clampText(15, width));
    text("等待轨道时间码。", x + 28, y + 88);
    fill(89, 170, 205, 150);
    textSize(clampText(13, width));
    text("输入四位数字后启动，系统将从历史轨迹库中读取采样点并映射至十六宿。", x + 28, y + 122, w - 56, 80);
    return;
  }

  drawResultHouseImage(x + w - 78, y + h - 78, 116);

  const rows = [
    ["轨道时间码", divination.code],
    ["历史轨迹", divination.trajectory.name],
    ["轨迹来源", divination.trajectory.source],
    ["采样点编号", String(divination.pointIndex).padStart(2, "0")],
    ["宿位名称", divination.house.name],
    ["宿位象征", divination.house.symbol],
    ["签文", divination.house.oracle]
  ];

  let yy = y + 84;
  for (const [label, value] of rows) {
    fill(96, 188, 220, 185);
    textSize(clampText(12, width));
    text(label, x + 28, yy);
    fill(label === "签文" ? color(232, 250, 255) : color(199, 236, 246));
    textSize(label === "签文" ? clampText(15, width) : clampText(14, width));
    text(value, x + 122, yy, w - 150, label === "签文" ? 70 : 24);
    yy += label === "签文" ? 64 : 31;
  }
}

function drawResultHouseImage(x, y, size) {
  const img = divination ? houseImages[divination.house.id] : null;
  if (!img || !img.width) return;

  push();
  imageMode(CENTER);
  noStroke();
  fill(137, 224, 255, 18);
  circle(x, y, size * 1.35 + 8 * sin(frameCount * 0.08));
  tint(210, 245, 255, 58);
  image(img, x, y, size, size);
  noTint();
  pop();
}

function drawScanningText(x, y, w, h) {
  const progress = constrain((millis() - scanStartedAt) / SCAN_DURATION, 0, 1);
  const barX = x + 28;
  const barY = y + h - 58;
  const barW = w - 56;

  fill(190, 235, 248);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(clampText(15, width));
  text("轨迹扫描中", x + 28, y + 92);
  fill(95, 178, 210, 160);
  textSize(clampText(13, width));
  text("正在读取历史轨迹、锁定采样点、归入十六宿盘。", x + 28, y + 124, w - 56, 56);

  noFill();
  stroke(80, 170, 210, 105);
  rect(barX, barY, barW, 10, 2);
  noStroke();
  fill(182, 240, 255, 210);
  rect(barX, barY, barW * progress, 10, 2);
}

function drawInputPanel(x, y, w, h) {
  drawPanel(x, y, w, h);

  fill(222, 248, 255);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(clampText(20, width));
  text("轨道时间码", x + 28, y + 22);

  digitBoxes = [];
  const gap = w * 0.035;
  const boxW = (w - 56 - gap * 3) / 4;
  const boxH = h * 0.44;
  const top = y + h * 0.30;

  for (let i = 0; i < 4; i += 1) {
    const bx = x + 28 + i * (boxW + gap);
    const box = { x: bx, y: top, w: boxW, h: boxH, index: i };
    digitBoxes.push(box);
    drawDigitWheel(box, digits[i]);
  }

  launchButton = { x: x + 28, y: y + h - 58, w: w - 56, h: 36 };
  drawLaunchButton(launchButton);
}

function drawDigitWheel(box, value) {
  const over = pointInRect(mouseX, mouseY, box);
  noFill();
  stroke(over ? color(188, 240, 255, 180) : color(105, 198, 235, 95));
  strokeWeight(1.3);
  rect(box.x, box.y, box.w, box.h, 6);

  stroke(87, 177, 215, 70);
  line(box.x + 8, box.y + box.h / 2, box.x + box.w - 8, box.y + box.h / 2);

  fill(70, 157, 192, 105);
  noStroke();
  triangle(box.x + box.w / 2, box.y + 9, box.x + box.w / 2 - 5, box.y + 18, box.x + box.w / 2 + 5, box.y + 18);
  triangle(box.x + box.w / 2, box.y + box.h - 9, box.x + box.w / 2 - 5, box.y + box.h - 18, box.x + box.w / 2 + 5, box.y + box.h - 18);

  fill(232, 250, 255);
  textAlign(CENTER, CENTER);
  textSize(clampText(38, width));
  text(value, box.x + box.w / 2, box.y + box.h / 2 + 1);
}

function drawLaunchButton(button) {
  const disabled = appState === "scanning";
  fill(hoverButton && !disabled ? color(30, 98, 132, 220) : color(12, 55, 82, 210));
  stroke(150, 225, 255, disabled ? 55 : 135);
  strokeWeight(1);
  rect(button.x, button.y, button.w, button.h, 6);

  fill(disabled ? color(105, 150, 168) : color(224, 249, 255));
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(clampText(14, width));
  text(disabled ? "轨道读取中" : "启动轨道问签", button.x + button.w / 2, button.y + button.h / 2);
}

function drawPanel(x, y, w, h) {
  fill(7, 18, 34, 188);
  stroke(125, 210, 255, 66);
  strokeWeight(1);
  rect(x, y, w, h, 8);

  stroke(185, 234, 255, 96);
  const c = 16;
  line(x, y + c, x, y);
  line(x, y, x + c, y);
  line(x + w - c, y, x + w, y);
  line(x + w, y, x + w, y + c);
  line(x, y + h - c, x, y + h);
  line(x, y + h, x + c, y + h);
  line(x + w - c, y + h, x + w, y + h);
  line(x + w, y + h - c, x + w, y + h);
}

function createStarField() {
  randomSeed(20260520);
  starField = [];
  for (let i = 0; i < 160; i += 1) {
    starField.push({
      x: random(),
      y: random(),
      size: random(0.7, 2.2),
      alpha: random(25, 135),
      twinkle: random(0.008, 0.025),
      phase: random(TWO_PI)
    });
  }
}

function pointInRect(px, py, rectLike) {
  return px >= rectLike.x && px <= rectLike.x + rectLike.w && py >= rectLike.y && py <= rectLike.y + rectLike.h;
}

function clampText(baseSize, currentWidth) {
  return max(10, baseSize * (currentWidth / 1280));
}
