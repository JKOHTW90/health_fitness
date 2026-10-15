'use strict';

// ---------- Storage ----------
const STORE_KEY = 'coach.v1';

function freshState() {
  return {
    version: 1,
    profile: { ...PROFILE_DEFAULT },
    targets: { ...TARGETS_DEFAULT },
    weights: [{ date: PROFILE_DEFAULT.startDate, kg: PROFILE_DEFAULT.startWeight }],
    waists: [],
    scans: [{ date: PROFILE_DEFAULT.startDate, weight: 63.7, bf: 14.6, smm: 30.4, note: 'Evolt 360 baseline (likely reads low)' }],
    sessions: [],
    active: null,
    food: {},
    customFoods: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...freshState(), ...JSON.parse(raw) };
  } catch (e) { /* fall through */ }
  return freshState();
}

let S = loadState();
let saveFailed = false;
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); saveFailed = false; }
  catch (e) { if (!saveFailed) toast('Could not save — storage unavailable'); saveFailed = true; }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// UI-only state (not persisted)
const UI = { tab: 'today', foodDate: null, foodCat: null, foodSearch: '', libGroup: 'All', libMode: null, libIndex: null, sheetFood: null, sheetQty: 1 };

// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round1 = (n) => Math.round(n * 10) / 10;
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };
const fmtKg = (n) => (n == null ? '–' : (Math.round(n * 100) / 100).toString());

function dstr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function pdate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
const today = () => dstr(new Date());
function addDays(s, n) { const d = pdate(s); d.setDate(d.getDate() + n); return dstr(d); }
function daysBetween(a, b) { return Math.round((pdate(b) - pdate(a)) / 86400000); }
function prettyDate(s) {
  const t = today();
  if (s === t) return 'Today';
  if (s === addDays(t, -1)) return 'Yesterday';
  return pdate(s).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' });
}
function weekStart(s) { const d = pdate(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return dstr(d); }
function fmtTime(sec) { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; }

const exById = (id) => EXERCISES.find((e) => e.id === id) || { id, name: id, group: 'Other', inc: 2.5 };
const exType = (ex) => ex.type || 'weight';
const allFoods = () => [...S.customFoods, ...FOODS];
const foodById = (id) => allFoods().find((f) => f.id === id);

// ---------- Weight maths ----------
function sortedWeights() { return [...S.weights].sort((a, b) => a.date.localeCompare(b.date)); }
function avg7(date) {
  const from = addDays(date, -6);
  const w = S.weights.filter((x) => x.date >= from && x.date <= date);
  if (!w.length) return null;
  return w.reduce((s, x) => s + x.kg, 0) / w.length;
}
function latestWeight() { const w = sortedWeights(); return w.length ? w[w.length - 1] : null; }
function currentAvg() { const lw = latestWeight(); return lw ? avg7(lw.date) : null; }

function checkIn() {
  const lw = latestWeight();
  if (!lw) return null;
  const nowAvg = avg7(lw.date);
  const prevAvg = avg7(addDays(lw.date, -7));
  const daysLeft = Math.max(1, daysBetween(today(), S.profile.goalDate));
  const toGo = nowAvg - S.profile.goalWeight;
  const needed = toGo / (daysLeft / 7);
  const loggedDays = S.weights.filter((x) => x.date > addDays(lw.date, -14)).length;
  if (prevAvg == null || loggedDays < 6) {
    return { nowAvg, needed, toGo, status: 'collect', msg: 'Weigh in most mornings for 2 weeks and I\'ll start adjusting your calories based on your real trend.' };
  }
  const rate = nowAvg - prevAvg; // negative = losing
  let status, msg, delta = 0;
  if (toGo <= 0) { status = 'good'; msg = 'You\'ve hit your goal weight. Focus now is on waist measurement and getting stronger — talk to me about maintenance calories.'; }
  else if (rate > -0.15) { status = 'slow'; delta = -150; msg = `Your 7-day average moved ${rate >= 0 ? '+' : ''}${round1(rate)} kg this week. First, check you logged everything (sauces, drinks!). If you did, drop to ${S.targets.kcal - 150} kcal or add 2,000 steps a day.`; }
  else if (rate < -0.9) { status = 'fast'; delta = 150; msg = `You lost ${round1(-rate)} kg this week — faster than ideal, you risk losing muscle. Bump up to ${S.targets.kcal + 150} kcal (add carbs around training).`; }
  else { status = 'good'; msg = `Down ${round1(-rate)} kg this week. Right on track — keep everything the same.`; }
  return { nowAvg, prevAvg, rate, needed, toGo, status, msg, delta };
}

// ---------- Training maths ----------
function finishedLifts() { return S.sessions.filter((s) => s.type === 'lift').sort((a, b) => b.end - a.end); }

function lastPerformance(exId) {
  for (const s of finishedLifts()) {
    const e = s.exercises.find((x) => x.ex === exId);
    if (e) {
      const sets = e.log.filter((l) => l.done && num(l.r) != null);
      if (sets.length) return { date: s.date, sets, reps: e.reps, nSets: e.sets };
    }
  }
  return null;
}

function suggest(exId, reps, nSets) {
  const ex = exById(exId);
  const t = exType(ex);
  const [lo, hi] = reps;
  const last = lastPerformance(exId);
  const rows = [];
  let hint = '';
  if (!last) {
    const w = t === 'weight' ? (ex.start ?? '') : '';
    for (let i = 0; i < nSets; i++) rows.push({ w: w === '' ? '' : String(w), r: String(lo), done: false });
    hint = t === 'weight'
      ? `First time: ${w !== '' ? `starting guess ${w} kg${ex.equip === 'Dumbbells' ? ' per dumbbell' : ''}` : 'pick a weight'} — adjust so ${lo}–${hi} reps feels like 2–3 left in the tank.`
      : `First time: aim for ${lo}–${hi} ${t === 'time' ? 'seconds' : 'reps'} with perfect form.`;
    return { rows, hint };
  }
  const weights = last.sets.map((s) => num(s.w) || 0);
  const topW = Math.max(...weights);
  const repsAtTop = last.sets.filter((s) => (num(s.w) || 0) === topW).map((s) => num(s.r));
  const allTop = repsAtTop.length >= nSets && repsAtTop.every((r) => r >= hi);
  const lastStr = last.sets.map((s) => (t === 'weight' || num(s.w) ? `${fmtKg(num(s.w))}×${s.r}` : `${s.r}`)).join(', ');
  if (allTop && t === 'weight') {
    const nw = round1(topW + (ex.inc || 2.5));
    for (let i = 0; i < nSets; i++) rows.push({ w: String(nw), r: String(lo), done: false });
    hint = `Last (${prettyDate(last.date)}): ${lastStr}. 💪 You hit the top of the range — go up to ${fmtKg(nw)} kg and aim for ${lo}+ reps.`;
  } else if (allTop) {
    for (let i = 0; i < nSets; i++) rows.push({ w: topW ? String(topW) : '', r: String(hi), done: false });
    hint = `Last: ${lastStr}. Top of range hit — slow the tempo (3 sec down) or add a little weight.`;
  } else {
    for (let i = 0; i < nSets; i++) {
      const prev = last.sets[i];
      const pr = prev && (num(prev.w) || 0) === topW ? num(prev.r) : lo - 1;
      rows.push({ w: topW ? String(topW) : '', r: String(Math.min(hi, Math.max(lo, pr + 1))), done: false });
    }
    hint = `Last (${prettyDate(last.date)}): ${lastStr}. Beat it by 1 rep per set.`;
  }
  return { rows, hint };
}

const e1rm = (w, r) => w * (1 + r / 30);
function bestE1rm(exId, before = Infinity) {
  let best = 0;
  for (const s of S.sessions) {
    if (s.type !== 'lift' || s.end >= before) continue;
    for (const e of s.exercises) if (e.ex === exId) for (const l of e.log) {
      const w = num(l.w), r = num(l.r);
      if (l.done && w && r) best = Math.max(best, e1rm(w, r));
    }
  }
  return best;
}

function nextTemplate() {
  const last = finishedLifts().find((s) => s.templateId && TEMPLATES.some((t) => t.id === s.templateId));
  if (!last) return TEMPLATES[0];
  const i = TEMPLATES.findIndex((t) => t.id === last.templateId);
  return TEMPLATES[(i + 1) % TEMPLATES.length];
}

function weekCounts() {
  const ws = weekStart(today());
  const inWeek = S.sessions.filter((s) => s.date >= ws);
  return { lifts: inWeek.filter((s) => s.type === 'lift').length, grids: inWeek.filter((s) => s.type === 'grid').length };
}

// ---------- Food maths ----------
function dayEntries(date) { return S.food[date] || []; }
function dayTotals(date) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const e of dayEntries(date)) { t.kcal += e.kcal * e.qty; t.p += e.p * e.qty; t.c += e.c * e.qty; t.f += e.f * e.qty; }
  return t;
}
function recentFoodIds() {
  const seen = new Set(); const out = [];
  const dates = Object.keys(S.food).sort().reverse();
  for (const d of dates) for (const e of [...S.food[d]].reverse()) {
    if (e.fid && !seen.has(e.fid) && foodById(e.fid)) { seen.add(e.fid); out.push(e.fid); }
    if (out.length >= 12) return out;
  }
  return out;
}

// ---------- Rendering ----------
const view = () => $('#view');

function setTopbar(title) {
  $('#topbarTitle').textContent = title;
  const left = daysBetween(today(), S.profile.goalDate);
  const total = daysBetween(S.profile.startDate, S.profile.goalDate);
  const week = Math.min(Math.ceil(total / 7), Math.floor(daysBetween(S.profile.startDate, today()) / 7) + 1);
  $('#topbarSub').textContent = left >= 0
    ? `${left} days to ${pdate(S.profile.goalDate).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })} · Week ${Math.max(1, week)} of ${Math.ceil(total / 7)}`
    : 'Goal date passed — set a new one in Progress → Settings';
}

function render() {
  document.querySelectorAll('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === UI.tab));
  const fn = { today: renderToday, train: renderTrain, food: renderFood, progress: renderProgress, plan: renderPlan }[UI.tab];
  fn();
}

function macroBars(t) {
  const T = S.targets;
  const bar = (label, val, target, unit, cls = '') => {
    const pct = Math.min(100, (val / target) * 100);
    const over = val > target * 1.05 && label !== 'Protein';
    return `<div class="macro"><div class="row between"><span>${label}</span><span><b>${Math.round(val)}</b> / ${target}${unit}</span></div>
      <div class="bar ${over ? 'over' : cls}"><div style="width:${pct}%"></div></div></div>`;
  };
  return bar('Calories', t.kcal, T.kcal, ' kcal') + bar('Protein', t.p, T.protein, ' g', 'blue')
    + `<div class="grid2">${bar('Carbs', t.c, T.carbs, ' g', 'warn')}${bar('Fat', t.f, T.fat, ' g', 'warn')}</div>`;
}

function renderToday() {
  setTopbar(`Hi ${S.profile.name} 👋`);
  const t = today();
  const tot = dayTotals(t);
  const left = Math.round(S.targets.kcal - tot.kcal);
  const pLeft = Math.round(S.targets.protein - tot.p);
  const nt = nextTemplate();
  const wc = weekCounts();
  const lw = latestWeight();
  const avg = currentAvg();
  const todayW = S.weights.find((w) => w.date === t);
  const tip = COACH_TIPS[(daysBetween('2026-01-01', t) % COACH_TIPS.length + COACH_TIPS.length) % COACH_TIPS.length];
  const toGo = avg != null ? round1(avg - S.profile.goalWeight) : null;

  view().innerHTML = `
    <div class="card hero">
      <div class="row between">
        <div>
          <div class="muted small">7-day average</div>
          <div class="big">${avg != null ? round1(avg) : '–'}<span class="mid muted"> kg</span></div>
          <div class="small">${toGo != null ? (toGo > 0 ? `<span class="accent">${toGo} kg</span> to go to ${S.profile.goalWeight} kg` : '<span class="accent">Goal weight reached 🎉</span>') : ''}</div>
        </div>
        <div style="width:120px">
          <label class="f" style="margin-top:0">Today's weigh-in</label>
          <div class="row" style="gap:6px">
            <input id="wToday" type="number" inputmode="decimal" step="0.1" placeholder="${lw ? lw.kg : 'kg'}" value="${todayW ? todayW.kg : ''}">
          </div>
          <button class="btn sm primary block" style="margin-top:6px" data-act="log-weight-today">${todayW ? 'Update' : 'Save'}</button>
        </div>
      </div>
    </div>

    <div class="card">
      ${S.active ? `
        <h3>Workout in progress</h3>
        <div class="row between"><div><div class="mid">${esc(S.active.name)}</div><div class="muted small">Started ${fmtTime((Date.now() - S.active.start) / 1000)} ago</div></div>
        <button class="btn primary" data-act="goto" data-tab="train">Resume</button></div>
      ` : `
        <h3>Next workout</h3>
        <div class="row between">
          <div><div class="mid">${nt.name}</div><div class="muted small">${nt.focus} · ${nt.exercises.length} exercises · ~50 min</div></div>
          <button class="btn primary" data-act="start-tpl" data-id="${nt.id}">Start</button>
        </div>
      `}
      <div class="row between" style="margin-top:14px">
        <div class="small muted">This week</div>
        <div class="dots">
          ${[0, 1, 2, 3].map((i) => `<div class="dot ${i < wc.lifts ? 'done' : ''}">L</div>`).join('')}
          ${[0, 1].map((i) => `<div class="dot grid ${i < wc.grids ? 'done' : ''}">G</div>`).join('')}
        </div>
      </div>
      <button class="btn sm block" style="margin-top:10px" data-act="grid-sheet">+ Log a Grid class</button>
    </div>

    <div class="card">
      <div class="row between"><h3 style="margin:0">Food today</h3><button class="btn sm primary" data-act="goto" data-tab="food">+ Log food</button></div>
      <div class="row" style="margin-top:10px; gap:16px">
        <div><div class="big ${left < 0 ? 'bad' : ''}">${Math.abs(left)}</div><div class="small muted">kcal ${left < 0 ? 'over' : 'left'}</div></div>
        <div><div class="big" style="color:var(--blue)">${Math.max(0, pLeft)}</div><div class="small muted">g protein to go</div></div>
      </div>
      ${macroBars(tot)}
    </div>

    <div class="card">
      <h3>Coach tip</h3>
      <p>${esc(tip)}</p>
    </div>
  `;
}

// ----- Train -----
function renderTrain() {
  if (S.active) return renderSession();
  setTopbar('Train');
  const nt = nextTemplate();
  const hist = [...S.sessions].sort((a, b) => b.end - a.end).slice(0, 20);
  view().innerHTML = `
    <h3>Your programme · pick a workout</h3>
    ${TEMPLATES.map((t) => `
      <div class="card tpl ${t.id === nt.id ? 'next' : ''}" data-act="start-tpl" data-id="${t.id}">
        <div class="badge">${t.id}</div>
        <div class="grow">
          <div style="font-weight:800">${t.name} ${t.id === nt.id ? '<span class="tag">NEXT</span>' : ''}</div>
          <div class="small muted">${t.focus} · ${t.exercises.map((e) => exById(e.ex).name.split(' (')[0]).slice(0, 3).join(', ')}…</div>
        </div>
        <div class="muted">›</div>
      </div>`).join('')}
    <div class="grid2">
      <button class="btn block" data-act="start-custom">＋ Custom workout</button>
      <button class="btn block" data-act="grid-sheet">⚡ Log Grid class</button>
    </div>

    <div class="card" style="margin-top:12px">
      <h3>Before every session (5 min)</h3>
      <ol class="plan-list small">${WARMUP.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>
    </div>

    <div class="card">
      <h3>History</h3>
      ${hist.length ? hist.map((s) => `
        <div class="list-item" data-act="view-session" data-id="${s.id}">
          <div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${prettyDate(s.date)} · ${s.type === 'lift' ? `${s.exercises.reduce((n, e) => n + e.log.filter((l) => l.done).length, 0)} sets · ${s.durationMin} min` : `${s.durationMin} min`}</div></div>
          <div class="muted">›</div>
        </div>`).join('') : '<p class="muted small">No workouts yet. Your first one is waiting! 💪</p>'}
    </div>
  `;
}

function startSession(templateId) {
  if (S.active) { UI.tab = 'train'; return render(); }
  const t = TEMPLATES.find((x) => x.id === templateId);
  const exercises = t ? t.exercises.map((e) => buildExercise(e.ex, e.sets, e.reps, e.rest)) : [];
  S.active = { id: uid(), start: Date.now(), date: today(), templateId: t ? t.id : null, name: t ? `${t.name} — ${t.focus}` : 'Custom workout', exercises };
  save();
  UI.tab = 'train';
  render();
  window.scrollTo(0, 0);
}

function buildExercise(exId, sets = 3, reps, rest) {
  const ex = exById(exId);
  reps = reps || (exType(ex) === 'time' ? [30, 45] : ex.group === 'Core' ? [10, 15] : [8, 12]);
  rest = rest || (ex.group === 'Core' ? 45 : 90);
  const sug = suggest(exId, reps, sets);
  return { ex: exId, sets, reps, rest, log: sug.rows, hint: sug.hint };
}

function renderSession() {
  const a = S.active;
  setTopbar(a.name.split(' — ')[0]);
  view().innerHTML = `
    <div class="card row between">
      <div><div class="small muted">${esc(a.name)}</div><div class="mid" id="elapsed">${fmtTime((Date.now() - a.start) / 1000)}</div></div>
      <button class="btn primary" data-act="finish">Finish</button>
    </div>
    ${a.exercises.map((e, ei) => renderExercise(e, ei)).join('')}
    <button class="btn block" data-act="lib-open" data-mode="add">＋ Add exercise</button>
    <button class="btn block danger" style="margin-top:10px" data-act="discard">Discard workout</button>
  `;
}

function renderExercise(e, ei) {
  const ex = exById(e.ex);
  const t = exType(ex);
  const unitR = t === 'time' ? 'sec' : 'reps';
  const doneCount = e.log.filter((l) => l.done).length;
  return `
    <div class="card ex-card" id="ex-${ei}">
      <div class="ex-head">
        <div class="grow">
          <div class="ex-name">${esc(ex.name)} ${doneCount === e.log.length && e.log.length ? '✅' : ''}</div>
          <div class="ex-meta">${e.log.length} × ${e.reps[0]}–${e.reps[1]} ${unitR} · rest ${fmtTime(e.rest)}${ex.equip === 'Dumbbells' ? ' · kg per DB' : ''}</div>
        </div>
        <button class="btn sm" data-act="cue" data-ei="${ei}">ⓘ</button>
      </div>
      ${e.hint ? `<div class="ex-hint">${esc(e.hint)}</div>` : ''}
      <div class="ex-cue hidden" id="cue-${ei}">${esc(ex.cue || '')}</div>
      <div class="set-row" style="margin-top:10px"><div></div><div class="lbl">${t === 'weight' ? 'KG' : '+KG (opt.)'}</div><div class="lbl">${unitR.toUpperCase()}</div><div></div></div>
      ${e.log.map((l, si) => `
        <div class="set-row ${l.done ? 'done' : ''}">
          <div class="n">${si + 1}</div>
          <input type="number" inputmode="decimal" step="0.5" data-in="set" data-ei="${ei}" data-si="${si}" data-field="w" value="${esc(l.w)}" placeholder="${t === 'weight' ? 'kg' : '–'}">
          <input type="number" inputmode="numeric" data-in="set" data-ei="${ei}" data-si="${si}" data-field="r" value="${esc(l.r)}" placeholder="${e.reps[0]}-${e.reps[1]}">
          <button class="check" data-act="set-done" data-ei="${ei}" data-si="${si}">✓</button>
        </div>`).join('')}
      <div class="ex-actions">
        <button class="btn sm" data-act="set-add" data-ei="${ei}">＋ Set</button>
        <button class="btn sm" data-act="set-remove" data-ei="${ei}">− Set</button>
        <button class="btn sm" data-act="lib-open" data-mode="swap" data-ei="${ei}">⇄ Swap</button>
        <button class="btn sm" data-act="ex-up" data-ei="${ei}">↑</button>
        <button class="btn sm danger" data-act="ex-remove" data-ei="${ei}">✕</button>
      </div>
    </div>`;
}

function finishSession() {
  const a = S.active;
  const doneSets = a.exercises.reduce((n, e) => n + e.log.filter((l) => l.done).length, 0);
  if (!doneSets) {
    if (!confirm('No sets ticked off. Discard this workout?')) return;
    S.active = null; save(); return render();
  }
  const end = Date.now();
  const prs = [];
  for (const e of a.exercises) {
    const prev = bestE1rm(e.ex);
    let best = 0, bestSet = null;
    for (const l of e.log) { const w = num(l.w), r = num(l.r); if (l.done && w && r && e1rm(w, r) > best) { best = e1rm(w, r); bestSet = l; } }
    if (best && prev && best > prev + 0.01) prs.push(`${exById(e.ex).name}: ${fmtKg(num(bestSet.w))} kg × ${bestSet.r}`);
  }
  const session = {
    id: a.id, type: 'lift', date: a.date, start: a.start, end, templateId: a.templateId, name: a.name,
    durationMin: Math.max(1, Math.round((end - a.start) / 60000)),
    exercises: a.exercises.map((e) => ({ ex: e.ex, sets: e.sets, reps: e.reps, rest: e.rest, log: e.log.filter((l) => l.done) })).filter((e) => e.log.length),
  };
  S.sessions.push(session);
  S.active = null;
  stopRest();
  save();
  const vol = session.exercises.reduce((v, e) => v + e.log.reduce((s, l) => s + (num(l.w) || 0) * (num(l.r) || 0), 0), 0);
  openSheet(`
    <div class="handle"></div>
    <div style="text-align:center">
      <div style="font-size:48px">🔥</div>
      <h2>Workout done!</h2>
      <p class="muted">${session.durationMin} min · ${doneSets} sets · ${Math.round(vol).toLocaleString()} kg lifted</p>
    </div>
    ${prs.length ? `<div class="card"><h3>New personal records 🏆</h3>${prs.map((p) => `<div class="small" style="margin-bottom:4px">• ${esc(p)}</div>`).join('')}</div>` : ''}
    <div class="card"><p class="small">Now: get ~40 g protein in within the next couple of hours. Next up: <b>${nextTemplate().name}</b>.</p></div>
    <button class="btn primary block" data-act="sheet-close">Nice</button>
  `);
  render();
}

function viewSession(id) {
  const s = S.sessions.find((x) => x.id === id);
  if (!s) return;
  openSheet(`
    <div class="handle"></div>
    <h2>${esc(s.name)}</h2>
    <p class="muted small">${prettyDate(s.date)} · ${s.durationMin} min</p>
    ${s.type === 'lift' ? s.exercises.map((e) => `
      <div class="list-item"><div class="grow"><div class="t">${esc(exById(e.ex).name)}</div>
      <div class="s">${e.log.map((l) => (num(l.w) ? `${fmtKg(num(l.w))}×${l.r}` : l.r)).join(' · ')}</div></div></div>`).join('') : '<p>Grid class ⚡</p>'}
    <button class="btn block danger" style="margin-top:14px" data-act="delete-session" data-id="${s.id}">Delete this workout</button>
  `);
}

function openGridSheet() {
  openSheet(`
    <div class="handle"></div>
    <h2>Log Grid class ⚡</h2>
    <label class="f">Date</label><input type="date" id="gridDate" value="${today()}">
    <label class="f">Duration (min)</label><input type="number" inputmode="numeric" id="gridMin" value="45">
    <button class="btn primary block" style="margin-top:14px" data-act="grid-save">Save</button>
  `);
}

// Library sheet
function openLibrary(mode, ei) {
  UI.libMode = mode; UI.libIndex = ei; UI.libGroup = 'All';
  const groups = ['All', ...new Set(EXERCISES.map((e) => e.group))];
  if (mode === 'swap') UI.libGroup = exById(S.active.exercises[ei].ex).group;
  openSheet(`
    <div class="handle"></div>
    <h2>${mode === 'swap' ? 'Swap exercise' : 'Add exercise'}</h2>
    <input id="libSearch" data-in="lib-search" placeholder="Search exercises…" autocomplete="off">
    <div class="chips" style="margin:10px 0">${groups.map((g) => `<button class="chip ${g === UI.libGroup ? 'active' : ''}" data-act="lib-group" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>
    <div id="libList"></div>
  `);
  renderLibList();
}
function renderLibList() {
  const q = ($('#libSearch')?.value || '').toLowerCase();
  const list = EXERCISES.filter((e) => (UI.libGroup === 'All' || e.group === UI.libGroup) && (!q || e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q)));
  $('#libList').innerHTML = list.map((e) => `
    <div class="list-item" data-act="lib-pick" data-id="${e.id}">
      <div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${esc(e.group)} · ${esc(e.equip)}</div></div><div class="accent">＋</div>
    </div>`).join('') || '<p class="muted">No matches</p>';
}

// ----- Rest timer -----
let restEnd = 0, restTimer = null;
function startRest(sec) {
  restEnd = Date.now() + sec * 1000;
  $('#restBar').classList.remove('hidden');
  tickRest();
  clearInterval(restTimer);
  restTimer = setInterval(tickRest, 500);
}
function tickRest() {
  const left = (restEnd - Date.now()) / 1000;
  if (left <= 0) {
    $('#restTime').textContent = 'Go! 💪';
    if (left < -4) stopRest();
    return;
  }
  $('#restTime').textContent = fmtTime(left);
}
function stopRest() { clearInterval(restTimer); restTimer = null; $('#restBar').classList.add('hidden'); }

// ----- Food -----
function renderFood() {
  setTopbar('Food');
  const date = UI.foodDate || today();
  const tot = dayTotals(date);
  const entries = dayEntries(date);
  const recent = recentFoodIds();
  const cats = [...(recent.length ? ['Recent'] : []), ...(S.customFoods.length ? ['My foods'] : []), ...FOOD_CATS];
  if (!UI.foodCat || !cats.includes(UI.foodCat)) UI.foodCat = recent.length ? 'Recent' : 'Hawker';
  const left = Math.round(S.targets.kcal - tot.kcal);

  view().innerHTML = `
    <div class="row between" style="margin-bottom:10px">
      <button class="btn sm" data-act="food-day" data-d="-1">‹</button>
      <div style="font-weight:800">${prettyDate(date)}</div>
      <button class="btn sm" data-act="food-day" data-d="1" ${date >= today() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <div class="card">
      <div class="row between"><div><span class="big ${left < 0 ? 'bad' : ''}">${Math.abs(left)}</span> <span class="muted">kcal ${left < 0 ? 'over' : 'left'}</span></div>
      <div class="small muted" style="text-align:right">${Math.round(tot.p)} / ${S.targets.protein} g<br>protein</div></div>
      ${macroBars(tot)}
    </div>

    ${entries.length ? `<div class="card"><h3>Logged</h3>${entries.map((e) => `
      <div class="list-item">
        <div class="grow"><div class="t">${esc(e.name)}</div><div class="s">${e.qty !== 1 ? `${e.qty}× ` : ''}${esc(e.portion || '')} · ${Math.round(e.kcal * e.qty)} kcal · ${Math.round(e.p * e.qty)} g P</div></div>
        <button class="x" data-act="food-del" data-id="${e.id}">×</button>
      </div>`).join('')}</div>` : ''}

    <div class="card">
      <h3>Add food</h3>
      <input id="foodSearch" data-in="food-search" placeholder="Search: chicken rice, HeyBo, kopi…" value="${esc(UI.foodSearch)}" autocomplete="off">
      <div class="chips" style="margin:10px 0">${cats.map((c) => `<button class="chip ${c === UI.foodCat ? 'active' : ''}" data-act="food-cat" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div id="foodList"></div>
      <div class="grid2" style="margin-top:10px">
        <button class="btn sm" data-act="food-custom">✏️ Custom food</button>
        <button class="btn sm" data-act="food-quick">⚡ Quick kcal</button>
      </div>
      <p class="small muted" style="margin-top:10px">⭐ = coach-recommended pick. Values are estimates for typical portions.</p>
    </div>
  `;
  renderFoodList();
}

function renderFoodList() {
  const q = UI.foodSearch.trim().toLowerCase();
  let list;
  if (q) list = allFoods().filter((f) => (f.name + ' ' + f.cat).toLowerCase().includes(q));
  else if (UI.foodCat === 'Recent') list = recentFoodIds().map(foodById);
  else if (UI.foodCat === 'My foods') list = S.customFoods;
  else list = FOODS.filter((f) => f.cat === UI.foodCat);
  $('#foodList').innerHTML = list.map((f) => `
    <div class="list-item" data-act="food-pick" data-id="${f.id}">
      <div class="grow"><div class="t">${esc(f.name)}${f.tip ? ' ⭐' : ''}</div><div class="s">${esc(f.portion)} · ${f.kcal} kcal · ${f.p} g protein</div></div>
      <div class="accent" style="font-size:22px">＋</div>
    </div>`).join('') || '<p class="muted small">Nothing found — use Custom food below.</p>';
}

function openFoodSheet(id) {
  const f = foodById(id);
  if (!f) return;
  UI.sheetFood = id; UI.sheetQty = 1;
  openSheet(`<div id="foodSheet"></div>`);
  renderFoodSheet();
}
function renderFoodSheet() {
  const f = foodById(UI.sheetFood); const q = UI.sheetQty;
  $('#foodSheet').innerHTML = `
    <div class="handle"></div>
    <h2>${esc(f.name)}${f.tip ? ' ⭐' : ''}</h2>
    <p class="muted small">${esc(f.portion)} per serving</p>
    <div class="qty">${[0.5, 1, 1.5, 2].map((v) => `<button class="${v === q ? 'active' : ''}" data-act="qty" data-v="${v}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <div class="grid2">
      <div class="stat"><div class="k">Calories</div><div class="v">${Math.round(f.kcal * q)}</div></div>
      <div class="stat"><div class="k">Protein</div><div class="v">${Math.round(f.p * q)} g</div></div>
      <div class="stat"><div class="k">Carbs</div><div class="v">${Math.round(f.c * q)} g</div></div>
      <div class="stat"><div class="k">Fat</div><div class="v">${Math.round(f.f * q)} g</div></div>
    </div>
    <button class="btn primary block" style="margin-top:14px" data-act="food-add">Add to ${prettyDate(UI.foodDate || today())}</button>
    ${f.custom ? `<button class="btn block danger" style="margin-top:8px" data-act="custom-del" data-id="${f.id}">Delete from My foods</button>` : ''}
  `;
}

function addFoodEntry(entry) {
  const date = UI.foodDate || today();
  (S.food[date] = S.food[date] || []).push({ id: uid(), ...entry });
  save();
  closeSheet();
  render();
  const added = S.food[date][S.food[date].length - 1].id;
  toast(`Added ${entry.name}`, 'Undo', () => {
    S.food[date] = (S.food[date] || []).filter((e) => e.id !== added);
    save(); render();
  });
}

function openCustomFood(quick) {
  openSheet(`
    <div class="handle"></div>
    <h2>${quick ? 'Quick add' : 'Custom food'}</h2>
    ${quick ? '' : '<label class="f">Name</label><input id="cfName" placeholder="e.g. Mum\'s curry chicken">'}
    ${quick ? '' : '<label class="f">Portion</label><input id="cfPortion" placeholder="e.g. 1 plate">'}
    <div class="grid2">
      <div><label class="f">Calories</label><input id="cfKcal" type="number" inputmode="numeric"></div>
      <div><label class="f">Protein (g)</label><input id="cfP" type="number" inputmode="numeric"></div>
      ${quick ? '' : `<div><label class="f">Carbs (g)</label><input id="cfC" type="number" inputmode="numeric"></div>
      <div><label class="f">Fat (g)</label><input id="cfF" type="number" inputmode="numeric"></div>`}
    </div>
    ${quick ? '' : '<label class="row small" style="margin-top:12px"><input type="checkbox" id="cfSave" checked style="width:auto"> Save to My foods for next time</label>'}
    <button class="btn primary block" style="margin-top:14px" data-act="${quick ? 'quick-save' : 'custom-save'}">Add</button>
  `);
  setTimeout(() => $(quick ? '#cfKcal' : '#cfName')?.focus(), 250);
}

// ----- Progress -----
function weightChart() {
  const ws = sortedWeights();
  if (!ws.length) return '<p class="muted">Log your weight to see the chart.</p>';
  const W = 340, H = 190, padL = 34, padR = 10, padT = 10, padB = 24;
  const p = S.profile;
  const x0 = p.startDate < ws[0].date ? p.startDate : ws[0].date;
  const x1 = ws[ws.length - 1].date > p.goalDate ? ws[ws.length - 1].date : p.goalDate;
  const span = Math.max(1, daysBetween(x0, x1));
  const vals = ws.map((w) => w.kg).concat([p.goalWeight, p.startWeight]);
  const yMin = Math.floor(Math.min(...vals) - 0.5), yMax = Math.ceil(Math.max(...vals) + 0.5);
  const X = (d) => padL + (daysBetween(x0, d) / span) * (W - padL - padR);
  const Y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);
  let g = '';
  for (let v = yMin; v <= yMax; v++) {
    if ((yMax - yMin) > 8 && v % 2) continue;
    g += `<line x1="${padL}" x2="${W - padR}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2a2f3a" stroke-width="1"/><text x="${padL - 6}" y="${Y(v) + 4}" fill="#9aa3b2" font-size="10" text-anchor="end">${v}</text>`;
  }
  // month ticks
  const d = pdate(x0); d.setDate(1); d.setMonth(d.getMonth() + 1);
  while (dstr(d) <= x1) {
    const s = dstr(d);
    g += `<text x="${X(s)}" y="${H - 6}" fill="#9aa3b2" font-size="10" text-anchor="middle">${d.toLocaleDateString('en-SG', { month: 'short' })}</text>`;
    d.setMonth(d.getMonth() + 1);
  }
  const target = `<line x1="${X(p.startDate)}" y1="${Y(p.startWeight)}" x2="${X(p.goalDate)}" y2="${Y(p.goalWeight)}" stroke="#ffb547" stroke-width="2" stroke-dasharray="5 5"/>`;
  const dots = ws.map((w) => `<circle cx="${X(w.date)}" cy="${Y(w.kg)}" r="2.5" fill="#6aa8ff" opacity=".55"/>`).join('');
  const avgPts = ws.map((w) => `${X(w.date)},${Y(avg7(w.date))}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}${target}${dots}<polyline points="${avgPts}" fill="none" stroke="#3ee6a8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
    <div class="legend"><span><i style="background:#3ee6a8"></i>7-day average</span><span><i style="background:#6aa8ff"></i>Daily weigh-in</span><span><i style="background:#ffb547"></i>Target path</span></div>`;
}

const KEY_LIFTS = ['bench', 'incline_db', 'lat_pulldown', 'db_shoulder', 'hip_thrust', 'leg_press', 'goblet_squat', 'cable_crunch'];

function renderProgress() {
  setTopbar('Progress');
  const ci = checkIn();
  const ws = sortedWeights().reverse();
  const waists = [...S.waists].sort((a, b) => b.date.localeCompare(a.date));
  const scans = [...S.scans].sort((a, b) => b.date.localeCompare(a.date));
  const lifts = KEY_LIFTS.map((id) => {
    const hist = finishedLifts().slice().reverse().filter((s) => s.exercises.some((e) => e.ex === id));
    if (!hist.length) return null;
    const best = (s) => Math.max(...s.exercises.filter((e) => e.ex === id).flatMap((e) => e.log.map((l) => (num(l.w) && num(l.r) ? e1rm(num(l.w), num(l.r)) : 0))));
    return { id, first: best(hist[0]), last: best(hist[hist.length - 1]), n: hist.length };
  }).filter(Boolean);

  view().innerHTML = `
    <div class="card">
      <h3>Weight</h3>
      ${weightChart()}
      <div class="row" style="margin-top:12px; gap:8px">
        <input type="date" id="wDate" value="${today()}" style="flex:1.3">
        <input type="number" id="wKg" inputmode="decimal" step="0.1" placeholder="kg" style="flex:1">
        <button class="btn primary" data-act="weight-add">Add</button>
      </div>
    </div>

    ${ci ? `<div class="card">
      <h3>Weekly coach check-in</h3>
      <div class="grid3" style="margin-bottom:10px">
        <div class="stat"><div class="k">7-day avg</div><div class="v">${round1(ci.nowAvg)}</div></div>
        <div class="stat"><div class="k">This week</div><div class="v">${ci.rate != null ? `${ci.rate > 0 ? '+' : ''}${round1(ci.rate)}` : '–'}</div></div>
        <div class="stat"><div class="k">Needed/wk</div><div class="v">${ci.toGo > 0 ? `-${round1(ci.needed)}` : '✓'}</div></div>
      </div>
      <p class="${ci.status === 'good' ? 'accent' : ci.status === 'collect' ? '' : 'warn'}">${esc(ci.msg)}</p>
      ${ci.delta ? `<button class="btn sm block" data-act="apply-delta" data-v="${ci.delta}">Apply: ${ci.delta > 0 ? '+' : ''}${ci.delta} kcal → ${S.targets.kcal + ci.delta} kcal/day</button>` : ''}
    </div>` : ''}

    <div class="card">
      <h3>Waist (weekly, at belly button)</h3>
      <p class="small muted">The best fat-loss signal you have — more reliable than the Evolt. Measure Monday mornings, relaxed, after breathing out.</p>
      <div class="row" style="gap:8px">
        <input type="date" id="waDate" value="${today()}" style="flex:1.3">
        <input type="number" id="waCm" inputmode="decimal" step="0.1" placeholder="cm" style="flex:1">
        <button class="btn primary" data-act="waist-add">Add</button>
      </div>
      ${waists.slice(0, 8).map((w, i) => `<div class="list-item"><div class="grow"><span class="t">${w.cm} cm</span> <span class="s">${prettyDate(w.date)}${waists[i + 1] ? ` · ${round1(w.cm - waists[i + 1].cm) > 0 ? '+' : ''}${round1(w.cm - waists[i + 1].cm)}` : ''}</span></div><button class="x" data-act="waist-del" data-d="${w.date}">×</button></div>`).join('')}
    </div>

    <div class="card">
      <h3>Strength (estimated 1-rep max)</h3>
      ${lifts.length ? lifts.map((l) => `<div class="list-item"><div class="grow"><div class="t">${esc(exById(l.id).name)}</div><div class="s">${l.n} session${l.n === 1 ? '' : 's'}</div></div>
        <div style="text-align:right"><b>${fmtKg(round1(l.last))} kg</b><div class="s ${l.last > l.first ? 'accent' : 'muted'}">${l.last > l.first ? '+' : ''}${fmtKg(round1(l.last - l.first))} kg</div></div></div>`).join('')
        : '<p class="muted small">Complete a few workouts and your strength gains show up here.</p>'}
    </div>

    <div class="card">
      <div class="row between"><h3 style="margin:0">Body scans</h3><button class="btn sm" data-act="scan-sheet">+ Add scan</button></div>
      ${scans.map((s) => `<div class="list-item"><div class="grow"><div class="t">${prettyDate(s.date)} · ${s.weight} kg · ${s.bf}% fat</div><div class="s">Skeletal muscle ${s.smm ?? '–'} kg${s.note ? ` · ${esc(s.note)}` : ''}</div></div><button class="x" data-act="scan-del" data-d="${s.date}">×</button></div>`).join('')}
      <p class="small muted" style="margin-top:8px">Rescan every 4 weeks, same time of day, fasted and before training — compare scans to each other, not to the absolute number.</p>
    </div>

    <div class="card">
      <h3>Weigh-in log</h3>
      ${ws.slice(0, 10).map((w) => `<div class="list-item"><div class="grow"><span class="t">${w.kg} kg</span> <span class="s">${prettyDate(w.date)}</span></div><button class="x" data-act="weight-del" data-d="${w.date}">×</button></div>`).join('')}
    </div>

    <div class="card">
      <h3>Settings & targets</h3>
      <div class="grid2">
        <div><label class="f">Calories / day</label><input id="tKcal" type="number" inputmode="numeric" value="${S.targets.kcal}"></div>
        <div><label class="f">Protein (g)</label><input id="tP" type="number" inputmode="numeric" value="${S.targets.protein}"></div>
        <div><label class="f">Carbs (g)</label><input id="tC" type="number" inputmode="numeric" value="${S.targets.carbs}"></div>
        <div><label class="f">Fat (g)</label><input id="tF" type="number" inputmode="numeric" value="${S.targets.fat}"></div>
        <div><label class="f">Goal weight (kg)</label><input id="gW" type="number" inputmode="decimal" step="0.1" value="${S.profile.goalWeight}"></div>
        <div><label class="f">Goal date</label><input id="gD" type="date" value="${S.profile.goalDate}"></div>
      </div>
      <button class="btn primary block" style="margin-top:12px" data-act="targets-save">Save settings</button>
      <h3 style="margin-top:18px">Backup</h3>
      <p class="small muted">Your data lives only on this phone. Export a backup every week or two (save to Files or send to yourself).</p>
      <div class="grid2">
        <button class="btn sm" data-act="export">⬆︎ Export backup</button>
        <button class="btn sm" data-act="import">⬇︎ Import backup</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden">
      <button class="btn sm block danger" style="margin-top:10px" data-act="reset">Reset all data</button>
    </div>
  `;
}

function openScanSheet() {
  openSheet(`
    <div class="handle"></div>
    <h2>Add body scan</h2>
    <label class="f">Date</label><input type="date" id="scDate" value="${today()}">
    <div class="grid3">
      <div><label class="f">Weight kg</label><input id="scW" type="number" inputmode="decimal" step="0.1"></div>
      <div><label class="f">Body fat %</label><input id="scBf" type="number" inputmode="decimal" step="0.1"></div>
      <div><label class="f">Skel. muscle</label><input id="scSmm" type="number" inputmode="decimal" step="0.1"></div>
    </div>
    <label class="f">Note</label><input id="scNote" placeholder="e.g. Evolt, fasted, 8am">
    <button class="btn primary block" style="margin-top:14px" data-act="scan-save">Save</button>
  `);
}

// ----- Plan -----
function renderPlan() {
  setTopbar('Your Plan');
  const T = S.targets;
  view().innerHTML = `
    <div class="card hero">
      <h2>The goal: lean, strong & visible abs by 31 Dec</h2>
      <p class="small">63.7 kg → <b>${S.profile.goalWeight} kg</b> · body fat → ~10% · stronger every week. That means losing ~0.4–0.5 kg a week while keeping (and building) muscle.</p>
    </div>

    <details open>
      <summary>📅 Your week</summary>
      <table class="sched">
        <tr><td>Mon</td><td><b>Upper A</b> — chest & shoulders</td></tr>
        <tr><td>Tue</td><td><b>Lower A</b> — glutes & core</td></tr>
        <tr><td>Wed</td><td>Grid class ⚡ (or rest)</td></tr>
        <tr><td>Thu</td><td><b>Upper B</b> — back, arms & delts</td></tr>
        <tr><td>Fri</td><td><b>Lower B</b> — legs, glutes & abs</td></tr>
        <tr><td>Sat</td><td>Grid class ⚡</td></tr>
        <tr><td>Sun</td><td>Rest — walk 10k steps</td></tr>
      </table>
      <p class="small muted" style="margin-top:8px">Days are flexible — the app always tells you which workout is next. Try not to put Grid the day before a Lower day.</p>
    </details>

    <details>
      <summary>🍽️ Nutrition targets</summary>
      <div class="grid2" style="margin-bottom:10px">
        <div class="stat"><div class="k">Calories</div><div class="v">${T.kcal}</div></div>
        <div class="stat"><div class="k">Protein</div><div class="v">${T.protein} g</div></div>
        <div class="stat"><div class="k">Carbs</div><div class="v">${T.carbs} g</div></div>
        <div class="stat"><div class="k">Fat</div><div class="v">${T.fat} g</div></div>
      </div>
      <ul class="plan-list small">
        <li><b>2 meals is fine.</b> Skipping breakfast doesn't hurt fat loss or muscle — total protein and calories do. Black coffee / kopi-O kosong in the morning is fine.</li>
        <li>Each meal: <b>~55 g protein</b> (roughly 2 palms of meat/fish). Top up with a whey shake or Greek yoghurt to hit ${T.protein} g.</li>
        <li>On training days, eat one of your meals within ~2 hours after the gym.</li>
        <li>Your calories adjust weekly in <b>Progress → check-in</b> based on your real weight trend.</li>
      </ul>
    </details>

    <details>
      <summary>🥢 Hawker, HeyBo & delivery playbook</summary>
      <ul class="plan-list small">
        <li><b>Best hawker picks:</b> sliced fish soup, yong tau foo soup, chicken rice with plain rice & no skin, cai fan with 2 lean meats + veg and ½ rice, grilled chicken.</li>
        <li><b>Magic phrases:</b> "shao fan" (less rice), "no gravy", "no skin", "soup not dry".</li>
        <li><b>HeyBo:</b> go greens + half grain, double protein, sauce on the side. That's ~500–600 kcal with 40–55 g protein.</li>
        <li><b>Delivery:</b> sashimi, tandoori chicken, pho, Subway chicken (no mayo), teriyaki don with half rice. Avoid katsu, curry & creamy pasta most nights.</li>
        <li><b>Drinks:</b> kopi-C kosong instead of kopi saves ~75 kcal a cup. Bubble tea is a dessert.</li>
        <li><b>Meal prep:</b> even 3 prep boxes a fortnight helps — batch chicken + rice + veg on Sunday.</li>
      </ul>
    </details>

    <details>
      <summary>🍷 Alcohol</summary>
      <p class="small">A pint a week is fine (~230 kcal). A full bottle of red is ~625 kcal — a third of your day — and slows recovery. Until 31 Dec: cap it at 2 glasses, log it, and keep protein high that day. December parties: plan for them, don't skip training the next day.</p>
    </details>

    <details>
      <summary>🏋️ How to progress (the app does it for you)</summary>
      <ul class="plan-list small">
        <li>Each exercise has a rep range (e.g. 8–12). Use the same weight until you hit the <b>top of the range on all sets</b> — then the app bumps the weight up.</li>
        <li>Finish most sets with <b>2–3 reps left in the tank</b>. Last set of an exercise can go closer to failure.</li>
        <li>The app pre-fills last time's weight and target reps — just lift and tap ✓. Edit if you did more or fewer.</li>
        <li>Starting weights are educated guesses from your 45 kg bench — adjust in your first week and the app learns.</li>
      </ul>
    </details>

    <details>
      <summary>🩹 Protecting your lower back</summary>
      <ul class="plan-list small">
        <li>No barbell squats or deadlifts for now. You get the same glute & leg growth from hip thrusts, leg press, split squats and goblet squats — with much less back stress.</li>
        <li>The 5-minute warm-up (McGill curl-up, bird dog, side plank) builds a stiff, protective core. Don't skip it.</li>
        <li>Brace before every rep: breathe into your belly, tighten like you're about to be poked.</li>
        <li>Desk tightness: hip flexor stretch + 10 glute squeezes every hour you sit.</li>
        <li>Muscle soreness is normal. <b>Sharp, shooting or leg-radiating pain is not</b> — stop and see a physio.</li>
        <li>Once your back feels solid (4–6 weeks), we can add a light dumbbell RDL to build the hinge.</li>
      </ul>
    </details>

    <details>
      <summary>📏 Body fat — what's real?</summary>
      <p class="small">Your Evolt said 14.6%, and you feel ~18%. Scales like the Evolt send a small current through your body and can easily be 3–5% off. Your real number is likely 15–18%. Either way the plan is the same: <b>~60 kg at your current muscle mass ≈ 10% body fat</b>. Track your waist + 7-day average weight + monthly photos in the same light — those don't lie.</p>
    </details>

    <details>
      <summary>🎯 Milestones</summary>
      <ul class="plan-list small">
        <li><b>End Oct:</b> ~62.8 kg avg · nailed technique on every exercise · logging food daily.</li>
        <li><b>End Nov:</b> ~61.2 kg · bench 50 kg × 8 · waist down 2–3 cm · upper abs showing in good light.</li>
        <li><b>31 Dec:</b> ~60 kg · bench 52.5+ kg · clear upper abs, firmer glutes & capped shoulders.</li>
      </ul>
    </details>

    <details>
      <summary>📲 Install & backup</summary>
      <ul class="plan-list small">
        <li>In Safari: Share → <b>Add to Home Screen</b>. Open it from the icon every time — that keeps your data safe.</li>
        <li>Export a backup from Progress → Settings every week or two.</li>
      </ul>
    </details>
  `;
}

// ---------- Sheet & toast ----------
function openSheet(html) { $('#sheetPanel').innerHTML = html; $('#sheet').classList.remove('hidden'); }
function closeSheet() { $('#sheet').classList.add('hidden'); $('#sheetPanel').innerHTML = ''; }
let toastTimer = null;
function toast(msg, actLabel, actFn) {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${actLabel ? `<button id="toastAct">${esc(actLabel)}</button>` : ''}`;
  el.classList.remove('hidden');
  if (actLabel) $('#toastAct').onclick = () => { el.classList.add('hidden'); actFn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3500);
}

// ---------- Actions ----------
function upsertByDate(arr, date, obj) {
  const i = arr.findIndex((x) => x.date === date);
  if (i >= 0) arr[i] = { ...arr[i], ...obj, date }; else arr.push({ ...obj, date });
}

const actions = {
  goto: (el) => { UI.tab = el.dataset.tab; render(); window.scrollTo(0, 0); },
  'sheet-close': closeSheet,
  'log-weight-today': () => {
    const v = num($('#wToday').value);
    if (!v || v < 30 || v > 200) return toast('Enter your weight in kg');
    upsertByDate(S.weights, today(), { kg: v }); save(); render(); toast('Weight saved ✓');
  },
  'start-tpl': (el) => {
    if (S.active && !confirm('You have a workout in progress. Resume it instead?')) return;
    startSession(el.dataset.id);
  },
  'start-custom': () => startSession(null),
  finish: finishSession,
  discard: () => { if (confirm('Discard this workout? Nothing will be saved.')) { S.active = null; stopRest(); save(); render(); } },
  cue: (el) => $(`#cue-${el.dataset.ei}`).classList.toggle('hidden'),
  'set-done': (el) => {
    const e = S.active.exercises[+el.dataset.ei];
    const l = e.log[+el.dataset.si];
    l.done = !l.done;
    if (l.done) {
      if (!l.r) l.r = String(e.reps[0]);
      const allDone = S.active.exercises.every((x) => x.log.every((y) => y.done));
      if (!allDone) startRest(e.rest);
    }
    save(); renderSession();
  },
  'set-add': (el) => {
    const e = S.active.exercises[+el.dataset.ei];
    const last = e.log[e.log.length - 1] || { w: '', r: String(e.reps[0]) };
    e.log.push({ w: last.w, r: last.r, done: false }); save(); renderSession();
  },
  'set-remove': (el) => {
    const e = S.active.exercises[+el.dataset.ei];
    if (e.log.length > 1) { e.log.pop(); save(); renderSession(); }
  },
  'ex-remove': (el) => {
    if (!confirm('Remove this exercise?')) return;
    S.active.exercises.splice(+el.dataset.ei, 1); save(); renderSession();
  },
  'ex-up': (el) => {
    const i = +el.dataset.ei; if (i === 0) return;
    const a = S.active.exercises; [a[i - 1], a[i]] = [a[i], a[i - 1]]; save(); renderSession();
  },
  'lib-open': (el) => openLibrary(el.dataset.mode, el.dataset.ei != null ? +el.dataset.ei : null),
  'lib-group': (el) => {
    UI.libGroup = el.dataset.g;
    document.querySelectorAll('[data-act="lib-group"]').forEach((c) => c.classList.toggle('active', c.dataset.g === UI.libGroup));
    renderLibList();
  },
  'lib-pick': (el) => {
    const id = el.dataset.id;
    if (UI.libMode === 'swap') {
      const old = S.active.exercises[UI.libIndex];
      const ex = exById(id);
      const reps = exType(ex) === 'time' ? [30, 45] : old.reps;
      S.active.exercises[UI.libIndex] = buildExercise(id, old.log.length, reps, old.rest);
    } else {
      S.active.exercises.push(buildExercise(id));
    }
    save(); closeSheet(); renderSession();
    if (UI.libMode !== 'swap') window.scrollTo(0, document.body.scrollHeight);
  },
  'view-session': (el) => viewSession(el.dataset.id),
  'delete-session': (el) => {
    if (!confirm('Delete this workout from history?')) return;
    S.sessions = S.sessions.filter((s) => s.id !== el.dataset.id); save(); closeSheet(); render();
  },
  'grid-sheet': openGridSheet,
  'grid-save': () => {
    const date = $('#gridDate').value || today();
    const min = num($('#gridMin').value) || 45;
    const end = pdate(date).getTime() + 12 * 3600000;
    S.sessions.push({ id: uid(), type: 'grid', date, start: end, end, name: 'Grid class', durationMin: min, exercises: [] });
    save(); closeSheet(); render(); toast('Grid class logged ⚡');
  },
  'rest-add': () => { restEnd = Math.max(restEnd, Date.now()) + 30000; tickRest(); },
  'rest-stop': stopRest,

  'food-day': (el) => {
    const d = addDays(UI.foodDate || today(), +el.dataset.d);
    if (d > today()) return;
    UI.foodDate = d === today() ? null : d; render();
  },
  'food-cat': (el) => {
    UI.foodCat = el.dataset.c; UI.foodSearch = '';
    const s = $('#foodSearch'); if (s) s.value = '';
    document.querySelectorAll('[data-act="food-cat"]').forEach((c) => c.classList.toggle('active', c.dataset.c === UI.foodCat));
    renderFoodList();
  },
  'food-pick': (el) => openFoodSheet(el.dataset.id),
  qty: (el) => { UI.sheetQty = +el.dataset.v; renderFoodSheet(); },
  'food-add': () => {
    const f = foodById(UI.sheetFood);
    addFoodEntry({ fid: f.id, name: f.name, portion: f.portion, kcal: f.kcal, p: f.p, c: f.c, f: f.f, qty: UI.sheetQty });
  },
  'food-del': (el) => {
    const date = UI.foodDate || today();
    S.food[date] = dayEntries(date).filter((e) => e.id !== el.dataset.id); save(); render();
  },
  'food-custom': () => openCustomFood(false),
  'food-quick': () => openCustomFood(true),
  'custom-save': () => {
    const name = $('#cfName').value.trim() || 'Custom food';
    const f = { id: 'c_' + uid(), cat: 'My foods', custom: true, name, portion: $('#cfPortion').value.trim() || '1 serving', kcal: num($('#cfKcal').value) || 0, p: num($('#cfP').value) || 0, c: num($('#cfC').value) || 0, f: num($('#cfF').value) || 0 };
    if (!f.kcal) return toast('Enter calories');
    if ($('#cfSave').checked) S.customFoods.unshift(f);
    addFoodEntry({ fid: $('#cfSave').checked ? f.id : null, name: f.name, portion: f.portion, kcal: f.kcal, p: f.p, c: f.c, f: f.f, qty: 1 });
  },
  'quick-save': () => {
    const kcal = num($('#cfKcal').value);
    if (!kcal) return toast('Enter calories');
    addFoodEntry({ fid: null, name: 'Quick add', portion: '', kcal, p: num($('#cfP').value) || 0, c: 0, f: 0, qty: 1 });
  },
  'custom-del': (el) => {
    S.customFoods = S.customFoods.filter((f) => f.id !== el.dataset.id); save(); closeSheet(); render();
  },

  'weight-add': () => {
    const v = num($('#wKg').value); const d = $('#wDate').value || today();
    if (!v || v < 30 || v > 200) return toast('Enter your weight in kg');
    upsertByDate(S.weights, d, { kg: v }); save(); render(); toast('Weight saved ✓');
  },
  'weight-del': (el) => { S.weights = S.weights.filter((w) => w.date !== el.dataset.d); save(); render(); },
  'waist-add': () => {
    const v = num($('#waCm').value); const d = $('#waDate').value || today();
    if (!v || v < 40 || v > 200) return toast('Enter your waist in cm');
    upsertByDate(S.waists, d, { cm: v }); save(); render(); toast('Waist saved ✓');
  },
  'waist-del': (el) => { S.waists = S.waists.filter((w) => w.date !== el.dataset.d); save(); render(); },
  'scan-sheet': openScanSheet,
  'scan-save': () => {
    const w = num($('#scW').value), bf = num($('#scBf').value);
    if (!w || bf == null) return toast('Enter weight and body fat %');
    upsertByDate(S.scans, $('#scDate').value || today(), { weight: w, bf, smm: num($('#scSmm').value), note: $('#scNote').value.trim() });
    save(); closeSheet(); render();
  },
  'scan-del': (el) => { if (confirm('Delete this scan?')) { S.scans = S.scans.filter((s) => s.date !== el.dataset.d); save(); render(); } },
  'apply-delta': (el) => {
    const d = +el.dataset.v;
    S.targets.kcal += d; S.targets.carbs = Math.max(50, S.targets.carbs + Math.round(d / 4));
    save(); render(); toast(`Target now ${S.targets.kcal} kcal`);
  },
  'targets-save': () => {
    S.targets = { kcal: num($('#tKcal').value) || S.targets.kcal, protein: num($('#tP').value) || S.targets.protein, carbs: num($('#tC').value) || S.targets.carbs, fat: num($('#tF').value) || S.targets.fat };
    S.profile.goalWeight = num($('#gW').value) || S.profile.goalWeight;
    S.profile.goalDate = $('#gD').value || S.profile.goalDate;
    save(); render(); toast('Settings saved ✓');
  },
  export: async () => {
    const json = JSON.stringify(S, null, 1);
    const name = `coach-backup-${today()}.json`;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Coach backup' }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  },
  import: () => $('#importFile').click(),
  reset: () => {
    if (!confirm('Delete ALL your data? Export a backup first if you want to keep it.')) return;
    if (!confirm('Really? This cannot be undone.')) return;
    S = freshState(); save(); render();
  },
};

document.addEventListener('click', (ev) => {
  const tab = ev.target.closest('.tabbar [data-tab]');
  if (tab) { UI.tab = tab.dataset.tab; closeSheet(); render(); window.scrollTo(0, 0); return; }
  const el = ev.target.closest('[data-act]');
  if (el && actions[el.dataset.act]) { ev.preventDefault(); actions[el.dataset.act](el); }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  const kind = el.dataset && el.dataset.in;
  if (kind === 'set' && S.active) {
    const l = S.active.exercises[+el.dataset.ei].log[+el.dataset.si];
    l[el.dataset.field] = el.value; save();
  } else if (kind === 'lib-search') renderLibList();
  else if (kind === 'food-search') { UI.foodSearch = el.value; renderFoodList(); }
});

document.addEventListener('change', (ev) => {
  if (ev.target.id !== 'importFile') return;
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.weights) || !Array.isArray(data.sessions)) throw new Error('bad');
      if (!confirm('Replace all current data with this backup?')) return;
      S = { ...freshState(), ...data }; save(); render(); toast('Backup restored ✓');
    } catch (e) { toast('That file isn\'t a valid backup'); }
  };
  reader.readAsText(file);
});

// Workout clock
setInterval(() => { const el = $('#elapsed'); if (el && S.active) el.textContent = fmtTime((Date.now() - S.active.start) / 1000); }, 1000);

// Day rollover / returning to the app
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && $('#sheet').classList.contains('hidden') && document.activeElement?.tagName !== 'INPUT') render();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
