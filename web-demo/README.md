# Signal-Encrypting DM-TMA Demonstrator

An interactive, offline analytical demonstrator of independently steerable
dual-beam time-modulated arrays (TMAs), complementary sum/difference patterns,
pseudorandom phase scrambling and keyed coherent QPSK reception.

Companion to the paper **“Time-Modulated Arrays with Signal Encryption
for Enhanced Directional Modulation Security”**, by Roberto Maneiro-Catoira,
Julio Brégains, José A. García-Naya and Luis Castedo, submitted to the
*IEEE Antennas and Wireless Propagation Letters*.

This folder of the [repository](../README.md) contains the complete editable
application source, its build and verification scripts, and a ready-to-run
browser build of version 1.0, which is also published at
<https://gtec-udc.github.io/tma_signal_encryption_dm/>. The user tutorial is in
[`../docs/TUTORIAL.md`](../docs/TUTORIAL.md); this document is the developer
reference.
All numerical calculations run in the browser. No account, server, API key,
external service or internet connection is required to use the built application.

## Run immediately

1. Use the [online version](https://gtec-udc.github.io/tma_signal_encryption_dm/), or download and
   extract the complete repository archive (or clone the repository).
2. Open **`index.html` in this `web-demo` folder** in a modern browser.
3. Start with **Restore paper benchmark**, then explore the three tabs.

This `index.html` uses a classic JavaScript bundle and relative local resources;
it supports direct `file://` opening. Keep `app.js`, `styles.css`, `favicon.svg`
and the other distribution files together. Opening `public/index.html` is not
a substitute: `public/` contains build templates, not a complete distribution.

VS Code with **Open with Live Server** on this `index.html` is an optional
alternative. Node.js and npm are needed only for source development and rebuilding.

## What the demonstrator includes

- Independently steered cyan `(+1,+1)` and amber `(-1,+1)` harmonic families.
- Normalized sum (Σ) and difference (Δ) array factors and angular SINR.
- Intended-link, unintended-link and secrecy-capacity indicators.
- Deterministic scrambled and recovered QPSK constellations.
- Four receiver presets, timing mismatch and pseudorandom phase controls.
- The feeding architecture of the n-th element and all four instrumental delays.
- An illustrative harmonic spectrum and the paper's reference efficiency figures.
- Local CSV export of angular results and JSON export of scenario metadata.

## Folder contents

| File or directory | Purpose |
| --- | --- |
| `index.html` | Ready-to-run entry point; double-click this file. |
| `app.js` | Generated production bundle: application, React, React DOM and Scheduler. |
| `styles.css` | Generated responsive stylesheet. |
| `favicon.svg` | Local vector icon. |
| `data/model-info.json` | Descriptive model metadata and reference benchmark; not loaded as live configuration. |
| `MANIFEST.json` | Sizes and SHA-256 hashes of the runtime distribution files. |
| `src/App.tsx` | Complete readable interface, numerical model, SVG plots and export handlers. |
| `src/main.tsx` | Browser bootstrap: creates the React root and renders the application. |
| `src/styles.css` | Editable stylesheet; contains the complete application styling. |
| `public/` | Templates copied to this folder during a build: HTML, icon, metadata and Spanish quick start. |
| `scripts/build.mjs` | Cross-platform production build and integrity-manifest generator. |
| `scripts/dev.mjs` | Local development server with automatic source and CSS rebuilding. |
| `scripts/test.mjs` | Compiles and runs the numerical and offline-package checks. |
| `scripts/package.mjs` | Creates an offline runtime ZIP using Node built-ins. |
| `tests/model-check.ts` | Numerical benchmark and independent beam-steering checks. |
| `tests/package-check.mjs` | Offline assets, paper metadata and manifest-integrity checks. |
| `package.json`, `package-lock.json` | Development commands and pinned dependency versions. |
| `tsconfig.json` | TypeScript configuration. |
| `THIRD_PARTY_NOTICES.md`, `licenses/`, `app.js.LEGAL.txt` | Notices for libraries included in the browser bundle. |
| `.gitignore` | Exclusions for dependencies and build output (line endings are set by `../.gitattributes`). |

The source export preserves the application logic from the tested web edition.
The development toolchain is reduced to React, TypeScript and esbuild; the
application has no hosting-platform, database or server framework dependency.

## Develop and rebuild

Use Node.js **22.13.0 or newer** and npm. Run these commands in this `web-demo` folder:

```sh
npm ci
npm run build
npm test
```

`npm ci` downloads the pinned development dependencies and normally requires
internet access. Once dependencies are installed, building and testing run locally.
The generated browser application remains independent of Node.js and npm.

| Command | Action |
| --- | --- |
| `npm run dev` | Serves a development build at `http://127.0.0.1:5173`. |
| `npm run build` | Regenerates the browser files of this folder and `MANIFEST.json`. |
| `npm run build:standalone` | Alias for `npm run build`. |
| `npm run typecheck` | Checks application and numerical-test TypeScript without emitting files. |
| `npm test` | Type-checks, checks the numerical benchmark, and validates the current distribution. |
| `npm run package` | Builds, runs the checks, and writes `release/TMA_Signal_Encryption_Demonstrator_Web_v1.0.zip`. |

During `npm run dev`, edit files under `src/` and refresh the browser after a
rebuild. Restart the server after changing templates under `public/`. Press
Ctrl+C to stop it. The development server uses `.dev/` and does not replace
the production bundle. Port 5173 must be available.

Edit `src/App.tsx` for model or interface changes and `src/styles.css` for styling.
Edit `public/index.html`, `public/favicon.svg` or
`public/data/model-info.json` for template and metadata changes. The JSON file
documents the model; editing it alone does not change the simulation defaults,
which are initialized in `Home()` inside `src/App.tsx`.

After changing sources, run `npm run build` and `npm test`, and commit both the
editable files and the regenerated `index.html`, `app.js`, `styles.css`,
`MANIFEST.json` and related files. GitHub Pages serves this folder directly
from the `main` branch, so the published demonstrator is updated on the next
push. Direct edits to the generated
`app.js` or `styles.css` are overwritten by the next build.

`npm test` checks the currently generated files; it does not rebuild them first.
The package command performs the full sequence. Manifest timestamps may change
on rebuilding even when the application source is unchanged.

## Interface and controls

### Shared sidebar

| Control label | Default | Range / increment | Meaning and use |
| --- | --- | --- | --- |
| Elements (2N) | 20 | 8–40 / 2 | Total number of isotropic array elements; changes aperture, beamwidth and sidelobes. |
| Spacing | 0.50 λ | 0.25–0.75 / 0.01 λ | Adjacent-element spacing normalized to the carrier wavelength. |
| f₊ beam θ₁ | 110° | 10–170° / 1° | Steering angle of the cyan `(+1,+1)` family. |
| f₋ beam θ₂ | 60° | 10–170° / 1° | Steering angle of the amber `(-1,+1)` family. |
| Carrier | 2.40 GHz | 1–12 / 0.05 GHz | Carrier frequency; determines wavelength, physical aperture and RF harmonic frequencies. |
| QPSK bit rate | 2.0 Mbit/s | 0.5–20 / 0.5 Mbit/s | Bit rate used to derive occupied bandwidth and switching frequencies. |
| RRC roll-off | 0.25 | 0–0.50 / 0.05 | Roll-off parameter used in the occupied-bandwidth formula. |
| Spectral spacing fᵦ / Bf | 1.6 | 1.1–2.5 / 0.1 | Ratio of switching frequency `fb` to occupied bandwidth; adjusts replica separation. |
| Update factor ζ | 2 | 1–8 / 1 | Sets the PR update interval `TPR = ζ/fb`. |
| Peak SNR | 25 dB | 5–35 / 1 dB | Noise reference for unit normalized sum-pattern power. |
| Delay resolution | 0 ps | 0–250 / 25 ps | Optional instrumental-delay quantization; zero means continuous delays. |

Angles are measured from the array axis: **90° is broadside**. Changing the
carrier at fixed normalized spacing changes physical dimensions, but does not
change the ideal normalized array-factor geometry.

**Restore paper benchmark** and the ↺ button restore the physical-model and
receiver defaults, set the probe to 110°, and return to PR frame 0. In version
1.0 they retain the current PR seed, selected harmonic, active tab and chart
mode. For the original fully reproducible starting state, also set seed 2606
and select `ω¹,¹ · θ₁`.

The sidebar section headers expand or collapse their controls. Collapsing a
section does not disable its parameters.

### 01 — Beams & spectrum

Both harmonic families are calculated and plotted simultaneously. Continuous
curves represent Σ patterns; dashed curves represent Δ patterns, whose designed
nulls coincide with the corresponding Σ steering directions. The two pointing
arrows are straight radial directions.

- **ω⁻¹,¹ · θ₂ / ω¹,¹ · θ₁:** select the harmonic used for the detailed link
  metrics, receiver calculations, delay-independent frequency readout and exports.
  Both beam families remain visible. The selection persists across tabs.
- **Pattern / SINR:** switch between normalized spatial powers and Σ-key SINR
  curves. The selection does not change the synthesized delays.
- **Eve\*:** marks the strongest unintended Σ-key point for the selected harmonic,
  sampled outside the ±8° sector around its intended direction.

The spectrum shows the `q = 1` slice at odd indices `i = ±1, ±3, ±5, ±7`, with
offsets `i·fa + fb` and levels `−20 log10(|i|)` relative to the useful `|i|=1`
components. The 66% transmission efficiency, −9.54 dB nearest-unused-component
level and −26.4 dB degenerate-component reference are explanatory paper values;
this panel is not an FFT of a simulated switched RF waveform.

### 02 — Encrypted link

| Control | Default / range | Effect |
| --- | --- | --- |
| Intended · Σ key | Initial receiver preset | Selects Σ recovery and moves the probe to the active harmonic's intended direction. |
| Off-axis · Σ key | Preset | Selects the correct Σ key at the strongest unintended direction; demonstrates spatial interference despite key knowledge. |
| Authorized · Δ key | Preset | Selects Δ recovery and moves the probe to the largest sampled Δ-key SINR. |
| No key | Preset | Leaves the waveform scrambled and uses a random-guess BER indicator. |
| Probe angle | 110°; 0–180° / 0.5° | Observation direction for constellations and receiver metrics; can be adjusted after a preset. |
| PR phase states M | 50; 2–100 / 1 | Number of uniformly spaced possible PR phase values on the complex unit circle. |
| Timing mismatch | 0%; 0–100% / 2% TPR | Fractional key timing error used in the residual-power law and constellation illustration. |
| PR seed | 2606; displayed numeric bounds 1–999999 | Seed for reproducible phase and noise sequences. |
| Next key state → | 96-state cyclic sequence | Advances the delay-table PR frame; shared with the Delay synthesis tab. |

`M` counts phase values, not generated frames. The display uses a deterministic
96-frame delay sequence. The constellation uses 180 deterministic QPSK samples
and a separate 181-state phase sequence seeded with `seed + 13`.

Advancing the displayed PR frame changes the current instrumental delays and
frame labels. It does not regenerate the constellation as a single-frame
snapshot: that plot already spans many PR states. Changing the seed or other
constellation inputs does regenerate the deterministic sample set.

The numeric seed field displays HTML bounds; its change handler converts the
entry to a number and substitutes 1 for an empty/zero value. It does not apply
an additional explicit range clamp. Enter an integer within the displayed range.

### 03 — Delay synthesis

The feeding diagram shows two parallel branches:

$$
h_n(t)=\frac{a(t-D_n^1)b(t-D_n^3)}{\sqrt{2}}
       +\frac{a(t-D_n^2)b(t-D_n^4)}{\sqrt{2}}.
$$

`D1/D3` synthesize Σ; `D2/D4` synthesize Δ. The table contains one solution per
element, with positions in carrier wavelengths and delays in nanoseconds.
**Recompute PR state** advances the same 96-frame sequence as **Next key state**.

## Numerical model and source map

The calculation and rendering are intentionally preserved together in
`src/App.tsx`, allowing the delivered application to remain directly traceable
to the tested version. The following functions provide useful entry points:

| Function or component | Responsibility |
| --- | --- |
| `expj`, `add`, `mul`, `scale`, `divide`, `abs2` | Complex-number arithmetic. |
| `mod`, `wrapPhase`, `db10`, `dbToLinear` | Period wrapping and power/log conversions. |
| `erf`, `qpskBer` | Error-function approximation and analytical BER indicator. |
| `mulberry32`, `gaussian` | Seeded pseudorandom generation and Gaussian noise. |
| `buildPhaseSequence` | Two independent draws per state for Σ and Δ phases. |
| `solveDelays` | Per-element four-delay synthesis and optional quantization. |
| `arrayFactor` | Complex normalized Σ or Δ response of either useful harmonic. |
| `LineChart`, `HarmonicSpectrum`, `Constellation`, `ArraySchematic` | Local SVG/CSS visualizations; no plotting-library or image-service calls. |
| `RangeControl`, `Metric` | Reusable slider and numerical-result components. |
| `Home` | State, derived quantities, angular sweep, constellations, controls and downloads. |

`abs2`, `arrayFactor`, `buildPhaseSequence` and `solveDelays` are named exports
used by the numerical tests. The default export renders the whole demonstrator.

### Frequencies and geometry

For bit rate $R_b$, roll-off $\alpha$, spectral-spacing ratio $r$ and update
factor $\zeta$, the implemented relations are

$$
B_f=\frac{R_b(1+\alpha)}{2},\qquad
f_b=rB_f,\qquad f_a=\frac{f_b}{2},\qquad
T_{\mathrm{PR}}=\frac{\zeta}{f_b}.
$$

The useful RF frequencies in hertz are

$$
f_+=f_c+f_a+f_b,\qquad f_-=f_c-f_a+f_b.
$$

The interface labels them by their angular-frequency harmonic indices
$\omega^{(1,1)}$ and $\omega^{(-1,1)}$; angular frequencies satisfy
$\omega=2\pi f$. Here $f_c$ is the carrier frequency.

For $K=2N$ elements and normalized spacing $d$, the code stores normalized
positions $z_n/\lambda_c=(n-(K+1)/2)d$, where $n=1,\ldots,K$ and
$\lambda_c=c_0/f_c$. The physical end-to-end aperture is $(K-1)d\lambda_c$.

### Phase and delay synthesis

Let $\psi_{\Sigma,j,n}$ be the wrapped steering phase
$2\pi(z_n/\lambda_c)\cos\theta_j-\phi_\Sigma$ for beam $j=1,2$.
For Δ, replace $\phi_\Sigma$ by $\phi_\Delta$ and subtract an additional
$\pi$ on the second half of the array. With $\omega_a=2\pi f_a$ and
$\omega_b=2\pi f_b$, the code computes

$$
\begin{aligned}
D_n^1&=\frac{\psi_{\Sigma,1,n}-\psi_{\Sigma,2,n}}{2\omega_a},&
D_n^3&=\frac{\psi_{\Sigma,1,n}+\psi_{\Sigma,2,n}}{2\omega_b},\\
D_n^2&=\frac{\psi_{\Delta,1,n}-\psi_{\Delta,2,n}}{2\omega_a},&
D_n^4&=\frac{\psi_{\Delta,1,n}+\psi_{\Delta,2,n}}{2\omega_b}.
\end{aligned}
$$

The implementation optionally rounds these delays to the selected resolution,
then applies modulo wrapping into the relevant periods $1/f_a$ or $1/f_b$.
Both phases and delays are wrapped; the displayed table is one periodic
solution, rather than a unique physical delay-line realization.

For $s=+1$ or $-1$, `arrayFactor` evaluates the normalized sum

$$
F_s(\theta)=\frac{1}{K}\sum_{n=1}^{K}
\exp\!\left[-j(s\omega_aD_{a,n}+\omega_bD_{b,n})\right]
\exp\!\left[j2\pi(z_n/\lambda_c)\cos\theta\right],
$$

using $(D_a,D_b)=(D^1,D^3)$ for Σ or $(D^2,D^4)$ for Δ.

### Link metrics, BER and timing

With normalized powers $P_\Sigma=|F_\Sigma|^2$ and
$P_\Delta=|F_\Delta|^2$, and normalized noise power
$\sigma_n^2=10^{-\mathrm{SNR}_{\mathrm{dB}}/10}$, the displayed linear SINRs are

$$
\gamma_\Sigma=\frac{P_\Sigma}{P_\Delta+\sigma_n^2},\qquad
\gamma_\Delta=\frac{P_\Delta}{P_\Sigma+\sigma_n^2}.
$$

The angular sweep covers 0–180° in 0.5° increments. The unintended-link
reference is the largest sampled Σ-key SINR outside the ±8° intended sector.
For intended and unintended linear SINRs $\gamma_b$ and $\gamma_e$,

$$
C_s=\max\{0,\log_2(1+\gamma_b)-\log_2(1+\gamma_e)\}.
$$

Version 1.0 floors normalized pattern display/export values at −50 dB and
clips angular SINR values to [−30, 35] dB. The metric cards use those sampled
SINRs. This secrecy-capacity indicator is a model comparison, not a measured
throughput or an end-to-end security guarantee.

For timing mismatch fraction $\delta=\Delta t/T_{\mathrm{PR}}$, the residual
power law is $P_{\mathrm{res}}/P_{\mathrm{useful}}=2\delta$. The BER indicator
uses $\gamma_{\mathrm{eff}}=(1/\gamma+2\delta)^{-1}$ and
$P_b=\tfrac12\operatorname{erfc}(\sqrt{\gamma_{\mathrm{eff}}})$.
The selected Σ/Δ SINR is used directly in this demonstrator formula; no
additional $E_s/N_0$ to $E_b/N_0$ conversion is inserted. It is an analytical
indicator, not an error count from the plotted 180 symbols. **No key** displays
approximately 0.5 by design.

The constellation timing illustration applies an adjacent key phase to a
fraction $\delta$ of samples. It does not simulate a complete asynchronous
receiver or a continuous pulse-shaped waveform.

## Paper benchmark and verification

| Parameter | Value |
| --- | --- |
| Total elements / spacing | 20 / 0.5 λc |
| Steering angles θ₁ / θ₂ | 110° / 60° |
| Carrier / QPSK bit rate | 2.4 GHz / 2 Mbit/s |
| Roll-off / occupied bandwidth | 0.25 / 1.25 MHz |
| fa / fb | 1 MHz / 2 MHz |
| fb / Bf | 1.6 |
| ζ / TPR | 2 / 1 µs |
| PR phase states / seed | 50 / 2606 |
| Peak SNR | 25 dB |
| Delay resolution / timing mismatch | 0 ps / 0% |
| Useful RF frequencies f₋ / f₊ | 2.401 GHz / 2.403 GHz |

For the `(+1,+1)` reference channel, the numerical check gives approximately
25.0 dB intended SINR, 4.4 dB strongest unintended SINR and
6.39 bit/s/Hz secrecy capacity, consistent with the
$(\gamma_b,\gamma_e)\approx(25,4.5)$ dB and $C_s\approx6.4$ bit/s/Hz reported in
the paper (the 0.5° angular grid of the demonstrator gives 4.4 dB). The Σ peaks occur at 110° and 60° and the corresponding
Δ patterns have nulls there.

The included checks verify the benchmark, the complementary nulls, steering
independence, bandwidth/switching/update relations, the use of local classic
script resources, absence of the application's external-request APIs, and the
runtime manifest hashes. They do not substitute for RF hardware measurements
or a comprehensive browser compatibility suite.

## Exported data

**Export angular data** writes 361 data rows for the **selected harmonic**:

```csv
theta_deg,sum_pattern_db,difference_pattern_db,sigma_sinr_db,delta_sinr_db
```

The files are named `encrypted-dm-tma-omega-1-1.csv` or
`encrypted-dm-tma-omega-minus-1-1.csv`. Pattern and SINR values are subject
to the display limits stated above and are written to five decimal places.
The export does not contain both harmonics, constellation samples or the delay table.

**Save scenario** writes `encrypted-dm-tma-scenario.json` containing the paper
identifier, timestamp, selected harmonic, shared model configuration, derived
quantities, link metrics and assumptions. Version 1.0 has **no scenario-import
control**. This JSON is a record for inspection or downstream processing; it
does not include every interface state, such as receiver preset, probe angle,
timing mismatch, active tab or current PR frame.

Both downloads are generated locally with browser `Blob` objects.

## Model scope

The application assumes uniform excitation, isotropic elements, ideal RF
switching apart from optional delay quantization, and coherent processing.
It does not solve mutual coupling, element patterns, matching, feed losses,
switch transients, oscillator phase noise or a propagation-channel model.
Bandwidth and roll-off parameters enter analytical frequency relations;
there is no sample-by-sample RRC filter or full RF circuit simulation.

The seeded Mulberry32 generator provides repeatable demonstrations. It is not
a cryptographic key generator, and the application is not a production
encryption implementation. Efficiency and harmonic-reference values are
ideal analytical annotations rather than independently measured results.

## Publication

The [repository root](../README.md) publishes this folder on GitHub Pages
(deployment from the `main` branch; the root `index.html` redirects to
`web-demo/` and `.nojekyll` disables Jekyll processing). No build step runs on
GitHub: the committed browser files are served as they are.

The `.gitignore` excludes downloaded dependencies, development output, test
artifacts, generated runtime ZIPs and local environment files. It deliberately
keeps the production assets, so a fresh download runs immediately.

The generated application is a static website with relative asset paths and
can also be served from any other static host. Deploy the runtime files listed
in `MANIFEST.json`, together with the manifest itself.

## Full user tutorial

The [user tutorial](../docs/TUTORIAL.md) provides a longer user-oriented
explanation, the reference case of the paper and guided experiments.

## License and attribution

The source code is distributed under the [MIT License](../LICENSE) and the
tutorial under CC BY 4.0. To cite the demonstrator, use the metadata in
[`../CITATION.cff`](../CITATION.cff).

Bundled third-party components retain their original licenses; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [licenses/](licenses/).
