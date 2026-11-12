import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readExecutionProfile } from "./execution-profile.mjs";

const [command, ...args] = process.argv.slice(2);
if (!["dev", "build"].includes(command)) throw new Error("Expected dev or build.");
const managedLinux = readExecutionProfile() === "managed-linux";

// Public assets are copied into dist by the framework. A fresh production
// output prevents obsolete installer copies from being shipped on later builds.
// Development previews continue to serve the source public directory.
if (command === "build") {
  rmSync(fileURLToPath(new URL("../dist", import.meta.url)), { recursive: true, force: true });
}

if (command === "build") {
  // A clean clone selects portable. Run its CLI as a child too: importing it
  // in-process can exit the launcher before the required public-asset gate.
  const executable = managedLinux ? "bash" : process.execPath;
  const buildArgs = managedLinux
    ? [fileURLToPath(new URL("./build-verified.sh", import.meta.url)), ...args]
    : [fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url)), "build", ...args];
  const result = spawnSync(executable, buildArgs, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status === 0) {
    const checked = spawnSync(process.execPath, [
      fileURLToPath(new URL("./verify-public-build.mjs", import.meta.url)),
    ], { stdio: "inherit" });
    if (checked.error) throw checked.error;
    process.exit(checked.status ?? 1);
  }
  process.exit(result.status ?? 1);
}

// Import in this process so the preview owner retains its PID and signals.
const cli = new URL(managedLinux
  ? "../node_modules/vite/bin/vite.js"
  : "../node_modules/vinext/dist/cli.js", import.meta.url);
process.argv = [process.execPath, fileURLToPath(cli), command,
  ...(!managedLinux && command === "dev" ? ["--port", "5173"] : []), ...args];
await import(cli.href);
