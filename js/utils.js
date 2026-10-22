// ─── UTILITIES ───────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

// Bilingual text helper — every dynamic string is written in both languages
function tx(en, pt) { return S.lang === 'pt' ? pt : en; }

// Source chip: <a class="src">D2</a> linking to the official page
function src(...ids) {
  return ids.map(id => {
    const s = SOURCES[id];
    if (!s) return '';
    const blog = id[0] === 'B' ? ' blog' : '';
    return `<a class="src${blog}" href="${s.url}" target="_blank" rel="noopener" title="${s.t}">${id}</a>`;
  }).join('');
}

let logCount = 0;
function log(level, comp, msg) {
  const el = $('log');
  const now = new Date();
  const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');
  const cls = { INFO: 'li', WARN: 'lw', ERROR: 'le', SUCCESS: 'ls' }[level] || 'li';
  const row = document.createElement('div');
  row.className = 'lr';
  row.innerHTML = `<span class="lt">${ts}</span><span class="${cls}">${level}</span><span class="lc">${comp}</span><span class="lm">${msg}</span>`;
  el.insertBefore(row, el.firstChild);
  if (++logCount > 100) el.lastChild && el.removeChild(el.lastChild);
}

// Render a list of steps into an <ol class="steps">; states: '', active, done, skip
function renderSteps(olId, items, states) {
  $(olId).innerHTML = items.map((h, i) => `<li class="${(states && states[i]) || ''}">${h}</li>`).join('');
}
function setStep(olId, i, state) {
  const li = $(olId).children[i];
  if (li) li.className = state;
}

// ─── SVG HELPERS ─────────────────────────────────────────────────────────────
// Brand rule: architecture-diagram icons use only Spring Green and Slate.
// Status red is reserved for failures (always paired with an ✕ and a label).
const C = {
  slate: '#001E2B', white: '#FFFFFF', spring: '#00ED64', forest: '#00684A', evergreen: '#023430', offwhite: '#FAFBFC',
  lavender: '#F9EBFF', mist: '#E3FCF7',
  sky: '#00D2FF', clearblue: '#006EFF', lime: '#E9FF99',            // chart-only colors
  t2: 'rgba(0,30,43,.72)', t3: 'rgba(0,30,43,.5)', line: 'rgba(0,30,43,.22)', faint: 'rgba(0,30,43,.12)',
  bad: '#C0392B', badBg: '#FDF0EE', warn: '#B45309',
};

function crossMark(cx, cy, k) {
  return `<line x1="${cx - k}" y1="${cy - k}" x2="${cx + k}" y2="${cy + k}" stroke="${C.bad}" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="${cx + k}" y1="${cy - k}" x2="${cx - k}" y2="${cy + k}" stroke="${C.bad}" stroke-width="2.5" stroke-linecap="round"/>`;
}

// MongoDB node icon. role: PRIMARY | STANDBY | SECONDARY | READ_ONLY | ANALYTICS ; state: UP | DOWN | PROVISIONING
// Roles differ by fill/ring (Spring Green vs Slate) and are always labelled below the icon.
function mdbNodeIcon(cx, cy, size, state, role) {
  const s = size || 44, w = s * 0.92, r = s * 0.18, cr = s * 0.30;
  let stroke = C.slate, sw = 2, bg = C.white, cFill = C.slate, cStroke = 'none', cSw = 0, txt = C.spring, dash = '', op = 1;
  if (role === 'PRIMARY')   { cFill = C.spring; txt = C.slate; sw = 3; }
  if (role === 'READ_ONLY') { cFill = C.white; cStroke = C.slate; cSw = 2.2; txt = C.slate; }
  if (role === 'ANALYTICS') { cFill = C.white; cStroke = C.spring; cSw = 3.2; txt = C.slate; }
  if (state === 'PROVISIONING') { dash = 'stroke-dasharray="4 3"'; op = .55; }
  if (state === 'DOWN') { stroke = C.bad; bg = C.badBg; cFill = C.white; cStroke = C.bad; cSw = 1.5; txt = C.bad; sw = 2.5; }
  return `<g opacity="${op}">
    <rect x="${cx - w / 2}" y="${cy - w / 2}" width="${w}" height="${w}" rx="${r}" ry="${r}" fill="${bg}" stroke="${stroke}" stroke-width="${sw}" ${dash}/>
    <circle cx="${cx}" cy="${cy}" r="${cr}" fill="${cFill}" stroke="${cStroke}" stroke-width="${cSw}"/>
    <text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="middle" font-size="${s * 0.2}" font-weight="700" fill="${txt}"
      style="font-family:'SF Mono','Consolas','Courier New',monospace">{ }</text>
    ${state === 'DOWN' ? crossMark(cx, cy, cr * .65) : ''}</g>`;
}

// Role badge under a node
function roleBadge(cx, y, role, state, label) {
  let fill = C.slate, stroke = 'none', txt = C.white, dash = '';
  if (state === 'DOWN') { fill = C.badBg; stroke = C.bad; txt = C.bad; }
  else if (state === 'PROVISIONING') { fill = C.offwhite; stroke = C.t3; txt = C.t2; dash = 'stroke-dasharray="3 2"'; }
  else if (role === 'PRIMARY') { fill = C.spring; txt = C.slate; }
  else if (role === 'READ_ONLY') { fill = C.white; stroke = C.slate; txt = C.slate; }
  else if (role === 'ANALYTICS') { fill = C.white; stroke = C.forest; txt = C.forest; }
  const w = Math.max(56, label.length * 5.6 + 14);
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="15" rx="7.5" fill="${fill}" stroke="${stroke}" stroke-width="1.2" ${dash}/>
    <text x="${cx}" y="${y + 11}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${txt}" letter-spacing=".3">${label}</text>`;
}

// Log Service replica — a stack of log segments (newest one in Spring Green)
function logIcon(cx, cy, down) {
  const st = down ? C.bad : C.slate;
  const bars = [0, 1, 2, 3].map(i =>
    `<rect x="${cx - 14}" y="${cy - 13 + i * 7}" width="${[24, 28, 20, 28][i]}" height="4.5" rx="2" fill="${down ? 'rgba(192,57,43,.35)' : (i === 3 ? C.spring : C.slate)}"/>`).join('');
  return `<rect x="${cx - 21}" y="${cy - 19}" width="42" height="38" rx="7" fill="${down ? C.badBg : C.white}" stroke="${st}" stroke-width="1.6"/>${bars}
    ${down ? crossMark(cx, cy, 12) : ''}`;
}

// Page Service — a grid of materialized pages
function pageIcon(cx, cy, down) {
  const st = down ? C.bad : C.slate;
  let cells = '';
  for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++)
    cells += `<rect x="${cx - 13 + k * 9}" y="${cy - 13 + r * 9}" width="7" height="7" rx="1.5" fill="${down ? 'rgba(192,57,43,.35)' : ((r + k) % 2 === 0 ? C.spring : C.slate)}"/>`;
  return `<rect x="${cx - 19}" y="${cy - 19}" width="38" height="38" rx="7" fill="${down ? C.badBg : C.white}" stroke="${st}" stroke-width="1.6"/>${cells}
    ${down ? crossMark(cx, cy, 12) : ''}`;
}

// Object-storage bucket
function bucketIcon(x, y) {
  return `<g transform="translate(${x},${y})"><path d="M0,6 L5,36 Q17,42 29,36 L34,6 Z" fill="${C.slate}"/>
    <path d="M2.2,18 L31.8,18 L30.6,25 L3.4,25 Z" fill="${C.spring}"/>
    <ellipse cx="17" cy="6" rx="17" ry="5.5" fill="${C.white}" stroke="${C.slate}" stroke-width="1.6"/></g>`;
}

// Disk cylinder (Atlas Core local storage)
function diskIcon(cx, cy, w, h, label) {
  const rx = w / 2, ry = 6;
  return `<path d="M${cx - rx},${cy - h / 2} v${h} a${rx},${ry} 0 0,0 ${w},0 v-${h}" fill="${C.white}" stroke="${C.slate}" stroke-width="1.6"/>
    <ellipse cx="${cx}" cy="${cy - h / 2}" rx="${rx}" ry="${ry}" fill="${C.spring}" stroke="${C.slate}" stroke-width="1.6"/>
    ${label ? `<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-size="8.5" fill="${C.slate}" font-weight="600">${label}</text>` : ''}`;
}

// Client application box
function clientBox(cx, y, w, label, sub) {
  return `<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${sub ? 36 : 28}" rx="8" fill="${C.white}" stroke="${C.slate}" stroke-width="1.4"/>
    <text x="${cx}" y="${y + (sub ? 15 : 18)}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.slate}" letter-spacing=".5">${label}</text>
    ${sub ? `<text x="${cx}" y="${y + 28}" text-anchor="middle" font-size="8.5" fill="${C.t3}">${sub}</text>` : ''}`;
}

// Animate a packet along a polyline — resolves when it arrives
function fly(svgId, pts, ms, color, r, keep) {
  return new Promise(resolve => {
    const svg = $(svgId) && $(svgId).querySelector('svg');
    if (!svg) return resolve();
    let fx = svg.querySelector('g.fx');
    if (!fx) { fx = document.createElementNS('http://www.w3.org/2000/svg', 'g'); fx.setAttribute('class', 'fx'); svg.appendChild(fx); }
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('r', r || 6);
    c.setAttribute('fill', color || '#00ED64');
    c.setAttribute('stroke', color === C.slate || color === C.evergreen ? C.white : C.slate);
    c.setAttribute('stroke-width', '1.6');
    fx.appendChild(c);
    const segs = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const d = Math.hypot(x2 - x1, y2 - y1);
      segs.push({ x1, y1, x2, y2, d }); total += d;
    }
    const t0 = performance.now();
    function step(now) {
      const p = clamp((now - t0) / ms, 0, 1);
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      let dist = e * total, x = pts[0][0], y = pts[0][1];
      for (const s of segs) {
        if (dist <= s.d) { const k = s.d ? dist / s.d : 0; x = s.x1 + (s.x2 - s.x1) * k; y = s.y1 + (s.y2 - s.y1) * k; break; }
        dist -= s.d; x = s.x2; y = s.y2;
      }
      c.setAttribute('cx', x); c.setAttribute('cy', y);
      if (p < 1) requestAnimationFrame(step);
      else { if (!keep) c.remove(); resolve(c); }
    }
    requestAnimationFrame(step);
  });
}

// Floating label that fades out (e.g. "ACK", "durable")
function flash(svgId, x, y, text, color) {
  const svg = $(svgId) && $(svgId).querySelector('svg');
  if (!svg) return;
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', x); t.setAttribute('y', y);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-size', '10'); t.setAttribute('font-weight', '800');
  t.setAttribute('fill', color || C.forest);
  t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke', '#fff'); t.setAttribute('stroke-width', '3');
  t.textContent = text;
  t.style.transition = 'opacity 1.4s ease, transform 1.4s ease';
  svg.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '0'; t.style.transform = 'translateY(-10px)'; });
  setTimeout(() => t.remove(), 1500);
}

function fmtTB(tb) {
  if (tb < 1) return (tb * 1000).toFixed(0) + ' GB';
  return (tb < 10 ? tb.toFixed(1) : tb.toFixed(0)) + ' TB';
}
