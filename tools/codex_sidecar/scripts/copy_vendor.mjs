import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptFile);
const sidecarDir = path.dirname(scriptDir);

async function main() {
  const sourceVendor = path.join(
    sidecarDir,
    "node_modules",
    "@openai",
    "codex-sdk",
    "vendor",
  );
  const destVendor = path.join(sidecarDir, "vendor");

  await mkdir(destVendor, { recursive: true });
  await cp(sourceVendor, destVendor, { recursive: true, force: true });
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
