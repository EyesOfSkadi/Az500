/* AZ-500 Question Bank — offline study app.
   Data comes from questions-data.js (window.QUESTION_BANK). */
(() => {
  'use strict';

  const BANK = window.QUESTION_BANK;
  const QS = BANK.questions;
  const LETTERS = 'ABCDEFGH';
  const LS = 'az500.v1';

  /* ---------------- persisted state ---------------- */
  const store = Object.assign(
    { theme: 'light', starred: [], stats: {}, showAnswers: true },
    JSON.parse(localStorage.getItem(LS) || '{}')
  );
  const starred = new Set(store.starred);
  const stats = store.stats; // id -> {ok:n, bad:n}
  const save = () => {
    store.starred = [...starred];
    localStorage.setItem(LS, JSON.stringify(store));
  };

  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* ---------------- text rendering ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Escape, then unwrap markdown autolinks (<mail@x.com>) and simple emphasis.
  function fmt(s) {
    return esc(s)
      .replace(/&lt;((?:https?:\/\/|mailto:)?[^\s&]+@[^\s&]+|https?:\/\/[^\s&]+)&gt;/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
  function highlight(html, terms) {
    if (!terms.length) return html;
    // Split on tags so we never inject inside an attribute.
    return html.split(/(<[^>]+>)/).map((chunk) => {
      if (chunk.startsWith('<')) return chunk;
      let out = chunk;
      for (const t of terms) {
        out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
      }
      return out;
    }).join('');
  }
  const norm = (s) => s.toLowerCase();

  /* ---------------- corrections (corrections.js) ----------------
     Sửa lại các câu bị đánh dấu sai đáp án ở bộ đề gốc. Khớp lựa chọn theo
     chuỗi con thay vì chỉ số, để không bị lệch nếu upstream đảo thứ tự. */
  function applyCorrections() {
    const list = window.CORRECTIONS || [];
    const warn = [];
    let applied = 0;

    for (const c of list) {
      const q = QS.find((x) => x.id === c.id);
      if (!q) { warn.push(`#${c.id}: không tìm thấy câu hỏi (id lệch?)`); continue; }
      if (c.verify && !norm(q.question).includes(norm(c.verify))) {
        warn.push(`#${c.id}: nội dung đề đã thay đổi so với lúc ghi correction — BỎ QUA để tránh sửa sai câu`);
        continue;
      }
      if (Array.isArray(c.correct) && c.correct.length) {
        const idx = c.correct.map((sn) => q.options.findIndex((o) => norm(o.text).includes(norm(sn))));
        if (idx.some((i) => i < 0)) {
          warn.push(`#${c.id}: không khớp được lựa chọn đúng — BỎ QUA`);
          continue;
        }
        q.options.forEach((o, i) => { o.correct = idx.includes(i); });
        q.correctCount = idx.length;
        q.multi = idx.length > 1;
      }
      q.corrected = true;
      if (c.note) q.note = c.note;
      if (c.answer) q.answerText = c.answer;
      applied++;
    }

    if (warn.length) console.warn('[corrections] Có vấn đề:\n  ' + warn.join('\n  '));
    if (applied) console.info(`[corrections] Đã áp dụng ${applied}/${list.length} correction.`);
    return { applied, warn };
  }
  const CORR = applyCorrections();

  /* precomputed search index */
  QS.forEach((q) => {
    q._hay = norm(q.question + ' ' + q.options.map((o) => o.text).join(' '));
  });

  function imgsHtml(list) {
    if (!list || !list.length) return '';
    return '<div class="imgs">' + list.map((src) =>
      `<img loading="lazy" src="${esc(src)}" alt="">`).join('') + '</div>';
  }

  /* ---------------- question card renderer ----------------
     mode: 'browse' | 'answered' | 'interactive'
     picked: Set of option indexes  */
  function renderCard(q, opts = {}) {
    const { mode = 'browse', picked = new Set(), revealed = true, terms = [], onPick } = opts;
    const card = el('div', 'card');
    card.dataset.qid = q.id;
    if (mode === 'browse') card.id = 'q' + q.id;
    if (mode === 'browse' && !revealed) card.classList.add('answers-hidden');

    const head = el('div', 'q-head');
    head.appendChild(el('span', 'q-num', '#' + q.id));
    head.appendChild(el('div', 'q-text', highlight(fmt(q.question), terms)));

    const tags = el('div', 'q-tags');
    if (q.corrected) {
      const t = el('span', 'tag fixed', '⚠ Đã sửa');
      t.title = 'Đáp án ở bộ đề gốc bị sai và đã được sửa lại — xem ghi chú bên dưới';
      tags.appendChild(t);
    }
    if (q.type === 'lab') tags.appendChild(el('span', 'tag lab', 'LAB'));
    else if (q.multi) tags.appendChild(el('span', 'tag multi', `Chọn ${q.correctCount}`));
    const st = stats[q.id];
    if (st && (st.ok || st.bad)) tags.appendChild(el('span', 'tag', `✔${st.ok || 0} ✘${st.bad || 0}`));
    const star = el('button', 'star', '⭐');
    star.title = 'Đánh dấu để xem lại';
    star.setAttribute('aria-pressed', starred.has(q.id));
    star.onclick = () => {
      starred.has(q.id) ? starred.delete(q.id) : starred.add(q.id);
      star.setAttribute('aria-pressed', starred.has(q.id));
      save();
    };
    tags.appendChild(star);
    head.appendChild(tags);
    card.appendChild(head);

    if (q.images.length) card.insertAdjacentHTML('beforeend', imgsHtml(q.images));

    const ul = el('ul', 'opts');
    q.options.forEach((o, i) => {
      const li = el('li', 'opt');
      const isPicked = picked.has(i);
      if (mode === 'interactive') {
        li.classList.add('clickable');
        if (isPicked) li.classList.add('picked');
      } else {
        if (o.correct) li.classList.add('correct');
        else if (isPicked) li.classList.add('wrong');
        if (isPicked) li.classList.add(o.correct ? 'correct' : 'wrong');
      }
      const markSym = mode === 'interactive'
        ? (isPicked ? '✓' : LETTERS[i])
        : (o.correct ? '✓' : (isPicked ? '✕' : LETTERS[i]));
      li.appendChild(el('span', 'mark', markSym));
      const body = el('div', '', highlight(fmt(o.text), terms) + imgsHtml(o.images));
      li.appendChild(body);
      if (mode === 'interactive' && onPick) li.onclick = () => onPick(i);
      ul.appendChild(li);
    });
    card.appendChild(ul);

    // Ghi chú của correction — chỉ hiện khi đáp án đã được tiết lộ
    if (q.corrected && (q.note || q.answerText) && mode !== 'interactive') {
      const note = el('div', 'fix-note');
      note.appendChild(el('div', 'fix-note-head', '⚠ Ghi chú: đáp án bộ đề gốc bị sai'));
      if (q.answerText) {
        note.appendChild(el('div', 'fix-answer', '<b>Đáp án đúng:</b> ' + fmt(q.answerText)));
      }
      if (q.note) note.appendChild(el('div', '', fmt(q.note)));
      card.appendChild(note);
    }
    return card;
  }

  /* ---------------- lightbox ---------------- */
  const lb = $('#lightbox');
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.imgs img');
    if (img) {
      lb.querySelector('img').src = img.src;
      lb.classList.remove('hidden');
      return;
    }
    if (e.target.closest('#lightbox')) lb.classList.add('hidden');
  });

  /* ---------------- theme ---------------- */
  function applyTheme() {
    document.documentElement.dataset.theme = store.theme;
    $('#themeBtn').textContent = store.theme === 'dark' ? '☀️' : '🌙';
  }
  $('#themeBtn').onclick = () => {
    store.theme = store.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    save();
  };
  applyTheme();

  $('#totalBadge').textContent = QS.length + ' câu';
  $('#srcLink').href = BANK.source;

  /* =================== BROWSE =================== */
  const listEl = $('#list');
  const PAGE = 25;
  let shown = PAGE;
  let filtered = QS;

  function currentTerms() {
    return $('#search').value.trim().split(/\s+/).filter((t) => t.length > 1);
  }

  function computeFilter() {
    const q = norm($('#search').value.trim());
    const terms = q ? q.split(/\s+/).filter(Boolean) : [];
    const kind = $('#filterSelect').value;
    filtered = QS.filter((x) => {
      if (kind === 'starred' && !starred.has(x.id)) return false;
      if (kind === 'multi' && !x.multi) return false;
      if (kind === 'images' && !x.images.length && !x.options.some((o) => o.images.length)) return false;
      if (kind === 'lab' && x.type !== 'lab') return false;
      if (kind === 'corrected' && !x.corrected) return false;
      if (kind === 'wrong' && !(stats[x.id] && stats[x.id].bad)) return false;
      return terms.every((t) => x._hay.includes(t));
    });
  }

  function renderBrowse(reset = true) {
    if (reset) { computeFilter(); shown = PAGE; listEl.innerHTML = ''; }
    const slice = filtered.slice(listEl.children.length, shown);
    const terms = currentTerms();
    const revealed = store.showAnswers;
    const frag = document.createDocumentFragment();
    slice.forEach((q) => frag.appendChild(renderCard(q, { mode: 'browse', revealed, terms })));
    listEl.appendChild(frag);

    $('#listEmpty').classList.toggle('hidden', filtered.length > 0);
    $('#loadMore').classList.toggle('hidden', listEl.children.length >= filtered.length);
    $('#loadMore').textContent = `Tải thêm… (còn ${filtered.length - listEl.children.length})`;
    $('#browseStats').innerHTML =
      `Hiển thị <b>${listEl.children.length}</b>/<b>${filtered.length}</b> câu` +
      (filtered.length !== QS.length ? ` (lọc từ ${QS.length})` : '') +
      ` · ⭐ ${starred.size} đã đánh dấu`;
    $('#clearSearch').classList.toggle('hidden', !$('#search').value);
  }

  /* ---------------- nhảy tới một câu bất kỳ ----------------
     Danh sách được phân trang 25 câu/lần, nên phải render tới vị trí của câu
     đó trước khi cuộn. Nếu câu đang bị bộ lọc/từ khoá loại ra thì xoá lọc. */
  let flashTimer;
  function jumpTo(rawId) {
    const id = parseInt(String(rawId).replace(/[^0-9]/g, ''), 10);
    if (!id) return false;
    const q = QS.find((x) => x.id === id);
    if (!q) {
      notice(`Không có câu #${id} — chỉ có câu 1 đến ${QS.length}.`, true);
      return false;
    }

    switchTab('browse');

    // Câu bị lọc mất → xoá từ khoá và bộ lọc để chắc chắn tìm thấy
    let cleared = false;
    if (!filtered.includes(q)) {
      if ($('#search').value || $('#filterSelect').value !== 'all') {
        $('#search').value = '';
        $('#filterSelect').value = 'all';
        cleared = true;
      }
      renderBrowse();
    }

    const idx = filtered.indexOf(q);
    if (idx < 0) { notice(`Không tìm được câu #${id}.`, true); return false; }

    // Render thêm cho đủ tới vị trí cần
    if (idx >= listEl.children.length) {
      shown = Math.max(shown, idx + PAGE);
      renderBrowse(false);
    }

    const card = listEl.querySelector(`[data-qid="${id}"]`);
    if (!card) { notice(`Không hiển thị được câu #${id}.`, true); return false; }

    // Ảnh dùng lazy-load và không khai báo kích thước, nên khi ảnh phía trên
    // tải xong thì layout dịch và câu đích trôi khỏi tầm nhìn. Cuộn lại vài
    // lần trong ~1,2s để bám đúng vị trí.
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    [200, 500, 1200].forEach((ms) => setTimeout(() => {
      if (!card.isConnected) return;
      const top = card.getBoundingClientRect().top;
      const target = window.innerHeight / 2 - card.offsetHeight / 2;
      if (Math.abs(top - Math.max(80, target)) > 120) {
        card.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }, ms));

    listEl.querySelectorAll('.card.flash').forEach((c) => c.classList.remove('flash'));
    card.classList.add('flash');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => card.classList.remove('flash'), 2000);

    history.replaceState(null, '', '#q' + id);
    notice(`Đã tới câu #${id}${cleared ? ' (đã xoá bộ lọc để tìm thấy câu này)' : ''}.`);
    return true;
  }

  function notice(msg, isError) {
    const box = $('#jumpNotice');
    box.textContent = msg;
    box.className = 'jump-notice' + (isError ? ' err' : '');
    clearTimeout(notice._t);
    notice._t = setTimeout(() => { box.textContent = ''; box.className = 'jump-notice'; }, 4000);
  }

  const jumpInput = $('#jumpTo');
  const doJump = () => { if (jumpTo(jumpInput.value)) jumpInput.value = ''; };
  $('#jumpBtn').onclick = doJump;
  jumpInput.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doJump(); }
    else if (e.key === 'Escape') { jumpInput.value = ''; jumpInput.blur(); }
  };

  // Hỗ trợ URL dạng .../index.html#q32 — mở trực tiếp tới câu đó
  function jumpFromHash() {
    const m = /^#q(\d+)$/.exec(location.hash);
    if (m) jumpTo(m[1]);
    return !!m;
  }
  window.addEventListener('hashchange', jumpFromHash);
  // Trình duyệt tự phục hồi vị trí cuộn SAU khi script chạy, ghi đè cú nhảy
  // của ta. Tắt phục hồi và nhảy lại lúc 'load' khi layout đã ổn định.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('load', () => { jumpFromHash(); });

  let t;
  $('#search').oninput = () => { clearTimeout(t); t = setTimeout(() => renderBrowse(), 140); };
  $('#clearSearch').onclick = () => { $('#search').value = ''; renderBrowse(); $('#search').focus(); };
  $('#filterSelect').onchange = () => renderBrowse();
  $('#loadMore').onclick = () => { shown += PAGE; renderBrowse(false); };

  const ansBtn = $('#toggleAnswers');
  function syncAnsBtn() {
    ansBtn.setAttribute('aria-pressed', store.showAnswers);
    ansBtn.textContent = store.showAnswers ? 'Hiện đáp án' : 'Ẩn đáp án';
  }
  ansBtn.onclick = () => {
    store.showAnswers = !store.showAnswers;
    syncAnsBtn(); save();
    listEl.querySelectorAll('.card').forEach((c) => c.classList.toggle('answers-hidden', !store.showAnswers));
  };
  syncAnsBtn();

  /* =================== PRACTICE =================== */
  const prac = { order: [], i: 0, picked: new Set(), checked: false, ok: 0, bad: 0 };

  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function pracStart(pool) {
    prac.order = shuffle(pool.length ? pool : QS);
    prac.i = 0; prac.ok = 0; prac.bad = 0;
    pracGo(0);
  }

  function pracGo(i) {
    prac.i = Math.max(0, Math.min(i, prac.order.length - 1));
    prac.picked = new Set();
    prac.checked = false;
    pracRender();
  }

  function pracRender() {
    const q = prac.order[prac.i];
    if (!q) return;
    const holder = $('#pracCard');
    holder.innerHTML = '';

    const card = renderCard(q, {
      mode: prac.checked ? 'answered' : 'interactive',
      picked: prac.picked,
      onPick: (idx) => {
        if (prac.checked) return;
        if (q.multi) prac.picked.has(idx) ? prac.picked.delete(idx) : prac.picked.add(idx);
        else { prac.picked.clear(); prac.picked.add(idx); }
        pracRender();
      },
    });

    const foot = el('div', 'practice-foot');
    const check = el('button', 'pill primary', prac.checked ? 'Câu tiếp →' : 'Kiểm tra');
    check.disabled = !prac.checked && prac.picked.size === 0 && q.type !== 'lab';
    check.onclick = () => (prac.checked ? pracGo(prac.i + 1) : pracCheck(q));
    foot.appendChild(check);

    const reveal = el('button', 'pill', 'Xem đáp án');
    reveal.onclick = () => { prac.checked = true; pracRender(); };
    if (!prac.checked) foot.appendChild(reveal);

    if (prac.checked) {
      const correctSet = new Set(q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0));
      const same = prac.picked.size === correctSet.size && [...prac.picked].every((i) => correctSet.has(i));
      foot.appendChild(el('span', 'verdict ' + (same ? 'ok' : 'bad'),
        q.type === 'lab' ? 'Đáp án tham khảo ↑' : (same ? '✔ Chính xác' : '✘ Chưa đúng')));
    }

    foot.appendChild(el('span', 'spacer'));
    const prev = el('button', 'pill', '← Trước');
    prev.disabled = prac.i === 0;
    prev.onclick = () => pracGo(prac.i - 1);
    const next = el('button', 'pill', 'Sau →');
    next.disabled = prac.i >= prac.order.length - 1;
    next.onclick = () => pracGo(prac.i + 1);
    foot.appendChild(prev);
    foot.appendChild(next);
    card.appendChild(foot);
    holder.appendChild(card);

    $('#pracProgress').style.width = ((prac.i + 1) / prac.order.length * 100) + '%';
    const done = prac.ok + prac.bad;
    $('#pracStats').innerHTML =
      `Câu <b>${prac.i + 1}</b>/<b>${prac.order.length}</b> · ` +
      `Đúng <b style="color:var(--ok)">${prac.ok}</b> · Sai <b style="color:var(--bad)">${prac.bad}</b>` +
      (done ? ` · Tỷ lệ <b>${Math.round(prac.ok / done * 100)}%</b>` : '') +
      ` <button class="pill" id="pracReshuffle" style="margin-left:8px">🔀 Trộn lại</button>` +
      ` <button class="pill" id="pracStarredOnly" style="margin-left:4px">⭐ Chỉ câu đánh dấu</button>` +
      ` <button class="pill" id="pracWrongOnly" style="margin-left:4px">Luyện câu từng sai</button>` +
      ` <span class="jump-wrap" style="margin-left:4px"><span class="hash">#</span>` +
      `<input id="pracJump" type="text" inputmode="numeric" autocomplete="off" placeholder="Tới câu"` +
      ` title="Nhập số câu rồi nhấn Enter"></span>`;
    $('#pracReshuffle').onclick = () => pracStart(QS);
    $('#pracStarredOnly').onclick = () => {
      const pool = QS.filter((q) => starred.has(q.id));
      if (!pool.length) return alert('Bạn chưa đánh dấu câu nào. Bấm ⭐ ở câu hỏi để đánh dấu.');
      pracStart(pool);
    };
    $('#pracWrongOnly').onclick = () => {
      const pool = QS.filter((q) => stats[q.id] && stats[q.id].bad);
      if (!pool.length) return alert('Chưa có câu nào trả lời sai.');
      pracStart(pool);
    };

    // Nhảy tới một câu trong bộ đang luyện (bộ đã trộn nên phải tìm theo id)
    const pj = $('#pracJump');
    pj.onkeydown = (e) => {
      if (e.key === 'Escape') { pj.value = ''; pj.blur(); return; }
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const id = parseInt(pj.value.replace(/[^0-9]/g, ''), 10);
      if (!id) return;
      const at = prac.order.findIndex((x) => x.id === id);
      if (at < 0) {
        alert(`Câu #${id} không nằm trong bộ đang luyện.\n\n` +
          `Bộ hiện tại chỉ có ${prac.order.length} câu. Bấm "🔀 Trộn lại" để luyện toàn bộ ` +
          `${QS.length} câu, hoặc dùng ô "Tới câu" ở tab Tra cứu.`);
        return;
      }
      pj.value = '';
      pracGo(at);
    };
  }

  function pracCheck(q) {
    const correctSet = new Set(q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0));
    const same = prac.picked.size === correctSet.size && [...prac.picked].every((i) => correctSet.has(i));
    if (q.type !== 'lab') {
      const s = (stats[q.id] = stats[q.id] || { ok: 0, bad: 0 });
      same ? (s.ok++, prac.ok++) : (s.bad++, prac.bad++);
      save();
    }
    prac.checked = true;
    pracRender();
  }

  /* =================== EXAM =================== */
  const exam = { list: [], answers: {}, i: 0, endAt: null, timer: null, pass: 70, submitted: false };

  $('#examStart').onclick = () => {
    const n = Math.min(+$('#examCount').value, QS.length);
    const mins = +$('#examTime').value;
    exam.list = shuffle(QS).slice(0, n);
    exam.answers = {};
    exam.i = 0;
    exam.pass = +$('#examPass').value;
    exam.submitted = false;
    exam.endAt = mins ? Date.now() + mins * 60000 : null;
    exam.startAt = Date.now();
    $('#examSetup').classList.add('hidden');
    $('#examResult').classList.add('hidden');
    $('#examRun').classList.remove('hidden');
    clearInterval(exam.timer);
    exam.timer = setInterval(tickTimer, 500);
    tickTimer();
    examRender();
  };

  function tickTimer() {
    const t = $('#examTimer');
    if (exam.endAt) {
      const left = exam.endAt - Date.now();
      if (left <= 0) { t.textContent = '00:00'; examSubmit(); return; }
      t.textContent = mmss(left);
      t.classList.toggle('low', left < 5 * 60000);
    } else {
      t.textContent = mmss(Date.now() - exam.startAt);
    }
  }
  function mmss(ms) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }

  function examRender() {
    const q = exam.list[exam.i];
    const picked = exam.answers[q.id] || new Set();
    const holder = $('#examCard');
    holder.innerHTML = '';
    holder.appendChild(renderCard(q, {
      mode: 'interactive',
      picked,
      onPick: (idx) => {
        const set = exam.answers[q.id] || (exam.answers[q.id] = new Set());
        if (q.multi) set.has(idx) ? set.delete(idx) : set.add(idx);
        else { set.clear(); set.add(idx); }
        examRender();
      },
    }));

    const answered = Object.values(exam.answers).filter((s) => s.size).length;
    $('#examProgressText').textContent = `Câu ${exam.i + 1}/${exam.list.length} · đã trả lời ${answered}`;
    $('#examPrev').disabled = exam.i === 0;
    $('#examNext').disabled = exam.i >= exam.list.length - 1;

    const nav = $('#examNav');
    nav.innerHTML = '';
    exam.list.forEach((x, i) => {
      const b = el('button', '', String(i + 1));
      if ((exam.answers[x.id] || new Set()).size) b.classList.add('answered');
      if (i === exam.i) b.classList.add('current');
      b.onclick = () => { exam.i = i; examRender(); };
      nav.appendChild(b);
    });
  }

  $('#examPrev').onclick = () => { exam.i = Math.max(0, exam.i - 1); examRender(); };
  $('#examNext').onclick = () => { exam.i = Math.min(exam.list.length - 1, exam.i + 1); examRender(); };
  $('#examSubmit').onclick = () => {
    const answered = Object.values(exam.answers).filter((s) => s.size).length;
    const left = exam.list.length - answered;
    if (left && !confirm(`Còn ${left} câu chưa trả lời. Nộp bài luôn?`)) return;
    examSubmit();
  };

  function examSubmit() {
    if (exam.submitted) return;
    exam.submitted = true;
    clearInterval(exam.timer);

    let ok = 0;
    const graded = exam.list.map((q) => {
      const picked = exam.answers[q.id] || new Set();
      const correctSet = new Set(q.options.map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0));
      const right = picked.size === correctSet.size && [...picked].every((i) => correctSet.has(i));
      if (right) ok++;
      if (q.type !== 'lab' && picked.size) {
        const s = (stats[q.id] = stats[q.id] || { ok: 0, bad: 0 });
        right ? s.ok++ : s.bad++;
      }
      return { q, picked, right };
    });
    save();

    const pct = Math.round(ok / exam.list.length * 100);
    const pass = pct >= exam.pass;
    const res = $('#examResult');
    res.innerHTML = '';

    const hero = el('div', 'card score-hero');
    hero.innerHTML =
      `<div class="pct ${pass ? 'pass' : 'fail'}">${pct}%</div>` +
      `<div class="sub">${ok}/${exam.list.length} câu đúng · ` +
      `${pass ? '✅ ĐẠT' : '❌ CHƯA ĐẠT'} (mốc ${exam.pass}%) · thời gian ${mmss(Date.now() - exam.startAt)}</div>`;
    const again = el('button', 'pill primary', 'Thi lại');
    again.style.marginTop = '16px';
    again.onclick = () => {
      $('#examResult').classList.add('hidden');
      $('#examSetup').classList.remove('hidden');
    };
    const onlyWrong = el('button', 'pill', 'Luyện lại các câu sai');
    onlyWrong.style.margin = '16px 0 0 8px';
    onlyWrong.onclick = () => {
      const pool = graded.filter((g) => !g.right).map((g) => g.q);
      if (!pool.length) return alert('Bạn không sai câu nào 🎉');
      switchTab('practice');
      pracStart(pool);
    };
    hero.appendChild(again);
    hero.appendChild(onlyWrong);
    res.appendChild(hero);

    const nav = el('div', 'nav-grid');
    graded.forEach((g, i) => {
      const b = el('button', g.right ? 'res-ok' : 'res-bad', String(i + 1));
      b.onclick = () => res.querySelector(`[data-qid="${g.q.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nav.appendChild(b);
    });
    res.appendChild(el('div', 'meta-line', 'Xem lại chi tiết (bấm số để nhảy tới câu):'));
    res.appendChild(nav);

    graded.forEach((g) => res.appendChild(renderCard(g.q, { mode: 'answered', picked: g.picked })));

    $('#examRun').classList.add('hidden');
    res.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* =================== tabs =================== */
  const views = { browse: $('#view-browse'), practice: $('#view-practice'), exam: $('#view-exam') };
  let tab = 'browse';
  function switchTab(name) {
    tab = name;
    for (const k in views) views[k].classList.toggle('hidden', k !== name);
    ['browse', 'practice', 'exam'].forEach((k) =>
      $('#tab-' + k).setAttribute('aria-selected', k === name));
    $('#browseToolbar').classList.toggle('hidden', name !== 'browse');
    $('#browseMeta').classList.toggle('hidden', name !== 'browse');
    if (name === 'practice' && !prac.order.length) pracStart(QS);
  }
  $('#tab-browse').onclick = () => switchTab('browse');
  $('#tab-practice').onclick = () => switchTab('practice');
  $('#tab-exam').onclick = () => switchTab('exam');

  /* =================== keyboard =================== */
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('hidden')) {
      if (e.key === 'Escape') lb.classList.add('hidden');
      return;
    }
    const typing = /input|textarea|select/i.test(e.target.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); switchTab('browse'); $('#search').focus(); return; }
    if (e.key.toLowerCase() === 'g' && !typing) {
      e.preventDefault();
      switchTab('browse');
      $('#jumpTo').focus();
      $('#jumpTo').select();
      return;
    }
    if (typing) return;

    if (tab === 'practice') {
      const q = prac.order[prac.i];
      if (!q) return;
      if (/^[1-9]$/.test(e.key)) {
        const idx = +e.key - 1;
        if (idx < q.options.length && !prac.checked) {
          if (q.multi) prac.picked.has(idx) ? prac.picked.delete(idx) : prac.picked.add(idx);
          else { prac.picked.clear(); prac.picked.add(idx); }
          pracRender();
        }
      } else if (e.key === 'Enter') {
        prac.checked ? pracGo(prac.i + 1) : (prac.picked.size || q.type === 'lab') && pracCheck(q);
      } else if (e.key === 'ArrowRight') pracGo(prac.i + 1);
      else if (e.key === 'ArrowLeft') pracGo(prac.i - 1);
      else if (e.key.toLowerCase() === 's') {
        starred.has(q.id) ? starred.delete(q.id) : starred.add(q.id);
        save(); pracRender();
      }
    } else if (tab === 'exam' && !$('#examRun').classList.contains('hidden')) {
      const q = exam.list[exam.i];
      if (/^[1-9]$/.test(e.key) && +e.key - 1 < q.options.length) {
        const set = exam.answers[q.id] || (exam.answers[q.id] = new Set());
        const idx = +e.key - 1;
        if (q.multi) set.has(idx) ? set.delete(idx) : set.add(idx);
        else { set.clear(); set.add(idx); }
        examRender();
      } else if (e.key === 'ArrowRight') { exam.i = Math.min(exam.list.length - 1, exam.i + 1); examRender(); }
      else if (e.key === 'ArrowLeft') { exam.i = Math.max(0, exam.i - 1); examRender(); }
    }
  });

  renderBrowse();
  jumpFromHash();
})();
