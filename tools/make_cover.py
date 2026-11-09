"""Cover image of the repository: how the signal-encrypting DM-TMA works.

Left: the time-modulated array; the pseudorandom delays of the switches are
the key. Centre: the two dominant harmonic beams, each formed by a sum-type (Σ)
and a difference-type (Δ) pattern that carry independent pseudorandom phases
(array-factor amplitude, linear scale). Right: QPSK constellations computed
with the model of the letter (2N = 20, SNR = 25 dB, M = 64 phases).

Requirements: Python 3.10+, numpy, matplotlib. The published image uses the
Inter font; without it, Arial or DejaVu Sans is used and the text widths
change slightly.

Usage (from the repository root):
    python tools/make_cover.py            # writes docs/img/cover.svg, cover.png
    python tools/make_cover.py <folder>   # or into another folder
cover.png is 1280 x 640 px, the size recommended for the social preview image
of a GitHub repository.
"""
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Polygon
import numpy as np

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "docs" / "img"
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ model (as in the letter)
N2, SNR_DB, M = 20, 25.0, 64
n = np.arange(1, N2 + 1)
W_SUM = np.ones(N2)
W_DIF = np.r_[np.ones(N2 // 2), -np.ones(N2 // 2)]
NOISE = N2**2 / 10 ** (SNR_DB / 10)                   # SNR = 25 dB at the Σ peak
TH1, TH2, TH_EVE = 110.0, 60.0, 121.2                 # intended directions; strongest unintended


def af(w, theta, theta0):
    """Complex array factor; angles in degrees from the array axis z."""
    th = np.deg2rad(np.atleast_1d(theta))
    ph = np.pi * np.outer(np.cos(th) - np.cos(np.deg2rad(theta0)), n)
    return (w * np.exp(1j * ph)).sum(axis=1)


def constellation(theta, theta0, key, n_sym=2000):
    """Received QPSK samples at theta (harmonic steered to theta0), with or without the Σ key."""
    s = (rng.choice([1, -1], n_sym) + 1j * rng.choice([1, -1], n_sym)) / np.sqrt(2)
    phi_s = 2 * np.pi * rng.integers(0, M, n_sym) / M
    phi_d = 2 * np.pi * rng.integers(0, M, n_sym) / M
    fs, fd = af(W_SUM, theta, theta0)[0], af(W_DIF, theta, theta0)[0]
    noise = np.sqrt(NOISE / 2) * (rng.standard_normal(n_sym) + 1j * rng.standard_normal(n_sym))
    y = s * (fs * np.exp(1j * phi_s) + fd * np.exp(1j * phi_d)) + noise
    if key:
        y = y * np.exp(-1j * phi_s)                   # descrambling with the Σ key
    y = y / fs                                        # channel-gain normalization
    sinr = abs(fs) ** 2 / (abs(fd) ** 2 + NOISE)
    return y * np.sqrt(2), 10 * np.log10(sinr)


# ------------------------------------------------------------------ style
SIGMA, DELTA = "#2a78d6", "#eb6834"                   # same palette as Figs. 2-4 of the letter
INK, MUTED, FAINT, GRID = "#1a1a1a", "#5f5f5f", "#9a9a9a", "#e2e2e2"
KEY = "#a87a06"
plt.rcParams.update({
    "font.family": "sans-serif", "font.sans-serif": ["Inter", "Arial", "DejaVu Sans"],
    "mathtext.fontset": "stixsans", "font.size": 13, "svg.fonttype": "path",
})

W, H = 12.8, 6.4                                       # inches; 1280 x 640 px at 100 dpi
fig = plt.figure(figsize=(W, H), facecolor="white")
ax = fig.add_axes([0, 0, 1, 1])
ax.set_xlim(0, W)
ax.set_ylim(0, H)
ax.set_aspect("equal")
ax.axis("off")

# ------------------------------------------------------------------ title
ax.text(0.45, 5.95, "Signal-encrypting directional modulation with a time-modulated array",
        fontsize=21, fontweight="semibold", color=INK, va="center")
ax.text(0.45, 5.52, "Only the intended direction together with the key recovers the data",
        fontsize=15, color=MUTED, va="center")

# ------------------------------------------------------------------ (1) transmitter
X_ARR, Y0 = 2.75, 2.75                                 # array axis (z, vertical) and centre
z_el = np.linspace(-1.45, 1.45, 10)
for z in z_el:
    y = Y0 + z
    ax.add_patch(Circle((X_ARR, y), 0.07, color=INK, zorder=5))
    ax.add_patch(FancyBboxPatch((X_ARR - 0.82, y - 0.09), 0.4, 0.18,
                                boxstyle="round,pad=0,rounding_size=0.04",
                                fc="white", ec=INK, lw=1.1, zorder=3))
    ax.plot([X_ARR - 0.42, X_ARR - 0.07], [y, y], color=INK, lw=1.1, zorder=2)
    ax.plot([X_ARR - 1.2, X_ARR - 0.82], [y, y], color=INK, lw=1.1, zorder=2)
ax.plot([X_ARR - 1.2] * 2, [Y0 + z_el[0], Y0 + z_el[-1]], color=INK, lw=1.1)
ax.add_patch(FancyArrowPatch((0.5, Y0), (X_ARR - 1.2, Y0), arrowstyle="-|>", mutation_scale=16,
                             color=INK, lw=1.4))
ax.text(0.5, Y0 + 0.14, r"$s(t)$", fontsize=17, color=INK, va="bottom")
ax.text(0.5, Y0 - 0.14, "QPSK", fontsize=12.5, color=MUTED, va="top")
ax.text(X_ARR - 0.62, Y0 + z_el[-1] + 0.22, "switches", fontsize=12.5, color=MUTED,
        ha="center", va="bottom")
ax.text(X_ARR - 0.4, Y0 + z_el[0] - 0.22, r"$2N = 20$ elements", fontsize=12.5, color=MUTED,
        ha="center", va="top")


def draw_key(x, y, s=1.0, color=KEY):
    ax.add_patch(Circle((x, y), 0.16 * s, fc="white", ec=color, lw=2.4, zorder=6))
    ax.plot([x + 0.16 * s, x + 0.62 * s], [y, y], color=color, lw=2.8, solid_capstyle="butt", zorder=6)
    for dx in (0.44, 0.56):
        ax.plot([x + dx * s, x + dx * s], [y, y - 0.14 * s], color=color, lw=2.6,
                solid_capstyle="butt", zorder=6)


KX, KY = 0.62, 0.55
draw_key(KX, KY)
ax.text(KX + 0.82, KY, "Key: pseudorandom delays of the\nswitches, renewed every symbol",
        fontsize=12.5, color=INK, va="center", linespacing=1.3)
ax.add_patch(FancyArrowPatch((KX - 0.02, KY + 0.2), (X_ARR - 1.27, Y0 + z_el[0]),
                             connectionstyle="arc3,rad=-0.35", arrowstyle="-|>", mutation_scale=13,
                             color=KEY, lw=1.7, ls=(0, (3, 2))))

# ------------------------------------------------------------------ (2) beams (|AF|, linear)
R = 3.3
th = np.linspace(0.0, 180.0, 3601)


def polar(amp, r=R):
    return X_ARR + r * amp * np.sin(np.deg2rad(th)), Y0 + r * amp * np.cos(np.deg2rad(th))


def ray(theta, r0, r1, **kw):
    t = np.deg2rad(theta)
    ax.plot([X_ARR + r0 * np.sin(t), X_ARR + r1 * np.sin(t)],
            [Y0 + r0 * np.cos(t), Y0 + r1 * np.cos(t)], **kw)


def at(theta, r):
    t = np.deg2rad(theta)
    return X_ARR + r * np.sin(t), Y0 + r * np.cos(t)


for theta0, alpha, lw in ((TH2, 0.45, 1.5), (TH1, 1.0, 2.0)):
    for w, c, z in ((W_DIF, DELTA, 2), (W_SUM, SIGMA, 3)):
        x, y = polar(np.abs(af(w, th, theta0)) / N2)
        ax.add_patch(Polygon(np.c_[np.r_[X_ARR, x, X_ARR], np.r_[Y0, y, Y0]], closed=True,
                             fc=c, ec="none", alpha=0.13 * alpha, zorder=z))
        ax.plot(x, y, color=c, lw=lw, alpha=alpha, zorder=z + 0.5, solid_joinstyle="round")

RX = R + 0.45
ray(TH1, R + 0.05, RX - 0.12, color=MUTED, lw=1, ls=(0, (3, 2)), zorder=1)
ray(TH_EVE, 0.5, RX - 0.12, color=MUTED, lw=1, ls=(0, (3, 2)), zorder=1)
ax.plot(*at(TH1, RX), "o", ms=12, mfc=INK, mec="white", mew=1.5, zorder=8)
ax.plot(*at(TH_EVE, RX), "s", ms=11, mfc=INK, mec="white", mew=1.5, zorder=8)
bx, by = at(TH1, RX)
ax.text(bx + 0.2, by + 0.02, r"$\omega^{1,1}$ beam" + "\n" + r"$\theta_1 = 110^\circ$", fontsize=12.5, color=INK,
        ha="left", va="center", linespacing=1.3)
ex, ey = at(TH_EVE, RX)
ax.text(ex + 0.2, ey, r"$121^\circ$", fontsize=12.5, color=INK, ha="left", va="center")
tx, ty = at(TH2, R + 0.12)
ax.text(tx, ty, r"$\omega^{-1,1}$ beam, $\theta_2 = 60^\circ$" + "\nanother user and frequency",
        fontsize=12, color=MUTED, ha="left", va="center", linespacing=1.3)

# Σ / Δ legend (one row under the subtitle)
LY, lx = 4.98, 0.5
for c, txt in ((SIGMA, r"$\Sigma$ pattern: $s(t)$ with key phase $\phi^{\Sigma}$"),
               (DELTA, r"$\Delta$ pattern: $s(t)$ with independent phase $\phi^{\Delta}$, null at $\theta_1$")):
    ax.plot([lx, lx + 0.4], [LY, LY], color=c, lw=3.2, solid_capstyle="butt")
    t = ax.text(lx + 0.52, LY, txt, fontsize=12.5, color=INK, va="center")
    fig.canvas.draw()
    bb = t.get_window_extent().transformed(ax.transData.inverted())
    lx = bb.x1 + 0.45

# ------------------------------------------------------------------ (3) constellations
panels = [
    ("o", "Intended user", TH1, True),
    ("s", "Eavesdropper", TH_EVE, True),
    ("o", "Without the key", TH1, False),
]
PX, PW = 0.645, 0.088                                  # figure fractions (panel is square)
PH = PW * W / H
ys = (0.585, 0.33, 0.075)
for (mk, title, theta, key), y0 in zip(panels, ys):
    a = fig.add_axes([PX, y0, PW, PH])
    a.set_xlim(-2.4, 2.4)
    a.set_ylim(-2.4, 2.4)
    a.set_aspect("equal")
    a.set_xticks([])
    a.set_yticks([])
    for sp in a.spines.values():
        sp.set_color(GRID)
    a.axhline(0, color=GRID, lw=0.8, zorder=0)
    a.axvline(0, color=GRID, lw=0.8, zorder=0)
    y, sinr = constellation(theta, TH1, key)
    a.plot(y.real, y.imag, ".", ms=1.8, color=SIGMA, alpha=0.5, mew=0, rasterized=True)
    fx = PX + PW + 0.014
    top = y0 + PH
    fig.text(fx, top - 0.004, title, fontsize=14, fontweight="semibold", color=INK, va="top")
    fig.add_artist(Line2D([fx + 0.006], [top - 0.062], marker=mk, ms=9, mfc=INK, mec="white",
                          mew=1.2, transform=fig.transFigure))
    where = f"{theta:.0f}°" if theta == TH1 else f"{theta:.1f}°"
    if key and theta == TH1:
        sub = [f"{where}, with key", f"SINR {sinr:.0f} dB: clean QPSK"]
    elif key:
        sub = [f"{where}, with key", f"SINR {sinr:.1f} dB, BER ≈ 5·10⁻²:", "Δ interference remains"]
    else:
        sub = [f"{where}, no key", "unknown phase every symbol:", "no information"]
    fig.text(fx + 0.018, top - 0.062, sub[0], fontsize=12.5, color=INK, va="center")
    fig.text(fx, top - 0.1, "\n".join(sub[1:]), fontsize=12, color=MUTED, va="top", linespacing=1.3)

# ------------------------------------------------------------------ footer
ax.text(W - 0.3, 0.13, "No optimization at the transmitter  ·  model of the letter: 2N = 20, SNR = 25 dB, M = 64",
        fontsize=10, color=FAINT, ha="right", va="bottom")

OUT.mkdir(parents=True, exist_ok=True)
fig.savefig(OUT / "cover.svg", facecolor="white", dpi=200)       # dpi of the rasterized scatter
fig.savefig(OUT / "cover.png", dpi=100, facecolor="white")
print("written:", OUT / "cover.svg", OUT / "cover.png")
