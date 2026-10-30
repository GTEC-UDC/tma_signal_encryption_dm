import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".test-output");
await mkdir(output, { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ["tests/model-check.ts"],
  outfile: path.join(output, "model-check.mjs"),
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
  define: { "process.env.NODE_ENV": '"production"' },
});
execFileSync(process.execPath, [path.join(output, "model-check.mjs")], { cwd: root, stdio: "inherit" });
execFileSync(process.execPath, ["--test", "tests/package-check.mjs"], { cwd: root, stdio: "inherit" });
