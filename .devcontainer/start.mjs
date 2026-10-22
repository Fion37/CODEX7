import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const port = Number(process.env.IELTS_TEST_PORT || 3000);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid test port");
const address = `http://127.0.0.1:${port}`;
const logfile = path.join(tmpdir(), "ielts-study-os-dev.log");
const codespaces = process.env.CODESPACES === "true";
async function status() {
  try {
    const response = await fetch(address, {
      signal: AbortSignal.timeout(2500),
    });
    const html = await response.text();
    return {
      occupied: true,
      ready: response.ok && html.includes("IELTS Study OS"),
    };
  } catch {
    return { occupied: false, ready: false };
  }
}
function location() {
  if (
    codespaces &&
    process.env.CODESPACE_NAME &&
    process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
  ) {
    console.log(
      `测试网站：https://${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`,
    );
    console.log(
      `请在 Ports 面板保持${port}端口的可见性为 Private，仅你的GitHub账号访问。`,
    );
  } else console.log(`本机测试服务已就绪，端口${port}。`);
}
const existing = await status();
if (existing.ready) {
  console.log("已复用正在运行的IELTS Study OS。");
  location();
  process.exit(0);
}
if (existing.occupied) {
  console.error(
    `${port}端口已被其他服务或未完成配置的服务占用；没有停止任何现有进程。`,
  );
  process.exit(1);
}
const log = openSync(logfile, "a", 0o600);
// Codespaces uses its authenticated PRIVATE port gateway for this test instance.
// Outside Codespaces, bind only to loopback. Never use this script for public hosting.
const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "--hostname",
    codespaces ? "0.0.0.0" : "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    detached: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      APP_PRIVATE_MODE: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
);
closeSync(log);
child.unref();
let failed = false;
child.once("error", () => {
  failed = true;
});
for (let attempt = 0; attempt < 45; attempt++) {
  if (failed) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
  if ((await status()).ready) {
    console.log("IELTS Study OS已启动。");
    location();
    process.exit(0);
  }
}
console.error(`服务尚未就绪，请查看日志 ${logfile}。没有把开放端口当作就绪。`);
process.exit(1);
