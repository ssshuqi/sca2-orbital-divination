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

export const houseLibrary = [
  {
    id: "xuan",
    name: "玄",
    symbol: "初始暗域、潜伏参数、未被观测的开端",
    oracle: "读数进入暗面。先保持低速观测，答案会从尚未命名的数据边缘显现。"
  },
  {
    id: "sheng",
    name: "升",
    symbol: "轨道抬升、阈值穿越、轻微增益",
    oracle: "此签主上行。适合提高标准，但只提高一档，过量推力会破坏稳定。"
  },
  {
    id: "heng",
    name: "衡",
    symbol: "校准、平衡、测量尺度",
    oracle: "先校准仪器，再判断方向。真正的偏差不在目标，而在读数方法。"
  },
  {
    id: "jing",
    name: "镜",
    symbol: "反照、复核、影像回传",
    oracle: "你看到的是反射，不是本体。把问题换一个角度，它会自己变清。"
  },
  {
    id: "xi",
    name: "息",
    symbol: "静止窗口、低噪声、暂缓",
    oracle: "此刻宜停。短暂停顿不是退却，是为下一段轨道保存清晰度。"
  },
  {
    id: "xi-gap",
    name: "隙",
    symbol: "裂缝、通道、窄门",
    oracle: "可行之路很窄，但确实存在。请缩小问题，沿缝隙进入。"
  },
  {
    id: "hui",
    name: "晦",
    symbol: "遮蔽、低照度、延迟确认",
    oracle: "读数暂暗。不要用想象补齐缺失信息，等待下一次回波。"
  },
  {
    id: "feng",
    name: "逢",
    symbol: "相遇、交会、偶然同步",
    oracle: "两条轨迹短暂相交。请及时发出信号，错过窗口便需再绕一周。"
  },
  {
    id: "huan",
    name: "幻",
    symbol: "假象、模拟、视觉误差",
    oracle: "漂亮的形状未必可靠。先验证显影，再相信图像。"
  },
  {
    id: "mo",
    name: "默",
    symbol: "静默、封存、未发送",
    oracle: "有些答案尚不适合广播。先在内部记录，等噪声下降后再公开。"
  },
  {
    id: "qi",
    name: "歧",
    symbol: "分叉、路线选择、多解",
    oracle: "轨迹分岔。不要同时追逐所有可能，选择一个可验证的方向。"
  },
  {
    id: "chen",
    name: "尘",
    symbol: "残留、碎片、微小扰动",
    oracle: "微尘改变读数。清理边角、命名杂项，主线会随之变轻。"
  },
  {
    id: "lin",
    name: "临",
    symbol: "接近、临界、近距观测",
    oracle: "目标已近。请放慢动作，用最少的动作完成最后一次确认。"
  },
  {
    id: "fan",
    name: "返",
    symbol: "回归、复测、旧轨重访",
    oracle: "返回不是失败。旧轨道上有新证据，回看会节省下一段燃料。"
  },
  {
    id: "zhui",
    name: "坠",
    symbol: "下降、失重、释放负载",
    oracle: "此签示下降。放弃一个过重的设定，系统会重新获得姿态。"
  },
  {
    id: "huan-ring",
    name: "环",
    symbol: "闭合、循环、轨道完成",
    oracle: "路径将闭合。请整理记录，把这次循环转化为下一次的初始条件。"
  }
];

const positiveHouseReadings = [
  {
    oracleText: "暗域中已有第一道信号亮起。你不必一次看清全图，只要愿意进入，新的路径就会在行动中逐渐显形。",
    meaning: "此宿提示新的开端正在形成。尚未被完全观测的部分，不是阻碍，而是邀请你迈出第一步的空间。",
    advice: "先启动一个小行动，用记录回应新的信号。"
  },
  {
    oracleText: "轨道正在缓慢抬升，过去的回声成为向上的推力。你已经积累了经验，现在可以把它转化为更稳的标准。",
    meaning: "此宿象征上行与穿越阈值。它提醒你，已有经历不是负担，而是帮助你靠近更高位置的能量。",
    advice: "回看一个有效经验，并把它升级成今天的做法。"
  },
  {
    oracleText: "仪器回到平衡线，新的入口因此变得可见。先校准节奏，再做选择，你会更清楚哪条路真正适合自己。",
    meaning: "此宿关乎校准、尺度与平衡。它说明机会已经靠近，但需要你用稳定的判断去接住它。",
    advice: "把优先级重新排序，选择一个最清楚的入口。"
  },
  {
    oracleText: "镜面把答案温柔地返照回来。你正在通过另一个角度理解自己，关系与反馈会帮助问题恢复秩序。",
    meaning: "此宿象征反照与复核。外部回应并非评判，而是一面帮助你看见真实需要的镜子。",
    advice: "听取一个可靠反馈，再用自己的节奏修正方向。"
  },
  {
    oracleText: "低噪声窗口打开，内在火种重新变得清晰。安静不是停滞，而是在为下一次创造积蓄更纯净的能量。",
    meaning: "此宿提示暂缓与养息。它鼓励你保护热情，让创造力在更稳定的状态中重新点燃。",
    advice: "给自己一段安静时间，整理能量后再出发。"
  },
  {
    oracleText: "窄门已经显现，光从缝隙处进入。你无需强行突破，只要缩小问题，答案会沿着最清晰的通道靠近。",
    meaning: "此宿象征裂缝与通道。它提醒你，清晰往往来自聚焦，越具体的行动越容易带来明朗。",
    advice: "把问题缩小到一步之内，先完成最可验证的部分。"
  },
  {
    oracleText: "遮蔽正在慢慢退去，分散的线索会重新连接。请给未确认的信息一点时间，它们会在合适的位置相互照亮。",
    meaning: "此宿关乎低照度与延迟确认。暂时的不明朗正在整理资源，帮助你把零散信号组织成方向。",
    advice: "先收集线索，不急着定论，让关系自然成形。"
  },
  {
    oracleText: "两条轨迹在此相逢，行动的窗口已经打开。发出你的信号，实践会带来回应，也会让下一步更踏实。",
    meaning: "此宿象征相遇与交会。它提示你通过移动和尝试获得反馈，机会会在真实互动中变得具体。",
    advice: "主动推进一次沟通或实践，让反馈替你校准方向。"
  },
  {
    oracleText: "幻象并非迷失，而是想象力正在扩展边界。未完成的形状仍有生命，请允许它继续变化，直到新的形式出现。",
    meaning: "此宿对应模拟、视觉与边界。它鼓励你保留创造中的开放状态，不急于把灵感过早固定。",
    advice: "把一个想法做成草图或原型，让它继续生长。"
  },
  {
    oracleText: "静默之处正在蓄力，未发送的答案并没有消失。请靠近自己的内在声音，真正重要的事会在安静中浮现。",
    meaning: "此宿象征封存与内省。它提示你暂时收回注意力，先确认内心的真实需要，再对外回应。",
    advice: "今天少解释一点，多倾听自己真正想守护的事。"
  },
  {
    oracleText: "分岔处已有一束光回应你。机会并非遥远，它正在等待你选择一个方向，然后用持续的小步去验证。",
    meaning: "此宿关乎多解、觉察与开启。它说明可能性已经出现，关键是从其中选出可回应的一条。",
    advice: "选一个最有回声的方向，给它一次明确尝试。"
  },
  {
    oracleText: "微尘落在轨道上，也映出关系的形状。外部世界正在帮助你理解自己，温柔梳理后，主线会变得轻盈。",
    meaning: "此宿象征残留与映照。它提醒你从关系和细节中认识自己，把小扰动转化为更深的理解。",
    advice: "清理一个关系或任务里的小误会，让流动恢复。"
  },
  {
    oracleText: "目标已经接近，概念开始拥有轮廓。请把想法放到可执行的位置，稳定地建构，成果会一点点成形。",
    meaning: "此宿对应临界与近距观测。它提示你已经来到落实阶段，耐心的结构会支持愿望落地。",
    advice: "写下下一步的具体标准，并完成一个可见成果。"
  },
  {
    oracleText: "旧轨道并非回头路，而是通往新阶段的过渡带。你正在适应变化，回看会让前行更有把握。",
    meaning: "此宿象征回归、复测与转换。它提醒你从熟悉处取得新证据，带着理解继续向前。",
    advice: "复盘一个旧经验，带走有用部分，轻装进入新阶段。"
  },
  {
    oracleText: "多余的负载正在释放，重点因此显现。下降不是失去，而是让你更清楚什么值得保留、什么可以放下。",
    meaning: "此宿关乎释放、显现与确认。它帮助你看清核心选择，把能量集中到真正重要的方向。",
    advice: "删去一个不必要的负担，为重要选择留出空间。"
  },
  {
    oracleText: "轨道完成闭合，所有经历正在汇入新的起点。请整理这次循环的收获，带着更完整的自己重新出发。",
    meaning: "此宿象征闭合、整合与完成。它提示你已经获得阶段性的答案，总结会成为下一轮的力量。",
    advice: "记录三个收获，并为下一次出发设定温柔目标。"
  }
];

houseLibrary.forEach((house, index) => {
  house.keywords = house.symbol.split("、");
  Object.assign(house, positiveHouseReadings[index]);
});

export const trajectoryLibrary = [
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
