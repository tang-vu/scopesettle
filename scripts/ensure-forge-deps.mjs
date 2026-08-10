import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dependency = join(
  repositoryRoot,
  "contracts",
  "lib",
  "forge-std",
  "src",
  "Test.sol",
);
if (existsSync(dependency)) process.exit(0);

const localForge = join(
  repositoryRoot,
  ".tools",
  "foundry",
  process.platform === "win32" ? "forge.exe" : "forge",
);
const forge = existsSync(localForge) ? localForge : "forge";
const result = spawnSync(
  forge,
  ["install", "foundry-rs/forge-std@v1.16.2", "--no-git"],
  {
    cwd: join(repositoryRoot, "contracts"),
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
