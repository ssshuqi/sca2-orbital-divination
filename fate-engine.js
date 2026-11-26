(function exposeFateEngine(root) {
  "use strict";

  function hashString(input) {
    let hash = 2166136261;

    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  function mulberry32(initialSeed) {
    let seed = initialSeed >>> 0;

    return function random() {
      let value = (seed += 0x6d2b79f5);
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createFateSeed(input) {
    const orbitalData = input.orbitalData
      ? JSON.stringify(input.orbitalData)
      : "none";
    const raw = [
      input.timestamp,
      Number(input.performanceTime || 0).toFixed(3),
      Number(input.rotation || 0).toFixed(6),
      Number(input.interactionEntropy || 0).toFixed(4),
      Number(input.drawCount ?? input.syncCount ?? 0),
      orbitalData
    ].join(":");

    return hashString(raw);
  }

  function calculateFateFromSeed(seed, count) {
    const resultCount = Math.max(1, Number(count) || 16);
    return Math.floor(mulberry32(seed)() * resultCount);
  }

  function calculateFate(input) {
    const count = Math.max(1, Number(input.count) || 16);
    let seed = createFateSeed(input);
    let random = mulberry32(seed);
    let fateIndex = Math.floor(random() * count);

    if (count > 1 && fateIndex === input.lastFateIndex) {
      for (let attempt = 0; fateIndex === input.lastFateIndex; attempt += 1) {
        seed = hashString(`${seed}:anti-repeat:${input.drawCount ?? input.syncCount ?? 0}:${attempt}`);
        random = mulberry32(seed);
        fateIndex = Math.floor(random() * count);
      }
    }

    return {
      seed,
      fateIndex,
      alignmentValue: random(),
      trajectoryValue: random(),
      pointValue: random(),
      extraTurns: 3 + Math.floor(random() * 3),
      timestamp: input.timestamp
    };
  }

  const api = {
    hashString,
    mulberry32,
    createFateSeed,
    calculateFate,
    calculateFateFromSeed
  };

  root.FateEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
