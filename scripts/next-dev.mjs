import { execFileSync, spawn } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const lockFile = path.join(projectRoot, ".next", "dev", "lock");
const nextBin = require.resolve("next/dist/bin/next");
const forwardedArgs = process.argv.slice(2);

function normalizeForMatch(value) {
  return value.replaceAll("\\", "/").toLowerCase();
}

function safeExec(file, args) {
  try {
    return execFileSync(file, args, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch {
    return "";
  }
}

function getRunningNextDevProcesses() {
  const normalizedRoot = normalizeForMatch(projectRoot);

  if (process.platform === "win32") {
    const escapedRoot = projectRoot.replace(/'/g, "''");
    const script = [
      `$root = '${escapedRoot}'`,
      "Get-CimInstance Win32_Process |",
      "  Where-Object {",
      "    $_.CommandLine -and",
      "    $_.CommandLine -like '*next*dist*bin*next*' -and",
      "    $_.CommandLine -match '(^|\\s)dev(\\s|$)' -and",
      "    $_.CommandLine -like ('*' + $root + '*')",
      "  } |",
      "  Select-Object ProcessId, CommandLine |",
      "  ConvertTo-Json -Compress",
    ].join("\n");
    const raw = safeExec("powershell.exe", ["-NoProfile", "-Command", script]).trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items
        .map((item) => ({
          pid: Number(item.ProcessId),
          command: String(item.CommandLine ?? ""),
        }))
        .filter((item) => Number.isFinite(item.pid));
    } catch {
      return [];
    }
  }

  const raw = safeExec("ps", ["-eo", "pid=,args="]);
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.*)$/);
      if (!match) {
        return null;
      }

      const pid = Number(match[1]);
      const command = match[2];

      return { pid, command };
    })
    .filter((item) => item && item.pid !== process.pid)
    .filter((item) => {
      const normalizedCommand = normalizeForMatch(item.command);
      return (
        normalizedCommand.includes(normalizedRoot) &&
        normalizedCommand.includes("next") &&
        normalizedCommand.includes("dist/bin/next") &&
        /(^|\s)dev(\s|$)/.test(item.command)
      );
    });
}

function maybeClearStaleLock() {
  if (!existsSync(lockFile)) {
    return;
  }

  const runningProcesses = getRunningNextDevProcesses();
  if (runningProcesses.length > 0) {
    console.error("Another `next dev` instance for this project is already running:");
    for (const item of runningProcesses) {
      console.error(`- PID ${item.pid}: ${item.command}`);
    }
    console.error("");
    if (process.platform === "win32") {
      console.error("Stop it with `taskkill /PID <pid> /F`, then run `npm run dev` again.");
    } else {
      console.error("Stop it with `kill <pid>`, then run `npm run dev` again.");
    }
    process.exit(1);
  }

  rmSync(lockFile, { force: true });
  console.log(`Removed stale Next.js dev lock at ${path.relative(projectRoot, lockFile)}.`);
}

maybeClearStaleLock();

const child = spawn(process.execPath, [nextBin, "dev", ...forwardedArgs], {
  cwd: projectRoot,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
