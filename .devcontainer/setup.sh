#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --cache "${TMPDIR:-/tmp}/ielts-npm-cache" --no-audit --no-fund
npm run prepare:ocr
printf '%s\n' '准备完成。测试网站将自动启动，端口请保持 Private。'
