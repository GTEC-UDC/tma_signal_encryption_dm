# Signal-encrypting DM-TMA: interactive web demonstrator

Companion software for the letter

> R. Maneiro-Catoira, J. Brégains, J. A. García-Naya, and L. Castedo,
> "Time-Modulated Arrays with Signal Encryption for Enhanced Directional
> Modulation Security," submitted to *IEEE Antennas and Wireless Propagation
> Letters*, 2026.

The letter proposes a dual-beam time-modulated array (TMA) that encrypts the
transmitted signal while providing directional modulation (DM). The delays of
the periodic modulating signals are updated pseudorandomly, so that each
harmonic beam combines a sum-type (Σ) and a difference-type (Δ) pattern
carrying independent pseudorandom phase sequences. Only receivers that hold the
corresponding key can coherently reconstruct the signal, and no optimization is
required at the transmitter.

**Live demonstrator:** <https://gtec-udc.github.io/tma_signal_encryption_dm/>
· **User tutorial:** [`docs/TUTORIAL.md`](docs/TUTORIAL.md)

> **Status: preview.** The demonstrator is being updated to the final
> parameters of the letter (M = 64 scrambling phases instead of 50) and to the
> timing-offset model of its revised version. The tutorial already describes
> the final values.

## Contents

| Folder | Content |
|---|---|
| [`web-demo/`](web-demo/) | Interactive web demonstrator: ready-to-run build (`index.html`, `app.js`, `styles.css`) and its complete TypeScript/React source, build and test scripts. |
| [`docs/`](docs/) | [User tutorial](docs/TUTORIAL.md) of the demonstrator. |

### Web demonstrator

The demonstrator interactively evaluates the analytical model of the letter:
independent steering of the two dominant harmonics, Σ/Δ patterns, angular SINR,
QPSK BER, secrecy capacity, constellations before and after descrambling
(including reception without the key), the delays of every element and the
harmonic spectrum. All computations run locally in the browser; no data are
transmitted.

To use it, open the live version above, or download this repository and
double-click `web-demo/index.html`. No installation, account or Internet
connection is needed. See the [tutorial](docs/TUTORIAL.md) for a description of
every control, the reference case of the letter and guided experiments.

The model assumes uniformly excited isotropic elements, ideal switches, no
mutual coupling or RF losses, and a coherent receiver synchronized with the
pseudorandom key. Delay quantization is offered as an optional extension.

### Source code and rebuilding

The numerical model and the interface are in `web-demo/src/App.tsx`. With
Node.js 22.13 or later, run in `web-demo/`:

```bash
npm ci          # install the pinned development dependencies
npm run build   # regenerate app.js, styles.css and MANIFEST.json
npm test        # type-check, numerical benchmark and package checks
```

Commit the regenerated files together with the source changes: GitHub Pages
serves `web-demo/` as it is, without a build step. The
[developer README](web-demo/README.md) describes the source map, the
implemented equations and the development server.

## How to cite

If you use this software, please cite the letter above and this repository:

> R. Maneiro-Catoira, J. Brégains, J. A. García-Naya, and L. Castedo,
> *Signal-encrypting DM-TMA: interactive web demonstrator*,
> Zenodo, 2026. (The DOI will be available with the first release.)

Citation metadata are also provided in [`CITATION.cff`](CITATION.cff).

## Use of AI assistants

AI assistants were used in the development of the web demonstrator and its
tutorial. The authors reviewed and validated the models, equations and results
against the analysis of the letter.

## License

- Source code (`web-demo/`): [MIT License](LICENSE).
- Documentation (`docs/`): [Creative Commons Attribution 4.0 International
  (CC BY 4.0)](docs/LICENSE.md).
- Third-party components bundled in `web-demo/app.js` (React, React DOM and
  Scheduler, MIT License) are listed in
  [`web-demo/THIRD_PARTY_NOTICES.md`](web-demo/THIRD_PARTY_NOTICES.md).

## Funding

This work was funded in part by the Xunta de Galicia under Grant ED431C
2024/18; and in part by MICIU/AEI/10.13039/501100011033 under grants
PID2022-137099NB-C42 (MADDIE) and PID2025-169068NB-C31 (GEMMA); and by
ERDF/EU.

## Authors

Roberto Maneiro-Catoira, Julio Brégains, José A. García-Naya and Luis
Castedo, CITIC Research Center & Department of Computer Engineering,
Universidade da Coruña, 15071 A Coruña, Spain.

Contact: José A. García-Naya (corresponding author of the letter).
