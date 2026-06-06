import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LINTABLE = new Set([".ts", ".tsx", ".astro", ".js", ".jsx"]);

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readHookInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const { file_path: filePath } = readHookInput();
if (!filePath) {
  process.exit(0);
}

const ext = path.extname(filePath).toLowerCase();
if (!LINTABLE.has(ext)) {
  process.exit(0);
}

const eslintBin = path.join(projectRoot, "node_modules", "eslint", "bin", "eslint.js");
const result = spawnSync(process.execPath, [eslintBin, "--fix", filePath], {
  cwd: projectRoot,
  encoding: "utf8",
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stderr.write(`[lint-after-edit] eslint failed for ${filePath} (exit ${result.status})\n`);
}

process.exit(0);
