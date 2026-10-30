import { build } from "esbuild";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

/** Compile the editable sources into a file://-compatible browser package. */
export async function buildApplication() {
  await build({
    absWorkingDir: root,
    entryPoints: { app: "src/main.tsx", styles: "src/styles.css" },
    outdir: root,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2019",
    minify: true,
    legalComments: "external",
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "info",
  });

  await mkdir(path.join(root, "data"), { recursive: true });
  for (const name of ["index.html", "favicon.svg", "README_ES.txt", "data/model-info.json"]) {
    await cp(path.join(root, "public", name), path.join(root, name));
  }

  // Paths are explicitly listed so development files never enter an offline release.
  const runtimeFiles = [
    "index.html", "app.js", "app.js.LEGAL.txt", "styles.css", "favicon.svg",
    "README_ES.txt", "data/model-info.json", "THIRD_PARTY_NOTICES.md",
    "licenses/react-LICENSE.txt", "licenses/react-dom-LICENSE.txt",
    "licenses/scheduler-LICENSE.txt",
  ].sort();
  const files = [];
  for (const name of runtimeFiles) {
    const bytes = await readFile(path.join(root, name));
    files.push({ path: name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  await writeFile(path.join(root, "MANIFEST.json"), `${JSON.stringify({
    package: "TMA_Signal_Encryption_Demonstrator_Web",
    version: "1.0",
    generatedAt: new Date().toISOString(),
    offline: true,
    files,
  }, null, 2)}\n`);
  console.log("Build complete. Open index.html directly in a browser.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildApplication();
}
