/*
 * Orbital Divination data layer.
 *
 * IMPORTANT:
 * The trajectory records below are deterministic archival-style sample data.
 * They are not live satellite telemetry and are not verified SCA-2 mission
 * records. Replace `trajectoryLibrary` with real historical SCA-2 samples when
 * those records are available. The rest of the application only expects:
 *   { name, source, points: [{ sample, angle, radius }] }
 */

// R3 physical-card edition. Order and English text follow the print PDF.
// Chinese translations and reflection prompts accompany the original card text.
const houseLibrary = [
  {
    "id": "sample",
    "name": "SAMPLE",
    "chineseName": "采样",
    "symbol": "Whole、Fragment、Sampling",
    "keywords": [
      "Whole",
      "Fragment",
      "Sampling"
    ],
    "oracle": "THE WHOLE IS REDUCED TO A FRAGMENT.",
    "oracleText": "THE WHOLE IS REDUCED TO A FRAGMENT.\n整体被缩减为一个片段。",
    "meaning": "整体被缩减为一个片段。",
    "advice": "Consider what the sample leaves out before deciding whether it can represent the whole.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house01.svg"
  },
  {
    "id": "label",
    "name": "LABEL",
    "chineseName": "标签",
    "symbol": "Naming、Labels、Reality",
    "keywords": [
      "Naming",
      "Labels",
      "Reality"
    ],
    "oracle": "THE NAME ECLIPSES THE REAL.",
    "oracleText": "THE NAME ECLIPSES THE REAL.\n名称遮蔽了真实。",
    "meaning": "名称遮蔽了真实。",
    "advice": "Set existing labels aside and observe the people, situations, and details afresh.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house02.svg"
  },
  {
    "id": "match",
    "name": "MATCH",
    "chineseName": "匹配",
    "symbol": "Similarity、Matching、Belonging",
    "keywords": [
      "Similarity",
      "Matching",
      "Belonging"
    ],
    "oracle": "SIMILARITY CREATES BELONGING.",
    "oracleText": "SIMILARITY CREATES BELONGING.\n相似性创造归属。",
    "meaning": "相似性创造归属。",
    "advice": "Notice why you are placed within a group, and leave room for the parts that do not fit.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house03.svg"
  },
  {
    "id": "weight",
    "name": "WEIGHT",
    "chineseName": "权重",
    "symbol": "Emphasis、Weight、Truth",
    "keywords": [
      "Emphasis",
      "Weight",
      "Truth"
    ],
    "oracle": "EMPHASIS RESHAPES TRUTH.",
    "oracleText": "EMPHASIS RESHAPES TRUTH.\n侧重重塑了真相。",
    "meaning": "侧重重塑了真相。",
    "advice": "Check which factors are amplified and which are overlooked, then weigh your judgment again.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house04.svg"
  },
  {
    "id": "probability",
    "name": "PROBABILITY",
    "chineseName": "概率",
    "symbol": "Future、Probability、Possibility",
    "keywords": [
      "Future",
      "Probability",
      "Possibility"
    ],
    "oracle": "THE FUTURE APPEARS AS POSSIBILITY.",
    "oracleText": "THE FUTURE APPEARS AS POSSIBILITY.\n未来以可能性的形式显现。",
    "meaning": "未来以可能性的形式显现。",
    "advice": "Treat a prediction as one possibility, and leave room to prepare and act for other outcomes.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house05.svg"
  },
  {
    "id": "threshold",
    "name": "THRESHOLD",
    "chineseName": "阈值",
    "symbol": "Continuity、Boundaries、Outcomes",
    "keywords": [
      "Continuity",
      "Boundaries",
      "Outcomes"
    ],
    "oracle": "A CONTINUUM BECOMES AN OUTCOME.",
    "oracleText": "A CONTINUUM BECOMES AN OUTCOME.\n连续的变化被划定为一个结果。",
    "meaning": "连续的变化被划定为一个结果。",
    "advice": "Revisit the boundary that decides the outcome. Are the two sides really so different?",
    "edition": "R3",
    "artwork": "assets/cards-r3/house06.svg"
  },
  {
    "id": "ranking",
    "name": "RANKING",
    "chineseName": "排名",
    "symbol": "Position、Ranking、Visibility",
    "keywords": [
      "Position",
      "Ranking",
      "Visibility"
    ],
    "oracle": "POSITION DETERMINES VISIBILITY.",
    "oracleText": "POSITION DETERMINES VISIBILITY.\n位置决定可见性。",
    "meaning": "位置决定可见性。",
    "advice": "Look beyond the ranking and distinguish prominent placement from actual value.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house07.svg"
  },
  {
    "id": "recommendation",
    "name": "RECOMMENDATION",
    "chineseName": "推荐",
    "symbol": "Recommendation、Choice、Preselection",
    "keywords": [
      "Recommendation",
      "Choice",
      "Preselection"
    ],
    "oracle": "CHOICE BEGINS BEFORE ARRIVAL.",
    "oracleText": "CHOICE BEGINS BEFORE ARRIVAL.\n选择在抵达之前就已开始。",
    "meaning": "选择在抵达之前就已开始。",
    "advice": "Ask how these options reached you, then seek out a possibility that was not recommended.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house08.svg"
  },
  {
    "id": "blind-spot",
    "name": "BLIND SPOT",
    "chineseName": "盲点",
    "symbol": "Unseen、Blind Spots、Hidden Influence",
    "keywords": [
      "Unseen",
      "Blind Spots",
      "Hidden Influence"
    ],
    "oracle": "THE UNSEEN CONTINUES TO OPERATE.",
    "oracleText": "THE UNSEEN CONTINUES TO OPERATE.\n未被看见的事物仍在运作。",
    "meaning": "未被看见的事物仍在运作。",
    "advice": "Make room for unseen factors and seek a clue beyond your current perspective.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house09.svg"
  },
  {
    "id": "noise",
    "name": "NOISE",
    "chineseName": "噪声",
    "symbol": "Interpretation、Noise、Silence",
    "keywords": [
      "Interpretation",
      "Noise",
      "Silence"
    ],
    "oracle": "THE UNREADABLE IS RENDERED SILENT.",
    "oracleText": "THE UNREADABLE IS RENDERED SILENT.\n无法被解读的事物被置于沉默。",
    "meaning": "无法被解读的事物被置于沉默。",
    "advice": "Listen again to signals dismissed as noise and consider whether they carry meaning you have yet to understand.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house10.svg"
  },
  {
    "id": "bias",
    "name": "BIAS",
    "chineseName": "偏差",
    "symbol": "Judgment、Center、Displacement",
    "keywords": [
      "Judgment",
      "Center",
      "Displacement"
    ],
    "oracle": "THE CENTER SHIFTS THROUGH JUDGMENT.",
    "oracleText": "THE CENTER SHIFTS THROUGH JUDGMENT.\n中心在判断中发生偏移。",
    "meaning": "中心在判断中发生偏移。",
    "advice": "Examine the same question from another position and notice how judgment shifts what you consider the center.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house11.svg"
  },
  {
    "id": "black-box",
    "name": "BLACK BOX",
    "chineseName": "黑箱",
    "symbol": "Invisibility、Process、Answers",
    "keywords": [
      "Invisibility",
      "Process",
      "Answers"
    ],
    "oracle": "AN ANSWER EMERGES FROM THE INVISIBLE.",
    "oracleText": "AN ANSWER EMERGES FROM THE INVISIBLE.\n答案从不可见之处浮现。",
    "meaning": "答案从不可见之处浮现。",
    "advice": "Before accepting an answer, ask what produced it and which parts of the process remain unseen.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house12.svg"
  },
  {
    "id": "fit",
    "name": "FIT",
    "chineseName": "拟合",
    "symbol": "Past、Fit、Future",
    "keywords": [
      "Past",
      "Fit",
      "Future"
    ],
    "oracle": "THE PAST GIVES SHAPE TO THE FUTURE.",
    "oracleText": "THE PAST GIVES SHAPE TO THE FUTURE.\n过去塑造了未来的形状。",
    "meaning": "过去塑造了未来的形状。",
    "advice": "Identify the past experiences you are relying on and consider whether they still apply to the present situation.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house13.svg"
  },
  {
    "id": "confidence",
    "name": "CONFIDENCE",
    "chineseName": "置信度",
    "symbol": "Certainty、Expression、Performance",
    "keywords": [
      "Certainty",
      "Expression",
      "Performance"
    ],
    "oracle": "CERTAINTY BECOMES A PERFORMANCE.",
    "oracleText": "CERTAINTY BECOMES A PERFORMANCE.\n确定性成为一种表演。",
    "meaning": "确定性成为一种表演。",
    "advice": "Separate a confident presentation from the evidence, and leave unverified claims open to question.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house14.svg"
  },
  {
    "id": "feedback",
    "name": "FEEDBACK",
    "chineseName": "反馈",
    "symbol": "Prediction、Action、Feedback",
    "keywords": [
      "Prediction",
      "Action",
      "Feedback"
    ],
    "oracle": "PREDICTION BECOMES REAL THROUGH ACTION.",
    "oracleText": "PREDICTION BECOMES REAL THROUGH ACTION.\n预测通过行动成为现实。",
    "meaning": "预测通过行动成为现实。",
    "advice": "Notice whether believing a prediction shapes your actions, and how those actions then change the outcome.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house15.svg"
  },
  {
    "id": "exception",
    "name": "EXCEPTION",
    "chineseName": "例外",
    "symbol": "Exceptions、Boundaries、Beyond the System",
    "keywords": [
      "Exceptions",
      "Boundaries",
      "Beyond the System"
    ],
    "oracle": "SOMETHING REMAINS OUTSIDE THE SYSTEM.",
    "oracleText": "SOMETHING REMAINS OUTSIDE THE SYSTEM.\n总有某些事物留在系统之外。",
    "meaning": "总有某些事物留在系统之外。",
    "advice": "Attend to experiences that existing rules cannot contain, and allow them to remain unclassified for now.",
    "edition": "R3",
    "artwork": "assets/cards-r3/house16.svg"
  }
];

const trajectoryLibrary = [
  makeTrajectory("SCA-2 历史轨迹样本 A / Dawn Terminator", "Replaceable sample segment A", "T+0132 至 T+0221", 0.18, 0.78, 0.055, 0.9),
  makeTrajectory("SCA-2 历史轨迹样本 B / High Latitude Echo", "Replaceable sample segment B", "T+0416 至 T+0505", 1.05, 0.62, 0.071, 1.25),
  makeTrajectory("SCA-2 历史轨迹样本 C / Perigee Trace", "Replaceable sample segment C", "T+0788 至 T+0877", 2.14, 0.72, 0.063, 1.7),
  makeTrajectory("SCA-2 历史轨迹样本 D / Nightside Quiet", "Replaceable sample segment D", "T+1094 至 T+1183", 3.02, 0.54, 0.082, 2.35),
  makeTrajectory("SCA-2 历史轨迹样本 E / Equator Crossing", "Replaceable sample segment E", "T+1420 至 T+1509", 4.08, 0.68, 0.067, 2.9)
];

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

window.houseLibrary = houseLibrary;
window.trajectoryLibrary = trajectoryLibrary;
