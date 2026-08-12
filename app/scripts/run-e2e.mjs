import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const persistPath = await mkdtemp(join(tmpdir(), "sgrs-swimplan-e2e-"));
const playwrightCli = new URL(
  "../node_modules/@playwright/test/cli.js",
  import.meta.url,
);
const child = spawn(
  process.execPath,
  [playwrightCli.pathname, "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_D1_PERSIST_PATH: persistPath,
      PLAYWRIGHT_ISOLATED_RUN: "true",
    },
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => child.kill(signal));
}

let exitCode = 1;
try {
  exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
} finally {
  await rm(persistPath, { recursive: true, force: true });
}

process.exitCode = exitCode;
