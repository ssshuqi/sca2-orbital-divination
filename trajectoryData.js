/*
 * Historical SCA-2 trajectory material for Orbital Divination.
 *
 * The five trajectories below are deterministic archival-style samples. Each
 * trajectory contains 90 sampling points with an angle, radius, and projected
 * x/y coordinate. To replace them with real SCA-2 records later, keep the same
 * shape:
 *   { name, source, period, points: [{ sample, angle, radius, x, y }] }
 */

const HOUSE_LIBRARY = [
  {
    id: "xuan",
    name: "玄",
    symbol: "启程、校准、立意",
    oracle: "轨迹初亮，宜先定北辰。今日之问，答案藏在第一个被你忽略的方向。"
  },
  {
    id: "sheng",
    name: "升",
    symbol: "边界、抬升、抗衡",
    oracle: "过高则离，过低则滞。把尺度调回可承受处，阻力会变成升力。"
  },
  {
    id: "heng",
    name: "衡",
    symbol: "根基、回环、沉潜",
    oracle: "此签主归根。先复查旧资料，再推进新计划，误差会在回看时显形。"
  },
  {
    id: "jing",
    name: "镜",
    symbol: "容器、关系、栖居",
    oracle: "轨道暂入暖区。适合修补关系、安置材料，让漂浮之物获得居所。"
  },
  {
    id: "xi",
    name: "息",
    symbol: "核心、热源、决断",
    oracle: "亮点穿心而过。若问题久悬，请择其一而行，答案会在行动后收束。"
  },
  {
    id: "xi-gap",
    name: "隙",
    symbol: "余波、延展、未尽",
    oracle: "尾迹仍在发光。不要急着关闭旧任务，它的残响会提供下一步线索。"
  },
  {
    id: "hui",
    name: "晦",
    symbol: "风、筛选、清理",
    oracle: "风筛尘埃，真形自现。删去多余选项，比继续收集更接近答案。"
  },
  {
    id: "feng",
    name: "逢",
    symbol: "度量、分配、秩序",
    oracle: "斗柄指向尺度。把问题拆成可计量的小格，混乱会退到盘外。"
  },
  {
    id: "huan",
    name: "幻",
    symbol: "负载、耐心、运输",
    oracle: "此路重而可行。不要追求瞬时抵达，稳定推进会比灵感更可靠。"
  },
  {
    id: "mo",
    name: "默",
    symbol: "编织、细节、隐线",
    oracle: "微弱连线正在成图。照看细节，尤其是被标注为“不重要”的部分。"
  },
  {
    id: "qi",
    name: "歧",
    symbol: "空域、等待、回声",
    oracle: "虚处不是无物。暂停三息，让延迟返回；你需要的不是更多推力。"
  },
  {
    id: "chen",
    name: "尘",
    symbol: "临界、警示、转向",
    oracle: "轨迹近临界边。此签示警：先降速，先备份，先确认，再越界。"
  },
  {
    id: "lin",
    name: "临",
    symbol: "建构、庇护、系统",
    oracle: "适合搭架与封存。把散乱的愿望放入结构，结构会替你守夜。"
  },
  {
    id: "fan",
    name: "返",
    symbol: "记录、档案、界面",
    oracle: "壁上有旧光。查阅记录、命名版本、留下痕迹，后来者会因此找到门。"
  },
  {
    id: "zhui",
    name: "坠",
    symbol: "图像、纹理、显影",
    oracle: "图样正在显影。此问宜用图解、草图或原型回答，不宜只在心中推演。"
  },
  {
    id: "huan-ring",
    name: "环",
    symbol: "聚合、召集、共同体",
    oracle: "散点可成群。向他人发出简短信号，回应会比预想更快抵达。"
  }
];

const TRAJECTORY_LIBRARY = buildTrajectoryLibrary();

function buildTrajectoryLibrary() {
  return [
    makeTrajectory("SCA-2 轨迹甲：晨昏交界段", "SCA-2 历史轨迹库 / Segment A", "T+0132 至 T+0221", 0.18, 0.80, 0.055, 0.90),
    makeTrajectory("SCA-2 轨迹乙：高纬回波段", "SCA-2 历史轨迹库 / Segment B", "T+0416 至 T+0505", 1.05, 0.62, 0.071, 1.25),
    makeTrajectory("SCA-2 轨迹丙：近地点掠影段", "SCA-2 历史轨迹库 / Segment C", "T+0788 至 T+0877", 2.14, 0.72, 0.063, 1.70),
    makeTrajectory("SCA-2 轨迹丁：夜侧静默段", "SCA-2 历史轨迹库 / Segment D", "T+1094 至 T+1183", 3.02, 0.54, 0.082, 2.35),
    makeTrajectory("SCA-2 轨迹戊：赤道穿越段", "SCA-2 历史轨迹库 / Segment E", "T+1420 至 T+1509", 4.08, 0.68, 0.067, 2.90)
  ];
}

function makeTrajectory(name, source, period, angleOffset, baseRadius, angularStep, phase) {
  const points = [];

  for (let i = 0; i < 90; i += 1) {
    const t = i / 89;
    const wobble = Math.sin(i * 0.21 + phase) * 0.11 + Math.cos(i * 0.047 + phase) * 0.07;
    const angle = normalizeRadians(angleOffset + i * angularStep + wobble);
    const radius = clamp(
      baseRadius + Math.sin(i * 0.13 + phase) * 0.12 + Math.cos(i * 0.31 + phase) * 0.035 + (t - 0.5) * 0.09,
      0.34,
      0.96
    );

    points.push({
      sample: i,
      angle,
      radius,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    });
  }

  return { name, source, period, points };
}

function normalizeRadians(angle) {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
