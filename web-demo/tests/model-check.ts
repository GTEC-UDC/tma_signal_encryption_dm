import assert from "node:assert/strict";
import {
  abs2,
  arrayFactor,
  buildPhaseSequence,
  qpskBer,
  solveDelays,
  timingResidual,
} from "../src/App";

const config = {
  elements: 20,
  spacing: 0.5,
  theta1: 110,
  theta2: 60,
  fcGHz: 2.4,
  bitRateMbps: 2,
  rolloff: 0.25,
  frequencyRatio: 1.6,
  snrDb: 25,
  prStates: 64,
  zeta: 2,
  seed: 2606,
  delayStepPs: 0,
};

function evaluate(which: 1 | -1, theta1 = 110, theta2 = 60) {
  const current = { ...config, theta1, theta2 };
  const phases = buildPhaseSequence(current.seed, current.prStates);
  const delays = solveDelays(current, phases.sigma[0], phases.delta[0]);
  const noise = 10 ** (-current.snrDb / 10);
  const angles = Array.from({ length: 361 }, (_, index) => index / 2);
  const sigmaPower = angles.map((angle) =>
    abs2(arrayFactor(angle, which, "sigma", delays, current)),
  );
  const deltaPower = angles.map((angle) =>
    abs2(arrayFactor(angle, which, "delta", delays, current)),
  );
  const sigmaSinrDb = sigmaPower.map((power, index) =>
    10 * Math.log10(power / (deltaPower[index] + noise)),
  );
  const target = which === 1 ? theta1 : theta2;
  const targetIndex = Math.round(target * 2);
  let eveIndex = 0;
  angles.forEach((angle, index) => {
    if (
      Math.abs(angle - target) > 8 &&
      sigmaSinrDb[index] > sigmaSinrDb[eveIndex]
    ) {
      eveIndex = index;
    }
  });
  const bobSinrDb = sigmaSinrDb[targetIndex];
  const eveSinrDb = sigmaSinrDb[eveIndex];
  const secrecyCapacity = Math.max(
    0,
    Math.log2(1 + 10 ** (bobSinrDb / 10)) -
      Math.log2(1 + 10 ** (eveSinrDb / 10)),
  );
  const maxSigmaIndex = sigmaPower.indexOf(Math.max(...sigmaPower));
  return {
    angles,
    sigmaPower,
    deltaPower,
    bobSinrDb,
    eveSinrDb,
    eveAngleDeg: angles[eveIndex],
    secrecyCapacity,
    sigmaPeakDeg: angles[maxSigmaIndex],
    deltaAtTarget: deltaPower[targetIndex],
  };
}

const plus = evaluate(1);
const minus = evaluate(-1);
assert.ok(Math.abs(plus.sigmaPeakDeg - 110) <= 0.5);
assert.ok(Math.abs(minus.sigmaPeakDeg - 60) <= 0.5);
assert.ok(plus.deltaAtTarget < 1e-12);
assert.ok(minus.deltaAtTarget < 1e-12);
assert.ok(Math.abs(plus.bobSinrDb - 25) < 0.1);
assert.ok(plus.eveSinrDb > 3 && plus.eveSinrDb < 6);
assert.ok(plus.bobSinrDb - plus.eveSinrDb > 19);
assert.ok(plus.secrecyCapacity > 6.2 && plus.secrecyCapacity < 6.7);

const steeredPlus = evaluate(1, 125, 60);
const preservedMinus = evaluate(-1, 125, 60);
assert.ok(Math.abs(steeredPlus.sigmaPeakDeg - 125) <= 0.5);
assert.ok(Math.abs(preservedMinus.sigmaPeakDeg - 60) <= 0.5);

const occupiedBandwidthHz =
  (config.bitRateMbps * 1e6 * (1 + config.rolloff)) / 2;
const fb = config.frequencyRatio * occupiedBandwidthHz;
const fa = fb / 2;
const tpr = config.zeta / fb;
assert.equal(occupiedBandwidthHz, 1.25e6);
assert.equal(fa, 1e6);
assert.equal(fb, 2e6);
assert.equal(tpr, 1e-6);

// Timing offset of the descrambling sequence (paper, Section IV-C).
const symbolPeriod = 2 / (config.bitRateMbps * 1e6);
const aligned = timingResidual(0.05, tpr, symbolPeriod);
assert.ok(aligned.aligned);
assert.ok(Math.abs(aligned.beforeMf - 0.1) < 1e-12);
assert.ok(Math.abs(aligned.afterMf - 0.0025) < 1e-12);
const misaligned = timingResidual(0.05, 2 * tpr, symbolPeriod);
assert.ok(!misaligned.aligned);
assert.equal(misaligned.afterMf, misaligned.beforeMf);
const effectiveDb = -10 * Math.log10(10 ** (-25 / 10) + aligned.afterMf);
assert.ok(Math.abs(effectiveDb - 22.47) < 0.01);

// BER convention of Fig. 3(b): 0.5 erfc(sqrt(gamma)).
assert.ok(Math.abs(qpskBer(4.47) - 8.9e-3) < 0.3e-3);
assert.ok(qpskBer(11.87) > 1e-8 && qpskBer(11.87) < 2e-8);

// Phase alphabet of the paper.
for (const phase of buildPhaseSequence(2606, 64).sigma) {
  const k = (phase * 64) / (2 * Math.PI);
  assert.ok(Math.abs(k - Math.round(k)) < 1e-9 && k >= 0 && k < 64);
}

console.log(
  JSON.stringify(
    {
      plus: {
        peakDeg: plus.sigmaPeakDeg,
        bobSinrDb: plus.bobSinrDb,
        eveSinrDb: plus.eveSinrDb,
        eveAngleDeg: plus.eveAngleDeg,
        contrastDb: plus.bobSinrDb - plus.eveSinrDb,
        secrecyCapacity: plus.secrecyCapacity,
      },
      minus: { peakDeg: minus.sigmaPeakDeg },
      derived: {
        occupiedBandwidthHz,
        fa,
        fb,
        tpr,
        omegaMinusHz: 2.4e9 - fa + fb,
        omegaPlusHz: 2.4e9 + fa + fb,
      },
    },
    null,
    2,
  ),
);
