import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function applyEnvFile(relativePath, { required = false } = {}) {
  const path = join(root, relativePath);
  if (!existsSync(path)) {
    return !required;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }

  return true;
}

applyEnvFile(".env");

if (!applyEnvFile(".env.cloud", { required: true })) {
  console.error(
    "Missing .env.cloud — copy .env.cloud.example to .env.cloud and add hosted Supabase credentials.",
  );
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_KEY?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "SUPABASE_URL and SUPABASE_KEY must be set in .env.cloud (Publishable key from dashboard).",
  );
  process.exit(1);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["astro", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("error", (err) => {
  console.error(err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
