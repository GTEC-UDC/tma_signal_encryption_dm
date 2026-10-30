import { context } from "esbuild";
import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, ".dev");
await mkdir(output, { recursive: true });
for (const name of ["index.html", "favicon.svg", "data/model-info.json"]) {
  await cp(path.join(root, "public", name), path.join(output, name), { recursive: true });
}

const development = await context({
  absWorkingDir: root,
  entryPoints: { app: "src/main.tsx", styles: "src/styles.css" },
  outdir: output,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2019",
  sourcemap: true,
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "info",
});
await development.watch();
const server = await development.serve({ servedir: output, host: "127.0.0.1", port: 5173 });
console.log(`Development server: http://127.0.0.1:${server.port}`);
console.log("Source and CSS changes rebuild automatically; refresh the browser. Restart after editing public/ files.");
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await development.dispose();
    process.exit(0);
  });
}
