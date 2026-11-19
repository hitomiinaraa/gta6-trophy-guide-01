// Leonida Trophy Atlas — tracker + cited guide for the 55 GTA VI PS5 trophies.
// Vanilla JS, no libraries, no network: loads only data/trophies.json and data/sources.json.
// Progress lives in localStorage; export/import move it as a file.

const KEY_EARNED = 'lta-earned-v1';
const KEY_COUNTS = 'lta-counts-v1';
const KEY_SPOILER = 'lta-spoiler-v1';

const STAGES = {
  1: 'S1 · Chapter 1',
  2: 'S2 · Chapter 2',
  3: 'S3 · Chapter 3',
  4: 'S4 · Chapter 4',
  5: 'S5 · Finale · Chapter 5',
  6: 'S6 · Cleanup — activities & collectibles',
  7: 'S7 · Free-roam — money & 100%',
};
const STAGE_WINDOWS = {
  1: 'Missable window: the balcony meditation closes when Chapter 1 ends.',
  3: 'Watch: Yago’s timed race carries an hourglass — save first.',
};
const KIND_LABELS = {
  story: 'Story', side: 'Side chains', collectible: 'Collectibles',
  activity: 'Activities', crime: 'Crime & heists', money: 'Money', misc: 'Misc',
};
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const GRADE_POINTS = { platinum: 300, gold: 90, silver: 30, bronze: 15 };

let DATA = null;      // trophies.json
let SOURCES = null;   // sources.json
let earned = new Set();
let counts = {};
let revealed = new Set(); // hidden trophies the reader chose to reveal (session only)
let spoiler = true;
let kindFilter = 'all';
let gradeFilter = 'all';
let sortBy = 'roadmap';
let query = '';
let selectedId = 28; // Positive Mental Attitude opens, as the contested trophy
let stageFilter = 0;

function loadState() {
  try { earned = new Set(JSON.parse(localStorage.getItem(KEY_EARNED) || '[]')); } catch (e) { earned = new Set(); }
  try { counts = JSON.parse(localStorage.getItem(KEY_COUNTS) || '{}'); } catch (e) { counts = {}; }
  const sp = localStorage.getItem(KEY_SPOILER);
  spoiler = sp === null ? true : sp === '1';
}
function saveState() {
  localStorage.setItem(KEY_EARNED, JSON.stringify([...earned]));
  localStorage.setItem(KEY_COUNTS, JSON.stringify(counts));
  localStorage.setItem(KEY_SPOILER, spoiler ? '1' : '0');
  const note = document.getElementById('savedNote');
  if (note) note.textContent = 'Saved in this browser · just now';
}

function trophyById(id) { return DATA.trophies.find((t) => t.id === id); }
function isHidden(t) { return t.hidden === true; }
function isMasked(t) { return spoiler && isHidden(t) && !earned.has(t.name) && !revealed.has(t.id); }
function guideSources(t) { return (t.sources || []).filter((n) => n !== 4); }
function trustOf(t) {
  if (t.unconfirmed || t.disagree || guideSources(t).length <= 1) return 'amber';
  return 'green';
}
function pointsOf(t) { return GRADE_POINTS[t.grade] || 0; }

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}
function tagSpan(text, cls) { return el('span', 'tag ' + cls, text); }

function renderHeader() {
  const total = DATA.trophies.length;
  const done = DATA.trophies.filter((t) => earned.has(t.name)).length;
  document.getElementById('earnedCount').textContent = done + ' / ' + total;
  document.getElementById('progressFill').style.width = Math.round((done / total) * 100) + '%';
  const gc = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of DATA.trophies) {
    gc[t.grade][1] += 1;
    if (earned.has(t.name)) gc[t.grade][0] += 1;
  }
  document.getElementById('gradeCounts').textContent =
    'P ' + gc.platinum[0] + '/' + gc.platinum[1] +
    ' · G ' + gc.gold[0] + '/' + gc.gold[1] +
    ' · S ' + gc.silver[0] + '/' + gc.silver[1] +
    ' · B ' + gc.bronze[0] + '/' + gc.bronze[1];
  const pts = DATA.trophies.reduce((s, t) => s + (earned.has(t.name) ? pointsOf(t) : 0), 0);
  document.getElementById('psnPoints').textContent = pts.toLocaleString('en-US') + ' / 1,350 PSN points';
  const left = total - done;
  document.getElementById('timeLeft').textContent =
    '≈ 200 h to platinum · difficulty 4/10 · ' + left + ' to go';
}

function renderAudit() {
  const total = DATA.trophies.length;
  const hidden = DATA.trophies.filter(isHidden).length;
  let steps = 0, cited = 0, single = 0, disagree = 0, unconfirmed = 0, watch = 0, missable = 0;
  let green = 0, amber = 0;
  for (const t of DATA.trophies) {
    for (const s of (t.steps || [])) { steps += 1; if (s.c && s.c.length) cited += 1; }
    if (guideSources(t).length <= 1) single += 1;
    if (t.disagree) disagree += 1;
    if (t.unconfirmed) unconfirmed += 1;
    if (t.missable === 'possible') missable += 1;
    if (t.missable === 'watch') watch += 1;
    if (trustOf(t) === 'green') green += 1; else amber += 1;
  }
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of DATA.trophies) grades[t.grade] += 1;
  const a = document.getElementById('audit');
  a.replaceChildren();
  const parts = [
    ['55 official', true],
    ['1P 2G 6S 46B', false],
    [hidden + ' hidden', false],
    ['55/55 guides cite a source', true],
    [cited + '/' + steps + ' steps cited', true],
    [SOURCES.length + ' sources read 20 Nov 2026', false],
    [missable + ' possibly missable', missable > 0],
    [watch + ' watch', watch > 0],
    [unconfirmed + ' unconfirmed', unconfirmed > 0],
    [single + ' single-source', false],
    [disagree + ' disagree', disagree > 0],
    [green + ' green · ' + amber + ' amber', false],
    ['1,350 PSN points', false],
  ];
  parts.forEach(([text, bold], i) => {
    if (i) a.appendChild(document.createTextNode(' · '));
    const s = el('span', null, text);
    if (bold) s.style.fontWeight = '700';
    a.appendChild(s);
  });
  const c = document.getElementById('citedBy');
  c.replaceChildren();
  c.appendChild(el('b', null, 'CITED BY '));
  SOURCES.forEach((s, i) => {
    if (i) c.appendChild(document.createTextNode('  '));
    const n = DATA.trophies.filter((t) => (t.sources || []).includes(s.n)).length;
    const span = el('span', null, '[' + s.n + '] ' + n + '/' + total);
    span.title = s.name + ' — ' + s.title;
    c.appendChild(span);
  });
}

function renderStages() {
  const box = document.getElementById('stageChips');
  box.replaceChildren();
  for (let s = 1; s <= 7; s += 1) {
    const inStage = DATA.trophies.filter((t) => t.stage === s);
    const done = inStage.filter((t) => earned.has(t.name)).length;
    const b = el('button', 'stage-chip' + (stageFilter === s ? ' sel' : ''), '');
    b.type = 'button';
    b.appendChild(el('span', null, STAGES[s].split(' · ')[0] + ' ' + done + '/' + inStage.length));
    if (STAGE_WINDOWS[s]) b.appendChild(el('span', 'risk', ' ⚠'));
    b.title = STAGES[s] + (STAGE_WINDOWS[s] ? ' — ' + STAGE_WINDOWS[s] : '');
    b.addEventListener('click', () => {
      stageFilter = stageFilter === s ? 0 : s;
      renderStages(); renderList();
    });
    box.appendChild(b);
  }
}

function kindCounts() {
  const m = { all: DATA.trophies.length, earned: 0, unearned: 0 };
  for (const t of DATA.trophies) {
    m[t.kind] = (m[t.kind] || 0) + 1;
    if (earned.has(t.name)) m.earned += 1; else m.unearned += 1;
  }
  m.missable = DATA.trophies.filter((t) => t.missable === 'possible').length;
  m.watch = DATA.trophies.filter((t) => t.missable === 'watch').length;
  m.unconfirmed = DATA.trophies.filter((t) => t.unconfirmed).length;
  return m;
}

function renderFilters() {
  const box = document.getElementById('filters');
  box.replaceChildren();
  const counts = kindCounts();
  const defs = [['all', 'All 55'], ...Object.keys(KIND_LABELS).map((k) => [k, KIND_LABELS[k]]),
    ['missable', 'Missable'], ['watch', 'Watch'], ['unconfirmed', 'Unconfirmed'],
    ['earned', 'Earned'], ['unearned', 'Unearned']];
  for (const [k, label] of defs) {
    const n = counts[k] === undefined ? 0 : counts[k];
    const b = el('button', 'chip' + (kindFilter === k ? ' sel' : ''), label + ' ' + n);
    b.type = 'button';
    b.addEventListener('click', () => { kindFilter = k; renderFilters(); renderList(); });
    box.appendChild(b);
  }
}

function visibleTrophies() {
  let list = DATA.trophies.slice();
  if (kindFilter === 'earned') list = list.filter((t) => earned.has(t.name));
  else if (kindFilter === 'unearned') list = list.filter((t) => !earned.has(t.name));
  else if (kindFilter === 'missable') list = list.filter((t) => t.missable === 'possible');
  else if (kindFilter === 'watch') list = list.filter((t) => t.missable === 'watch');
  else if (kindFilter === 'unconfirmed') list = list.filter((t) => t.unconfirmed);
  else if (kindFilter !== 'all') list = list.filter((t) => t.kind === kindFilter);
  if (gradeFilter !== 'all') list = list.filter((t) => t.grade === gradeFilter);
  if (stageFilter) list = list.filter((t) => t.stage === stageFilter);
  if (query) {
    const q = query.toLowerCase();
    list = list.filter((t) => {
      const hay = [t.name, t.description, t.guide || '', (t.steps || []).map((s) => s.t).join(' ')].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
  if (sortBy === 'official') list.sort((a, b) => a.id - b.id);
  else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'grade') list.sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else list.sort((a, b) => a.stage - b.stage || a.id - b.id);
  return list;
}

function renderList() {
  const box = document.getElementById('trophyList');
  box.replaceChildren();
  const list = visibleTrophies();
  document.getElementById('showing').textContent = 'Showing ' + list.length + ' of 55 trophies';
  let lastStage = 0;
  for (const t of list) {
    if (sortBy === 'roadmap' && t.stage !== lastStage) {
      lastStage = t.stage;
      box.appendChild(el('div', 'stage-head', STAGES[t.stage]));
    }
    const row = el('button', 'trow' + (selectedId === t.id ? ' sel' : ''));
    row.type = 'button';
    const boxEl = document.createElement('input');
    boxEl.type = 'checkbox';
    boxEl.checked = earned.has(t.name);
    boxEl.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    boxEl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleEarned(t);
    });
    row.appendChild(boxEl);
    const mid = el('div');
    if (isMasked(t)) {
      mid.appendChild(el('div', 'nm', 'Story trophy — hidden until earned'));
      mid.appendChild(el('div', 'ds', 'Description hidden by spoiler-safe mode.'));
    } else {
      mid.appendChild(el('div', 'nm', t.name));
      mid.appendChild(el('div', 'ds', t.description));
    }
    const tags = el('div', 'tags');
    tags.appendChild(tagSpan(t.grade, t.grade));
    tags.appendChild(tagSpan(KIND_LABELS[t.kind] || t.kind, ''));
    if (isHidden(t)) tags.appendChild(tagSpan('hidden on PSN', 'hidden'));
    if (t.missable === 'possible') tags.appendChild(tagSpan('possibly missable', 'missable'));
    if (t.missable === 'watch') tags.appendChild(tagSpan('watch', 'watch'));
    if (t.unconfirmed) tags.appendChild(tagSpan('unconfirmed', 'unconfirmed'));
    tags.appendChild(tagSpan(trustOf(t) === 'green' ? '● green' : '● amber', trustOf(t)));
    mid.appendChild(tags);
    row.appendChild(mid);
    if (t.count) {
      const got = counts[t.id] || 0;
      row.appendChild(el('span', 'cnt', got + '/' + t.count.need + ' ' + t.count.label));
    }
    row.addEventListener('click', () => { selectedId = t.id; renderList(); renderDetail(); });
    box.appendChild(row);
  }
  if (!list.length) box.appendChild(el('p', 'muted', 'No trophies match these filters.'));
}

function toggleEarned(t) {
  if (earned.has(t.name)) earned.delete(t.name);
  else earned.add(t.name);
  saveState();
  renderHeader(); renderAudit(); renderStages(); renderList(); renderDetail();
  if (document.querySelector('[data-tab="roadmap"].active')) renderRoadmap();
  if (document.querySelector('[data-tab="progress"].active')) renderProgress();
}

function citeMarks(nums) {
  return (nums || []).map((n) => '[' + n + ']').join('');
}

function renderDetail() {
  const box = document.getElementById('detail');
  box.replaceChildren();
  const t = trophyById(selectedId) || DATA.trophies[0];
  if (isMasked(t)) {
    box.appendChild(el('h2', null, 'Story trophy — hidden until earned'));
    box.appendChild(el('p', null, 'This trophy is hidden on PlayStation. Its name and description stay hidden while spoiler-safe mode is on.'));
    const b = el('button', 'ghost', 'Reveal this trophy');
    b.type = 'button';
    b.addEventListener('click', () => { revealed.add(t.id); renderList(); renderDetail(); });
    box.appendChild(b);
    return;
  }
  const head = el('div');
  head.appendChild(el('h2', null, t.name));
  box.appendChild(head);
  const kv = el('div', 'kv');
  kv.appendChild(tagSpan(t.grade + ' · ' + pointsOf(t) + ' PSN pts', t.grade));
  kv.appendChild(tagSpan(KIND_LABELS[t.kind] || t.kind, ''));
  kv.appendChild(tagSpan(STAGES[t.stage], ''));
  if (isHidden(t)) kv.appendChild(tagSpan('hidden on PSN', 'hidden'));
  kv.appendChild(tagSpan('Difficulty ' + (t.difficulty || 2) + '/5 · ' + (t.time || 'story') + ' · our estimate', ''));
  box.appendChild(kv);
  const off = el('div', 'official');
  off.appendChild(el('b', null, 'OFFICIAL DESCRIPTION · PLAYSTATION — '));
  off.appendChild(document.createTextNode('“' + t.description + '”'));
  box.appendChild(off);
  if (t.missable === 'possible') {
    const bn = el('div', 'banner miss');
    bn.appendChild(el('b', null, 'POSSIBLY MISSABLE — read this first'));
    bn.appendChild(document.createTextNode(t.missableNote || 'Do the Chapter 1 step before the chapter ends, and keep a Chapter 1 manual save until the trophy pops.'));
    box.appendChild(bn);
  }
  if (t.disagree) {
    const bn = el('div', 'banner dis');
    bn.appendChild(el('b', null, 'SOURCES DISAGREE — BOTH VERSIONS SHOWN'));
    bn.appendChild(document.createTextNode(t.disagree));
    box.appendChild(bn);
  }
  if (t.unconfirmed) {
    const bn = el('div', 'banner warn');
    bn.appendChild(el('b', null, 'TRIGGER UNCONFIRMED'));
    bn.appendChild(document.createTextNode('No source has confirmed how this trophy unlocks yet. What follows is the best current belief, labelled as such — do not treat it as settled.'));
    box.appendChild(bn);
  }
  box.appendChild(el('h3', null, 'In short'));
  box.appendChild(el('p', null, t.guide || ''));
  if (t.count) {
    const got = counts[t.id] || 0;
    const cw = el('div', 'counter');
    const minus = el('button', '', '−');
    minus.type = 'button';
    minus.addEventListener('click', () => { counts[t.id] = Math.max(0, got - 1); saveState(); renderDetail(); renderList(); });
    const plus = el('button', '', '+');
    plus.type = 'button';
    plus.addEventListener('click', () => { counts[t.id] = Math.min(t.count.need, got + 1); saveState(); renderDetail(); renderList(); });
    const label = el('span', null, got + ' / ' + t.count.need + ' ' + t.count.label);
    const bar = el('div', 'bar');
    const fill = el('div');
    fill.style.width = Math.round((got / t.count.need) * 100) + '%';
    bar.appendChild(fill);
    cw.appendChild(minus); cw.appendChild(label); cw.appendChild(bar); cw.appendChild(plus);
    box.appendChild(cw);
  }
  box.appendChild(el('h3', null, 'How to get it — in our own words, every step cited'));
  const ol = el('ol', 'steps');
  for (const s of (t.steps || [])) {
    const li = el('li', null, s.t + ' ');
    li.appendChild(el('span', 'cite', citeMarks(s.c)));
    ol.appendChild(li);
  }
  box.appendChild(ol);
  const mark = el('button', earned.has(t.name) ? 'ghost' : '', earned.has(t.name) ? '✓ Earned — click to unmark' : 'Mark earned');
  mark.type = 'button';
  mark.addEventListener('click', () => toggleEarned(t));
  box.appendChild(mark);
  const how = el('p', 'howto', 'Sources for this guide: ' +
    (t.sources || []).map((n) => '[' + n + '] ' + (SOURCES.find((s) => s.n === n) || {}).name).join(', ') +
    '. Citations are beside each step; the official description above is PlayStation’s own text.');
  box.appendChild(how);
  const trust = el('p', 'trust');
  trust.appendChild(el('b', null, trustOf(t) === 'green' ? '● Green — ' : '● Amber — '));
  trust.appendChild(document.createTextNode(trustOf(t) === 'green'
    ? 'backed by at least two guide sources and no disagreement.'
    : 'backed by a single guide source, or a source disagreement, or an unconfirmed trigger. Treat it with care.'));
  box.appendChild(trust);
}

function renderSources() {
  const box = document.getElementById('sourcePanel');
  box.replaceChildren();
  box.appendChild(el('h3', null, 'SOURCES — read 20 Nov 2026'));
  for (const s of SOURCES) {
    const n = DATA.trophies.filter((t) => (t.sources || []).includes(s.n)).length;
    const d = el('div', 'src');
    d.appendChild(el('span', 'n', '[' + s.n + ']'));
    d.appendChild(el('b', null, ' ' + s.name + ' — '));
    d.appendChild(document.createTextNode(s.title + ' '));
    const meta = el('div', 'meta', s.depth + ' · cited by ' + n + ' of 55 guides · ' + s.url);
    d.appendChild(meta);
    box.appendChild(d);
  }
  box.appendChild(el('p', 'howto', 'Every step cites its source by number. The official list [4] gives each trophy its name, description and grade.'));
}

function renderRoadmap() {
  const box = document.getElementById('roadmapView');
  box.replaceChildren();
  const wrap = el('div', 'cards');
  for (let s = 1; s <= 7; s += 1) {
    const inStage = DATA.trophies.filter((t) => t.stage === s);
    const done = inStage.filter((t) => earned.has(t.name)).length;
    const card = el('div', 'card');
    card.appendChild(el('h3', null, STAGES[s] + ' — ' + done + '/' + inStage.length + ' earned'));
    if (STAGE_WINDOWS[s]) card.appendChild(el('p', 'muted', STAGE_WINDOWS[s]));
    for (const t of inStage) {
      const row = el('div', 'row');
      row.appendChild(el('span', null, (earned.has(t.name) ? '✓ ' : '○ ') + (isMasked(t) ? 'Story trophy — hidden' : t.name)));
      const right = el('span', 'muted', t.grade + (t.missable === 'possible' ? ' · MISSABLE' : t.missable === 'watch' ? ' · watch' : ''));
      row.appendChild(right);
      card.appendChild(row);
    }
    wrap.appendChild(card);
  }
  box.appendChild(wrap);
  const note = el('p', 'muted', 'Order rule: story in chapter order, side finales when their questlines open, cleanup only after the story (nothing in cleanup is missable). The platinum pops when the last of the 54 lands.');
  box.appendChild(note);
}

function renderMissables() {
  const box = document.getElementById('missablesView');
  box.replaceChildren();
  const flagged = DATA.trophies.filter((t) => t.missable === 'possible' || t.missable === 'watch' || t.unconfirmed);
  const wrap = el('div', 'cards');
  for (const t of flagged) {
    const card = el('div', 'card');
    card.appendChild(el('h3', null, t.name + ' — ' + t.grade));
    if (t.missable === 'possible') card.appendChild(el('p', null, 'POSSIBLY MISSABLE. ' + (t.missableNote || '')));
    if (t.missable === 'watch') card.appendChild(el('p', null, 'WATCH. ' + (t.missableNote || 'Timing or trigger needs care — see the guide.')));
    if (t.unconfirmed) card.appendChild(el('p', null, 'UNCONFIRMED. No source has confirmed the trigger yet.'));
    if (t.disagree) card.appendChild(el('p', null, 'Sources disagree: ' + t.disagree));
    const b = el('button', 'small', 'Open guide');
    b.type = 'button';
    b.addEventListener('click', () => { selectedId = t.id; switchTab('checklist'); });
    card.appendChild(b);
    wrap.appendChild(card);
  }
  box.appendChild(wrap);
  const safe = el('p', null, 'Everything else is safe: all other trophies stay available in free-roam after the story, and the 100% checklist needs only part of most activities.');
  box.appendChild(safe);
}

function renderMatrix() {
  const box = document.getElementById('matrixView');
  box.replaceChildren();
  const table = el('table', 'matrix');
  const head = el('tr');
  for (const h of ['#', 'Source', 'Read depth', 'Guides citing it', 'What it covers']) {
    head.appendChild(el('th', null, h));
  }
  table.appendChild(head);
  for (const s of SOURCES) {
    const n = DATA.trophies.filter((t) => (t.sources || []).includes(s.n)).length;
    const tr = el('tr');
    tr.appendChild(el('td', null, '[' + s.n + ']'));
    tr.appendChild(el('td', null, s.name + ' — ' + s.title));
    tr.appendChild(el('td', null, s.depth));
    tr.appendChild(el('td', null, n + ' / 55'));
    tr.appendChild(el('td', null, s.covers));
    table.appendChild(tr);
  }
  box.appendChild(table);
  const note = el('p', 'muted', 'A guide step counts as cited only when its number appears beside the step. The official list [4] is a list, not a guide: it backs names, descriptions and grades, never a how-to step.');
  box.appendChild(note);
}

function renderProgress() {
  const box = document.getElementById('progressView');
  box.replaceChildren();
  const wrap = el('div', 'pbars');
  const groups = [['By grade', ['platinum', 'gold', 'silver', 'bronze']],
    ['By kind', Object.keys(KIND_LABELS)], ['By stage', [1, 2, 3, 4, 5, 6, 7]]];
  for (const [title, keys] of groups) {
    wrap.appendChild(el('h3', null, title));
    for (const k of keys) {
      const inGroup = typeof k === 'number'
        ? DATA.trophies.filter((t) => t.stage === k)
        : DATA.trophies.filter((t) => t.kind === k || t.grade === k);
      const done = inGroup.filter((t) => earned.has(t.name)).length;
      const row = el('div', 'row');
      row.appendChild(el('span', null, typeof k === 'number' ? STAGES[k] : (KIND_LABELS[k] || k)));
      const bar = el('div', 'bar');
      const fill = el('div');
      fill.style.width = (inGroup.length ? Math.round((done / inGroup.length) * 100) : 0) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(el('span', null, done + '/' + inGroup.length));
      wrap.appendChild(row);
    }
  }
  box.appendChild(wrap);
  const pts = DATA.trophies.reduce((s, t) => s + (earned.has(t.name) ? pointsOf(t) : 0), 0);
  box.appendChild(el('p', null, 'PSN points earned: ' + pts.toLocaleString('en-US') + ' of 1,350. The full run is ≈ 200 h at difficulty 4/10 [1][2][3] — story 60–80 h, the rest cleanup.'));
}

function switchTab(name) {
  for (const b of document.querySelectorAll('#tabs button')) {
    b.classList.toggle('active', b.dataset.tab === name);
  }
  for (const s of document.querySelectorAll('#view .tab')) {
    s.classList.toggle('active', s.id === 'tab-' + name);
  }
  if (name === 'roadmap') renderRoadmap();
  if (name === 'missables') renderMissables();
  if (name === 'sources') renderMatrix();
  if (name === 'progress') renderProgress();
  if (name === 'checklist') { renderList(); renderDetail(); }
}

function exportProgress() {
  const payload = { app: 'leonida-trophy-atlas', version: 1, savedAt: new Date().toISOString(), earned: [...earned], counts };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-atlas-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = new Set(DATA.trophies.map((t) => t.name));
    earned = new Set((data.earned || []).filter((n) => names.has(n)));
    counts = {};
    for (const [id, v] of Object.entries(data.counts || {})) {
      const t = trophyById(Number(id));
      if (t && t.count) counts[id] = Math.max(0, Math.min(t.count.need, Number(v) || 0));
    }
    saveState();
    renderAll();
  } catch (e) {
    alert('That file is not a Leonida Trophy Atlas export.');
  }
}

function renderAll() {
  renderHeader(); renderAudit(); renderStages(); renderFilters(); renderList(); renderDetail(); renderSources();
}

async function init() {
  loadState();
  const [t, s] = await Promise.all([
    (await fetch('data/trophies.json')).json(),
    (await fetch('data/sources.json')).json(),
  ]);
  DATA = t;
  SOURCES = s.sources;
  document.getElementById('spoilerToggle').checked = spoiler;
  document.getElementById('spoilerToggle').addEventListener('change', (e) => {
    spoiler = e.target.checked;
    saveState(); renderList(); renderDetail();
  });
  document.getElementById('gradeFilter').addEventListener('change', (e) => { gradeFilter = e.target.value; renderList(); });
  document.getElementById('sortBy').addEventListener('change', (e) => { sortBy = e.target.value; renderList(); });
  document.getElementById('search').addEventListener('input', (e) => { query = e.target.value; renderList(); });
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
  document.getElementById('resetBtn').addEventListener('click', () => {
    earned = new Set(); counts = {}; saveState(); renderAll();
  });
  for (const b of document.querySelectorAll('#tabs button')) {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  }
  renderAll();
}

init();
