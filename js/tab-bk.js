// ─── TAB 5 — BACKUP & RESTORE ────────────────────────────────────────────────

const BP = {};
const BK_SPLIT = 400;   // slider: 0–399 → older than 24 h (snapshots only); 400–1000 → last 24 h (PITR)
const BK_SNAPS = [      // positions on the "older" segment (illustrative retained snapshots)
  { v: 15, en: '~3 years', pt: '~3 anos' }, { v: 90, en: '~1 year', pt: '~1 ano' }, { v: 170, en: '~6 months', pt: '~6 meses' },
  { v: 250, en: '~1 month', pt: '~1 mês' }, { v: 320, en: '~7 days', pt: '~7 dias' }, { v: 375, en: '~2 days', pt: '~2 dias' },
];

function bkRender() {
  let s = `<svg viewBox="0 0 760 236" width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="8" width="470" height="88" rx="12" fill="${C.mist}" stroke="rgba(0,104,74,.35)" stroke-width="1.4"/>
    <text x="24" y="27" font-size="10" font-weight="800" fill="${C.forest}" letter-spacing="1">${tx('COMPUTE LAYER', 'CAMADA DE COMPUTE')}</text>
    ${mdbNodeIcon(70, 62, 40, 'UP', 'PRIMARY')}${mdbNodeIcon(125, 62, 40, 'UP', 'STANDBY')}
    <text x="160" y="52" font-size="10.5" font-weight="700" fill="${C.slate}">${tx('Busy serving your queries', 'Ocupado atendendo suas queries')}</text>
    <text x="160" y="68" font-size="9.5" fill="${C.t2}">${tx('not involved in taking backups —', 'não participa dos backups —')}</text>
    <text x="160" y="82" font-size="9.5" fill="${C.t2}">${tx('no competition for CPU, RAM or IOPS', 'sem disputa de CPU, RAM ou IOPS')}</text>
    <rect x="10" y="112" width="470" height="116" rx="12" fill="${C.lavender}" stroke="${C.line}" stroke-width="1.4"/>
    <text x="24" y="131" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing="1">${tx('STORAGE LAYER', 'CAMADA DE STORAGE')}</text>
    ${logIcon(80, 176, false)}${pageIcon(150, 176, false)}${bucketIcon(205, 157)}
    <text x="80" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">Log Service</text>
    <text x="150" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">Page Service</text>
    <text x="222" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">S3</text>
    <text x="262" y="168" font-size="9.5" fill="${C.t2}">${tx('backup, restore and point-in-time', 'backup, restore e point-in-time')}</text>
    <text x="262" y="182" font-size="9.5" fill="${C.t2}">${tx('recovery run here, independently', 'recovery rodam aqui, de forma')}</text>
    <text x="262" y="196" font-size="9.5" fill="${C.t2}">${tx('of the compute layer', 'independente do compute')}</text>
    <path d="M480,170 C520,170 520,120 556,120" fill="none" stroke="${C.forest}" stroke-width="2" class="repl"/>
    <rect x="556" y="20" width="194" height="208" rx="12" fill="${C.slate}"/>
    <text x="653" y="44" text-anchor="middle" font-size="11" font-weight="800" fill="${C.spring}">Cloud Backup</text>
    <rect x="572" y="58" width="162" height="64" rx="8" fill="rgba(255,255,255,.07)" stroke="rgba(0,237,100,.45)"/>
    <text x="653" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="${C.white}">${tx('Continuous backup', 'Backup contínuo')}</text>
    <text x="653" y="94" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">${tx('last 24 hours', 'últimas 24 horas')}</text>
    <text x="653" y="110" text-anchor="middle" font-size="9" fill="${C.spring}">${tx('point-in-time restore', 'restore point-in-time')}</text>
    <rect x="572" y="132" width="162" height="80" rx="8" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.25)"/>
    <text x="653" y="152" text-anchor="middle" font-size="10" font-weight="700" fill="${C.white}">${tx('Snapshots', 'Snapshots')}</text>
    <text x="653" y="168" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">Additional Backup Retention</text>
    <text x="653" y="182" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">${tx('on by default', 'ativado por padrão')}</text>
    <text x="653" y="200" text-anchor="middle" font-size="9" fill="${C.spring}">${tx('kept up to 3 years', 'mantidos até 3 anos')}</text>
  </svg>`;
  $('bk-svg').innerHTML = s;
}

function bkRenderTimeline() {
  const W = 720, y0 = 72, xL = 20, xS = 300, xR = 700;
  const pos = v => v < BK_SPLIT ? xL + (v / BK_SPLIT) * (xS - xL - 14) : xS + 6 + ((v - BK_SPLIT) / (1000 - BK_SPLIT)) * (xR - xS - 6);
  let s = `<svg viewBox="0 0 ${W} 130" width="100%" xmlns="http://www.w3.org/2000/svg">
    <text x="${xL}" y="12" font-size="9.5" font-weight="700" fill="${C.t2}">${tx('OLDER — retained snapshots only (up to 3 years)', 'MAIS ANTIGO — apenas snapshots retidos (até 3 anos)')}</text>
    <text x="${xR}" y="12" text-anchor="end" font-size="9.5" font-weight="700" fill="${C.forest}">${tx('LAST 24 h — continuous: any point in time', 'ÚLTIMAS 24 h — contínuo: qualquer ponto no tempo')}</text>
    <line x1="${xL}" x2="${xS - 14}" y1="${y0}" y2="${y0}" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>
    <text x="${xS - 7}" y="${y0 + 4}" text-anchor="middle" font-size="11" fill="${C.t3}">≈</text>
    <rect x="${xS + 6}" y="${y0 - 9}" width="${xR - xS - 6}" height="18" rx="9" fill="${C.mist}" stroke="${C.forest}" stroke-width="1.5"/>`;
  for (let h = 0; h <= 24; h += 6) {
    const x = xS + 6 + (h / 24) * (xR - xS - 6);
    s += `<line x1="${x}" x2="${x}" y1="${y0 + 11}" y2="${y0 + 17}" stroke="${C.t3}"/>
      <text x="${x}" y="${y0 + 29}" text-anchor="middle" font-size="9" fill="${C.t2}">${h === 24 ? tx('now', 'agora') : '−' + (24 - h) + 'h'}</text>`;
  }
  BK_SNAPS.forEach(sn => {
    const x = pos(sn.v);
    s += `<circle cx="${x}" cy="${y0}" r="6" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/>
      <text x="${x}" y="${y0 + 26}" text-anchor="middle" font-size="8.5" fill="${C.t2}">${S.lang === 'pt' ? sn.pt : sn.en}</text>`;
  });
  [450, 700, 950].forEach(v => { s += `<circle cx="${pos(v)}" cy="${y0}" r="5" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/>`; });
  const x = pos(S.bk.point), pit = S.bk.point >= BK_SPLIT;
  s += `<line x1="${x}" x2="${x}" y1="${y0 - 26}" y2="${y0 + 12}" stroke="${C.slate}" stroke-width="2"/>
    <path d="M${x - 6},${y0 - 32} L${x + 6},${y0 - 32} L${x},${y0 - 24} Z" fill="${pit ? C.spring : C.slate}" stroke="${C.slate}"/>
    <text x="${clamp(x, 60, W - 60)}" y="${y0 - 36}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${C.slate}">${bkPointLabel()}</text>
    <g transform="translate(${xL},${y0 + 44})">
      <circle cx="5" cy="0" r="5" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/><text x="15" y="3.5" font-size="9" fill="${C.t2}">${tx('snapshot (frequency per your backup policy)', 'snapshot (frequência conforme sua política de backup)')}</text>
      <rect x="250" y="-6" width="22" height="12" rx="6" fill="${C.mist}" stroke="${C.forest}"/><text x="278" y="3.5" font-size="9" fill="${C.t2}">${tx('continuous oplog capture → point-in-time window', 'captura contínua do oplog → janela point-in-time')}</text>
    </g></svg>`;
  $('bk-timeline').innerHTML = s;
}

function bkPointLabel() {
  const v = S.bk.point;
  if (v >= BK_SPLIT) {
    const hAgo = 24 * (1 - (v - BK_SPLIT) / (1000 - BK_SPLIT));
    if (hAgo < 0.05) return tx('now', 'agora');
    const h = Math.floor(hAgo), m = Math.round((hAgo - h) * 60);
    return '−' + (h ? h + 'h' : '') + (m ? String(m).padStart(h ? 2 : 1, '0') + 'min' : '');
  }
  const near = BK_SNAPS.reduce((a, b) => Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a);
  return tx('snapshot ', 'snapshot ') + (S.lang === 'pt' ? near.pt : near.en);
}

function bkSetPoint(v) {
  if (v < BK_SPLIT) v = BK_SNAPS.reduce((a, b) => Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a).v;
  S.bk.point = v;
  bkUpdate();
}

function bkVerdict() {
  const t = S.bk.target;
  const no = (en, pt, ...ids) => ({ ok: false, html: tx(en, pt) + src(...ids) });
  switch (t) {
    case 'region': return no('✕ Not supported — you can\'t restore to an Atlas Infinite cluster in a different region.', '✕ Não suportado — não é possível restaurar em um cluster Atlas Infinite de outra região.', 'D9');
    case 'cloud': return no('✕ Not supported — no restore across cloud providers (and Atlas Infinite runs on AWS only in preview).', '✕ Não suportado — sem restore entre cloud providers (e o Atlas Infinite roda só na AWS no preview).', 'D9', 'D1');
    case 'org': return no('✕ Not supported — no restore into a different Atlas organization.', '✕ Não suportado — sem restore para outra organização do Atlas.', 'D9');
    case 'core': return no('✕ Not supported — backup/restore between Atlas Core and Atlas Infinite isn\'t available in public preview.', '✕ Não suportado — backup/restore entre Atlas Core e Atlas Infinite não está disponível no public preview.', 'D1', 'D9');
    case 'older': return no('✕ Not supported — the target must run the same or a greater MongoDB version than the snapshot.', '✕ Não suportado — o destino precisa rodar a mesma versão do MongoDB do snapshot ou uma maior.', 'D9');
  }
  return {
    ok: true, html: tx(`✓ Supported. ⚠ Restores are <strong>destructive</strong>: Atlas removes all existing data on the target cluster before restoring.${src('D9')}`,
      `✓ Suportado. ⚠ Restores são <strong>destrutivos</strong>: o Atlas remove todos os dados existentes no cluster de destino antes de restaurar.${src('D9')}`),
  };
}

function bkUpdate() {
  bkRenderTimeline();
  const pit = S.bk.point >= BK_SPLIT;
  $('bk-slider').value = S.bk.point;
  $('bk-target').value = S.bk.target;
  $('bk-label').textContent = pit ? tx('point-in-time restore', 'restore point-in-time') : tx('snapshot restore', 'restore de snapshot');
  $('bk-expl').innerHTML = pit
    ? tx(`<strong>Point-in-time restore to ${bkPointLabel()}.</strong> Atlas takes the nearest earlier snapshot and <strong>replays the oplog</strong> up to that exact moment. The target time must be within the <strong>last 24 hours</strong> — the continuous cloud backup window included with Atlas Infinite (Atlas CLI: <code>pointInTimeUTCSeconds</code>).${src('D9', 'D1')}`,
         `<strong>Restore point-in-time para ${bkPointLabel()}.</strong> O Atlas pega o snapshot anterior mais próximo e <strong>reaplica o oplog</strong> até aquele momento exato. O horário alvo precisa estar nas <strong>últimas 24 horas</strong> — a janela de continuous cloud backup incluída no Atlas Infinite (Atlas CLI: <code>pointInTimeUTCSeconds</code>).${src('D9', 'D1')}`)
    : tx(`<strong>Older than 24 hours → snapshot restore</strong> (${bkPointLabel()}). Point-in-time precision isn't available outside the 24-hour continuous window; you restore a retained snapshot. <strong>Additional Backup Retention</strong> — enabled by default — keeps snapshots beyond that window, for up to 3 years.${src('D20', 'D1')}`,
         `<strong>Mais de 24 horas atrás → restore de snapshot</strong> (${bkPointLabel()}). A precisão point-in-time não existe fora da janela contínua de 24 horas; você restaura um snapshot retido. O <strong>Additional Backup Retention</strong> — ativado por padrão — mantém snapshots além dessa janela, por até 3 anos.${src('D20', 'D1')}`);
  const v = bkVerdict();
  $('bk-verdict').innerHTML = `<div class="verdict ${v.ok ? 'ok' : 'no'}">${v.html}</div>`;
  $('bk-run').disabled = !v.ok || S.bk.busy;
  $('bk-facts').innerHTML = [
    ['yes', tx(`Backup, restore and PITR run <b>at the storage layer</b>, independent of compute.`, `Backup, restore e PITR rodam <b>na camada de storage</b>, independentes do compute.`), src('D1', 'D9')],
    ['yes', tx(`<b>24-hour continuous cloud backup</b> window included.`, `Janela de <b>continuous cloud backup de 24 horas</b> incluída.`), src('D20')],
    ['yes', tx(`<b>Additional Backup Retention</b> on by default — snapshots kept up to <b>3 years</b>.`, `<b>Additional Backup Retention</b> ativado por padrão — snapshots mantidos por até <b>3 anos</b>.`), src('D20', 'D1')],
    ['yes', tx(`Both <b>snapshot</b> and <b>continuous (point-in-time)</b> restores.`, `Restores de <b>snapshot</b> e <b>contínuos (point-in-time)</b>.`), src('D9')],
    ['no', tx(`Not in preview: collection-level restore, copying snapshots to other regions, snapshot download / local restore, importing archived snapshots, immutable snapshots, Core ↔ Infinite backup/restore.`, `Fora do preview: restore por coleção, cópia de snapshots para outras regiões, download de snapshot / restore local, importar snapshots arquivados, snapshots imutáveis, backup/restore Core ↔ Infinite.`), src('D1')],
  ].map(([k, h, c]) => `<div class="lim-item"><span class="ico ${k}">${k === 'yes' ? '✓' : '✕'}</span><span>${h}${c}</span></div>`).join('');
}

async function bkRestore() {
  if (S.bk.busy || !bkVerdict().ok) return;
  S.bk.busy = true; $('bk-run').disabled = true;
  const pit = S.bk.point >= BK_SPLIT, when = bkPointLabel();
  log('WARN', 'RESTORE', tx('Restore job created — Atlas first removes all existing data on the target cluster', 'Job de restore criado — o Atlas primeiro remove todos os dados existentes no cluster de destino'));
  await fly('bk-svg', [[600, 175], [520, 170], [480, 170], [222, 176]], 1100, C.spring, 6);
  log('INFO', 'RESTORE', tx(`Snapshot restored at the storage layer${pit ? '' : ' (' + when + ')'}`, `Snapshot restaurado na camada de storage${pit ? '' : ' (' + when + ')'}`));
  if (pit) {
    await fly('bk-svg', [[600, 90], [520, 120], [480, 170], [80, 176]], 1100, C.forest, 6);
    log('INFO', 'RESTORE', tx(`Oplog replayed up to ${when}`, `Oplog reaplicado até ${when}`));
  }
  flash('bk-svg', 240, 140, tx('restored ✓', 'restaurado ✓'), C.forest);
  log('SUCCESS', 'RESTORE', tx(`Restore complete (${pit ? 'point-in-time ' + when : 'snapshot'}) — compute layer was never involved`, `Restore concluído (${pit ? 'point-in-time ' + when : 'snapshot'}) — a camada de compute não participou`));
  S.bk.busy = false; bkUpdate();
}
