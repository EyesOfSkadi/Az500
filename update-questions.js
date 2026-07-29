#!/usr/bin/env node
/**
 * Re-pull the AZ-500 question bank from the upstream GitHub repo and rebuild
 * questions.json + questions-data.js + images/.
 *
 * Usage:  node update-questions.js
 * Requires: Node 18+ (uses global fetch). No dependencies.
 */
const fs = require('fs');
const path = require('path');

const REPO = 'Ditectrev/Microsoft-Azure-AZ-500-Azure-Security-Engineer-Practice-Tests-Exams-Questions-Answers';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const ROOT = __dirname;
const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

async function main() {
  process.stdout.write('Đang tải README.md từ GitHub… ');
  const res = await fetch(`${RAW}/README.md`);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải README.md`);
  const md = (await res.text()).replace(/\r\n/g, '\n');
  console.log('xong (' + Math.round(md.length / 1024) + ' KB)');

  const { questions, images } = parse(md);
  console.log(`Đã phân tích: ${questions.length} câu hỏi, ${images.size} hình ảnh.`);

  const missingAnswer = questions.filter((q) => q.correctCount === 0);
  if (missingAnswer.length) {
    console.warn(`⚠ ${missingAnswer.length} câu không có đáp án được đánh dấu: ` +
      missingAnswer.map((q) => '#' + q.id).join(', '));
  }

  const bank = {
    source: `https://github.com/${REPO}`,
    exam: 'AZ-500 Microsoft Azure Security Technologies',
    fetchedAt: new Date().toISOString().slice(0, 10),
    count: questions.length,
    questions,
  };
  fs.writeFileSync(path.join(ROOT, 'questions.json'), JSON.stringify(bank, null, 1));
  fs.writeFileSync(path.join(ROOT, 'questions-data.js'), 'window.QUESTION_BANK=' + JSON.stringify(bank) + ';\n');
  console.log('Đã ghi questions.json và questions-data.js.');

  await downloadImages([...images]);
  console.log('✅ Hoàn tất. Mở index.html để dùng.');
}

function parse(md) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => l.startsWith('### '));
  const blocks = [];
  let cur = null;
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ')) {
      if (cur) blocks.push(cur);
      cur = { heading: line.slice(4).trim(), body: [] };
    } else if (cur) {
      if (/^\*\*\[⬆ Back to Top\]/.test(line)) { blocks.push(cur); cur = null; continue; }
      cur.body.push(line);
    }
  }
  if (cur) blocks.push(cur);

  const images = new Set();
  const questions = blocks.map((b, idx) => {
    const qImages = [];
    const options = [];
    const extra = [];
    let last = null;

    for (const line of b.body) {
      const t = line.trim();
      if (!t) continue;
      const m = t.match(/^-\s+\[( |x|X)\]\s*(.*)$/);
      if (m) {
        last = { text: m[2].trim(), correct: m[1].toLowerCase() === 'x', images: [] };
        options.push(last);
        continue;
      }
      const imgs = matchImages(t);
      if (imgs.length && t.replace(IMG_RE, '').trim() === '') {
        (last ? last.images : qImages).push(...imgs);
        continue;
      }
      if (last) last.text += ' ' + t;
      else extra.push(t);
    }

    [...qImages, ...options.flatMap((o) => o.images)].forEach((s) => images.add(s));
    const correctCount = options.filter((o) => o.correct).length;
    return {
      id: idx + 1,
      question: (b.heading + (extra.length ? '\n' + extra.join('\n') : '')).trim(),
      images: qImages,
      options,
      multi: correctCount > 1,
      correctCount,
      type: options.length === 1 && options[0].correct ? 'lab' : 'choice',
    };
  });

  return { questions, images };
}

function matchImages(text) {
  const out = [];
  IMG_RE.lastIndex = 0;
  let m;
  while ((m = IMG_RE.exec(text)) !== null) out.push(m[2]);
  return out;
}

async function downloadImages(list) {
  const todo = list.filter((p) => !fs.existsSync(path.join(ROOT, p)));
  if (!todo.length) { console.log('Hình ảnh: đã có đủ, không cần tải thêm.'); return; }
  console.log(`Đang tải ${todo.length} hình ảnh mới…`);
  const LIMIT = 8;
  let done = 0, failed = [];
  await Promise.all(Array.from({ length: LIMIT }, async () => {
    while (todo.length) {
      const rel = todo.shift();
      try {
        const r = await fetch(`${RAW}/${rel}`);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const dest = path.join(ROOT, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()));
        done++;
      } catch (e) {
        failed.push(rel + ' (' + e.message + ')');
      }
    }
  }));
  console.log(`Đã tải ${done} hình ảnh.`);
  if (failed.length) console.warn('⚠ Tải thất bại:\n  ' + failed.join('\n  '));
}

main().catch((e) => { console.error('❌ Lỗi:', e.message); process.exit(1); });
