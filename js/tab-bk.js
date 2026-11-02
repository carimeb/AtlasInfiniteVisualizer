// ─── TAB 5 — BACKUP & RESTORE ────────────────────────────────────────────────

const BP = {};
const BK_SPLIT = 400;   // slider: 0–399 → older than 24 h (snapshots only); 400–1000 → last 24 h (PITR)
const BK_SNAPS = [      // positions on the "older" segment (illustrative retained snapshots)
  { v: 15, en: '~3 years', pt: '~3 anos', es: '~3 años' }, { v: 90, en: '~1 year', pt: '~1 ano', es: '~1 año' }, { v: 170, en: '~6 months', pt: '~6 meses', es: '~6 meses' },
  { v: 250, en: '~1 month', pt: '~1 mês', es: '~1 mes' }, { v: 320, en: '~7 days', pt: '~7 dias', es: '~7 días' }, { v: 375, en: '~2 days', pt: '~2 dias', es: '~2 días' },
];

function bkRender() {
  let s = `<svg viewBox="0 0 760 236" width="100%" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="8" width="470" height="88" rx="12" fill="${C.mist}" stroke="rgba(0,104,74,.35)" stroke-width="1.4"/>
    <text x="24" y="27" font-size="10" font-weight="800" fill="${C.forest}" letter-spacing="1">${tx('COMPUTE LAYER', 'CAMADA DE COMPUTE', "CAPA DE COMPUTE")}</text>
    ${mdbNodeIcon(70, 62, 40, 'UP', 'PRIMARY')}${mdbNodeIcon(125, 62, 40, 'UP', 'STANDBY')}
    <text x="160" y="52" font-size="10.5" font-weight="700" fill="${C.slate}">${tx('Busy serving your queries', 'Ocupado atendendo suas queries', "Ocupada atendiendo tus consultas")}</text>
    <text x="160" y="68" font-size="9.5" fill="${C.t2}">${tx('not involved in taking backups —', 'não participa dos backups —', "no participa en la creación de backups —")}</text>
    <text x="160" y="82" font-size="9.5" fill="${C.t2}">${tx('no competition for CPU, RAM or IOPS', 'sem disputa de CPU, RAM ou IOPS', "sin competir por CPU, RAM ni IOPS")}</text>
    <rect x="10" y="112" width="470" height="116" rx="12" fill="${C.lavender}" stroke="${C.line}" stroke-width="1.4"/>
    <text x="24" y="131" font-size="10" font-weight="800" fill="${C.slate}" letter-spacing="1">${tx('STORAGE LAYER', 'CAMADA DE STORAGE', "CAPA DE STORAGE")}</text>
    ${logIcon(80, 176, false)}${pageIcon(150, 176, false)}${bucketIcon(205, 157)}
    <text x="80" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">Log Service</text>
    <text x="150" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">Page Service</text>
    <text x="222" y="210" text-anchor="middle" font-size="8.5" font-weight="700" fill="${C.slate}">S3</text>
    <text class="dt" x="262" y="168" font-size="9.5" fill="${C.t2}">${tx('backup, restore and point-in-time', 'backup, restore e point-in-time', "backup, restauración y recuperación")}</text>
    <text class="dt" x="262" y="182" font-size="9.5" fill="${C.t2}">${tx('recovery run here, independently', 'recovery rodam aqui, de forma', "a un punto en el tiempo ocurren aquí,")}</text>
    <text class="dt" x="262" y="196" font-size="9.5" fill="${C.t2}">${tx('of the compute layer', 'independente do compute', "independientes de la capa de compute")}</text>
    <path d="M480,170 C520,170 520,120 556,120" fill="none" stroke="${C.forest}" stroke-width="2" class="repl"/>
    <rect x="556" y="20" width="194" height="208" rx="12" fill="${C.slate}"/>
    <text x="653" y="44" text-anchor="middle" font-size="11" font-weight="800" fill="${C.spring}">Cloud Backup</text>
    <rect x="572" y="58" width="162" height="64" rx="8" fill="rgba(255,255,255,.07)" stroke="rgba(0,237,100,.45)"/>
    <text x="653" y="78" text-anchor="middle" font-size="10" font-weight="700" fill="${C.white}">${tx('Continuous backup', 'Backup contínuo', "Backup continuo")}</text>
    <text x="653" y="94" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">${tx('last 24 hours', 'últimas 24 horas', "últimas 24 horas")}</text>
    <text x="653" y="110" text-anchor="middle" font-size="9" fill="${C.spring}">${tx('point-in-time restore', 'restore point-in-time', "restauración a un punto en el tiempo")}</text>
    <rect x="572" y="132" width="162" height="80" rx="8" fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.25)"/>
    <text x="653" y="152" text-anchor="middle" font-size="10" font-weight="700" fill="${C.white}">${tx('Snapshots', 'Snapshots', "Instantáneas")}</text>
    <text x="653" y="168" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">Additional Backup Retention</text>
    <text x="653" y="182" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.75)">${tx('on by default', 'ativado por padrão', "activadas de forma predeterminada")}</text>
    <text x="653" y="200" text-anchor="middle" font-size="9" fill="${C.spring}">${tx('kept up to 3 years', 'mantidos até 3 anos', "conservadas hasta 3 años")}</text>
  </svg>`;
  $('bk-svg').innerHTML = s;
}

function bkRenderTimeline() {
  const W = 720, y0 = 72, xL = 20, xS = 300, xR = 700;
  const pos = v => v < BK_SPLIT ? xL + (v / BK_SPLIT) * (xS - xL - 14) : xS + 6 + ((v - BK_SPLIT) / (1000 - BK_SPLIT)) * (xR - xS - 6);
  let s = `<svg viewBox="0 0 ${W} 130" width="100%" xmlns="http://www.w3.org/2000/svg">
    <text x="${xL}" y="12" font-size="9.5" font-weight="700" fill="${C.t2}">${tx('OLDER — retained snapshots only (up to 3 years)', 'MAIS ANTIGO — apenas snapshots retidos (até 3 anos)', "ANTERIOR — solo instantáneas retenidas (hasta 3 años)")}</text>
    <text x="${xR}" y="12" text-anchor="end" font-size="9.5" font-weight="700" fill="${C.forest}">${tx('LAST 24 h — continuous: any point in time', 'ÚLTIMAS 24 h — contínuo: qualquer ponto no tempo', "ÚLTIMAS 24 h — continuo: cualquier punto en el tiempo")}</text>
    <line x1="${xL}" x2="${xS - 14}" y1="${y0}" y2="${y0}" stroke="${C.line}" stroke-width="4" stroke-linecap="round"/>
    <text x="${xS - 7}" y="${y0 + 4}" text-anchor="middle" font-size="11" fill="${C.t3}">≈</text>
    <rect x="${xS + 6}" y="${y0 - 9}" width="${xR - xS - 6}" height="18" rx="9" fill="${C.mist}" stroke="${C.forest}" stroke-width="1.5"/>`;
  for (let h = 0; h <= 24; h += 6) {
    const x = xS + 6 + (h / 24) * (xR - xS - 6);
    s += `<line x1="${x}" x2="${x}" y1="${y0 + 11}" y2="${y0 + 17}" stroke="${C.t3}"/>
      <text x="${x}" y="${y0 + 29}" text-anchor="middle" font-size="9" fill="${C.t2}">${h === 24 ? tx('now', 'agora', "ahora") : '−' + (24 - h) + 'h'}</text>`;
  }
  BK_SNAPS.forEach(sn => {
    const x = pos(sn.v);
    s += `<circle cx="${x}" cy="${y0}" r="6" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/>
      <text x="${x}" y="${y0 + 26}" text-anchor="middle" font-size="8.5" fill="${C.t2}">${tx(sn.en, sn.pt, sn.es)}</text>`;
  });
  [450, 700, 950].forEach(v => { s += `<circle cx="${pos(v)}" cy="${y0}" r="5" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/>`; });
  const x = pos(S.bk.point), pit = S.bk.point >= BK_SPLIT;
  s += `<line x1="${x}" x2="${x}" y1="${y0 - 26}" y2="${y0 + 12}" stroke="${C.slate}" stroke-width="2"/>
    <path d="M${x - 6},${y0 - 32} L${x + 6},${y0 - 32} L${x},${y0 - 24} Z" fill="${pit ? C.spring : C.slate}" stroke="${C.slate}"/>
    <text x="${clamp(x, 60, W - 60)}" y="${y0 - 36}" text-anchor="middle" font-size="9.5" font-weight="800" fill="${C.slate}">${bkPointLabel()}</text>
    <g transform="translate(${xL},${y0 + 44})">
      <circle cx="5" cy="0" r="5" fill="${C.white}" stroke="${C.slate}" stroke-width="2"/><text x="15" y="3.5" font-size="9" fill="${C.t2}">${tx('snapshot (frequency per your backup policy)', 'snapshot (frequência conforme sua política de backup)', "instantánea (frecuencia según tu política de backup)")}</text>
      <rect x="352" y="-6" width="22" height="12" rx="6" fill="${C.mist}" stroke="${C.forest}"/><text x="380" y="3.5" font-size="9" fill="${C.t2}">${tx('continuous log history → point-in-time window', 'histórico contínuo do log → janela point-in-time', "historial continuo del log → ventana PITR")}</text>
    </g></svg>`;
  $('bk-timeline').innerHTML = s;
}

function bkPointLabel() {
  const v = S.bk.point;
  if (v >= BK_SPLIT) {
    const hAgo = 24 * (1 - (v - BK_SPLIT) / (1000 - BK_SPLIT));
    if (hAgo < 0.05) return tx('now', 'agora', "ahora");
    const h = Math.floor(hAgo), m = Math.round((hAgo - h) * 60);
    return '−' + (h ? h + 'h' : '') + (m ? String(m).padStart(h ? 2 : 1, '0') + 'min' : '');
  }
  const near = BK_SNAPS.reduce((a, b) => Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a);
  return tx('snapshot ', 'snapshot ', "instantánea ") + tx(near.en, near.pt, near.es);
}

function bkSetPoint(v) {
  if (v < BK_SPLIT) v = BK_SNAPS.reduce((a, b) => Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a).v;
  S.bk.point = v;
  bkUpdate();
}

function bkVerdict() {
  const t = S.bk.target;
  const no = (en, pt, es, ...ids) => ({ ok: false, html: tx(en, pt, es) + src(...ids) });
  switch (t) {
    case 'region': return no('✕ Not supported — you can\'t restore to an Atlas Infinite cluster in a different region.', '✕ Não suportado — não é possível restaurar em um cluster Atlas Infinite de outra região.', '✕ No compatible: no puedes restaurar en un clúster Atlas Infinite de otra región.', 'D9');
    case 'cloud': return no('✕ Not supported — no restore across cloud providers (and Atlas Infinite runs on AWS only in preview).', '✕ Não suportado — sem restore entre cloud providers (e o Atlas Infinite roda só na AWS no preview).', '✕ No compatible: no se puede restaurar entre proveedores de nube (y Atlas Infinite solo funciona en AWS durante la vista previa).', 'D9', 'D1');
    case 'org': return no('✕ Not supported — MongoDB manages a separate encryption key per Atlas organization, so you restore within the organization that created the snapshot.', '✕ Não suportado — a MongoDB gerencia uma chave de criptografia separada por organização do Atlas, então o restore é feito na organização que criou o snapshot.', '✕ No compatible: MongoDB administra una clave de cifrado distinta por organización de Atlas, por lo que se restaura dentro de la organización que creó la instantánea.', 'D1', 'D9');
    case 'project': return {
      ok: true, html: tx(`✓ Supported with Atlas-managed (default) encryption. <strong>With customer-managed keys (CMK), the docs' table and procedure disagree about cross-project restores; verify target eligibility in Atlas.</strong> ⚠ Restores are <strong>destructive</strong>: Atlas removes all existing data on the target cluster first.${src('D9', 'D21')}`,
        `✓ Suportado com criptografia padrão (gerenciada pelo Atlas). <strong>Com chaves do cliente (CMK), a tabela e o procedimento da documentação divergem sobre restore entre projetos; confirme a elegibilidade do destino no Atlas.</strong> ⚠ Restores são <strong>destrutivos</strong>: o Atlas remove antes todos os dados do cluster de destino.${src('D9', 'D21')}`, `✓ Compatible con el cifrado administrado por Atlas (predeterminado). <strong>Con claves administradas por el cliente (CMK), la tabla y el procedimiento de la documentación discrepan sobre restauraciones entre proyectos; comprueba en Atlas si el destino es elegible.</strong> ⚠ Las restauraciones son <strong>destructivas</strong>: Atlas elimina primero todos los datos existentes en el clúster de destino.${src('D9', 'D21')}`),
    };
    case 'core': return no('✕ Not supported — backup/restore between Atlas Core and Atlas Infinite isn\'t available in public preview.', '✕ Não suportado — backup/restore entre Atlas Core e Atlas Infinite não está disponível no public preview.', '✕ No compatible: el backup/restauración entre Atlas Core y Atlas Infinite no está disponible en la vista previa pública.', 'D1', 'D9');
    case 'older': return no('✕ For CMK restores, the documented procedure requires a target MongoDB version equal to or newer than the snapshot\'s.', '✕ Para restores com CMK, o procedimento documentado exige que o destino use versão do MongoDB igual ou mais recente que a do snapshot.', '✕ Para restauraciones con CMK, el procedimiento documentado exige que la versión de MongoDB del destino sea igual o posterior a la de la instantánea.', 'D9');
  }
  return {
    ok: true, html: tx(`✓ Supported. ⚠ Restores are <strong>destructive</strong>: Atlas removes all existing data on the target cluster before restoring.${src('D9', 'D21')}`,
      `✓ Suportado. ⚠ Restores são <strong>destrutivos</strong>: o Atlas remove todos os dados existentes no cluster de destino antes de restaurar.${src('D9', 'D21')}`, `✓ Compatible. ⚠ Las restauraciones son <strong>destructivas</strong>: Atlas elimina todos los datos existentes en el clúster de destino antes de restaurar.${src('D9', 'D21')}`),
  };
}

function bkUpdate() {
  bkRenderTimeline();
  const pit = S.bk.point >= BK_SPLIT;
  $('bk-slider').value = S.bk.point;
  $('bk-target').value = S.bk.target;
  $('bk-label').textContent = pit ? tx('point-in-time restore', 'restore point-in-time', "restauración a un punto en el tiempo") : tx('snapshot restore', 'restore de snapshot', "restauración de instantánea");
  $('bk-expl').innerHTML = pit
    ? tx(`<strong>Point-in-time restore to ${bkPointLabel()}.</strong> Continuous cloud backup keeps history in the storage layer as an append-only, versioned log. Per the engineering blog, a restore <strong>creates a new log branch at the chosen moment</strong>. Creating that branch is constant-time and zero-copy, reusing existing data regardless of database size. <strong>Completing the restore and making the target ready also require the other job steps.</strong> The point must fall within the <strong>24-hour continuous window</strong> included at no extra cost (Atlas CLI: <code>pointInTimeUTCSeconds</code> within the last 24 h).${src('D3', 'D20', 'B4', 'D21')}`,
         `<strong>Restore point-in-time para ${bkPointLabel()}.</strong> O continuous cloud backup guarda o histórico na camada de storage como um log versionado e só de acréscimos. Segundo o blog de engenharia, um restore <strong>cria um novo ramo do log no momento escolhido</strong>. Criar esse ramo leva tempo constante e não copia os dados existentes, independentemente do tamanho do banco. <strong>Para concluir o restore e disponibilizar o destino, o Atlas também executa as demais etapas do job.</strong> O ponto precisa estar na <strong>janela contínua de 24 horas</strong>, incluída sem custo adicional (Atlas CLI: <code>pointInTimeUTCSeconds</code> nas últimas 24 h).${src('D3', 'D20', 'B4', 'D21')}`, `<strong>Restauración a un punto en el tiempo: ${bkPointLabel()}.</strong> El backup continuo en la nube conserva el historial en la capa de storage como un log versionado al que solo se añaden entradas. Según el blog de ingeniería, una restauración <strong>crea una nueva rama del log en el momento elegido</strong>. Crear esa rama requiere un tiempo constante y ninguna copia, reutilizando los datos existentes sin importar el tamaño de la base de datos. <strong>Completar la restauración y dejar listo el destino también requiere los demás pasos del trabajo.</strong> El punto debe estar dentro de la <strong>ventana continua de 24 horas</strong> incluida sin coste adicional (Atlas CLI: <code>pointInTimeUTCSeconds</code> dentro de las últimas 24 h).${src('D3', 'D20', 'B4', 'D21')}`)
    : tx(`<strong>Older than 24 hours → snapshot restore</strong> (${bkPointLabel()}). Point-in-time precision isn't available outside the 24-hour continuous window; you restore a retained snapshot. <strong>Additional Backup Retention</strong> — enabled by default — keeps snapshots beyond that window, for up to 3 years.${src('D20', 'D1')}`,
         `<strong>Mais de 24 horas atrás → restore de snapshot</strong> (${bkPointLabel()}). A precisão point-in-time não existe fora da janela contínua de 24 horas; você restaura um snapshot retido. O <strong>Additional Backup Retention</strong> — ativado por padrão — mantém snapshots além dessa janela, por até 3 anos.${src('D20', 'D1')}`, `<strong>Más de 24 horas → restauración de instantánea</strong> (${bkPointLabel()}). La precisión de un punto en el tiempo no está disponible fuera de la ventana continua de 24 horas; se restaura una instantánea retenida. <strong>Additional Backup Retention</strong>, activada de forma predeterminada, conserva instantáneas fuera de esa ventana hasta por 3 años.${src('D20', 'D1')}`);
  const v = bkVerdict();
  $('bk-verdict').innerHTML = `<div class="verdict ${v.ok ? 'ok' : 'no'}">${v.html}</div>`;
  $('bk-run').disabled = !v.ok || S.bk.busy;
  $('bk-facts').innerHTML = [
    ['yes', tx(`Backup, restore and PITR run <b>at the storage layer</b>, independent of compute.`, `Backup, restore e PITR rodam <b>na camada de storage</b>, independentes do compute.`, `El backup, la restauración y PITR se ejecutan <b>en la capa de storage</b>, independientes del compute.`), src('D1', 'D9')],
    ['yes', tx(`<b>24-hour continuous cloud backup</b> window included at no additional cost.`, `Janela de <b>continuous cloud backup de 24 horas</b> incluída sem custo adicional.`, `Ventana de <b>backup continuo en la nube de 24 horas</b> incluida sin coste adicional.`), src('D3', 'D20')],
    ['yes', tx(`<b>Additional Backup Retention</b> on by default (extra cost per backup policy) — snapshots kept up to <b>3 years</b>.`, `<b>Additional Backup Retention</b> ativado por padrão (custo extra conforme a política de backup) — snapshots mantidos por até <b>3 anos</b>.`, `<b>Additional Backup Retention</b> activada de forma predeterminada (coste adicional según la política de backup): instantáneas conservadas hasta <b>3 años</b>.`), src('D20', 'D1')],
    ['yes', tx(`A snapshot <b>marks a point in the log</b>; a restore creates a branch that reuses its history. The constant-time, zero-copy claim describes <b>creating that branch</b>, not the full restore job.`, `Um snapshot <b>marca um ponto no log</b>; um restore cria um ramo que reutiliza esse histórico. A afirmação de tempo constante e zero cópia descreve a <b>criação desse ramo</b>, não o job completo de restore.`, `Una instantánea <b>marca un punto en el log</b>; una restauración crea una rama que reutiliza su historial. La afirmación de tiempo constante y sin copia describe <b>la creación de esa rama</b>, no todo el trabajo de restauración.`), src('B4'), 1],
    ['lim', tx(`Log branching is an <b>architectural foundation for future cloning workflows</b>. General-purpose cloning is a future possibility described by the blog, outside the public preview workflow shown here.`, `Ramificações de log são uma <b>base arquitetural para futuros fluxos de clonagem</b>. A clonagem genérica é uma possibilidade futura descrita pelo blog, fora do fluxo de public preview mostrado aqui.`, `La ramificación del log es una <b>base arquitectónica para futuros procesos de clonación</b>. La clonación de uso general es una posibilidad futura descrita por el blog, fuera del proceso de la vista previa pública mostrado aquí.`), src('B4'), 1],
    ['yes', tx(`Both <b>snapshot</b> and <b>continuous (point-in-time)</b> restores.`, `Restores de <b>snapshot</b> e <b>contínuos (point-in-time)</b>.`, `Restauraciones tanto de <b>instantáneas</b> como <b>continuas (a un punto en el tiempo)</b>.`), src('D9')],
    ['no', tx(`Not in preview: collection-level restore, copying snapshots to other regions, snapshot download / local restore, importing archived snapshots, cross-organization restores, Core ↔ Infinite backup/restore.`, `Fora do preview: restore por coleção, cópia de snapshots para outras regiões, download de snapshot / restore local, importar snapshots arquivados, restore entre organizações, backup/restore Core ↔ Infinite.`, `Fuera de la vista previa: restauración por colección, copia de instantáneas a otras regiones, descarga de instantáneas / restauración local, importación de instantáneas archivadas, restauraciones entre organizaciones, backup/restauración Core ↔ Infinite.`), src('D1'), 1],
  ].map(([k, h, c, d]) => `<div class="lim-item${d ? ' only-detailed' : ''}"><span class="ico ${k}">${k === 'yes' ? '✓' : k === 'lim' ? '!' : '✕'}</span><span>${h}${c}</span></div>`).join('');
}

async function bkRestore() {
  if (S.bk.busy || !bkVerdict().ok) return;
  S.bk.busy = true; $('bk-run').disabled = true;
  const pit = S.bk.point >= BK_SPLIT, when = bkPointLabel();
  log('WARN', 'RESTORE', tx('Restore job created — Atlas first removes all existing data on the target cluster', 'Job de restore criado — o Atlas primeiro remove todos os dados existentes no cluster de destino', "Trabajo de restauración creado: Atlas primero elimina todos los datos existentes en el clúster de destino"));
  await fly('bk-svg', [[600, 175], [520, 170], [480, 170], [222, 176]], 1100, C.spring, 6);
  if (pit) {
    await fly('bk-svg', [[600, 90], [520, 120], [480, 170], [80, 176]], 1100, C.forest, 6);
    log('INFO', 'RESTORE', tx(`New log branched off the source history at ${when} — no data copied (engineering blog)`, `Novo log ramificado do histórico de origem em ${when} — nenhum dado copiado (blog de engenharia)`, `Nueva rama del log creada desde el historial de origen en ${when}: sin copiar datos (blog de ingeniería)`));
  } else log('INFO', 'RESTORE', tx(`Snapshot (${when}) selected as the history for the storage-layer restore`, `Snapshot (${when}) selecionado como histórico para o restore na camada de storage`, `Instantánea (${when}) seleccionada como historial para la restauración en la capa de storage`));
  flash('bk-svg', 240, 140, tx('storage step ✓', 'etapa de storage ✓', "paso de storage ✓"), C.forest);
  log('SUCCESS', 'RESTORE', tx(`Storage step illustrated (${pit ? 'point-in-time ' + when : 'snapshot'}). In a real restore, follow the Atlas job status to verify completion and target readiness.`, `Etapa de storage ilustrada (${pit ? 'point-in-time ' + when : 'snapshot'}). Em um restore real, acompanhe o status do job no Atlas para verificar a conclusão e a disponibilidade do destino.`, `Paso de storage ilustrado (${pit ? 'punto en el tiempo: ' + when : 'instantánea'}). En una restauración real, sigue el estado del trabajo en Atlas para comprobar que terminó y que el destino está listo.`));
  S.bk.busy = false; bkUpdate();
}
