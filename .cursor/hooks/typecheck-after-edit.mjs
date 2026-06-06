import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TYPECHECKABLE = new Set([".ts", ".tsx", ".astro"]);

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
if (!TYPECHECKABLE.has(ext)) {
  process.exit(0);
}

const result = spawnSync("npm", ["run", "typecheck"], {
  cwd: projectRoot,
  encoding: "utf8",
  shell: true,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stderr.write(`[typecheck-after-edit] typecheck failed after editing ${filePath} (exit ${result.status})\n`);
}

process.exit(0);
