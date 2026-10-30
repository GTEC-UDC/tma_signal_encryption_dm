import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const packageDirectory = path.resolve(".");

test("offline package contains the complete distribution", async () => {
  for (const file of [
    "index.html",
    "app.js",
    "styles.css",
    "favicon.svg",
    "README_ES.txt",
    "MANIFEST.json",
    "data/model-info.json",
    "app.js.LEGAL.txt",
    "THIRD_PARTY_NOTICES.md",
    "licenses/react-LICENSE.txt",
    "licenses/react-dom-LICENSE.txt",
    "licenses/scheduler-LICENSE.txt",
  ]) {
    assert.ok((await stat(path.join(packageDirectory, file))).isFile(), file);
  }
});

test("index.html opens directly and uses only local assets", async () => {
  const html = await readFile(path.join(packageDirectory, "index.html"), "utf8");
  assert.match(html, /src="\.\/app\.js"/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /type="module"/i);
});

test("application performs no external network requests", async () => {
  const javascript = await readFile(path.join(packageDirectory, "app.js"), "utf8");
  assert.doesNotMatch(javascript, /\bfetch\s*\(/i);
  assert.doesNotMatch(javascript, /XMLHttpRequest/i);
  assert.doesNotMatch(javascript, /\bWebSocket\s*\(/i);
  assert.doesNotMatch(javascript, /sendBeacon/i);
});

test("paper identity and benchmark replace the former project framing", async () => {
  const files = await Promise.all(
    ["index.html", "app.js", "README_ES.txt", "data/model-info.json"].map(
      (file) => readFile(path.join(packageDirectory, file), "utf8"),
    ),
  );
  const contents = files.join("\n");
  const model = JSON.parse(files[3]);
  assert.match(
    contents,
    /Time-Modulated Arrays with Signal Encryption for Enhanced Directional Modulation Security/,
  );
  assert.doesNotMatch(contents, /\bESA\b|satellite|space-relevant|consortium|proposal definition/i);
  assert.match(contents, /M = 50/);
  assert.ok(
    model.implementedRelations.includes(
      "h_n(t) = a(t-D_n^1)b(t-D_n^3)/sqrt(2) + a(t-D_n^2)b(t-D_n^4)/sqrt(2)",
    ),
  );
  assert.equal(model.paperBaseline.occupiedBandwidthMHz, 1.25);
  assert.equal(model.paperBaseline.faMHz, 1);
  assert.equal(model.paperBaseline.fbMHz, 2);
  assert.equal(model.paperBaseline.tprMicroseconds, 1);
  assert.equal(model.paperBaseline.prPhaseStatesM, 50);
});

test("manifest hashes match every distributed file", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(packageDirectory, "MANIFEST.json"), "utf8"),
  );
  assert.equal(manifest.package, "TMA_Signal_Encryption_Demonstrator_Web");
  assert.equal(manifest.version, "1.0");
  for (const entry of manifest.files) {
    const bytes = await readFile(path.join(packageDirectory, entry.path));
    assert.equal(bytes.length, entry.bytes, entry.path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      entry.sha256,
      entry.path,
    );
  }
});
