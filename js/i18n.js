// ─── I18N ────────────────────────────────────────────────────────────────────
// English lives in index.html (captured on first run); Portuguese and Spanish below.
// Dynamic strings use tx(en, pt, es) next to the code that renders them.

const PT = {
  'arch.simulation': 'Simulação',
  'arch.cacheOnlyRead': 'Esta escolha vale somente para a simulação de leitura. Ela não altera o caminho da escrita.',
  'arch.timingNote': 'Uma etapa por vez, no seu ritmo. Os tempos da animação são ilustrativos.',
  'hdr.sub': 'Material educativo, não é documentação oficial da MongoDB',
  'hdr.badge': 'Public Preview',
  'view.basic': 'Essencial',
  'view.detailed': 'Detalhado',
  'tab.arch': '① Arquitetura e Caminho da Escrita',
  'tab.ha': '② Alta Disponibilidade e Failover',
  'tab.vs': '③ Escala Vertical e Storage',
  'tab.hs': '④ Escala Horizontal de Leitura',
  'tab.bk': '⑤ Backup e Restore',
  'tab.lim': '⑥ Limitações do Preview e Fontes',
  'extra.az': 'As AZs mostradas para os nós extras são ilustrativas. A documentação pública do Atlas Infinite descreve a escolha da quantidade de nós, mas não de uma AZ específica.<a class="src" data-src="D6"></a>',

  'arch.tip': '<strong>O Atlas Infinite separa compute de storage.</strong> Os nós de compute executam queries e transações; uma <strong>camada de storage</strong> independente e multi-AZ mantém os dados duráveis e coordena o failover. Alterne <strong>Atlas Core ↔ Atlas Infinite</strong> para comparar e clique em <strong>▶ Simular Escrita</strong> ou <strong>▶ Simular Leitura</strong> para acompanhar cada etapa.',
  'arch.topo': 'Topologia do deployment',
  'arch.ideas': 'Ideias-chave',
  'arch.cmp': 'Atlas Core vs Atlas Infinite — lado a lado',
  'arch.edition': 'Edição do banco de dados',
  'cc.try': 'Experimente',
  'cc.title': 'Configurações de escrita e leitura',
  'opt.w0': 'w: 0 — sem confirmação',
  'opt.w1': 'w: 1 — somente o primário',
  'opt.wmaj': 'w: "majority" (padrão)',
  'opt.wnum': 'w: 3 (qualquer número ≥ 2)',
  'opt.rclocal': 'local (padrão)',
  'opt.rcsnap': 'snapshot (transações)',
  'btn.simw': '▶ Simular Escrita',
  'btn.simr': '▶ Simular Leitura',
  'arch.steps': 'Passo a passo',
  'arch.cache': 'Cenário de leitura',
  'arch.cache.miss': 'Cache miss — buscar no storage',
  'arch.cache.hit': 'Cache hit — ler da memória',

  'ha.tip': '<strong>Clique em qualquer nó de compute</strong> para simular uma falha, ou <strong>clique no cabeçalho de uma Availability Zone</strong> para derrubar a zona inteira (compute + réplicas de storage). Veja como a <strong>camada de storage coordena o failover</strong> — sem eleição entre os nós de compute — e como a <strong>maioria do Log Service (2 de 3 AZs)</strong> mantém as escritas duráveis.',
  'ha.bn.az.t': '🛡 Uma Availability Zone caiu — o cluster continua atendendo',
  'ha.bn.az.d': 'O Log Service ainda tem <strong>maioria (2 de 3 zonas)</strong>, então as escritas continuam sendo confirmadas de forma durável. Se o primário estava na zona que caiu, o standby em outra zona assumiu.',
  'ha.bn.q.t': '⛔ Maioria da camada de storage perdida — escritas não podem ser confirmadas',
  'ha.bn.down.t': '🔴 Nenhum nó de compute disponível',
  'ha.bn.down.d': 'Nenhum nó de compute consegue atender leituras ou escritas agora. Os dados continuam duráveis na camada de storage; o serviço volta assim que um nó de compute estiver disponível.',
  'ha.topo': 'Cluster single-region em 3 Availability Zones',
  'ha.cmp': 'Failover: Atlas Core vs Atlas Infinite',
  'ha.sim': 'Simular falhas',
  'ha.btn.test': '⚡ Testar failover do primário',
  'btn.reset': '↺ Restaurar tudo',
  'ha.region': 'Região AWS (com suporte ao Atlas Infinite)',
  'ha.autoheal': 'O Atlas recupera nós de compute com falha (sem cópia de dados)',
  'ha.timeline': 'Linha do tempo do failover',
  'ha.client': 'O que a aplicação enxerga',

  'vs.tip': '<strong>Compute e storage escalam de forma independente.</strong> O tier do cluster define o compute (e o throughput/IOPS de storage) — a capacidade de storage cresce sozinha até 128 TB por replica set. Escolha um tier para ver um <strong>resize vertical sem mover dados</strong> e depois dispare um <strong>pico de tráfego de agentes de IA</strong> no auto-scaler.',
  'vs.bn.block.t': '✋ Limite máximo de storage atingido — escritas bloqueadas, leituras continuam',
  'vs.bn.block.d': 'O tamanho lógico dos dados se aproximou do limite máximo de storage configurado. O Atlas <strong>bloqueia as escritas, mas continua atendendo leituras</strong>. Aumente o limite (ou apague dados) para retomar as escritas — sem mudar de tier.',
  'vs.compute': 'Tier de compute — escala vertical',
  'vs.as': 'Auto-scaling de compute — demanda vs capacidade provisionada',
  'vs.as.note': 'Modelo ilustrativo para <strong>nós operacionais (primário + standby)</strong>. <strong>Scale up</strong>: &gt;90% por 10 min (20 min no M10/M20) ou média de 1 hora &gt;75%. <strong>Scale down</strong>: médias de CPU abaixo de 45% nas janelas de 10 min e 4 h, memória projetada no tier menor abaixo de 60% nas duas janelas e no máximo uma redução a cada 24 h.<br>A simulação usa utilização como aproximação de CPU e memória; considera o cache WiredTiger abaixo de 90% e não simula as restrições de provisionamento/reinício recente.<br><strong>Preditivo</strong>: M30+, após 2 semanas de histórico, até 2 tiers antes de picos cíclicos; nunca reduz. O mínimo também precisa ser M30+ quando a redução está habilitada, como aqui. O scaling é rolling, sem downtime, dentro dos tiers mín./máx. e da classe de tier. Para rajadas planejadas, como bulk inserts, escale antecipadamente. Unidades de capacidade e curvas de demanda são ilustrativas.<a class="src" data-src="D5"></a>',
  'vs.tier': 'Tier do cluster',
  'vs.asset': 'Configuração de auto-scaling',
  'vs.as.on': 'Auto-scaling de compute (recomendado)',
  'vs.as.pred': 'Scale-up preditivo',
  'vs.min': 'Tier mínimo',
  'vs.max': 'Tier máximo',
  'vs.pattern': 'Padrão de tráfego',
  'vs.p.steady': '〰 Estável',
  'vs.p.spike': '🚀 Pico de agentes de IA',
  'vs.p.daily': '📅 Pico diário recorrente',
  'btn.restart': '↺ Reiniciar',
  'vs.storage': 'Storage — cresce com os seus dados',
  'vs.maxlim': 'Limite máximo de storage',
  'vs.lim.unset': 'Não definido → 128 TB (lógico)',
  'vs.ingest': '＋ Ingerir dados',
  'vs.delete': '− Apagar dados',

  'hs.tip': '<strong>Escale leituras em minutos.</strong> Adicione até <strong>5 nós read-only ou analytics</strong> (máx. 7 nós). Os novos nós leem direto da camada de storage compartilhada — <strong>sem initial sync, sem cópia de dados</strong>. Depois altere o <strong>read preference</strong> e as <strong>tags</strong> para ver onde cada leitura cai.',
  'hs.topo': 'Roteamento de leituras e carga por nó',
  'hs.time': 'Tempo para adicionar capacidade de leitura',
  'hs.nodes': 'Nós read-only e analytics',
  'hs.addro': '＋ Nó read-only',
  'hs.addan': '＋ Nó analytics',
  'hs.rm': '− Remover último',
  'hs.ops': 'App operacional',
  'hs.tag.none': '(nenhuma — qualquer nó elegível)',
  'hs.rps': 'Tráfego de leitura',
  'hs.bi': 'App de Analytics / BI',
  'hs.chart': 'Leituras atendidas por nó',
  'hs.bi.on': 'Executar queries analíticas — readPreference: secondary, tags { nodeType: "ANALYTICS" }',

  'bk.tip': '<strong>Os backups rodam na camada de storage</strong> — independentes do compute, então não competem com suas queries. O Atlas Infinite inclui uma <strong>janela de 24 horas de continuous cloud backup</strong> para restore point-in-time, além do <strong>Additional Backup Retention</strong> (ativado por padrão) para manter snapshots por até 3 anos. Arraste o ponto de restore e escolha um destino.',
  'bk.where': 'Onde o backup acontece',
  'bk.timeline': 'Linha do tempo de recuperação',
  'bk.target': 'Destino do restore',
  'bk.target.l': 'Restaurar em…',
  'bk.t.same': 'O mesmo cluster Atlas Infinite',
  'bk.t.other': 'Outro cluster Infinite — mesma região e org',
  'bk.t.region': 'Cluster Infinite em outra região',
  'bk.t.cloud': 'Cluster em outro cloud provider',
  'bk.t.project': 'Outro cluster Infinite — outro projeto, mesma org',
  'bk.t.org': 'Cluster Infinite em outra organização',
  'bk.t.core': 'Um cluster Atlas Core',
  'bk.t.older': 'Restore com CMK — cluster Infinite com versão mais antiga do MongoDB',
  'bk.run': '▶ Simular restore',
  'bk.facts': 'Fatos sobre backup',

  'lim.tip': '<strong>O Atlas Infinite está em Public Preview</strong>. Recursos e documentação podem mudar antes do GA. Abaixo está o que <strong>ainda não está disponível</strong> ou tem limitações — confira as páginas oficiais linkadas antes de tomar decisões.',
  'lim.sources': 'Fontes oficiais usadas neste visualizador',
  'lim.legend': 'Chips como <a class="src">D2</a> apontam para a documentação da MongoDB; <a class="src blog">B4</a> apontam para posts de blog, press releases ou páginas de produto da MongoDB (afirmações do fabricante). Todo o resto nesta ferramenta é uma ilustração simplificada.',

};

const ES = {
  'arch.simulation': 'Simulación',
  'arch.cacheOnlyRead': 'Esta opción solo afecta a la simulación de lectura. No altera el recorrido de la escritura.',
  'arch.timingNote': 'Una etapa a la vez, a tu ritmo. Los tiempos de la animación son ilustrativos.',
  'hdr.sub': 'Material educativo, no es documentación oficial de MongoDB',
  'hdr.badge': 'Public Preview',
  'view.basic': 'Esencial',
  'view.detailed': 'Detallado',
  'tab.arch': '① Arquitectura y Recorrido de la Escritura',
  'tab.ha': '② Alta Disponibilidad y Failover',
  'tab.vs': '③ Escalado Vertical y Storage',
  'tab.hs': '④ Escalado Horizontal de Lectura',
  'tab.bk': '⑤ Backup y Restauración',
  'tab.lim': '⑥ Limitaciones del Preview y Fuentes',
  'extra.az': 'Las AZ mostradas para los nodos adicionales son ilustrativas. La documentación pública de Atlas Infinite describe la selección de la cantidad de nodos, pero no de una AZ específica.<a class="src" data-src="D6"></a>',

  'arch.tip': '<strong>Atlas Infinite separa compute de storage.</strong> Los nodos de compute ejecutan consultas y transacciones; una <strong>capa de storage</strong> independiente y multi-AZ mantiene los datos duraderos y coordina el failover. Alterna entre <strong>Atlas Core ↔ Atlas Infinite</strong> para comparar y haz clic en <strong>▶ Simular Escritura</strong> o <strong>▶ Simular Lectura</strong> para seguir cada etapa.',
  'arch.topo': 'Topología del despliegue',
  'arch.ideas': 'Ideas clave',
  'arch.cmp': 'Atlas Core vs Atlas Infinite — en paralelo',
  'arch.edition': 'Edición de la base de datos',
  'cc.try': 'Prueba',
  'cc.title': 'Configuración de escritura y lectura',
  'opt.w0': 'w: 0 — sin confirmación',
  'opt.w1': 'w: 1 — solo el primario',
  'opt.wmaj': 'w: "majority" (predeterminado)',
  'opt.wnum': 'w: 3 (cualquier número ≥ 2)',
  'opt.rclocal': 'local (predeterminado)',
  'opt.rcsnap': 'snapshot (transacciones)',
  'btn.simw': '▶ Simular Escritura',
  'btn.simr': '▶ Simular Lectura',
  'arch.steps': 'Paso a paso',
  'arch.cache': 'Escenario de lectura',
  'arch.cache.miss': 'Cache miss — buscar en storage',
  'arch.cache.hit': 'Cache hit — leer de la memoria',

  'ha.tip': '<strong>Haz clic en cualquier nodo de compute</strong> para simular un fallo, o <strong>en el encabezado de una Availability Zone</strong> para provocar la caída de toda la zona (compute + réplicas de storage). Observa cómo la <strong>capa de storage coordina el failover</strong> — sin elección entre los nodos de compute — y cómo la <strong>mayoría del Log Service (2 de 3 AZ)</strong> mantiene las escrituras duraderas.',
  'ha.bn.az.t': '🛡 Una Availability Zone cayó — el clúster sigue atendiendo solicitudes',
  'ha.bn.az.d': 'El Log Service aún tiene <strong>mayoría (2 de 3 zonas)</strong>, por lo que las escrituras siguen confirmándose de forma duradera. Si el primario estaba en la zona caída, el standby de otra zona asumió su función.',
  'ha.bn.q.t': '⛔ Se perdió la mayoría de la capa de storage — no se pueden confirmar escrituras',
  'ha.bn.down.t': '🔴 No hay ningún nodo de compute disponible',
  'ha.bn.down.d': 'Ningún nodo de compute puede atender lecturas ni escrituras ahora. Los datos siguen siendo duraderos en la capa de storage; el servicio se recupera en cuanto un nodo de compute esté disponible.',
  'ha.topo': 'Clúster en una sola región y 3 Availability Zones',
  'ha.cmp': 'Failover: Atlas Core vs Atlas Infinite',
  'ha.sim': 'Simular fallos',
  'ha.btn.test': '⚡ Probar failover del primario',
  'btn.reset': '↺ Restaurar todo',
  'ha.region': 'Región de AWS (compatible con Atlas Infinite)',
  'ha.autoheal': 'Atlas recupera los nodos de compute con fallos (sin copiar datos)',
  'ha.timeline': 'Línea de tiempo del failover',
  'ha.client': 'Lo que ve la aplicación',

  'vs.tip': '<strong>Compute y storage escalan de forma independiente.</strong> El tier del clúster define el compute (y el throughput/IOPS de storage) — la capacidad de storage crece automáticamente hasta 128 TB por replica set. Elige un tier para ver un <strong>escalado vertical sin mover datos</strong> y luego genera un <strong>pico de tráfico de agentes de IA</strong> en el auto-scaler.',
  'vs.bn.block.t': '✋ Se alcanzó el límite máximo de storage — escrituras bloqueadas, las lecturas continúan',
  'vs.bn.block.d': 'El tamaño lógico de los datos se acercó al límite máximo de storage configurado. Atlas <strong>bloquea las escrituras, pero sigue atendiendo lecturas</strong>. Aumenta el límite (o elimina datos) para reanudar las escrituras — sin cambiar de tier.',
  'vs.compute': 'Tier de compute — escalado vertical',
  'vs.as': 'Auto-scaling de compute — demanda vs capacidad aprovisionada',
  'vs.as.note': 'Modelo ilustrativo para <strong>nodos operativos (primario + standby)</strong>. <strong>Scale up</strong>: &gt;90% durante 10 min (20 min en M10/M20) o promedio de 1 hora &gt;75%. <strong>Scale down</strong>: promedios de CPU inferiores al 45% en las ventanas de 10 min y 4 h, memoria proyectada en el tier inferior por debajo del 60% en ambas ventanas y como máximo una reducción cada 24 h.<br>La simulación usa la utilización como aproximación de CPU y memoria; supone que la caché WiredTiger está por debajo del 90% y no simula las restricciones por aprovisionamiento o reinicio reciente.<br><strong>Predictivo</strong>: M30+, tras 2 semanas de historial, hasta 2 tiers antes de picos cíclicos; nunca reduce. El mínimo también debe ser M30+ cuando la reducción está habilitada, como aquí. El escalado es gradual, sin interrupciones, dentro de los tiers mín./máx. y de la clase de tier. Para ráfagas planificadas, como inserciones masivas, escala con anticipación. Las unidades de capacidad y las curvas de demanda son ilustrativas.<a class="src" data-src="D5"></a>',
  'vs.tier': 'Tier del clúster',
  'vs.asset': 'Configuración de auto-scaling',
  'vs.as.on': 'Auto-scaling de compute (recomendado)',
  'vs.as.pred': 'Scale-up predictivo',
  'vs.min': 'Tier mínimo',
  'vs.max': 'Tier máximo',
  'vs.pattern': 'Patrón de tráfico',
  'vs.p.steady': '〰 Estable',
  'vs.p.spike': '🚀 Pico de agentes de IA',
  'vs.p.daily': '📅 Pico diario recurrente',
  'btn.restart': '↺ Reiniciar',
  'vs.storage': 'Storage — crece con tus datos',
  'vs.maxlim': 'Límite máximo de storage',
  'vs.lim.unset': 'Sin definir → 128 TB (lógico)',
  'vs.ingest': '＋ Ingerir datos',
  'vs.delete': '− Eliminar datos',

  'hs.tip': '<strong>Escala las lecturas en minutos.</strong> Añade hasta <strong>5 nodos read-only o analytics</strong> (máx. 7 nodos). Los nuevos nodos leen directamente de la capa de storage compartida — <strong>sin initial sync, sin copiar datos</strong>. Después cambia el <strong>read preference</strong> y las <strong>tags</strong> para ver a dónde va cada lectura.',
  'hs.topo': 'Enrutamiento de lecturas y carga por nodo',
  'hs.time': 'Tiempo para añadir capacidad de lectura',
  'hs.nodes': 'Nodos read-only y analytics',
  'hs.addro': '＋ Nodo read-only',
  'hs.addan': '＋ Nodo analytics',
  'hs.rm': '− Eliminar el último',
  'hs.ops': 'App operativa',
  'hs.tag.none': '(ninguna — cualquier nodo elegible)',
  'hs.rps': 'Tráfico de lectura',
  'hs.bi': 'App de Analytics / BI',
  'hs.chart': 'Lecturas atendidas por nodo',
  'hs.bi.on': 'Ejecutar consultas analíticas — readPreference: secondary, tags { nodeType: "ANALYTICS" }',

  'bk.tip': '<strong>Los backups se ejecutan en la capa de storage</strong> — independientes del compute, por lo que no compiten con tus consultas. Atlas Infinite incluye una <strong>ventana de 24 horas de continuous cloud backup</strong> para restaurar a un punto en el tiempo, además de <strong>Additional Backup Retention</strong> (activado por defecto) para conservar snapshots hasta 3 años. Arrastra el punto de restauración y elige un destino.',
  'bk.where': 'Dónde se realiza el backup',
  'bk.timeline': 'Línea de tiempo de recuperación',
  'bk.target': 'Destino de la restauración',
  'bk.target.l': 'Restaurar en…',
  'bk.t.same': 'El mismo clúster Atlas Infinite',
  'bk.t.other': 'Otro clúster Infinite — misma región y organización',
  'bk.t.region': 'Clúster Infinite en otra región',
  'bk.t.cloud': 'Clúster en otro proveedor de nube',
  'bk.t.project': 'Otro clúster Infinite — otro proyecto, misma organización',
  'bk.t.org': 'Clúster en otra organización',
  'bk.t.core': 'Un clúster Atlas Core',
  'bk.t.older': 'Restauración con CMK — clúster Infinite con una versión anterior de MongoDB',
  'bk.run': '▶ Simular restauración',
  'bk.facts': 'Datos sobre backup',

  'lim.tip': '<strong>Atlas Infinite está en Public Preview</strong>. Las funciones y la documentación pueden cambiar antes de GA. A continuación se muestra lo que <strong>aún no está disponible</strong> o tiene limitaciones — consulta las páginas oficiales enlazadas antes de tomar decisiones.',
  'lim.sources': 'Fuentes oficiales usadas en este visualizador',
  'lim.legend': 'Las etiquetas como <a class="src">D2</a> enlazan a la documentación de MongoDB; <a class="src blog">B4</a> enlazan a publicaciones de blog, comunicados de prensa o páginas de producto de MongoDB (afirmaciones del fabricante). Todo lo demás en esta herramienta es una ilustración simplificada.',
};

function applyStaticLang() {
  const catalog = S.lang === 'pt' ? PT : S.lang === 'es' ? ES : {};
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    const k = el.getAttribute('data-i18n');
    el.innerHTML = catalog[k] !== undefined ? catalog[k] : el.dataset.en;
  });
  // Source chips written in static HTML: <a class="src" data-src="D5"></a>
  document.querySelectorAll('a.src[data-src]').forEach(a => {
    const id = a.dataset.src, s = SOURCES[id];
    if (!s) return;
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.title = s.t; a.textContent = id;
    if (id[0] === 'B') a.classList.add('blog');
  });
  document.documentElement.lang = S.lang === 'pt' ? 'pt-BR' : S.lang;
  document.querySelectorAll('.lang button').forEach(b => {
    const selected = b.dataset.lang === S.lang;
    b.classList.toggle('on', selected);
    b.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.lang').forEach(el => el.setAttribute('aria-label', tx('Language', 'Idioma', 'Idioma')));
  document.querySelectorAll('.view-toggle').forEach(el => el.setAttribute('aria-label', tx('View', 'Visualização', 'Vista')));
}

function setLang(lang) {
  S.lang = ['en', 'pt', 'es'].includes(lang) ? lang : 'pt';
  const u = new URL(location.href);
  u.searchParams.set('lang', S.lang);
  try { history.replaceState(null, '', u); } catch (e) { /* file:// may refuse */ }
  applyStaticLang();
  if (typeof rerenderAll === 'function') rerenderAll({ preservePlayback: true });
}

function applyView() {
  document.body.classList.toggle('view-basic', S.view === 'basic');
  document.body.classList.toggle('view-detailed', S.view === 'detailed');
  document.querySelectorAll('.view-toggle button').forEach(b => b.classList.toggle('on', b.dataset.view === S.view));
}

function setView(view) {
  S.view = view === 'detailed' ? 'detailed' : 'basic';
  const u = new URL(location.href);
  u.searchParams.set('view', S.view);
  try { history.replaceState(null, '', u); } catch (e) { /* file:// may refuse */ }
  applyView();
  if (typeof rerenderAll === 'function') rerenderAll();
}

function initView() {
  let view = null;
  try { view = new URL(location.href).searchParams.get('view'); } catch (e) { /* ignore */ }
  S.view = view === 'detailed' ? 'detailed' : 'basic';
  applyView();
}

function initLang() {
  let lang = null;
  try { lang = new URL(location.href).searchParams.get('lang'); } catch (e) { /* ignore */ }
  S.lang = ['en', 'pt', 'es'].includes(lang) ? lang : 'pt';
  applyStaticLang();
}
