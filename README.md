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

> **Status: preview.** The demonstrator and its tutorial are being updated to the
> final parameters of the letter (e.g., M = 64 scrambling phases instead of 50)
> and to the timing-offset model of its revised version.

## Contents

| Folder | Content |
|---|---|
| [`web-demo/`](web-demo/) | Interactive offline web demonstrator (HTML + JavaScript). |
| [`docs/`](docs/) | User tutorial of the demonstrator (PDF). |

### Web demonstrator

The demonstrator interactively evaluates the analytical model of the letter:
independent steering of the two dominant harmonics, Σ/Δ patterns, angular SINR,
QPSK BER, secrecy capacity, constellations before and after descrambling
(including reception without the key), the delays of every element and the
harmonic spectrum. All computations run locally in the browser; no data are
transmitted.

To use it, open the live version above, or download this repository and
double-click `web-demo/index.html`. No installation, account or Internet
connection is needed. See the [tutorial](docs/) for a description of every
control and for the reference case of the letter.

The model assumes uniformly excited isotropic elements, ideal switches, no
mutual coupling or RF losses, and a coherent receiver synchronized with the
pseudorandom key. Delay quantization is offered as an optional extension.

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
- Third-party components bundled in the demonstrator are listed in
  [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

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
