#!/usr/bin/env node
/**
 * sync-corrections.js — tự commit & push corrections.js lên GitHub.
 *
 * Được gọi bởi PostToolUse hook (matcher Write|Edit) trong .claude/settings.json:
 * nhận JSON của hook qua stdin, và CHỈ hành động khi file vừa sửa là
 * corrections.js. Mọi file khác thì thoát ngay, không làm gì.
 *
 * Chạy tay cũng được:  node sync-corrections.js --force
 *
 * Luôn exit 0 để không bao giờ làm gãy phiên làm việc. Kết quả được báo lại
 * bằng {"systemMessage": ...} trên stdout.
 */
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const TARGET = 'corrections.js';

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
    ...opts,
  }).trim();
}

function say(msg) {
  process.stdout.write(JSON.stringify({ systemMessage: msg }) + '\n');
}

function readStdin() {
  try {
    const fs = require('fs');
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  const forced = process.argv.includes('--force');

  if (!forced) {
    let payload;
    try {
      payload = JSON.parse(readStdin() || '{}');
    } catch {
      return; // stdin không phải JSON — bỏ qua im lặng
    }
    const file =
      (payload.tool_response && payload.tool_response.filePath) ||
      (payload.tool_input && payload.tool_input.file_path) ||
      '';
    if (path.basename(file) !== TARGET) return; // không phải file cần sync
  }

  // Có thay đổi thật hay không?
  let dirty;
  try {
    dirty = git(['status', '--porcelain', '--', TARGET]);
  } catch (e) {
    say(`⚠ sync-corrections: không đọc được git status — ${firstLine(e)}`);
    return;
  }
  if (!dirty) return; // không có gì để commit

  try {
    git(['add', '--', TARGET]);

    const count = countCorrections();
    const msg = `Cap nhat corrections.js (${count} cau da sua dap an)`;
    git(['commit', '-m', msg, '--', TARGET]);

    const sha = git(['rev-parse', '--short', 'HEAD']);
    git(['push', 'origin', 'HEAD:main']);
    say(`✅ corrections.js đã commit (${sha}) và push lên origin/main — ${count} câu đã sửa.`);
  } catch (e) {
    say(
      `⚠ sync-corrections: đã commit nhưng PUSH THẤT BẠI — ${firstLine(e)}\n` +
      `   Chạy tay để thử lại:  git push origin main`
    );
  }
}

function countCorrections() {
  try {
    const fs = require('fs');
    const sandbox = { window: {} };
    new Function('window', fs.readFileSync(path.join(ROOT, TARGET), 'utf8'))(sandbox.window);
    return (sandbox.window.CORRECTIONS || []).length;
  } catch {
    return '?';
  }
}

function firstLine(e) {
  const s = String((e && (e.stderr || e.message)) || e).trim();
  return s.split('\n')[0].slice(0, 200) || 'lỗi không rõ';
}

try {
  main();
} catch (e) {
  say(`⚠ sync-corrections: ${firstLine(e)}`);
}
process.exit(0);
