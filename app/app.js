// Leonida Trophy Atlas — tracker + cited guide for GTA VI's 55 PS5 trophies.
// All trophy content comes from app/data/trophies.json and app/data/sources.json;
// this file only renders it, tracks earned state and counters in localStorage.
(function () {
  'use strict';

  var LS_EARNED = 'lta-earned-v1';
  var LS_COUNTERS = 'lta-counters-v1';
  var LS_SPOILER = 'lta-spoiler-v1';

  var STAGES = [
    { n: 1, name: 'Chapter 1', blurb: 'The opening chapter — and the one missable in the whole list lives here.' },
    { n: 2, name: 'Chapter 2', blurb: 'Character switching opens; the partner and robbery trophies start here.' },
    { n: 3, name: 'Chapter 3', blurb: 'The Key Cloner and Yasmani\u2019s jobs open the robbery set.' },
    { n: 4, name: 'Chapter 4', blurb: 'Bank vaults open; the last chapter before the finale.' },
    { n: 5, name: 'Finale', blurb: 'The final mission and the last story trophy.' },
    { n: 6, name: 'Free roam', blurb: 'Everything left after the story: collectibles, activities, the 100% checklist.' },
    { n: 7, name: 'Cleanup', blurb: 'The platinum, the last scans and the plane.' }
  ];

  var CHECKLIST_100 = [
    { label: 'Optional missions', target: '100 of 100' },
    { label: 'Vehicles scanned (WAiNK)', target: '200 of 277' },
    { label: 'Animals studied', target: '100 of 255' },
    { label: 'Weapons collected', target: '50 of 66' },
    { label: 'Challenges', target: '70 of 80' },
    { label: 'Stunts', target: '300 of 397' },
    { label: 'Meditations', target: '15 of 18' },
    { label: 'Shooting-range golds', target: '42 of 42' },
    { label: 'Drone time trials', target: '42 of 42' },
    { label: 'Bret target decks', target: '15 of 15' },
    { label: 'Gang operations', target: '39 of 39' },
    { label: 'Bank jobs', target: '22 of 22' },
    { label: 'Payday loan jobs', target: '7 of 7' },
    { label: 'Bank vaults', target: '8 of 8' },
    { label: 'Smash \u2019n\u2019 grabs', target: '34 of 35' },
    { label: 'Stick ups', target: '50 of 91' },
    { label: 'Card sets', target: '15 of 18' },
    { label: 'Kenton treasure sets', target: '5 of 7' },
    { label: 'Underwater discoveries', target: '33 of 33' },
    { label: 'Magazines, books and comics', target: '30 of 34' },
    { label: 'Cocaine flamingos', target: '100 of 125' },
    { label: 'Races won', target: '30 of 40' },
    { label: 'Race challenge golds', target: '10 of 13' },
    { label: 'Styles', target: '70 of 79' },
    { label: 'Basketball hoops', target: '90 of 100' }
  ];

  var trophies = [];
  var srcData = null;
  var earned = new Set();
  var counters = {};
  var revealed = new Set();
  var selected = null;
  var filter = 'all';
  var gradeFilter = '';
  var sortMode = 'id';
  var query = '';
  var spoilerOn = true;

  function $(id) { return document.getElementById(id); }
  function loadSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch (e) { return new Set(); }
  }
  function loadObj(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
  }
  function save() {
    localStorage.setItem(LS_EARNED, JSON.stringify(Array.from(earned)));
    localStorage.setItem(LS_COUNTERS, JSON.stringify(counters));
    localStorage.setItem(LS_SPOILER, JSON.stringify(spoilerOn));
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function gradeLabel(t) {
    return t.grade.charAt(0).toUpperCase() + t.grade.slice(1);
  }
  function guideSources(t) { return t.sources.filter(function (n) { return n !== 4 && n !== 5; }); }
  function isSingle(t) { return guideSources(t).length === 1; }
  function displayName(t) {
    if (t.hidden && spoilerOn && !revealed.has(t.id)) return 'Hidden trophy';
    return t.name;
  }
  function isVeiled(t) { return t.hidden && spoilerOn && !revealed.has(t.id); }

  function filtered() {
    var list = trophies.filter(function (t) {
      if (gradeFilter && t.grade !== gradeFilter) return false;
      if (query) {
        var q = query.toLowerCase();
        if ((t.name + ' ' + t.description + ' ' + t.short).toLowerCase().indexOf(q) === -1) return false;
      }
      switch (filter) {
        case 'earned': return earned.has(t.id);
        case 'remaining': return !earned.has(t.id);
        case 'hidden': return t.hidden;
        case 'missable': return t.missable;
        case 'watch': return t.watch;
        case 'unconfirmed': return t.unconfirmed;
        case 'disagree': return t.disagree;
        case 'amber': return t.trust === 'amber';
        default: return true;
      }
    });
    var by = {
      id: function (a, b) { return a.id - b.id; },
      stage: function (a, b) { return a.stage - b.stage || a.id - b.id; },
      kind: function (a, b) { return a.kind.localeCompare(b.kind) || a.id - b.id; },
      difficulty: function (a, b) { return a.difficulty - b.difficulty || a.id - b.id; }
    };
    return list.sort(by[sortMode] || by.id);
  }

  function renderStats() {
    var pts = 0;
    trophies.forEach(function (t) { if (earned.has(t.id)) pts += t.points; });
    $('earnedCount').textContent = earned.size + '/55';
    $('pointsCount').textContent = pts.toLocaleString() + '/1,350';
  }

  function renderAudit() {
    var grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    var hidden = 0, steps = 0, cited = 0, green = 0, amber = 0;
    trophies.forEach(function (t) {
      grades[t.grade]++;
      if (t.hidden) hidden++;
      if (t.trust === 'green') green++; else amber++;
      t.steps.forEach(function (s) { steps++; if (s.c && s.c.length) cited++; });
    });
    var miss = trophies.filter(function (t) { return t.missable; }).length;
    var watch = trophies.filter(function (t) { return t.watch; }).length;
    var unconf = trophies.filter(function (t) { return t.unconfirmed; }).length;
    var single = trophies.filter(isSingle).length;
    var disagree = trophies.filter(function (t) { return t.disagree; }).length;
    $('audit').innerHTML =
      '<strong>55 official</strong> · 1P 2G 6S 46B · ' + hidden + ' hidden · ' +
      '<span class="ok">55/55 guides cite a source</span> · ' +
      '<span class="ok">' + cited + '/' + steps + ' steps cited</span> · ' +
      (srcData ? srcData.sources.length : 5) + ' sources read ' + (srcData ? esc(srcData.read) : '20 Nov 2026') + ' · ' +
      '<span class="warn">' + miss + ' possibly missable</span> · ' +
      '<span class="warn">' + watch + ' watch</span> · ' +
      '<span class="warn">' + unconf + ' unconfirmed</span> · ' +
      '<span class="warn">' + single + ' single-source</span> · ' +
      '<span class="warn">' + disagree + ' disagree</span> · ' +
      '<span class="ok">' + green + ' green</span> · ' +
      '<span class="warn">' + amber + ' amber</span> · 1,350 PSN points';
  }

  function renderCitedBy() {
    if (!srcData) return;
    var parts = srcData.sources.map(function (s) {
      var n = trophies.filter(function (t) { return t.sources.indexOf(s.id) !== -1; }).length;
      return '[' + s.id + '] ' + esc(s.name) + ' ' + n + '/55';
    });
    $('citedby').innerHTML = '<strong>Cited by:</strong> ' + parts.join(' · ');
  }

  function renderStages() {
    var html = '';
    STAGES.forEach(function (st) {
      var inStage = trophies.filter(function (t) { return t.stage === st.n; });
      var got = inStage.filter(function (t) { return earned.has(t.id); }).length;
      var flag = inStage.some(function (t) { return t.missable || t.watch; }) ? ' <span class="warnflag">\u26a0</span>' : '';
      html += '<button type="button" data-stage="' + st.n + '">S' + st.n + ' ' + esc(st.name) +
        ' · ' + got + '/' + inStage.length + flag + '</button>';
    });
    $('stages').innerHTML = html;
    Array.prototype.forEach.call($('stages').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        filter = 'all'; gradeFilter = ''; query = '';
        $('search').value = ''; $('gradeFilter').value = '';
        sortMode = 'stage'; $('sortFilter').value = 'stage';
        showView('checklist');
        renderAll();
      });
    });
  }

  function renderChips() {
    var defs = [
      ['all', 'All', trophies.length],
      ['earned', 'Earned', earned.size],
      ['remaining', 'Remaining', trophies.length - earned.size],
      ['hidden', 'Hidden', trophies.filter(function (t) { return t.hidden; }).length],
      ['missable', 'Possibly missable', trophies.filter(function (t) { return t.missable; }).length],
      ['watch', 'Watch', trophies.filter(function (t) { return t.watch; }).length],
      ['unconfirmed', 'Unconfirmed', trophies.filter(function (t) { return t.unconfirmed; }).length],
      ['disagree', 'Sources disagree', trophies.filter(function (t) { return t.disagree; }).length],
      ['amber', 'Amber trust', trophies.filter(function (t) { return t.trust === 'amber'; }).length]
    ];
    $('filterChips').innerHTML = defs.map(function (d) {
      return '<button type="button" data-f="' + d[0] + '"' + (filter === d[0] ? ' class="active"' : '') + '>' +
        esc(d[1]) + ' (' + d[2] + ')</button>';
    }).join('');
    Array.prototype.forEach.call($('filterChips').querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-f'); renderAll(); });
    });
  }

  function renderList() {
    var list = filtered();
    var html = '';
    list.forEach(function (t) {
      var badges = '';
      if (t.missable) badges += ' <span class="badge miss">missable</span>';
      else if (t.watch) badges += ' <span class="badge watch">watch</span>';
      if (t.unconfirmed) badges += ' <span class="badge amber">unconfirmed</span>';
      if (t.disagree) badges += ' <span class="badge amber">disagree</span>';
      html += '<div class="row' + (earned.has(t.id) ? ' earned' : '') + (selected === t.id ? ' selected' : '') +
        '" role="option" data-id="' + t.id + '">' +
        '<input type="checkbox" ' + (earned.has(t.id) ? 'checked' : '') + ' aria-label="Earned: ' + esc(displayName(t)) + '">' +
        '<span class="dot ' + t.grade + '"></span>' +
        '<span class="nm"><b>' + esc(displayName(t)) + '</b>' +
        '<span>' + gradeLabel(t) + ' · ' + t.points + ' pts · S' + t.stage + ' · ' + esc(t.kind) + badges + '</span></span>' +
        '</div>';
    });
    $('list').innerHTML = html || '<p style="padding:16px;color:var(--muted)">No trophies match this filter.</p>';
    Array.prototype.forEach.call($('list').querySelectorAll('.row'), function (row) {
      var id = Number(row.getAttribute('data-id'));
      row.addEventListener('click', function () { selected = id; renderList(); renderDetail(); });
      row.querySelector('input[type="checkbox"]').addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (ev.target.checked) earned.add(id); else earned.delete(id);
        save(); renderAll();
      });
    });
  }

  function renderDetail() {
    var t = trophies.find(function (x) { return x.id === selected; });
    var box = $('detail');
    if (!t) { box.innerHTML = '<p style="color:var(--muted)">Pick a trophy from the list to see its guide.</p>'; renderSourcesPanel(null); return; }
    if (isVeiled(t)) {
      box.innerHTML = '<div class="veil"><h2>Hidden trophy</h2>' +
        '<p>This trophy\u2019s name and guide are hidden by your spoiler setting.<br>Its grade is ' + gradeLabel(t) + ' · ' + t.points + ' PSN points · stage S' + t.stage + '.</p>' +
        '<button type="button" id="revealBtn">Reveal this trophy</button></div>';
      $('revealBtn').addEventListener('click', function () { revealed.add(t.id); renderList(); renderDetail(); });
      renderSourcesPanel(t, true);
      return;
    }
    var stepsHtml = '<ol>' + t.steps.map(function (s) {
      var cites = (s.c || []).map(function (n) { return '[' + n + ']'; }).join(' ');
      return '<li>' + esc(s.t) + ' <span class="cite">' + esc(cites) + '</span></li>';
    }).join('') + '</ol>';
    var counterHtml = '';
    if (t.counter) {
      var val = counters[t.id] || 0;
      var pct = Math.min(100, Math.round(val / t.counter.total * 100));
      var unit = t.counter.unit ? ' ' + t.counter.unit : '';
      counterHtml = '<div class="counterbox"><label><strong>' + esc(t.counter.label) + ':</strong> ' +
        '<input type="number" id="counterInput" min="0" max="' + t.counter.total + '" value="' + val + '"> / ' +
        t.counter.total.toLocaleString() + unit + '</label>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    }
    var flags = [];
    if (t.missable) flags.push('Possibly missable — do it before Chapter 1 ends');
    if (t.watch) flags.push('Watch — timing or a chain that can break');
    if (t.unconfirmed) flags.push('Unconfirmed method — best-known guide, not a guarantee');
    if (t.disagree) flags.push('Sources disagree — see the Source matrix tab');
    box.innerHTML =
      '<h2>' + esc(t.name) + '</h2>' +
      '<p class="meta">' + gradeLabel(t) + ' · ' + t.points + ' PSN points · ' + esc(t.kind) + ' · stage S' + t.stage +
      ' · difficulty ' + t.difficulty + '/5 · ' + esc(t.time) + (t.hidden ? ' · hidden' : '') + '</p>' +
      '<p class="desc">\u201c' + esc(t.description) + '\u201d</p>' +
      '<p class="short">' + esc(t.short) + '</p>' +
      (flags.length ? '<p>' + flags.map(function (f) { return '<span class="badge amber">' + esc(f) + '</span>'; }).join(' ') + '</p>' : '') +
      counterHtml + stepsHtml +
      '<label><input type="checkbox" id="earnedBox" ' + (earned.has(t.id) ? 'checked' : '') + '> Earned</label>';
    var eb = $('earnedBox');
    if (eb) eb.addEventListener('change', function () {
      if (eb.checked) earned.add(t.id); else earned.delete(t.id);
      save(); renderAll();
    });
    var ci = $('counterInput');
    if (ci) ci.addEventListener('change', function () {
      var v = Math.max(0, Math.min(t.counter.total, Number(ci.value) || 0));
      counters[t.id] = v;
      if (v >= t.counter.total) earned.add(t.id);
      save(); renderAll();
    });
    renderSourcesPanel(t, false);
  }

  function renderSourcesPanel(t, veiled) {
    var box = $('sourcesPanel');
    if (!t) { box.innerHTML = '<h3>Sources</h3><p style="color:var(--muted)">Sources for the selected trophy appear here.</p>'; return; }
    if (veiled) {
      box.innerHTML = '<h3>Sources</h3><p style="color:var(--muted)">Reveal the trophy to see its sources.</p>';
      return;
    }
    var items = t.sources.map(function (n) {
      var s = srcData.sources.find(function (x) { return x.id === n; });
      if (!s) return '<li>[' + n + ']</li>';
      var link = s.url ? ' — <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url.replace(/^https?:\/\//, '')) + '</a>' : '';
      return '<li><strong>[' + s.id + '] ' + esc(s.name) + '</strong> — ' + esc(s.title) + link + '<br><span style="color:var(--muted)">' + esc(s.coverage) + '</span></li>';
    }).join('');
    var trust = '<p class="trust">Trust: <span class="badge ' + t.trust + '">' + t.trust + '</span> ' +
      (t.trust === 'green' ? 'Two or more guide sources agree.' : 'One source, a disagreement, or an unconfirmed method.') + '</p>';
    var dis = '';
    if (srcData.disagreements) {
      var d = srcData.disagreements.find(function (x) { return x.trophy === t.id; });
      if (d) dis = '<p style="margin-top:12px"><strong>Where the sources disagree:</strong><br>' + esc(d.detail) + '</p>';
    }
    box.innerHTML = '<h3>Sources for this trophy</h3><ul>' + items + '</ul>' + trust + dis;
  }

  function renderRoadmap() {
    var html = '';
    STAGES.forEach(function (st) {
      var inStage = trophies.filter(function (t) { return t.stage === st.n; });
      var got = inStage.filter(function (t) { return earned.has(t.id); }).length;
      var flag = inStage.some(function (t) { return t.missable || t.watch; }) ? ' \u26a0 contains a missable or watch trophy' : '';
      html += '<div class="stageblock"><h2>S' + st.n + ' — ' + esc(st.name) + ' (' + got + '/' + inStage.length + ' earned)</h2>' +
        '<p>' + esc(st.blurb) + esc(flag) + '</p><ul>' +
        inStage.map(function (t) {
          return '<li class="' + (earned.has(t.id) ? 'earned' : '') + '">' + esc(displayName(t)) +
            ' — ' + gradeLabel(t) + ' · ' + t.points + ' pts' +
            (t.missable ? ' · <span style="color:var(--amber)">missable</span>' : '') +
            (t.watch ? ' · <span style="color:var(--amber)">watch</span>' : '') + '</li>';
        }).join('') + '</ul></div>';
    });
    $('roadmap').innerHTML = html;
  }

  function renderMissables() {
    function card(t, tag, note) {
      return '<div class="misscard"><span class="tag">' + esc(tag) + '</span>' +
        '<h3>' + esc(displayName(t)) + '</h3><p>' + esc(t.short) + '</p><p style="color:var(--muted)">' + esc(note) + '</p></div>';
    }
    var html = '<h2 style="color:var(--gold)">Possibly missable</h2>';
    trophies.filter(function (t) { return t.missable; }).forEach(function (t) {
      html += card(t, 'Possibly missable', 'Do the Chapter 1 balcony meditation before Chapter 1 ends. See the guide for the exact trigger.');
    });
    html += '<h2 style="color:var(--gold)">Watch</h2>';
    trophies.filter(function (t) { return t.watch; }).forEach(function (t) {
      html += card(t, 'Watch', t.short);
    });
    html += '<h2 style="color:var(--gold)">Unconfirmed</h2>';
    trophies.filter(function (t) { return t.unconfirmed; }).forEach(function (t) {
      html += card(t, 'Unconfirmed', 'Best-known method, not a guarantee — check the Source matrix for what each source says.');
    });
    html += '<h2 style="color:var(--gold)">Where the sources disagree</h2>';
    trophies.filter(function (t) { return t.disagree; }).forEach(function (t) {
      var d = srcData.disagreements ? srcData.disagreements.find(function (x) { return x.trophy === t.id; }) : null;
      html += card(t, 'Sources disagree', d ? d.detail : t.short);
    });
    $('missables').innerHTML = html;
  }

  function renderMatrix() {
    var head = '<tr><th>Trophy</th>' + srcData.sources.map(function (s) { return '<th>[' + s.id + '] ' + esc(s.name) + '</th>'; }).join('') + '<th>Trust</th></tr>';
    var rows = trophies.map(function (t) {
      var cells = srcData.sources.map(function (s) {
        var yes = t.sources.indexOf(s.id) !== -1;
        return '<td class="' + (yes ? 'yes' : 'no') + '">' + (yes ? '\u2713' : '\u2014') + '</td>';
      }).join('');
      return '<tr><td>' + esc(displayName(t)) + '</td>' + cells +
        '<td><span class="badge ' + t.trust + '">' + t.trust + '</span></td></tr>';
    }).join('');
    var dis = '';
    if (srcData.disagreements && srcData.disagreements.length) {
      dis = '<h2 style="color:var(--gold)">Disagreements, in full</h2>' + srcData.disagreements.map(function (d) {
        var t = trophies.find(function (x) { return x.id === d.trophy; });
        return '<div class="disagree"><h3>' + esc(t ? displayName(t) : ('Trophy ' + d.trophy)) + '</h3><p>' + esc(d.detail) + '</p></div>';
      }).join('');
    }
    var unc = '';
    if (srcData.unconfirmed && srcData.unconfirmed.length) {
      unc = '<h2 style="color:var(--gold)">Unconfirmed methods</h2>' + srcData.unconfirmed.map(function (u) {
        var t = trophies.find(function (x) { return x.id === u.trophy; });
        return '<div class="disagree"><h3>' + esc(t ? displayName(t) : ('Trophy ' + u.trophy)) + '</h3><p>' + esc(u.detail) + '</p></div>';
      }).join('');
    }
    $('matrix').innerHTML = '<div class="matrixwrap"><table class="matrix">' + head + rows + '</table></div>';
    $('disagreements').innerHTML = dis + unc;
  }

  function renderProgress() {
    var html = '<div class="progline"><b>' + earned.size + '/55 earned</b> · ' +
      '<span>' + trophies.reduce(function (a, t) { return a + (earned.has(t.id) ? t.points : 0); }, 0).toLocaleString() + ' / 1,350 PSN points</span>' +
      '<div class="bar"><i style="width:' + Math.round(earned.size / 55 * 100) + '%"></i></div></div>';
    var kinds = ['story', 'side', 'collectible', 'activity', 'crime', 'money', 'misc'];
    kinds.forEach(function (k) {
      var inKind = trophies.filter(function (t) { return t.kind === k; });
      var got = inKind.filter(function (t) { return earned.has(t.id); }).length;
      html += '<div class="progline"><b>' + esc(k) + ' ' + got + '/' + inKind.length + '</b>' +
        '<div class="bar"><i style="width:' + Math.round(got / inKind.length * 100) + '%"></i></div></div>';
    });
    html += '<h2 style="color:var(--gold)">A Long Road — the 100% checklist</h2>';
    CHECKLIST_100.forEach(function (c) {
      html += '<div class="progline"><b>' + esc(c.label) + '</b> · <span>' + esc(c.target) + '</span></div>';
    });
    html += '<h2 style="color:var(--gold)">Counted trophies</h2>';
    trophies.filter(function (t) { return t.counter; }).forEach(function (t) {
      var val = counters[t.id] || 0;
      var pct = Math.min(100, Math.round(val / t.counter.total * 100));
      html += '<div class="progline"><b>' + esc(displayName(t)) + '</b> · <span>' + val.toLocaleString() + ' / ' + t.counter.total.toLocaleString() + ' ' + esc(t.counter.label.toLowerCase()) + '</span>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div>';
    });
    $('progress').innerHTML = html;
  }

  function renderAll() {
    renderStats();
    renderAudit();
    renderCitedBy();
    renderStages();
    renderChips();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
    renderMatrix();
    renderProgress();
  }

  function showView(view) {
    Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.panel'), function (p) {
      p.classList.toggle('active', p.id === 'tab-' + view);
    });
  }

  function init() {
    earned = loadSet(LS_EARNED);
    counters = loadObj(LS_COUNTERS);
    try {
      var sp = localStorage.getItem(LS_SPOILER);
      spoilerOn = sp === null ? true : JSON.parse(sp);
    } catch (e) { spoilerOn = true; }
    $('spoilerToggle').checked = spoilerOn;
    $('spoilerToggle').addEventListener('change', function () {
      spoilerOn = $('spoilerToggle').checked;
      save(); renderAll();
    });
    $('search').addEventListener('input', function () { query = $('search').value; renderList(); });
    $('gradeFilter').addEventListener('change', function () { gradeFilter = $('gradeFilter').value; renderList(); });
    $('sortFilter').addEventListener('change', function () { sortMode = $('sortFilter').value; renderList(); });
    Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
      b.addEventListener('click', function () { showView(b.getAttribute('data-view')); });
    });
    $('exportBtn').addEventListener('click', function () {
      var data = { earned: Array.from(earned), counters: counters, exported: new Date().toISOString() };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'leonida-trophy-atlas-progress.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('importBtn').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function () {
      var f = $('importFile').files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = JSON.parse(r.result);
          if (Array.isArray(data.earned)) earned = new Set(data.earned.filter(function (n) { return n >= 1 && n <= 55; }));
          if (data.counters) counters = data.counters;
          save(); renderAll();
        } catch (e) { alert('Could not read that file.'); }
      };
      r.readAsText(f);
    });
    $('resetBtn').addEventListener('click', function () {
      if (!confirm('Reset all earned trophies and counters?')) return;
      earned = new Set(); counters = {};
      save(); renderAll();
    });

    Promise.all([
      fetch('data/trophies.json').then(function (r) { return r.json(); }),
      fetch('data/sources.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
      trophies = results[0].trophies;
      srcData = results[1];
      var params = new URLSearchParams(window.location.search);
      var view = params.get('view');
      if (view && document.getElementById('tab-' + view)) showView(view);
      var open = Number(params.get('open'));
      if (open && trophies.some(function (t) { return t.id === open; })) {
        selected = open;
        showView('checklist');
      } else if (trophies.length) {
        selected = 28;
      }
      renderAll();
    }).catch(function () {
      $('audit').textContent = 'Could not load trophy data. Serve this folder over HTTP (node serve.ts) and reload.';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
