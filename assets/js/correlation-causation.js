(() => {
  const state = {
    scenario: "confounding",
    data: null,
  };

  const elements = {
    scenario: document.getElementById("scenario"),
    sampleSize: document.getElementById("sampleSize"),
    sampleSizeValue: document.getElementById("sampleSizeValue"),
    noise: document.getElementById("noise"),
    noiseValue: document.getElementById("noiseValue"),
    confoundStrength: document.getElementById("confoundStrength"),
    confoundStrengthValue: document.getElementById("confoundStrengthValue"),
    confoundOutcome: document.getElementById("confoundOutcome"),
    confoundOutcomeValue: document.getElementById("confoundOutcomeValue"),
    directEffect: document.getElementById("directEffect"),
    directEffectValue: document.getElementById("directEffectValue"),
    reverseStrength: document.getElementById("reverseStrength"),
    reverseStrengthValue: document.getElementById("reverseStrengthValue"),
    reverseConfound: document.getElementById("reverseConfound"),
    reverseConfoundValue: document.getElementById("reverseConfoundValue"),
    selectionStrength: document.getElementById("selectionStrength"),
    selectionStrengthValue: document.getElementById("selectionStrengthValue"),
    selectionThreshold: document.getElementById("selectionThreshold"),
    selectionThresholdValue: document.getElementById("selectionThresholdValue"),
    controlZ: document.getElementById("controlZ"),
    conditionSelection: document.getElementById("conditionSelection"),
    generate: document.getElementById("generate"),
    analyze: document.getElementById("analyze"),
    reset: document.getElementById("reset"),
    corrValue: document.getElementById("corrValue"),
    slopeValue: document.getElementById("slopeValue"),
    pValue: document.getElementById("pValue"),
    adjustedRow: document.getElementById("adjustedRow"),
    adjustedSlope: document.getElementById("adjustedSlope"),
    selectionRow: document.getElementById("selectionRow"),
    selectedCount: document.getElementById("selectedCount"),
    scatter: document.getElementById("scatter"),
    scenarioNote: document.getElementById("scenarioNote"),
  };

  const scenarioNotes = {
    confounding:
      "A third variable Z can drive both X and Y, creating a correlation even when X does not directly cause Y. Start with the direct effect set to zero and notice how the slope still looks meaningful. When you toggle control for Z, the adjusted slope for X shrinks toward the true causal effect. This is an educational toy simulation rather than a real-world causal analysis.",
    reverse:
      "Here Y is generated first and then feeds into X. Regressing Y on X can still look persuasive, even though the direction of causality is reversed. This is why temporal ordering and design matter when interpreting correlations. This is an educational toy simulation rather than a real-world causal analysis.",
    collider:
      "X and Y are independent in the full sample, but we only observe cases that pass a selection filter S. Conditioning on S opens a path between X and Y and induces a correlation that is not causal. Compare the full sample with the selected sample to see the collider bias. This is an educational toy simulation rather than a real-world causal analysis.",
  };

  function randn() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  function mean(values) {
    return values.reduce((acc, val) => acc + val, 0) / values.length;
  }

  function variance(values, meanValue) {
    return values.reduce((acc, val) => acc + (val - meanValue) ** 2, 0) / (values.length - 1);
  }

  function covariance(x, y, meanX, meanY) {
    let sum = 0;
    for (let i = 0; i < x.length; i += 1) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }
    return sum / (x.length - 1);
  }

  function corr(x, y) {
    const meanX = mean(x);
    const meanY = mean(y);
    const cov = covariance(x, y, meanX, meanY);
    const sdX = Math.sqrt(variance(x, meanX));
    const sdY = Math.sqrt(variance(y, meanY));
    return cov / (sdX * sdY);
  }

  function simpleRegression(x, y) {
    const meanX = mean(x);
    const meanY = mean(y);
    let sxx = 0;
    let sxy = 0;
    for (let i = 0; i < x.length; i += 1) {
      const dx = x[i] - meanX;
      sxx += dx ** 2;
      sxy += dx * (y[i] - meanY);
    }
    const slope = sxy / sxx;
    const intercept = meanY - slope * meanX;
    let rss = 0;
    for (let i = 0; i < x.length; i += 1) {
      const residual = y[i] - (intercept + slope * x[i]);
      rss += residual ** 2;
    }
    const df = x.length - 2;
    const sigma2 = rss / df;
    const se = Math.sqrt(sigma2 / sxx);
    const t = slope / se;
    return { slope, intercept, t, df };
  }

  function multipleRegression(x, z, y) {
    const meanX = mean(x);
    const meanZ = mean(z);
    const meanY = mean(y);
    let sxx = 0;
    let szz = 0;
    let sxz = 0;
    let sxy = 0;
    let szy = 0;
    for (let i = 0; i < x.length; i += 1) {
      const dx = x[i] - meanX;
      const dz = z[i] - meanZ;
      const dy = y[i] - meanY;
      sxx += dx ** 2;
      szz += dz ** 2;
      sxz += dx * dz;
      sxy += dx * dy;
      szy += dz * dy;
    }
    const denom = sxx * szz - sxz ** 2;
    const betaX = (sxy * szz - szy * sxz) / denom;
    const betaZ = (szy * sxx - sxy * sxz) / denom;
    const intercept = meanY - betaX * meanX - betaZ * meanZ;
    return { betaX, betaZ, intercept };
  }

  function erf(x) {
    const sign = x >= 0 ? 1 : -1;
    const absX = Math.abs(x);
    const t = 1 / (1 + 0.5 * absX);
    const tau =
      t *
      Math.exp(
        -absX * absX -
          1.26551223 +
          t *
            (1.00002368 +
              t *
                (0.37409196 +
                  t *
                    (0.09678418 +
                      t *
                        (-0.18628806 +
                          t *
                            (0.27886807 +
                              t *
                                (-1.13520398 +
                                  t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))))
      );
    return sign * (1 - tau);
  }

  function normalCdf(x) {
    return 0.5 * (1 + erf(x / Math.SQRT2));
  }

  function approximatePValue(t) {
    const p = 2 * (1 - normalCdf(Math.abs(t)));
    return Math.min(Math.max(p, 0), 1);
  }

  function updateOutput(input, output) {
    output.textContent = input.value;
  }

  function updateScenarioVisibility() {
    const scenario = elements.scenario.value;
    state.scenario = scenario;
    document.querySelectorAll("[data-scenario]").forEach((group) => {
      const shouldShow = group.dataset.scenario === scenario;
      group.hidden = !shouldShow;
    });
    elements.adjustedRow.hidden = scenario !== "confounding";
    elements.selectionRow.hidden = scenario !== "collider";
    elements.scenarioNote.textContent = scenarioNotes[scenario];
  }

  function generateData() {
    const n = Number(elements.sampleSize.value);
    const noise = Number(elements.noise.value);
    const data = { x: [], y: [], z: [], s: [] };

    if (state.scenario === "confounding") {
      const a = Number(elements.confoundStrength.value);
      const b = Number(elements.confoundOutcome.value);
      const c = Number(elements.directEffect.value);
      for (let i = 0; i < n; i += 1) {
        const z = randn();
        const x = a * z + noise * randn();
        const y = b * z + c * x + noise * randn();
        data.z.push(z);
        data.x.push(x);
        data.y.push(y);
      }
    }

    if (state.scenario === "reverse") {
      const b = Number(elements.reverseConfound.value);
      const c = Number(elements.reverseStrength.value);
      for (let i = 0; i < n; i += 1) {
        const z = randn();
        const y = b * z + noise * randn();
        const x = c * y + noise * randn();
        data.z.push(z);
        data.x.push(x);
        data.y.push(y);
      }
    }

    if (state.scenario === "collider") {
      const strength = Number(elements.selectionStrength.value);
      const thresholdInput = Number(elements.selectionThreshold.value);
      const threshold = (thresholdInput - 0.5) * 1.5;
      for (let i = 0; i < n; i += 1) {
        const x = randn();
        const y = randn();
        const sScore = strength * (x + y) + noise * randn();
        const s = sScore > threshold ? 1 : 0;
        data.x.push(x);
        data.y.push(y);
        data.s.push(s);
      }
    }

    state.data = data;
  }

  function getAnalysisSample() {
    const { data } = state;
    if (!data) return null;

    if (state.scenario === "collider" && elements.conditionSelection.checked) {
      const x = [];
      const y = [];
      data.x.forEach((value, index) => {
        if (data.s[index] === 1) {
          x.push(value);
          y.push(data.y[index]);
        }
      });
      return { x, y, z: [], selectedCount: x.length };
    }

    return { ...data, selectedCount: data.x.length };
  }

  function drawScatter(x, y) {
    const canvas = elements.scatter;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const margin = 36;
    const plotWidth = width - margin * 2;
    const plotHeight = height - margin * 2;

    const minX = Math.min(...x);
    const maxX = Math.max(...x);
    const minY = Math.min(...y);
    const maxY = Math.max(...y);

    const xRange = maxX - minX || 1;
    const yRange = maxY - minY || 1;

    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();

    ctx.fillStyle = "rgba(31, 91, 143, 0.6)";
    for (let i = 0; i < x.length; i += 1) {
      const px = margin + ((x[i] - minX) / xRange) * plotWidth;
      const py = height - margin - ((y[i] - minY) / yRange) * plotHeight;
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(95, 107, 118, 0.9)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("X", width - margin + 6, height - margin + 4);
    ctx.fillText("Y", margin - 14, margin - 8);
  }

  function runAnalysis() {
    if (!state.data) {
      generateData();
    }
    const sample = getAnalysisSample();
    if (!sample || sample.x.length < 3) {
      elements.corrValue.textContent = "—";
      elements.slopeValue.textContent = "—";
      elements.pValue.textContent = "—";
      elements.adjustedSlope.textContent = "—";
      drawScatter([0], [0]);
      return;
    }

    const r = corr(sample.x, sample.y);
    const regression = simpleRegression(sample.x, sample.y);
    const pValue = approximatePValue(regression.t);

    elements.corrValue.textContent = r.toFixed(3);
    elements.slopeValue.textContent = regression.slope.toFixed(3);
    elements.pValue.textContent = pValue.toFixed(4);

    if (state.scenario === "confounding") {
      if (elements.controlZ.checked) {
        const adjusted = multipleRegression(sample.x, state.data.z, sample.y);
        elements.adjustedSlope.textContent = adjusted.betaX.toFixed(3);
      } else {
        elements.adjustedSlope.textContent = "(toggle to adjust)";
      }
    }

    if (state.scenario === "collider") {
      elements.selectedCount.textContent = `${sample.selectedCount} / ${state.data.x.length}`;
    }

    drawScatter(sample.x, sample.y);
  }

  function resetControls() {
    elements.scenario.value = "confounding";
    elements.sampleSize.value = 1000;
    elements.noise.value = 0.4;
    elements.confoundStrength.value = 0.7;
    elements.confoundOutcome.value = 0.7;
    elements.directEffect.value = 0;
    elements.reverseStrength.value = 0.8;
    elements.reverseConfound.value = 0.4;
    elements.selectionStrength.value = 0.7;
    elements.selectionThreshold.value = 0.5;
    elements.controlZ.checked = false;
    elements.conditionSelection.checked = true;

    updateOutput(elements.sampleSize, elements.sampleSizeValue);
    updateOutput(elements.noise, elements.noiseValue);
    updateOutput(elements.confoundStrength, elements.confoundStrengthValue);
    updateOutput(elements.confoundOutcome, elements.confoundOutcomeValue);
    updateOutput(elements.directEffect, elements.directEffectValue);
    updateOutput(elements.reverseStrength, elements.reverseStrengthValue);
    updateOutput(elements.reverseConfound, elements.reverseConfoundValue);
    updateOutput(elements.selectionStrength, elements.selectionStrengthValue);
    updateOutput(elements.selectionThreshold, elements.selectionThresholdValue);

    updateScenarioVisibility();
    generateData();
    runAnalysis();
  }

  function setupEvents() {
    elements.scenario.addEventListener("change", () => {
      updateScenarioVisibility();
      generateData();
      runAnalysis();
    });

    const inputs = [
      [elements.sampleSize, elements.sampleSizeValue],
      [elements.noise, elements.noiseValue],
      [elements.confoundStrength, elements.confoundStrengthValue],
      [elements.confoundOutcome, elements.confoundOutcomeValue],
      [elements.directEffect, elements.directEffectValue],
      [elements.reverseStrength, elements.reverseStrengthValue],
      [elements.reverseConfound, elements.reverseConfoundValue],
      [elements.selectionStrength, elements.selectionStrengthValue],
      [elements.selectionThreshold, elements.selectionThresholdValue],
    ];

    inputs.forEach(([input, output]) => {
      if (!input) return;
      updateOutput(input, output);
      input.addEventListener("input", () => {
        updateOutput(input, output);
      });
    });

    elements.controlZ.addEventListener("change", runAnalysis);
    elements.conditionSelection.addEventListener("change", runAnalysis);
    elements.generate.addEventListener("click", () => {
      generateData();
      runAnalysis();
    });
    elements.analyze.addEventListener("click", runAnalysis);
    elements.reset.addEventListener("click", resetControls);
  }

  updateScenarioVisibility();
  setupEvents();
  generateData();
  runAnalysis();
})();
