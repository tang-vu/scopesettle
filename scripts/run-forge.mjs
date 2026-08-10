import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const localBinary = join(
  repositoryRoot,
  ".tools",
  "foundry",
  process.platform === "win32" ? "forge.exe" : "forge",
);
const binary = existsSync(localBinary) ? localBinary : "forge";

const result = spawnSync(binary, process.argv.slice(2), {
  cwd: join(repositoryRoot, "contracts"),
  encoding: "utf8",
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(
    "Foundry is required. Install it from https://getfoundry.sh or place it in .tools/foundry.",
  );
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
