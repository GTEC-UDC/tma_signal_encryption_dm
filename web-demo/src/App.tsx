"use client";

import { useMemo, useState } from "react";

type Complex = { re: number; im: number };
type Harmonic = 1 | -1;
type Tab = "beamspace" | "security" | "hardware";
type Receiver = "sigma" | "sigmaOffAxis" | "delta" | "eve";

const C0 = 299_792_458;
const TAU = 2 * Math.PI;
const CYAN = "#45e0d3";
const AMBER = "#ffb35c";
const VIOLET = "#9f9bff";
const RED = "#ff7f79";

function expj(phase: number): Complex {
  return { re: Math.cos(phase), im: Math.sin(phase) };
}

function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function scale(a: Complex, value: number): Complex {
  return { re: a.re * value, im: a.im * value };
}

function divide(a: Complex, b: Complex): Complex {
  const denominator = b.re * b.re + b.im * b.im + 1e-14;
  return {
    re: (a.re * b.re + a.im * b.im) / denominator,
    im: (a.im * b.re - a.re * b.im) / denominator,
  };
}

function abs2(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

function mod(value: number, period: number): number {
  return ((value % period) + period) % period;
}

function wrapPhase(value: number): number {
  return mod(value, TAU);
}

function db10(value: number): number {
  return 10 * Math.log10(Math.max(value, 1e-12));
}

function dbToLinear(value: number): number {
  return 10 ** (value / 10);
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-x * x);
  return sign * y;
}

function qpskBer(sinrDb: number): number {
  const gamma = dbToLinear(sinrDb);
  return Math.max(0, 0.5 * (1 - erf(Math.sqrt(gamma))));
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number): number {
  const u = Math.max(random(), 1e-9);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

function formatFrequency(hz: number): string {
  if (Math.abs(hz) >= 1e9) return `${(hz / 1e9).toFixed(6)} GHz`;
  if (Math.abs(hz) >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
  return `${(hz / 1e3).toFixed(1)} kHz`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 1e-3) return `${(seconds * 1e3).toFixed(3)} ms`;
  if (seconds >= 1e-6) return `${(seconds * 1e6).toFixed(3)} µs`;
  return `${(seconds * 1e9).toFixed(2)} ns`;
}

function formatBer(value: number): string {
  if (value < 1e-7) return "< 10⁻⁷";
  if (value < 0.001) return value.toExponential(1);
  return value.toFixed(3);
}

interface Config {
  elements: number;
  spacing: number;
  theta1: number;
  theta2: number;
  fcGHz: number;
  bitRateMbps: number;
  rolloff: number;
  frequencyRatio: number;
  snrDb: number;
  prStates: number;
  zeta: number;
  seed: number;
  delayStepPs: number;
}

interface DelayRow {
  index: number;
  z: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
}

function buildPhaseSequence(seed: number, states: number, length = 96) {
  const random = mulberry32(seed);
  const sigma: number[] = [];
  const delta: number[] = [];
  for (let index = 0; index < length; index += 1) {
    sigma.push((TAU * Math.floor(random() * states)) / states);
    delta.push((TAU * Math.floor(random() * states)) / states);
  }
  return { sigma, delta };
}

function solveDelays(
  config: Config,
  phiSigma: number,
  phiDelta: number,
): DelayRow[] {
  const occupiedBandwidthHz =
    (config.bitRateMbps * 1e6 * (1 + config.rolloff)) / 2;
  const fb = config.frequencyRatio * occupiedBandwidthHz;
  const fa = fb / 2;
  const wa = TAU * fa;
  const wb = TAU * fb;
  const ta = 1 / fa;
  const tb = 1 / fb;
  const quantize = (delay: number) => {
    if (config.delayStepPs <= 0) return delay;
    const step = config.delayStepPs * 1e-12;
    return Math.round(delay / step) * step;
  };

  return Array.from({ length: config.elements }, (_, index) => {
    const z = (index - (config.elements - 1) / 2) * config.spacing;
    const phaseSigma1 = wrapPhase(
      TAU * z * Math.cos((config.theta1 * Math.PI) / 180) - phiSigma,
    );
    const phaseSigma2 = wrapPhase(
      TAU * z * Math.cos((config.theta2 * Math.PI) / 180) - phiSigma,
    );
    const halfPhase = index < config.elements / 2 ? 0 : Math.PI;
    const phaseDelta1 = wrapPhase(
      TAU * z * Math.cos((config.theta1 * Math.PI) / 180) -
        phiDelta -
        halfPhase,
    );
    const phaseDelta2 = wrapPhase(
      TAU * z * Math.cos((config.theta2 * Math.PI) / 180) -
        phiDelta -
        halfPhase,
    );

    return {
      index: index + 1,
      z,
      d1: mod(quantize((phaseSigma1 - phaseSigma2) / (2 * wa)), ta),
      d2: mod(quantize((phaseDelta1 - phaseDelta2) / (2 * wa)), ta),
      d3: mod(quantize((phaseSigma1 + phaseSigma2) / (2 * wb)), tb),
      d4: mod(quantize((phaseDelta1 + phaseDelta2) / (2 * wb)), tb),
    };
  });
}

function arrayFactor(
  theta: number,
  harmonic: Harmonic,
  kind: "sigma" | "delta",
  delays: DelayRow[],
  config: Config,
): Complex {
  const occupiedBandwidthHz =
    (config.bitRateMbps * 1e6 * (1 + config.rolloff)) / 2;
  const fb = config.frequencyRatio * occupiedBandwidthHz;
  const wa = TAU * (fb / 2);
  const wb = TAU * fb;
  const cosTheta = Math.cos((theta * Math.PI) / 180);
  let total: Complex = { re: 0, im: 0 };

  delays.forEach((row) => {
    const delayA = kind === "sigma" ? row.d1 : row.d2;
    const delayB = kind === "sigma" ? row.d3 : row.d4;
    const excitation = expj(-(harmonic * wa * delayA + wb * delayB));
    const spatial = expj(TAU * row.z * cosTheta);
    total = add(total, mul(excitation, spatial));
  });

  return scale(total, 1 / config.elements);
}

interface Series {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
  opacity?: number;
  width?: number;
}

function LineChart({
  angles,
  series,
  yMin,
  yMax,
  markers,
}: {
  angles: number[];
  series: Series[];
  yMin: number;
  yMax: number;
  markers: { angle: number; color: string; label: string }[];
}) {
  const width = 900;
  const height = 330;
  const margin = { left: 62, right: 22, top: 24, bottom: 46 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const x = (angle: number) => margin.left + (angle / 180) * innerWidth;
  const y = (value: number) =>
    margin.top +
    ((yMax - Math.max(yMin, Math.min(yMax, value))) / (yMax - yMin)) *
      innerHeight;
  const xTicks = [0, 30, 60, 90, 120, 150, 180];
  const yTicks = Array.from(
    { length: 6 },
    (_, index) => yMin + ((yMax - yMin) * index) / 5,
  );

  return (
    <div className="chart-shell">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Angular radiation and link-quality chart"
      >
        <title>Angular radiation and link-quality chart</title>
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          rx="10"
          fill="rgba(4, 13, 22, 0.45)"
        />
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgba(164, 194, 211, 0.13)"
              strokeWidth="1"
            />
            <text
              x={margin.left - 12}
              y={y(tick) + 4}
              textAnchor="end"
              className="chart-axis-label"
            >
              {tick.toFixed(0)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={margin.top}
              y2={height - margin.bottom}
              stroke="rgba(164, 194, 211, 0.09)"
              strokeWidth="1"
            />
            <text
              x={x(tick)}
              y={height - 18}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {tick}°
            </text>
          </g>
        ))}
        {markers.map((marker) => (
          <g key={`${marker.label}-${marker.angle}`}>
            <line
              x1={x(marker.angle)}
              x2={x(marker.angle)}
              y1={margin.top}
              y2={height - margin.bottom}
              stroke={marker.color}
              strokeOpacity="0.65"
              strokeDasharray="4 5"
            />
            <text
              x={x(marker.angle) + 5}
              y={margin.top + 14}
              fill={marker.color}
              className="chart-marker-label"
            >
              {marker.label}
            </text>
          </g>
        ))}
        {series.map((line) => {
          const path = line.values
            .map(
              (value, index) =>
                `${index === 0 ? "M" : "L"}${x(angles[index]).toFixed(2)},${y(value).toFixed(2)}`,
            )
            .join(" ");
          return (
            <path
              key={line.label}
              d={path}
              fill="none"
              stroke={line.color}
              strokeWidth={line.width ?? 2.4}
              strokeOpacity={line.opacity ?? 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={line.dashed ? "7 6" : undefined}
            />
          );
        })}
        <text
          x={18}
          y={margin.top + innerHeight / 2}
          transform={`rotate(-90 18 ${margin.top + innerHeight / 2})`}
          textAnchor="middle"
          className="chart-axis-title"
        >
          dB
        </text>
        <text
          x={margin.left + innerWidth / 2}
          y={height - 2}
          textAnchor="middle"
          className="chart-axis-title"
        >
          Elevation angle θ
        </text>
      </svg>
      <div className="chart-legend">
        {series.map((line) => (
          <span key={line.label}>
            <i
              style={{
                backgroundColor: line.color,
                opacity: line.opacity ?? (line.dashed ? 0.65 : 1),
              }}
            />
            {line.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  digits = 0,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  digits?: number;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-control">
      <span className="range-label">
        <span>{label}</span>
        <strong>
          {value.toFixed(digits)}{unit ? ` ${unit}` : ""}
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ "--range-fill": `${percentage}%` } as React.CSSProperties}
      />
      <span className="range-bounds">
        <span>{min}</span>
        <span>{max}</span>
      </span>
    </label>
  );
}

function ArraySchematic({
  elements,
  theta1,
  theta2,
}: {
  elements: number;
  theta1: number;
  theta2: number;
}) {
  const width = 850;
  const height = 370;
  const origin = { x: 570, y: 185 };
  const ray = (theta: number, length: number) => ({
    x: origin.x + Math.sin((theta * Math.PI) / 180) * length,
    y: origin.y - Math.cos((theta * Math.PI) / 180) * length,
  });
  const p1 = ray(theta1, 170);
  const p2 = ray(theta2, 170);
  const highlightedIndex = Math.floor((elements - 1) / 2);
  const highlightedY = 48 + (highlightedIndex / (elements - 1)) * 274;
  const labelY = (value: number) => Math.max(20, Math.min(height - 14, value));
  return (
    <svg
      className="array-schematic"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Nth-element time-modulation feed architecture and linear array with two independently steered beams"
    >
      <title>Nth-element feed architecture and independently steered dual-beam array</title>
      <defs>
        <filter id="cyanGlow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowCyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={CYAN} />
        </marker>
        <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={AMBER} />
        </marker>
        <marker id="signalArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#9fc0ce" />
        </marker>
      </defs>
      <g className="feed-cell">
        <text x="20" y="25" className="feed-heading">n-th element architecture · Fig. 1(b)</text>
        <text x="18" y="190" className="feed-input">s(t)</text>
        <line x1="49" y1="185" x2="70" y2="185" className="feed-line" markerEnd="url(#signalArrow)" />
        <circle cx="84" cy="185" r="12" className="feed-symbol" />
        <text x="84" y="189" textAnchor="middle" className="feed-symbol-text">S</text>
        <text x="84" y="211" textAnchor="middle" className="feed-note">split</text>

        <path d="M 96 185 H 108 V 112 H 124" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="128" y="92" width="82" height="40" rx="5" className="feed-block" />
        <text x="169" y="108" textAnchor="middle" className="feed-block-label">× a(t)</text>
        <text x="169" y="123" textAnchor="middle" className="feed-block-sub">delay Dₙ¹</text>
        <line x1="210" y1="112" x2="236" y2="112" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="240" y="92" width="82" height="40" rx="5" className="feed-block" />
        <text x="281" y="108" textAnchor="middle" className="feed-block-label">× b(t)</text>
        <text x="281" y="123" textAnchor="middle" className="feed-block-sub">delay Dₙ³</text>
        <line x1="322" y1="112" x2="348" y2="112" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="352" y="94" width="52" height="36" rx="5" className="feed-gain" />
        <text x="378" y="116" textAnchor="middle" className="feed-block-label">1/√2</text>

        <path d="M 96 185 H 108 V 258 H 124" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="128" y="238" width="82" height="40" rx="5" className="feed-block" />
        <text x="169" y="254" textAnchor="middle" className="feed-block-label">× a(t)</text>
        <text x="169" y="269" textAnchor="middle" className="feed-block-sub">delay Dₙ²</text>
        <line x1="210" y1="258" x2="236" y2="258" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="240" y="238" width="82" height="40" rx="5" className="feed-block" />
        <text x="281" y="254" textAnchor="middle" className="feed-block-label">× b(t)</text>
        <text x="281" y="269" textAnchor="middle" className="feed-block-sub">delay Dₙ⁴</text>
        <line x1="322" y1="258" x2="348" y2="258" className="feed-line" markerEnd="url(#signalArrow)" />
        <rect x="352" y="240" width="52" height="36" rx="5" className="feed-gain" />
        <text x="378" y="262" textAnchor="middle" className="feed-block-label">1/√2</text>

        <path d="M 404 112 H 428 V 177 H 443" className="feed-line" markerEnd="url(#signalArrow)" />
        <path d="M 404 258 H 428 V 193 H 443" className="feed-line" markerEnd="url(#signalArrow)" />
        <circle cx="458" cy="185" r="14" className="feed-symbol combiner" />
        <text x="458" y="190" textAnchor="middle" className="feed-symbol-text">Σ</text>
        <line x1="472" y1="185" x2={origin.x - 12} y2={highlightedY} className="feed-line output" markerEnd="url(#signalArrow)" />
        <text x="493" y="174" className="feed-note">hₙ(t)</text>

        <rect x="149" y="311" width="206" height="38" rx="5" className="feed-controller" />
        <text x="252" y="326" textAnchor="middle" className="feed-controller-title">PR delay controller</text>
        <text x="252" y="341" textAnchor="middle" className="feed-block-sub">Dₙ¹ · Dₙ² · Dₙ³ · Dₙ⁴</text>
        <path d="M 252 311 V 292 H 169 M 252 292 H 281" className="feed-control-line" />
      </g>
      {[45, 90, 135].map((angle) => {
        const end = ray(angle, 212);
        return <line key={angle} x1={origin.x} y1={origin.y} x2={end.x} y2={end.y} stroke="rgba(161, 196, 215, 0.10)" />;
      })}
      <line x1={origin.x} y1={origin.y} x2={p1.x} y2={p1.y} stroke={CYAN} strokeWidth="5" strokeOpacity="0.8" markerEnd="url(#arrowCyan)" filter="url(#cyanGlow)" />
      <line x1={origin.x} y1={origin.y} x2={p2.x} y2={p2.y} stroke={AMBER} strokeWidth="5" strokeOpacity="0.85" markerEnd="url(#arrowAmber)" />
      <line x1={origin.x} x2={origin.x} y1="36" y2="334" stroke="rgba(180, 210, 225, 0.28)" strokeWidth="2" />
      {Array.from({ length: elements }, (_, index) => {
        const y = 48 + (index / (elements - 1)) * 274;
        const active = index === highlightedIndex;
        return (
          <g key={index}>
            <line x1={origin.x - 8} x2={origin.x + 8} y1={y} y2={y} stroke={active ? CYAN : "#cde6f2"} strokeWidth={active ? 3 : 2} />
            <circle cx={origin.x} cy={y} r={active ? 5 : 3} fill={active ? CYAN : "#eaf7fc"} className={active ? "array-element-active" : undefined} />
            {active && <text x={origin.x - 18} y={y + 4} textAnchor="end" className="active-element-label">element n</text>}
          </g>
        );
      })}
      <text x={width - 15} y="25" textAnchor="end" className="schematic-caption">z-axis · 2N = {elements} isotropic elements</text>
      <text x={p1.x + 10} y={labelY(p1.y)} fill={CYAN} className="beam-label">ω¹,¹ · θ₁ = {theta1}°</text>
      <text x={p2.x + 10} y={labelY(p2.y)} fill={AMBER} className="beam-label">ω⁻¹,¹ · θ₂ = {theta2}°</text>
      <text x="675" y="351" className="schematic-caption">Independent dominant-harmonic steering</text>
    </svg>
  );
}

function HarmonicSpectrum({ faMHz, fbMHz }: { faMHz: number; fbMHz: number }) {
  const harmonics = [-7, -5, -3, -1, 1, 3, 5, 7];
  return (
    <div className="spectrum" role="img" aria-label="Ideal harmonic spectrum">
      <div className="spectrum-grid" />
      {harmonics.map((index) => {
        const level = -20 * Math.log10(Math.abs(index));
        const useful = Math.abs(index) === 1;
        const offset = index * faMHz + fbMHz;
        const height = Math.max(8, 82 + level * 2.1);
        return (
          <div className="spectral-line" key={index}>
            <span className={useful ? "bar useful" : "bar"} style={{ height: `${height}px` }} />
            <strong>{index > 0 ? `+${index}` : index}</strong>
            <small>{offset >= 0 ? "+" : ""}{offset.toFixed(2)} MHz</small>
          </div>
        );
      })}
      <div className="spectrum-floor">−40 dB</div>
      <div className="spectrum-zero">0 dB</div>
    </div>
  );
}

function Constellation({ title, subtitle, points, accent }: { title: string; subtitle: string; points: Complex[]; accent: string }) {
  const width = 320;
  const height = 286;
  const center = { x: 160, y: 143 };
  const span = 2.05;
  const px = (value: number) => center.x + (value / span) * 126;
  const py = (value: number) => center.y - (value / span) * 126;
  return (
    <div className="constellation-card">
      <div className="constellation-title">
        <span><strong>{title}</strong><small>{subtitle}</small></span>
        <i style={{ backgroundColor: accent }} />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <title>{title}</title>
        {[0.5, 1, 1.5].map((radius) => <circle key={radius} cx={center.x} cy={center.y} r={(radius / span) * 126} fill="none" stroke="rgba(161, 196, 215, 0.09)" />)}
        <line x1="28" x2="292" y1={center.y} y2={center.y} stroke="rgba(177, 207, 222, 0.22)" />
        <line x1={center.x} x2={center.x} y1="12" y2="274" stroke="rgba(177, 207, 222, 0.22)" />
        {[
          { re: 1 / Math.sqrt(2), im: 1 / Math.sqrt(2) },
          { re: 1 / Math.sqrt(2), im: -1 / Math.sqrt(2) },
          { re: -1 / Math.sqrt(2), im: 1 / Math.sqrt(2) },
          { re: -1 / Math.sqrt(2), im: -1 / Math.sqrt(2) },
        ].map((point, index) => (
          <path key={index} d={`M ${px(point.re) - 6} ${py(point.im)} L ${px(point.re) + 6} ${py(point.im)} M ${px(point.re)} ${py(point.im) - 6} L ${px(point.re)} ${py(point.im) + 6}`} stroke="rgba(238, 249, 252, 0.30)" strokeWidth="1" />
        ))}
        {points.map((point, index) => <circle key={index} cx={px(Math.max(-span, Math.min(span, point.re)))} cy={py(Math.max(-span, Math.min(span, point.im)))} r="2.35" fill={accent} fillOpacity="0.56" />)}
        <text x="288" y={center.y - 7} className="chart-axis-label">I</text>
        <text x={center.x + 7} y="19" className="chart-axis-label">Q</text>
      </svg>
    </div>
  );
}

function Metric({ label, value, note, tone = "neutral" }: { label: string; value: string; note: string; tone?: "neutral" | "cyan" | "amber" | "violet" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span><strong>{value}</strong><small>{note}</small>
    </div>
  );
}

export default function Home() {
  const isPortable =
    typeof document !== "undefined" &&
    document.documentElement.dataset.distribution === "portable";
  const [tab, setTab] = useState<Tab>("beamspace");
  const [harmonic, setHarmonic] = useState<Harmonic>(1);
  const [receiver, setReceiver] = useState<Receiver>("sigma");
  const [elements, setElements] = useState(20);
  const [spacing, setSpacing] = useState(0.5);
  const [theta1, setTheta1] = useState(110);
  const [theta2, setTheta2] = useState(60);
  const [fcGHz, setFcGHz] = useState(2.4);
  const [bitRateMbps, setBitRateMbps] = useState(2);
  const [rolloff, setRolloff] = useState(0.25);
  const [frequencyRatio, setFrequencyRatio] = useState(1.6);
  const [snrDb, setSnrDb] = useState(25);
  const [prStates, setPrStates] = useState(50);
  const [zeta, setZeta] = useState(2);
  const [seed, setSeed] = useState(2606);
  const [delayStepPs, setDelayStepPs] = useState(0);
  const [syncError, setSyncError] = useState(0);
  const [frame, setFrame] = useState(0);
  const [probeAngle, setProbeAngle] = useState(110);
  const [chartMode, setChartMode] = useState<"pattern" | "link">("pattern");

  const config: Config = useMemo(
    () => ({
      elements,
      spacing,
      theta1,
      theta2,
      fcGHz,
      bitRateMbps,
      rolloff,
      frequencyRatio,
      snrDb,
      prStates,
      zeta,
      seed,
      delayStepPs,
    }),
    [
      elements,
      spacing,
      theta1,
      theta2,
      fcGHz,
      bitRateMbps,
      rolloff,
      frequencyRatio,
      snrDb,
      prStates,
      zeta,
      seed,
      delayStepPs,
    ],
  );
  const phases = useMemo(() => buildPhaseSequence(seed, prStates), [seed, prStates]);
  const phiSigma = phases.sigma[frame % phases.sigma.length];
  const phiDelta = phases.delta[frame % phases.delta.length];

  const simulation = useMemo(() => {
    const angles = Array.from({ length: 361 }, (_, index) => index / 2);
    const delays = solveDelays(config, phiSigma, phiDelta);
    const noise = dbToLinear(-snrDb);

    const evaluateHarmonic = (which: Harmonic) => {
      const sigma: Complex[] = [];
      const delta: Complex[] = [];
      const sigmaDb: number[] = [];
      const deltaDb: number[] = [];
      const sinrSigmaDb: number[] = [];
      const sinrDeltaDb: number[] = [];

      angles.forEach((angle) => {
        const sumValue = arrayFactor(angle, which, "sigma", delays, config);
        const diffValue = arrayFactor(angle, which, "delta", delays, config);
        const pSigma = abs2(sumValue);
        const pDelta = abs2(diffValue);
        sigma.push(sumValue);
        delta.push(diffValue);
        sigmaDb.push(Math.max(-50, db10(pSigma)));
        deltaDb.push(Math.max(-50, db10(pDelta)));
        sinrSigmaDb.push(
          Math.max(-30, Math.min(35, db10(pSigma / (pDelta + noise)))),
        );
        sinrDeltaDb.push(
          Math.max(-30, Math.min(35, db10(pDelta / (pSigma + noise)))),
        );
      });

      return { sigma, delta, sigmaDb, deltaDb, sinrSigmaDb, sinrDeltaDb };
    };

    const plus = evaluateHarmonic(1);
    const minus = evaluateHarmonic(-1);
    const selected = harmonic === 1 ? plus : minus;

    const target = harmonic === 1 ? theta1 : theta2;
    const targetIndex = Math.round(target * 2);
    const bobSinr = selected.sinrSigmaDb[targetIndex];
    let eveIndex = 0;
    let deltaIndex = 0;
    angles.forEach((angle, index) => {
      if (
        Math.abs(angle - target) > 8 &&
        selected.sinrSigmaDb[index] > selected.sinrSigmaDb[eveIndex]
      ) {
        eveIndex = index;
      }
      if (selected.sinrDeltaDb[index] > selected.sinrDeltaDb[deltaIndex]) {
        deltaIndex = index;
      }
    });
    const eveSinr = selected.sinrSigmaDb[eveIndex];
    const authorizedDeltaSinr = selected.sinrDeltaDb[deltaIndex];
    const secrecyCapacity = Math.max(0, Math.log2(1 + dbToLinear(bobSinr)) - Math.log2(1 + dbToLinear(eveSinr)));

    return {
      angles,
      delays,
      plus,
      minus,
      ...selected,
      bobSinr,
      eveSinr,
      eveAngle: angles[eveIndex],
      deltaAngle: angles[deltaIndex],
      authorizedDeltaSinr,
      secrecyCapacity,
    };
  }, [config, harmonic, phiSigma, phiDelta, snrDb, theta1, theta2]);

  const signal = useMemo(() => {
    const bandwidthHz = (bitRateMbps * 1e6 * (1 + rolloff)) / 2;
    const fb = frequencyRatio * bandwidthHz;
    const fa = fb / 2;
    const fc = fcGHz * 1e9;
    const wavelength = C0 / fc;
    const tprSeconds = zeta / fb;
    return {
      bandwidthHz,
      fa,
      fb,
      plus: fc + fa + fb,
      minus: fc - fa + fb,
      tprSeconds,
      wavelength,
      apertureM: (elements - 1) * spacing * wavelength,
      guardRatio: fb / bandwidthHz,
    };
  }, [bitRateMbps, rolloff, frequencyRatio, zeta, fcGHz, elements, spacing]);

  const constellation = useMemo(() => {
    const random = mulberry32(seed + Math.round(probeAngle * 10) + harmonic * 97);
    const phaseSequence = buildPhaseSequence(seed + 13, prStates, 181);
    const noisePower = dbToLinear(-snrDb);
    const noiseSigma = Math.sqrt(noisePower / 2);
    const raw: Complex[] = [];
    const decoded: Complex[] = [];
    const syncFraction = syncError / 100;

    for (let index = 0; index < 180; index += 1) {
      const phiS = phaseSequence.sigma[index];
      const phiD = phaseSequence.delta[index];
      const nextS = phaseSequence.sigma[index + 1];
      const nextD = phaseSequence.delta[index + 1];
      const delays = solveDelays(config, phiS, phiD);
      const sumChannel = arrayFactor(probeAngle, harmonic, "sigma", delays, config);
      const diffChannel = arrayFactor(probeAngle, harmonic, "delta", delays, config);
      const symbols = [{ re: 1, im: 1 }, { re: 1, im: -1 }, { re: -1, im: 1 }, { re: -1, im: -1 }];
      const symbol = scale(symbols[Math.floor(random() * 4)], 1 / Math.sqrt(2));
      const channel = add(sumChannel, diffChannel);
      const received = add(mul(symbol, channel), { re: noiseSigma * gaussian(random), im: noiseSigma * gaussian(random) });
      const rawScale = Math.max(0.12, Math.sqrt(abs2(channel) + noisePower));
      raw.push(scale(received, 1 / rawScale));

      if (receiver === "eve") {
        decoded.push(scale(received, 1 / rawScale));
      } else {
        const sigmaReceiver = receiver === "sigma" || receiver === "sigmaOffAxis";
        const selectedChannel = sigmaReceiver ? sumChannel : diffChannel;
        const currentPhase = sigmaReceiver ? phiS : phiD;
        const nextPhase = sigmaReceiver ? nextS : nextD;
        let phaseDifference = nextPhase - currentPhase;
        while (phaseDifference > Math.PI) phaseDifference -= TAU;
        while (phaseDifference < -Math.PI) phaseDifference += TAU;
        const mismatched = random() < syncFraction;
        decoded.push(
          divide(
            received,
            mul(selectedChannel, expj(mismatched ? phaseDifference : 0)),
          ),
        );
      }
    }
    return { raw, decoded };
  }, [config, harmonic, prStates, probeAngle, receiver, seed, snrDb, syncError]);

  const setPaperPreset = () => {
    setElements(20);
    setSpacing(0.5);
    setTheta1(110);
    setTheta2(60);
    setFcGHz(2.4);
    setBitRateMbps(2);
    setRolloff(0.25);
    setFrequencyRatio(1.6);
    setSnrDb(25);
    setPrStates(50);
    setZeta(2);
    setDelayStepPs(0);
    setSyncError(0);
    setProbeAngle(110);
    setReceiver("sigma");
    setFrame(0);
  };

  const selectReceiver = (next: Receiver) => {
    setReceiver(next);
    if (next === "sigma") setProbeAngle(harmonic === 1 ? theta1 : theta2);
    else if (next === "sigmaOffAxis") setProbeAngle(simulation.eveAngle);
    else if (next === "delta") setProbeAngle(simulation.deltaAngle);
    else setProbeAngle(simulation.eveAngle);
  };

  const downloadCsv = () => {
    const header = "theta_deg,sum_pattern_db,difference_pattern_db,sigma_sinr_db,delta_sinr_db\n";
    const rows = simulation.angles.map((angle, index) => `${angle.toFixed(1)},${simulation.sigmaDb[index].toFixed(5)},${simulation.deltaDb[index].toFixed(5)},${simulation.sinrSigmaDb[index].toFixed(5)},${simulation.sinrDeltaDb[index].toFixed(5)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `encrypted-dm-tma-${harmonic === 1 ? "omega-1-1" : "omega-minus-1-1"}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  const downloadScenario = () => {
    const payload = {
      model: "Signal-encrypting DM-TMA demonstrator · paper analytical model",
      paper: "Time-Modulated Arrays with Signal Encryption for Enhanced Directional Modulation Security",
      generatedAt: new Date().toISOString(),
      harmonic: harmonic === 1 ? "(+1, +1)" : "(-1, +1)",
      parameters: config,
      derived: { occupiedBandwidthHz: signal.bandwidthHz, faHz: signal.fa, fbHz: signal.fb, fbToBandwidthRatio: signal.guardRatio, usefulHarmonicPlusHz: signal.plus, usefulHarmonicMinusHz: signal.minus, tprSeconds: signal.tprSeconds, apertureM: signal.apertureM },
      metrics: { bobSinrDb: simulation.bobSinr, worstCaseEveSinrDb: simulation.eveSinr, worstCaseEveAngleDeg: simulation.eveAngle, authorizedDeltaSinrDb: simulation.authorizedDeltaSinr, authorizedDeltaAngleDeg: simulation.deltaAngle, secrecyCapacityBitsPerSecondPerHz: simulation.secrecyCapacity },
      assumptions: ["uniformly excited isotropic elements", "ideal RF switches except optional delay quantization", "array-factor model without mutual coupling or RF losses", "coherent QPSK receiver synchronized to the pseudorandom key"],
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "encrypted-dm-tma-scenario.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  const activeTarget = harmonic === 1 ? theta1 : theta2;
  const currentProbeIndex = Math.round(probeAngle * 2);
  const probeSigmaSinr = simulation.sinrSigmaDb[currentProbeIndex];
  const probeDeltaSinr = simulation.sinrDeltaDb[currentProbeIndex];
  const currentReceiverSinr = receiver === "delta" ? probeDeltaSinr : receiver === "eve" ? simulation.eveSinr : probeSigmaSinr;
  const syncFraction = syncError / 100;
  const effectiveSinrLinear =
    receiver === "eve"
      ? 1
      : 1 / (1 / dbToLinear(currentReceiverSinr) + 2 * syncFraction);
  const effectiveSinrDb = db10(effectiveSinrLinear);
  const currentBer = qpskBer(effectiveSinrDb);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Signal-encrypting DM-TMA demonstrator home">
          <span className="brand-array" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>
          <span><strong>ENCRYPTED DM-TMA</strong><small>Paper technology demonstrator</small></span>
        </a>
        <div className="topbar-status"><span><i /> {isPortable ? "OFFLINE MODEL" : "LIVE MODEL"}</span><span>v1.0 · paper model</span></div>
      </header>

      <section className="intro" id="top">
        <div>
          <p className="eyebrow">Interactive analytical companion · draft paper</p>
          <h1>Time-Modulated Arrays with Signal Encryption for Enhanced Directional Modulation Security</h1>
          <p className="intro-copy">Explore the paper's independently steerable dual-beam TMA: two dominant harmonics, complementary Σ/Δ patterns, pseudorandom delay updates, keyed coherent recovery and authorized off-axis reception.</p>
          <p className="paper-authors">Roberto Maneiro-Catoira · Julio Brégains · José A. García-Naya · Luis Castedo</p>
        </div>
        <div className="intro-actions">
          <button className="button button-primary" onClick={downloadCsv}>Export angular data</button>
          <button className="button button-quiet" onClick={downloadScenario}>Save scenario</button>
        </div>
      </section>

      <section className="mission-strip" aria-label="Derived system quantities">
        <div><span>Occupied bandwidth B<sub>f</sub></span><strong>{(signal.bandwidthHz / 1e6).toFixed(2)} MHz</strong><small>R<sub>b</sub>(1 + α) / 2</small></div>
        <div><span>Dominant harmonic ω<sup>−1,1</sup></span><strong>{formatFrequency(signal.minus)}</strong><small>f<sub>c</sub> − f<sub>a</sub> + f<sub>b</sub></small></div>
        <div><span>Dominant harmonic ω<sup>1,1</sup></span><strong>{formatFrequency(signal.plus)}</strong><small>f<sub>c</sub> + f<sub>a</sub> + f<sub>b</sub></small></div>
        <div><span>Delay update T<sub>PR</sub></span><strong>{formatDuration(signal.tprSeconds)}</strong><small>ζT<sub>b</sub> · ζ = {zeta}</small></div>
        <div className="efficiency-cell"><span>Time-modulation efficiency</span><strong>66%</strong><small>P<sup>±1,1</sup> / P<sup>all</sup></small></div>
      </section>

      <div className="workspace">
        <aside className="control-rail">
          <div className="control-heading">
            <div><p className="eyebrow">Paper parameters</p><h2>Explore the model</h2></div>
            <button className="icon-button" onClick={setPaperPreset} title="Reset to paper benchmark" aria-label="Reset to paper benchmark">↺</button>
          </div>
          <div className="preset-row single" aria-label="Scenario preset"><button onClick={setPaperPreset}>Restore paper benchmark</button></div>

          <details open>
            <summary>Array & beams</summary>
            <div className="control-group">
              <RangeControl label="Elements (2N)" value={elements} min={8} max={40} step={2} onChange={setElements} />
              <RangeControl label="Spacing" value={spacing} min={0.25} max={0.75} step={0.01} unit="λ" digits={2} onChange={setSpacing} />
              <RangeControl label="f₊ beam θ₁" value={theta1} min={10} max={170} step={1} unit="°" onChange={setTheta1} />
              <RangeControl label="f₋ beam θ₂" value={theta2} min={10} max={170} step={1} unit="°" onChange={setTheta2} />
            </div>
          </details>
          <details open>
            <summary>Signal</summary>
            <div className="control-group">
              <RangeControl label="Carrier" value={fcGHz} min={1} max={12} step={0.05} unit="GHz" digits={2} onChange={setFcGHz} />
              <RangeControl label="QPSK bit rate" value={bitRateMbps} min={0.5} max={20} step={0.5} unit="Mbit/s" digits={1} onChange={setBitRateMbps} />
              <RangeControl label="RRC roll-off" value={rolloff} min={0} max={0.5} step={0.05} digits={2} onChange={setRolloff} />
              <RangeControl label="Spectral spacing fᵦ / Bf" value={frequencyRatio} min={1.1} max={2.5} step={0.1} digits={1} onChange={setFrequencyRatio} />
              <RangeControl label="Update factor ζ" value={zeta} min={1} max={8} step={1} onChange={setZeta} />
              <RangeControl label="Peak SNR" value={snrDb} min={5} max={35} step={1} unit="dB" onChange={setSnrDb} />
            </div>
          </details>
          <details>
            <summary>Hardware realism</summary>
            <div className="control-group">
              <RangeControl label="Delay resolution" value={delayStepPs} min={0} max={250} step={25} unit="ps" onChange={setDelayStepPs} />
              <p className="control-note">The paper assumes ideal switches and continuous delays. A nonzero value applies optional delay quantization to Dₙ¹…Dₙ⁴.</p>
            </div>
          </details>
          <div className="model-boundary"><span>MODEL BOUNDARY</span><p>Paper-level array-factor model with uniformly excited isotropic elements, ideal switches and a coherent synchronized receiver. Mutual coupling, RF losses and switch nonidealities are outside its scope.</p></div>
        </aside>

        <section className="results" aria-label="TMA simulation results">
          <nav className="tabs" aria-label="Demonstrator views">
            <button className={tab === "beamspace" ? "active" : ""} onClick={() => setTab("beamspace")}><span>01</span> Beams & spectrum</button>
            <button className={tab === "security" ? "active" : ""} onClick={() => setTab("security")}><span>02</span> Encrypted link</button>
            <button className={tab === "hardware" ? "active" : ""} onClick={() => setTab("hardware")}><span>03</span> Delay synthesis</button>
          </nav>

          {tab === "beamspace" && (
            <div className="view-stack">
              <section className="panel beam-overview">
                <div className="panel-heading split-heading">
                  <div><p className="eyebrow">Equations (7)–(13) · dominant harmonics</p><h2>Two independently steerable encrypted beams</h2><p>The cyan ω¹,¹ family is steered only by θ₁; the amber ω⁻¹,¹ family is steered only by θ₂. In each family, the Σ pattern peaks at the commanded angle while the complementary Δ pattern places a boresight null there.</p></div>
                  <div className="segmented" aria-label="Select useful harmonic">
                    <button className={harmonic === -1 ? "active amber" : ""} onClick={() => setHarmonic(-1)}>ω⁻¹,¹ · θ₂</button>
                    <button className={harmonic === 1 ? "active" : ""} onClick={() => setHarmonic(1)}>ω¹,¹ · θ₁</button>
                  </div>
                </div>
                <div className="beam-grid">
                  <ArraySchematic elements={elements} theta1={theta1} theta2={theta2} />
                  <div className="beam-facts">
                    <div><span>Selected harmonic</span><strong>{harmonic === 1 ? "ω¹,¹" : "ω⁻¹,¹"}</strong><small>{formatFrequency(harmonic === 1 ? signal.plus : signal.minus)}</small></div>
                    <div><span>Commanded pointing</span><strong>{activeTarget}°</strong><small>continuous-delay steering law</small></div>
                    <div><span>Physical aperture</span><strong>{(signal.apertureM * 100).toFixed(1)} cm</strong><small>{((elements - 1) * spacing).toFixed(2)} λc end-to-end</small></div>
                  </div>
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading split-heading compact">
                  <div><p className="eyebrow">Angular response</p><h2>{chartMode === "pattern" ? "Normalized spatial patterns" : "Recoverability by angle"}</h2></div>
                  <div className="segmented small" aria-label="Select chart metric"><button className={chartMode === "pattern" ? "active" : ""} onClick={() => setChartMode("pattern")}>Pattern</button><button className={chartMode === "link" ? "active" : ""} onClick={() => setChartMode("link")}>SINR</button></div>
                </div>
                <LineChart
                  angles={simulation.angles}
                  series={chartMode === "pattern" ? [
                    { label: "ω¹,¹ Σ · θ₁", color: CYAN, values: simulation.plus.sigmaDb, width: harmonic === 1 ? 2.8 : 2.2, opacity: harmonic === 1 ? 1 : 0.72 },
                    { label: "ω¹,¹ Δ · θ₁ null", color: CYAN, values: simulation.plus.deltaDb, dashed: true, width: 1.5, opacity: 0.46 },
                    { label: "ω⁻¹,¹ Σ · θ₂", color: AMBER, values: simulation.minus.sigmaDb, width: harmonic === -1 ? 2.8 : 2.2, opacity: harmonic === -1 ? 1 : 0.72 },
                    { label: "ω⁻¹,¹ Δ · θ₂ null", color: AMBER, values: simulation.minus.deltaDb, dashed: true, width: 1.5, opacity: 0.46 },
                  ] : [
                    { label: "ω¹,¹ Σ-key SINR · θ₁", color: CYAN, values: simulation.plus.sinrSigmaDb, width: harmonic === 1 ? 2.8 : 2.2, opacity: harmonic === 1 ? 1 : 0.72 },
                    { label: "ω⁻¹,¹ Σ-key SINR · θ₂", color: AMBER, values: simulation.minus.sinrSigmaDb, width: harmonic === -1 ? 2.8 : 2.2, opacity: harmonic === -1 ? 1 : 0.72 },
                  ]}
                  yMin={chartMode === "pattern" ? -50 : -30}
                  yMax={chartMode === "pattern" ? 0 : 35}
                  markers={[
                    { angle: theta1, color: CYAN, label: "θ₁" },
                    { angle: theta2, color: AMBER, label: "θ₂" },
                    { angle: simulation.eveAngle, color: RED, label: "Eve*" },
                  ]}
                />
                <p className="chart-footnote">Solid curves are the independently steered Σ patterns; dashed curves are the corresponding Δ patterns with boresight nulls. The harmonic selector changes only the detailed link metrics. * The strongest unintended point is evaluated outside an ±8° main-beam sector.</p>
              </section>

              <div className="metric-grid">
                <Metric label="Intended-direction SINR γᵦ" value={`${simulation.bobSinr.toFixed(1)} dB`} note={`Σ-key recovery at ${activeTarget}°`} tone="cyan" />
                <Metric label="Strongest unintended SINR γₑ" value={`${simulation.eveSinr.toFixed(1)} dB`} note={`${(simulation.bobSinr - simulation.eveSinr).toFixed(1)} dB angular contrast`} tone="amber" />
                <Metric label="Secrecy capacity Cₛ" value={`${simulation.secrecyCapacity.toFixed(2)} bit/s/Hz`} note="paper benchmark ≈ 6.5 bit/s/Hz" tone="violet" />
              </div>

              <section className="panel spectrum-panel">
                <div className="panel-heading"><p className="eyebrow">Selected pulses · Fig. 2 · q = 1 slice</p><h2>Separated dominant replicas</h2><p>f<sub>b</sub> = 2f<sub>a</sub> = {(signal.fb / 1e6).toFixed(2)} MHz = {signal.guardRatio.toFixed(1)}B<sub>f</sub>, above the 1.1B<sub>f</sub> guard-band requirement. The nearest |i| = 3 component is 9.54 dB below |i| = 1.</p></div>
                <HarmonicSpectrum faMHz={signal.fa / 1e6} fbMHz={signal.fb / 1e6} />
                <div className="spectrum-facts"><span><strong>{signal.guardRatio.toFixed(1)}B<sub>f</sub></strong> replica spacing</span><span><strong>−9.54 dB</strong> nearest unused harmonic</span><span><strong>−26.4 dB</strong> strongest degenerate component</span></div>
                <div className="efficiency-note"><div className="donut" aria-label="66 percent useful harmonic power"><span>66<small>%</small></span></div><p><strong>Transmission time-modulation efficiency</strong>The two desired harmonics contain 66% of the ideal radiated harmonic power. At reception, the effective value is halved because only one complementary Σ or Δ contribution is recovered.</p></div>
              </section>
            </div>
          )}

          {tab === "security" && (
            <div className="view-stack">
              <section className="panel security-controls">
                <div className="panel-heading split-heading">
                  <div><p className="eyebrow">Figure 4 · coherent QPSK recovery</p><h2>Test the key and the observation angle</h2><p>Compare intended Σ reception, the paper's strongest off-axis Σ case with the correct key, an authorized Δ window and reception without a key.</p></div>
                  <div className="security-badge"><span>PR state #{frame + 1}</span><button onClick={() => setFrame((frame + 1) % 96)}>Next key state →</button></div>
                </div>
                <div className="receiver-row" role="group" aria-label="Receiver preset">
                  <button className={receiver === "sigma" ? "active" : ""} onClick={() => selectReceiver("sigma")}><i style={{ background: CYAN }} /><span><strong>Intended · Σ key</strong><small>Fig. 4(a)</small></span></button>
                  <button className={receiver === "sigmaOffAxis" ? "active" : ""} onClick={() => selectReceiver("sigmaOffAxis")}><i style={{ background: VIOLET }} /><span><strong>Off-axis · Σ key</strong><small>Fig. 4(b) stress case</small></span></button>
                  <button className={receiver === "delta" ? "active" : ""} onClick={() => selectReceiver("delta")}><i style={{ background: AMBER }} /><span><strong>Authorized · Δ key</strong><small>off-axis recovery</small></span></button>
                  <button className={receiver === "eve" ? "active danger" : ""} onClick={() => selectReceiver("eve")}><i style={{ background: RED }} /><span><strong>No key</strong><small>encrypted waveform</small></span></button>
                </div>
                <div className="security-sliders">
                  <RangeControl label="Probe angle" value={probeAngle} min={0} max={180} step={0.5} unit="°" digits={1} onChange={setProbeAngle} />
                  <RangeControl label="PR phase states M" value={prStates} min={2} max={100} step={1} onChange={setPrStates} />
                  <RangeControl label="Timing mismatch" value={syncError} min={0} max={100} step={2} unit="% TPR" onChange={setSyncError} />
                  <label className="number-control"><span>PR seed</span><input type="number" value={seed} min={1} max={999999} onChange={(event) => setSeed(Number(event.target.value) || 1)} /></label>
                </div>
              </section>

              <div className="metric-grid security-metrics">
                <Metric label="Probe Σ-key SINR" value={`${probeSigmaSinr.toFixed(1)} dB`} note={`sum stream at ${probeAngle.toFixed(1)}°`} tone="cyan" />
                <Metric label="Probe Δ-key SINR" value={`${probeDeltaSinr.toFixed(1)} dB`} note={`difference stream at ${probeAngle.toFixed(1)}°`} tone="amber" />
                <Metric label="Selected-receiver BER" value={receiver === "eve" ? "≈ 0.5" : formatBer(currentBer)} note={receiver === "eve" ? "pseudorandom phase sequence unavailable" : `${effectiveSinrDb.toFixed(1)} dB effective SINR incl. timing`} tone="violet" />
              </div>

              <section className="panel constellation-panel">
                <div className="panel-heading"><p className="eyebrow">180 deterministic QPSK observations</p><h2>Scrambled before key processing; coherent only where permitted</h2><p>The left panel shows received samples before descrambling. The right panel applies the selected key and timing hypothesis; in the Fig. 4(b) case, spatial Σ/Δ interference still prevents clean recovery despite the correct key.</p></div>
                <div className="constellation-grid">
                  <Constellation title="Before descrambling" subtitle={`${probeAngle.toFixed(1)}° · Σ and Δ superposition`} points={constellation.raw} accent={VIOLET} />
                  <Constellation title={receiver === "eve" ? "No coherent recovery" : "After keyed recovery"} subtitle={receiver === "eve" ? "PR sequence unavailable" : `${receiver === "delta" ? "Δ" : "Σ"} key · ${syncError}% TPR mismatch`} points={constellation.decoded} accent={receiver === "delta" ? AMBER : receiver === "eve" ? RED : CYAN} />
                </div>
                <div className="interpretation"><span>INTERPRETATION</span><p>
                  {receiver === "sigma" && `At ${probeAngle.toFixed(1)}°, the Σ-key receiver removes its pseudorandom phase. Recovery is cleanest at the ${activeTarget}° sum-pattern maximum, where the Δ pattern has its designed null.`}
                  {receiver === "sigmaOffAxis" && `At ${probeAngle.toFixed(1)}°, the receiver knows the correct Σ key, but the Δ contribution dominates the spatial interference. As in Fig. 4(b), descrambling alone cannot recover a clean constellation.`}
                  {receiver === "delta" && `The Δ-key receiver exploits a spatial window around ${simulation.deltaAngle.toFixed(1)}°. It demonstrates authorized recovery outside the conventional directional-modulation beam.`}
                  {receiver === "eve" && `Without the PR sequence, phase states remain randomized even at the strongest unintended direction (${simulation.eveAngle.toFixed(1)}°). The BER indicator is therefore treated as random guessing.`}
                </p></div>
              </section>

              <section className="panel timing-panel">
                <div className="timing-copy"><p className="eyebrow">Synchronization sensitivity · Section IV-C</p><h2>Mismatch degrades gradually</h2><p>The paper gives P<sub>res</sub>/P<sub>useful</sub> = 2Δt/T<sub>PR</sub>. The constellation applies the adjacent key state to the corresponding fraction of samples, while the BER estimate includes the same residual-power law.</p><strong className="timing-ratio">P<sub>res</sub>/P<sub>useful</sub> = {(2 * syncFraction).toFixed(2)}</strong></div>
                <div className="timing-rail">{Array.from({ length: 17 }, (_, index) => <i key={index} className={index === frame % 17 ? "current" : ""} style={{ backgroundColor: phases.sigma[index] === phases.delta[index] ? VIOLET : CYAN }} />)}<span className="timing-window" style={{ width: `${Math.max(2, syncError)}%` }} /></div>
              </section>
            </div>
          )}

          {tab === "hardware" && (
            <div className="view-stack">
              <section className="panel architecture-panel">
                <div className="panel-heading"><p className="eyebrow">Figure 1 · Equation (2)</p><h2>Switched BFN and n-th element architecture</h2><p>The generic pre-modulated input s(t) is distributed to 2N cells. In every cell, four delays control the Σ and Δ phases at both dominant harmonics.</p></div>
                <div className="architecture-flow">
                  <div className="flow-node input-node"><span>RF INPUT</span><strong>s(t)</strong><small>pre-modulated QPSK</small></div><span className="flow-arrow">→</span>
                  <div className="flow-node"><span>DISTRIBUTION</span><strong>1 : 2N</strong><small>uniform excitation</small></div><span className="flow-arrow">→</span>
                  <div className="cell-bank"><div className="cell-controller"><span>PR CONTROLLER</span><strong>θ₁ · θ₂ · φΣ · φΔ</strong><small>M = {prStates} · update every {formatDuration(signal.tprSeconds)}</small></div><div className="flow-node active-node"><span>CELL n × {elements}</span><strong>a(t) · b(t)</strong><small>Dₙ¹ · Dₙ² · Dₙ³ · Dₙ⁴</small></div></div><span className="flow-arrow">→</span>
                  <div className="flow-node output-node"><span>RADIATION</span><strong>ω⁻¹,¹ + ω¹,¹</strong><small>Σ / Δ per harmonic</small></div>
                </div>
                <div className="equation-strip"><code>hₙ(t) = 1/√2 · a(t−Dₙ¹)b(t−Dₙ³) + 1/√2 · a(t−Dₙ²)b(t−Dₙ⁴)</code><code>F(θ,t) = eʲωᶜᵗ Σₙ hₙ(t)eʲᵝᶜᶻⁿᶜᵒˢᶿ</code></div>
              </section>

              <section className="panel delay-panel">
                <div className="panel-heading split-heading compact">
                  <div><p className="eyebrow">Equations (8) and (10) · one modulo-period solution</p><h2>Instrumental delays · PR state #{frame + 1}</h2><p>Dₙ¹/Dₙ³ synthesize the Σ patterns; Dₙ²/Dₙ⁴ synthesize the Δ patterns. Values are wrapped into T<sub>a</sub> and T<sub>b</sub>, then optionally quantized.</p></div>
                  <button className="button button-quiet" onClick={() => setFrame((frame + 1) % 96)}>Recompute PR state</button>
                </div>
                <div className="delay-summary"><span>φ<sub>Σ</sub> = {(phiSigma * 180 / Math.PI).toFixed(0)}°</span><span>φ<sub>Δ</sub> = {(phiDelta * 180 / Math.PI).toFixed(0)}°</span><span>T<sub>a</sub> = {(1e9 / signal.fa).toFixed(1)} ns</span><span>T<sub>b</sub> = {(1e9 / signal.fb).toFixed(1)} ns</span></div>
                <div className="table-wrap">
                  <table><thead><tr><th>Element n</th><th>zₙ / λc</th><th>Dₙ¹ (ns)</th><th>Dₙ² (ns)</th><th>Dₙ³ (ns)</th><th>Dₙ⁴ (ns)</th></tr></thead>
                    <tbody>{simulation.delays.map((row) => <tr key={row.index}><td>{String(row.index).padStart(2, "0")}</td><td>{row.z.toFixed(3)}</td><td>{(row.d1 * 1e9).toFixed(3)}</td><td>{(row.d2 * 1e9).toFixed(3)}</td><td>{(row.d3 * 1e9).toFixed(3)}</td><td>{(row.d4 * 1e9).toFixed(3)}</td></tr>)}</tbody>
                  </table>
                </div>
              </section>

              <section className="panel roadmap-panel">
                <div className="panel-heading"><p className="eyebrow">Paper traceability</p><h2>From architecture to numerical evidence</h2></div>
                <div className="roadmap">
                  <div className="roadmap-step complete"><span>EQ. (1)–(6)</span><strong>TMA structure</strong><p>2N isotropic elements, periodic a(t)/b(t) modulation and Σ/Δ decomposition.</p></div>
                  <div className="roadmap-step complete"><span>EQ. (8)–(11)</span><strong>Delay synthesis</strong><p>Independent steering of ω¹,¹ and ω⁻¹,¹ with maxima and complementary nulls.</p></div>
                  <div className="roadmap-step complete"><span>EQ. (12)–(13)</span><strong>Signal encryption</strong><p>Independent pseudorandom phases φΣ and φΔ with keyed coherent recovery.</p></div>
                  <div className="roadmap-step complete"><span>FIG. 3–4</span><strong>Numerical evidence</strong><p>Angular SINR/BER, QPSK constellations, 21 dB contrast and Cₛ ≈ 6.5 bit/s/Hz.</p></div>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>

      <footer>
        <div><strong>Signal-Encrypting DM-TMA Demonstrator</strong><span>Interactive companion to “Time-Modulated Arrays with Signal Encryption for Enhanced Directional Modulation Security”.</span></div>
        <p>Paper baseline: 2N = 20, f<sub>c</sub> = 2.4 GHz, R<sub>b</sub> = 2 Mbit/s, α = 0.25, M = 50, θ₁ = 110°, θ₂ = 60°, SNR = 25 dB.</p>
      </footer>
    </main>
  );
}

export { abs2, arrayFactor, buildPhaseSequence, solveDelays };
