
const $ = s => document.querySelector(s);
const K = 'reserva.v1';
let S = { tx: [], goals: [], plan: {}, hide: 0, theme: '', tipDone: {}, tipFav: {}, cards: [], buys: [], paid: {}, rec: [], ip: {}, cats: null, prof: { name: '', emoji: '', color: '#15803d', img: '' } };
let DB = null, ready = 'load', stx = '', st = 0;
const setSt = t => { stx = t; const e = $('#sv'); if (e) e.textContent = t };
let me = null, isAdm = false;
const save = () => { if (!DB || !me) return; clearTimeout(st); setSt('Salvando…'); st = setTimeout(async () => { try { const { error } = await sb.from('app_state').upsert({ user_id: me.id, data: JSON.parse(JSON.stringify(S)), updated_at: new Date().toISOString() }); if (error) throw error; setSt('Salvo') } catch (e) { setSt('Erro ao salvar') } }, 400) };
const brl = c => S.hide ? 'R$ •••••' : (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') };
let M = today().slice(0, 7), tab = 'home';
const shift = (m, n) => { const [y, o] = m.split('-').map(Number); const d = new Date(y, o - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') };
const mLabel = (m, s) => { const [y, o] = m.split('-'); return new Date(y, o - 1, 1).toLocaleDateString('pt-BR', { month: s ? 'short' : 'long', year: 'numeric' }) };
const fd = d => d.split('-').reverse().join('/');
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = v => { v = String(v).trim(); if (!v) return 0; const n = v.includes(',') ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : parseFloat(v); return isFinite(n) ? Math.round(n * 100) : NaN };
const DEF_CATS = ['Moradia', 'Alimentação', 'Mercado', 'Transporte', 'Saúde', 'Lazer', 'Restaurantes', 'Compras', 'Assinaturas', 'Educação', 'Viagens', 'Contas e serviços', 'Outros'];
let CATS = [...DEF_CATS];
const sum = a => a.reduce((x, y) => x + y, 0);
const inM = (m, t) => sum(S.tx.filter(x => x.d.startsWith(m) && x.t === t).map(x => x.a)) + recM(m, t);
const savedM = m => sum(S.tx.filter(x => x.d.startsWith(m) && x.t === 'goal').map(x => x.a));
const gAmt = g => g.init + sum(S.tx.filter(x => x.g === g.id).map(x => x.a));
const totalSaved = () => sum(S.goals.map(gAmt)) + genAmt();
const available = () => sum(S.tx.map(x => x.t === 'in' ? x.a : -x.a)) + recToDate() - paidInst();
// previsão
function forecast(g) {
    const rem = g.target - gAmt(g); if (rem <= 0) return { done: 1 };
    const ms = []; for (let i = 0; i < 3; i++)ms.push(shift(today().slice(0, 7), -i));
    const dep = ms.map(m => sum(S.tx.filter(x => x.g === g.id && x.d.startsWith(m)).map(x => x.a))).filter(v => v !== 0);
    const avg = dep.length >= 2 ? Math.round(sum(dep) / dep.length) : 0;
    const r = (rate) => rate > 0 ? { n: Math.ceil(rem / rate), d: shift(today().slice(0, 7), Math.ceil(rem / rate)), rate } : null;
    return { rem, plan: r(g.plan), avg: r(avg), fast: r((avg || g.plan) + 10000) };
}
function fcText(g) {
    const f = forecast(g); if (f.done) return 'Meta atingida';
    const p = f.avg || f.plan; if (!p) return 'Sem previsão: defina um valor mensal ou registre depósitos.';
    return 'Previsão: ' + mLabel(p.d) + (f.avg ? '' : ' (estimada pelo planejamento)');
}
// navegação
const TABS = [['home', 'Início', '⌂'], ['tx', 'Movimentos', '⇅'], ['goals', 'Objetivos', '◎'], ['cards', 'Cartões', '▭'], ['rec', 'Fixos', '↻'], ['plan', 'Planejamento', '▦'], ['tip', 'Dica do dia', '✦'], ['pig', 'Cofrinhos', '♡'], ['adm', 'Admin', '⛨'], ['cfg', 'Configurações', '⚙']];
function nav() {
    $('#nav').innerHTML = '<div class="logo">Reserva</div><button class="t prof" data-t="cfg" style="gap:10px">' + av(34) + '<b style="color:var(--tx);overflow:hidden;text-overflow:ellipsis">' + (esc(prof().name) || 'Meu perfil') + '</b></button>' + TABS.filter(t => t[0] !== 'adm' || isAdm).map(t => `<button class="t" data-t="${t[0]}" ${tab === t[0] ? 'aria-current="page"' : ''}><span aria-hidden="true">${t[2]}</span>${t[1]}</button>`).join('') + `<div style="flex:1"></div><small id="sv" style="padding:0 12px;color:var(--mu)">${stx}</small><button class="t" id="hid">${S.hide ? 'Mostrar valores' : 'Ocultar valores'}</button><button class="t" id="thm">Tema claro/escuro</button>`;
    document.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render() });
    $('#hid').onclick = () => { S.hide = S.hide ? 0 : 1; save(); render() };
    $('#thm').onclick = () => { const d = document.documentElement; const dark = (d.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark'; S.theme = dark ? 'light' : 'dark'; d.dataset.theme = S.theme; save() };
}
const monthBar = () => `<div class="mn"><button class="btn" data-m="-1" aria-label="Mês anterior">‹</button><span>${mLabel(M)}</span><button class="btn" data-m="1" aria-label="Próximo mês">›</button></div>`;
function bindM() { document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { M = shift(M, +b.dataset.m); render() }) }
// views
function home() {
    const inc = inM(M, 'in'), out = outM(M), sv = savedM(M), pm = shift(M, -1), pout = outM(pm);
    const act = S.goals.filter(g => g.status === 'andamento');
    let msg = '';
    if (!S.goals.length) msg = 'Crie seu primeiro objetivo para ver previsões baseadas nos seus depósitos.';
    else { const g = act[0]; msg = (sv > 0 ? `Você guardou ${brl(sv)} em ${mLabel(M)}. ` : `Nenhum depósito registrado em ${mLabel(M)}. `) + (g ? `${esc(g.name)}: ${fcText(g).toLowerCase()}.` : ''); }
    const cats = {}; S.tx.filter(x => x.d.startsWith(M) && x.t === 'out').forEach(x => cats[x.c] = (cats[x.c] || 0) + x.a); instOf(M).forEach(i => cats[i.c] = (cats[i.c] || 0) + i.a); recOf(M, 'out').forEach(r => cats[r.c] = (cats[r.c] || 0) + r.a);
    const ce = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const cols = ['#15803d', '#65a30d', '#0d9488', '#ca8a04', '#c2410c', '#7c3aed', '#64748b'];
    let acc = 0; const grad = ce.map((c, i) => { const s = acc; acc += c[1] / out * 100; return `${cols[i % 7]} ${s}% ${acc}%` }).join(',');
    const six = [...Array(6)].map((_, i) => shift(M, i - 5));
    const mx = Math.max(1, ...six.flatMap(m => [inM(m, 'in'), outM(m), savedM(m)]));
    const bars = six.map((m, i) => { const x = i * 100 + 20; const h = v => Math.round(v / mx * 110); return [['in', '#15803d'], ['out', '#c2410c'], ['sv', '#0d9488']].map((k, j) => { const v = k[0] === 'sv' ? savedM(m) : k[0] === 'out' ? outM(m) : inM(m, k[0]); return `<rect x="${x + j * 18}" y="${130 - h(Math.max(v, 0))}" width="14" height="${h(Math.max(v, 0))}" rx="3" fill="${k[1]}"><title>${mLabel(m, 1)}: ${brl(v)}</title></rect>` }).join('') + `<text x="${x + 27}" y="146" font-size="11" text-anchor="middle" fill="currentColor">${mLabel(m, 1).split(' ')[0]}</text>` }).join('');
    return `<div class="top"><h1 style="display:flex;align-items:center;gap:10px">${av(36)} ${prof().name ? 'Olá, ' + esc(prof().name) : 'Início'}</h1>${monthBar()}</div>
  <div class="msg">${msg}</div>
  <div class="grid">
   <div class="card"><div class="l">Saldo disponível</div><div class="v ${available() < 0 ? 'neg' : ''}">${brl(available())}</div></div>
   <div class="card"><div class="l">Parcelas a pagar</div><div class="v">${brl(openBills())}</div></div>
   <div class="card"><div class="l">Total guardado</div><div class="v pos">${brl(totalSaved())}</div></div>
   <div class="card"><div class="l">Gasto no mês</div><div class="v">${brl(out)}</div><small class="l">${pout ? (out >= pout ? '+' : '−') + Math.abs(Math.round((out - pout) / pout * 100)) + '% vs. mês anterior' : 'sem mês anterior para comparar'}</small></div>
   <div class="card"><div class="l">Guardado no mês</div><div class="v pos">${brl(sv)}</div>${inc ? `<small class="l">${Math.round(sv / inc * 100)}% da renda</small>` : ''}</div>
  </div>
  <h2>Seus objetivos</h2>${act.length ? act.map(goalCard).join('') : '<div class="empty">Nenhum objetivo ativo. Crie um com o botão +.</div>'}
  <h2>Resumo do mês</h2>
  <div class="card cf">${ce.length ? `<div class="donut" style="background:conic-gradient(${grad})"><b></b></div><div style="flex:1;min-width:180px">${ce.slice(0, 6).map((c, i) => `<div class="row"><span><span style="color:${cols[i % 7]}">●</span> ${esc(c[0])}</span><b>${brl(c[1])}</b></div>`).join('')}</div>` : '<div class="empty" style="flex:1;width:100%">Registre despesas para ver a distribuição por categoria.</div>'}</div>
  <div class="card" style="margin-top:12px"><div class="l">Últimos 6 meses: receitas, despesas e guardado</div><div class="scroll"><svg viewBox="0 0 600 155" width="100%" style="min-width:420px" role="img" aria-label="Gráfico mensal">${bars}</svg></div><small class="l"><span class="pos">■</span> receitas &nbsp;<span class="neg">■</span> despesas &nbsp;<span style="color:#0d9488">■</span> guardado</small></div>
  <p style="margin-top:14px"><button class="btn" id="csv">Exportar CSV</button></p>`;
}
function goalCard(g) {
    const a = gAmt(g), p = Math.max(0, Math.min(100, Math.round(a / g.target * 100)));
    return `<div class="card" style="margin-bottom:10px;border-left:4px solid ${g.color}"><div class="row" style="border:0;padding:0"><b>${esc(g.name)} ${g.status !== 'andamento' ? `<span class="tag">${g.status}</span>` : ''}</b><span>${p}%</span></div><div class="bar"><i style="width:${p}%;background:${g.color}"></i></div><div class="row" style="border:0;padding:0"><span>${brl(a)} de ${brl(g.target)}</span><small>${fcText(g)}</small></div></div>`
}
function goals() {
    return `<div class="top"><h1>Objetivos</h1><button class="btn p" data-a="newgoal">Novo objetivo</button></div>${genAmt() ? `<div class="card" style="margin-bottom:14px"><div class="row" style="border:0;padding:0"><b>Reserva geral (sem objetivo)</b><b>${brl(genAmt())}</b></div></div>` : ''}` + (S.goals.length ? S.goals.map(g => {
        const a = gAmt(g), f = forecast(g), dep = S.tx.filter(x => x.g === g.id).sort((x, y) => y.d.localeCompare(x.d));
        const sc = f.done ? '' : [['Ritmo planejado', f.plan], ['Ritmo médio recente', f.avg], ['Acelerado (+R$ 100/mês)', f.fast]].map(s => `<div class="row"><span>${s[0]}</span><span>${s[1] ? mLabel(s[1].d) + ` <small>${s[1].n} meses · ${brl(s[1].rate)}/mês</small>` : '<small>sem dados suficientes</small>'}</span></div>`).join('');
        return `<div class="card" style="margin-bottom:14px;border-left:4px solid ${g.color}">${goalCard(g).replace(/^<div class="card"[^>]*>/, '<div>')}
   ${a >= g.target && g.status === 'andamento' ? '<div class="msg" style="margin-top:10px">Meta atingida 🎉 <button class="btn" data-a="done" data-id="' + g.id + '">Marcar como concluída</button></div>' : ''}
   <div class="row"><span>Restante</span><b>${brl(Math.max(0, g.target - a))}</b></div>${sc}
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0"><button class="btn p" data-a="dep" data-id="${g.id}">Adicionar dinheiro à meta</button><button class="btn" data-a="editgoal" data-id="${g.id}">Editar</button><button class="btn" data-a="pause" data-id="${g.id}">${g.status === 'pausado' ? 'Retomar' : 'Pausar'}</button><button class="btn" data-a="delgoal" data-id="${g.id}">Excluir</button></div>
   <details><summary>Histórico (${dep.length})</summary>${dep.map(x => `<div class="row"><span>${fd(x.d)} <small>${esc(x.n)}</small></span><b class="${x.a < 0 ? 'neg' : 'pos'}">${brl(x.a)}</b></div>`).join('') || '<small>Sem depósitos ainda.</small>'}</details></div>`
    }).join('') : '<div class="empty">Você ainda não tem objetivos. Crie o primeiro e distribua o que guarda entre eles.</div>');
}
function txs() {
    const q = (window.Q || '').toLowerCase();
    const l = S.tx.filter(x => x.d.startsWith(M) && (!q || (x.n + x.c).toLowerCase().includes(q))).sort((a, b) => b.d.localeCompare(a.d));
    const lab = { in: 'Receita', out: 'Despesa', goal: 'Meta' };
    return `<div class="top"><h1>Movimentações</h1>${monthBar()}</div><input id="q" placeholder="Buscar por descrição ou categoria" value="${esc(window.Q)}" aria-label="Buscar" style="margin-bottom:10px"><div class="card">${recOf(M, 'in').concat(recOf(M, 'out')).map(r => `<div class="row"><span>${esc(r.desc)}<small>dia ${r.day} · ${r.k === 'in' ? 'Receita fixa' : 'Gasto fixo'} <span class="tag">fixo</span></small></span><b class="${r.k === 'in' ? 'pos' : 'neg'}">${r.k === 'out' ? '−' : ''}${brl(r.a)}</b></div>`).join('')}${l.length ? l.map(x => `<div class="row"><span>${esc(x.n || x.c)}<small>${fd(x.d)} · ${lab[x.t]} · ${esc(x.t === 'goal' ? (S.goals.find(g => g.id === x.g) || { name: 'Reserva geral' }).name : x.c)}</small></span><span><b class="${x.t === 'in' ? 'pos' : x.t === 'out' ? 'neg' : ''}">${x.t === 'out' ? '−' : ''}${brl(x.a)}</b><button class="x" data-a="edittx" data-id="${x.id}" aria-label="Editar" title="Editar">✎</button><button class="x" data-a="deltx" data-id="${x.id}" aria-label="Excluir" title="Excluir">✕</button></span></div>`).join('') : '<div class="empty">Nenhuma movimentação neste mês. Use o botão + para registrar.</div>'}</div>`;
}
function plan() {
    const rows = [...Array(12)].map((_, i) => shift(M.slice(0, 4) + '-01', i));
    return `<div class="top"><h1>Planejamento</h1><div class="mn"><button class="btn" data-y="-1">‹</button><span>${M.slice(0, 4)}</span><button class="btn" data-y="1">›</button></div></div>
  <p style="color:var(--mu)">Defina quanto pretende guardar em cada mês. Alterar um mês não muda os registros dos outros.</p>
  <div class="card scroll">${rows.map(m => {
        const p = S.plan[m] || 0, r = savedM(m), pc = p ? Math.round(r / p * 100) : 0, past = m <= today().slice(0, 7);
        return `<div class="row"><span style="text-transform:capitalize;min-width:110px">${mLabel(m, 1)}</span><input data-p="${m}" inputmode="decimal" placeholder="Meta R$" value="${p ? (p / 100).toString().replace('.', ',') : ''}" style="width:110px" aria-label="Meta de ${mLabel(m)}"><span style="min-width:90px;text-align:right">${past ? brl(r) : '—'}</span><span style="min-width:90px;text-align:right">${p && past ? `<span class="tag ${r >= p ? '' : 'r'}">${r > p ? 'superada' : r === p ? 'atingida' : pc + '%'}</span>` : ''}</span></div>`
    }).join('')}</div><small style="color:var(--mu)">Colunas: meta planejada, guardado de fato e situação.</small>`;
}
const TIPS = [['Pague seu futuro primeiro', 'Assim que receber, separe o valor das metas antes de gastar. Assim a economia vira prioridade, não sobra.', 'Defina quanto guardar no próximo mês e distribua entre seus objetivos.'], ['Revise as assinaturas', 'Pequenas mensalidades esquecidas somam bastante ao longo do ano.', 'Liste suas assinaturas e cancele uma que não usou no último mês.'], ['Espere 48 horas', 'Compras por impulso perdem força com o tempo.', 'Anote o item que quer comprar e decida só depois de dois dias.'], ['Pague a fatura inteira', 'Rotativo do cartão tem juros altos. Pagar o total evita que a dívida cresça.', 'Confira o valor da fatura e a data de vencimento.'], ['Reserva de emergência primeiro', 'Uma reserva evita recorrer ao crédito em imprevistos.', 'Crie ou aumente o objetivo de emergência com um depósito, mesmo pequeno.'], ['Compare preço por unidade', 'O maior pacote nem sempre é o mais barato.', 'Na próxima ida ao mercado, compare o preço por kg ou litro de 3 itens.'], ['Defina um limite para lazer', 'Um teto mensal por categoria dá liberdade sem estourar o orçamento.', 'Escolha a categoria que mais pesou e fixe um valor para o mês.'], ['Registre tudo por uma semana', 'Você só controla o que enxerga.', 'Anote hoje todas as despesas, inclusive as pequenas.'], ['Parcelas comprometem o futuro', 'Parcelas já contratadas reduzem o que sobra nos meses seguintes.', 'Some as parcelas que ainda vai pagar e compare com sua renda.'], ['Revise a meta mensal', 'A meta deve caber na sua realidade e ser ajustada quando ela muda.', 'Veja se o valor planejado para este mês ainda faz sentido.']];
function tip() {
    const day = Math.floor(Date.now() / 864e5), i = day % TIPS.length, t = TIPS[i];
    return `<div class="top"><h1>Dica do dia</h1></div><div class="card"><span class="tag">${fd(today())}</span><h2 style="margin-top:10px">${t[0]}</h2><p>${t[1]}</p><div class="msg"><b>Ação de hoje:</b> ${t[2]}</div><button class="btn ${S.tipDone[i] ? 'p' : ''}" data-a="tipdone" data-id="${i}">${S.tipDone[i] ? 'Concluída' : 'Marcar como concluída'}</button> <button class="btn" data-a="tipfav" data-id="${i}">${S.tipFav[i] ? '★ Favorita' : '☆ Favoritar'}</button></div><h2>Dicas anteriores</h2><div class="card">${TIPS.map((x, j) => j === i ? '' : `<div class="row"><span>${x[0]}<small>${x[2]}</small></span><span>${S.tipFav[j] ? '★' : ''}</span></div>`).join('')}</div>`;
}
function render() {
    const m = $('#main'); document.body.classList.toggle('noauth', AUTHS.includes(ready) || ready === 'nocfg'); nav(); $('#fab').hidden = ready !== 'ok';
    if (AUTHS.includes(ready)) { m.innerHTML = authHtml(); bindAuth(); return }
    if (ready === 'nocfg') { m.innerHTML = '<div class="empty">Configure SB_URL e SB_KEY no início do script (veja o LEIA-ME).</div>'; return }
    if (ready !== 'ok') { m.innerHTML = '<div class="empty">' + ({ load: 'Carregando seus dados…', nologin: 'Para usar o Reserva, entre na sua conta Claude e abra esta página pelo link do artefato. Seus dados ficam salvos na sua conta, não neste navegador.', ro: 'Sua conta tem acesso somente de leitura. Peça ao dono do artefato permissão de Contribuidor.', err: 'Não foi possível carregar seus dados. Recarregue a página.' })[ready] + '</div>'; return }
    m.innerHTML = ({ home, tx: txs, goals, cards: cardsV, rec: recV, cfg: cfgV, pig: pigV, adm: admV, plan, tip })[tab](); bindM(); bind()
}
function bind() {
    const q = $('#q'); if (q) q.oninput = e => { window.Q = e.target.value; const p = e.target.selectionStart; render(); $('#q').focus(); $('#q').setSelectionRange(p, p) };
    document.querySelectorAll('[data-y]').forEach(b => b.onclick = () => { M = shift(M, 12 * +b.dataset.y); render() });
    document.querySelectorAll('[data-p]').forEach(i => i.onchange = () => { const v = money(i.value); if (isNaN(v) || v < 0) { i.value = ''; return } S.plan[i.dataset.p] = v; save(); render() });
    document.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a, b.dataset.id));
    const c = $('#csv'); if (c) c.onclick = exportCsv;
}
function act(a, id) {
    const g = S.goals.find(x => x.id === id);
    if (a === 'newgoal') goalForm();
    else if (a === 'dep') txForm('goal', id);
    else if (a === 'edittx') return txForm(null, null, id);
    else if (a === 'pause') { g.status = g.status === 'pausado' ? 'andamento' : 'pausado'; }
    else if (a === 'done') g.status = 'concluído';
    else if (a === 'delgoal') return ask('Excluir este objetivo? Os depósitos feitos nele também serão excluídos.', () => { S.goals = S.goals.filter(x => x.id !== id); S.tx = S.tx.filter(x => x.g !== id) });
    else if (a === 'deltx') return ask('Excluir esta movimentação?', () => { S.tx = S.tx.filter(x => x.id !== id) });
    else if (a === 'newcard') return cardForm();
    else if (a === 'logout') { DB = null; sb.auth.signOut().then(() => { location.hash = ''; location.reload() }); return }
    else if (a === 'export') return exportMine();
    else if (a === 'policy') return policy();
    else if (a === 'delacct') return ask('Excluir sua conta e todos os seus dados? Isso é definitivo e não pode ser desfeito.', () => { DB = null; sb.rpc('delete_my_account').then(() => sb.auth.signOut()).then(() => { location.hash = ''; location.reload() }) });
    else if (a === 'newpig') return pigForm();
    else if (a === 'newpgoal') return pgoalForm(id);
    else if (a === 'pigtx') return pigTxForm(id);
    else if (a === 'invite') return inviteLink(id);
    else if (a === 'leavepig') return ask('Sair deste cofrinho? Seus lançamentos continuam no histórico dos outros membros.', () => { sb.rpc('leave_pig', { p_pig: id }).then(() => { PG.loaded = false; render() }) }, 'Sair');
    else if (a === 'admref') { AD.rows = null; AD.err = 0 }
    else if (a === 'admnew') return admNewForm();
    else if (a === 'admpw') { const u = (AD.rows || []).find(x => x.id === id); return admPwForm(id, u ? u.email : '') }
    else if (a === 'chpw') return chpwForm();
    else if (a === 'editpig') return pigEditForm(id);
    else if (a === 'members') return membersDlg(id);
    else if (a === 'editpgoal') return pgoalEdit(id);
    else if (a === 'delpgoal') return ask('Excluir este objetivo? O dinheiro dele passa para "Sem objetivo" e o histórico é mantido.', () => { sb.from('pig_goals').delete().eq('id', id).then(() => reloadPigs()) });
    else if (a === 'newrec') return recForm();
    else if (a === 'editrec') return recForm(id);
    else if (a === 'raise') return raiseForm(id);
    else if (a === 'endrec') { const r = S.rec.find(x => x.id === id); r.end = M < r.start ? r.start : M }
    else if (a === 'resume') { S.rec.find(x => x.id === id).end = '' }
    else if (a === 'delrec') return ask('Excluir este fixo? Isso apaga também os meses anteriores. Para apenas parar daqui para frente, use Encerrar.', () => { S.rec = S.rec.filter(x => x.id !== id) });
    else if (a === 'editgoal') return goalForm(id);
    else if (a === 'editbuy') return buyForm(id);
    else if (a === 'newbuy') return buyForm();
    else if (a === 'paid') { const [cid, mm] = id.split('|'), its = allInst().filter(i => i.card === cid && i.m === mm), all = its.every(isPaid); its.forEach(i => { S.ip[i.b + '|' + i.k] = !all }) }
    else if (a === 'ip') S.ip[id] = !S.ip[id];
    else if (a === 'editprof') return profForm();
    else if (a === 'addcat') { const v = ($('#nc').value || '').trim(); if (!v || CATS.some(c => c.toLowerCase() === v.toLowerCase())) return; S.cats = [...CATS, v]; applyCats() }
    else if (a === 'delcat') { if (CATS.length <= 1) return; return ask('Remover a categoria “' + esc(id) + '”? Lançamentos antigos mantêm o nome.', () => { S.cats = CATS.filter(c => c !== id); applyCats() }) }
    else if (a === 'rescat') { S.cats = null; applyCats() }
    else if (a === 'delcard') return ask('Excluir este cartão e as compras dele?', () => { S.cards = S.cards.filter(x => x.id !== id); S.buys = S.buys.filter(x => x.card !== id) });
    else if (a === 'delbuy') return ask('Excluir esta compra e todas as parcelas?', () => { S.buys = S.buys.filter(x => x.id !== id) });
    else if (a === 'tipdone') S.tipDone[id] = !S.tipDone[id];
    else if (a === 'tipfav') S.tipFav[id] = !S.tipFav[id];
    save(); render();
}
const dlg = $('#dlg');
function open(html, onok) {
    dlg.innerHTML = `<form method="dialog" id="f">${html}<p style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" id="cx">Cancelar</button><button class="btn p">Salvar</button></p><div class="neg" id="er" role="alert"></div></form>`;
    $('#cx').onclick = () => dlg.close();
    $('#f').onsubmit = e => { e.preventDefault(); const r = onok(new FormData($('#f'))); if (r) $('#er').textContent = r; else { dlg.close(); save(); render() } };
    dlg.showModal()
}
function txForm(type, gid, eid) {
    const old = eid ? S.tx.find(x => x.id === eid) : null;
    open(`<h2 style="margin-top:0">${old ? 'Editar movimentação' : 'Novo registro'}</h2><label>Tipo<select name="t" id="tt"><option value="out">Despesa</option><option value="in">Receita</option><option value="goal">Depósito em meta</option><option value="wd">Retirada de meta</option></select></label>
  <label>Descrição<input name="n"></label><label>Valor (R$)<input name="a" inputmode="decimal" required></label><label>Data<input type="date" name="d" value="${today()}" required></label>
  <label id="lc">Categoria<select name="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
  <label id="lg" hidden>Objetivo<select name="g"><option value="">Sem objetivo (reserva geral)</option>${S.goals.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>`, fm => {
        const t = fm.get('t'), a = money(fm.get('a'));
        if (!(a > 0)) return 'Informe um valor maior que zero.';
        if (!fm.get('d')) return 'Informe uma data válida.';
        const goalT = t === 'goal' || t === 'wd';

        if (t === 'wd') { const g2 = fm.get('g'), cur = g2 ? gAmt(S.goals.find(x => x.id === g2)) : genAmt(); if (a > cur - (old && (old.g || '') === g2 ? old.a : 0)) return 'A retirada é maior que o valor acumulado.' }
        const nx = { id: old ? old.id : uid(), t: goalT ? 'goal' : t, a: t === 'wd' ? -a : a, n: fm.get('n'), d: fm.get('d'), c: fm.get('c'), g: goalT ? fm.get('g') : undefined }; if (old) S.tx[S.tx.indexOf(old)] = nx; else S.tx.push(nx);
    });
    const sync = () => { const v = $('#tt').value, gt = v === 'goal' || v === 'wd'; $('#lg').hidden = !gt; $('#lc').hidden = gt };
    $('#tt').onchange = sync; if (type) { $('#tt').value = type; if (gid) dlg.querySelector('[name=g]').value = gid; sync() }
    if (old) { const E = n => $('#f').elements[n]; $('#tt').value = old.t === 'goal' ? (old.a < 0 ? 'wd' : 'goal') : old.t; E('n').value = old.n || ''; E('a').value = (Math.abs(old.a) / 100).toString().replace('.', ','); E('d').value = old.d; if (old.t === 'goal') E('g').value = old.g || ''; else E('c').value = old.c; sync() }
}
function ask(msg, fn, lbl) { dlg.innerHTML = `<p>${msg}</p><p style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="ano">Cancelar</button><button class="btn p" id="ays">${lbl || 'Excluir'}</button></p>`; $('#ano').onclick = () => dlg.close(); $('#ays').onclick = () => { dlg.close(); fn(); save(); render() }; dlg.showModal() }
function goalForm(eid) {
    const og = eid ? S.goals.find(x => x.id === eid) : null;
    open(`<h2 style="margin-top:0">${og ? 'Editar objetivo' : 'Novo objetivo'}</h2><label>Nome<input name="n" required></label><label>Valor desejado (R$)<input name="t" inputmode="decimal" required></label><label>Já acumulado (R$)<input name="i" inputmode="decimal" value="0"></label><label>Planejo guardar por mês (R$)<input name="p" inputmode="decimal"></label><label>Cor<input type="color" name="c" value="#15803d"></label>`, fm => {
        const t = money(fm.get('t')), i = money(fm.get('i')), p = money(fm.get('p'));
        if (!fm.get('n').trim()) return 'Informe o nome.'; if (!(t > 0)) return 'Informe o valor desejado.'; if (isNaN(i) || i < 0 || isNaN(p) || p < 0) return 'Valores inválidos.';
        const dt = { name: fm.get('n').trim(), target: t, init: i, plan: p || 0, color: fm.get('c') }; if (og) Object.assign(og, dt); else S.goals.push({ id: uid(), ...dt, status: 'andamento', start: today() });
    });
    if (og) { const E = n => $('#f').elements[n]; E('n').value = og.name; E('t').value = (og.target / 100).toString().replace('.', ','); E('i').value = (og.init / 100).toString().replace('.', ','); E('p').value = og.plan ? (og.plan / 100).toString().replace('.', ',') : ''; E('c').value = og.color }
}
function exportCsv() {
    const rows = [['Data', 'Tipo', 'Descrição', 'Categoria/Meta', 'Valor (R$)'], ...S.tx.sort((a, b) => a.d.localeCompare(b.d)).map(x => [fd(x.d), x.t, x.n, x.t === 'goal' ? (S.goals.find(g => g.id === x.g) || {}).name : x.c, (x.a / 100).toFixed(2).replace('.', ',')])];
    const b = new Blob(['\ufeff' + rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(';')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'reserva.csv'; a.click();
}
const instList = b => { const base = Math.floor(b.total / b.n), rem = b.total - base * b.n; return [...Array(b.n)].map((_, k) => ({ card: b.card, m: shift(b.first, k), a: base + (k === 0 ? rem : 0), k: k + 1, n: b.n, c: b.c, desc: b.desc, b: b.id })) };
const allInst = () => S.buys.flatMap(instList);
const instOf = m => allInst().filter(i => i.m === m);
const outM = m => inM(m, 'out') + sum(instOf(m).map(i => i.a));
const isPaid = i => !!(S.ip[i.b + '|' + i.k] || S.paid[i.card + '|' + i.m]);
const paidInst = () => sum(allInst().filter(isPaid).map(i => i.a));
const openBills = () => sum(allInst().filter(i => !isPaid(i)).map(i => i.a));
const genAmt = () => sum(S.tx.filter(x => x.t === 'goal' && !x.g).map(x => x.a));
const dueISO = (c, m) => { const mm = c.due > c.close ? m : shift(m, 1), [y, o] = mm.split('-').map(Number), dd = Math.min(c.due, new Date(y, o, 0).getDate()); return mm + '-' + String(dd).padStart(2, '0') };
function cardsV() {
    const head = '<div class="top"><h1>Cartões</h1>' + monthBar() + '</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"><button class="btn p" data-a="newbuy">Nova compra no cartão</button><button class="btn" data-a="newcard">Novo cartão</button></div>';
    if (!S.cards.length) return head + '<div class="empty">Cadastre seu primeiro cartão para registrar compras e acompanhar as parcelas.</div>';
    const tot = S.buys.length ? `<div class="msg">Parcelas ainda a pagar em todos os cartões: <b>${brl(openBills())}</b></div>` : '';
    return head + tot + S.cards.map(c => {
        const all = allInst().filter(i => i.card === c.id), used = sum(all.filter(i => !isPaid(i)).map(i => i.a)), bill = all.filter(i => i.m === M), bt = sum(bill.map(i => i.a)), paid = bill.length > 0 && bill.every(isPaid), pc = c.limit ? Math.min(100, Math.round(used / c.limit * 100)) : 0, iso = dueISO(c, M), days = Math.round((new Date(iso) - new Date(today())) / 864e5);
        const al = !paid && bt > 0 && days <= 5 && days >= -30 ? `<span class="tag r">${days < 0 ? 'Vencida há ' + (-days) + ' dias' : days === 0 ? 'Vence hoje' : 'Vence em ' + days + ' dias'}</span>` : '';
        const buys = S.buys.filter(b => b.card === c.id);
        return `<div class="card" style="margin-bottom:14px;border-left:4px solid ${c.color}"><div class="row" style="border:0;padding:0"><b>${esc(c.name)} ${al}</b><button class="x" data-a="delcard" data-id="${c.id}" aria-label="Excluir cartão">✕</button></div><div class="bar"><i style="width:${pc}%;background:${pc >= 90 ? 'var(--rd)' : c.color}"></i></div>
<div class="row"><span>Limite usado / disponível<small>limite ${brl(c.limit)}</small></span><span>${brl(used)} / <b class="${c.limit - used < 0 ? 'neg' : 'pos'}">${brl(c.limit - used)}</b></span></div>
<div class="row"><span>Fatura de ${mLabel(M)}<small>fecha dia ${c.close} · vence em ${fd(iso)}</small></span><b>${brl(bt)}</b></div>
${bill.map(i => `<div class="row"><label style="display:flex;gap:10px;align-items:center;margin:0;color:var(--tx);font-size:15px"><input type="checkbox" data-a="ip" data-id="${i.b}|${i.k}" ${isPaid(i) ? 'checked' : ''} aria-label="Parcela paga"><span>${esc(i.desc)} <small>parcela ${i.k}/${i.n} · ${esc(i.c)}</small></span></label><span style="${isPaid(i) ? 'text-decoration:line-through;color:var(--mu)' : ''}">${brl(i.a)}</span></div>`).join('')}
${bt ? `<p><button class="btn ${paid ? 'p' : ''}" data-a="paid" data-id="${c.id}|${M}">${paid ? 'Fatura paga (desfazer)' : 'Marcar fatura como paga'}</button></p>` : ''}
<div class="row"><span>Próximas faturas</span><small>${[1, 2, 3].map(n => { const m = shift(M, n); return mLabel(m, 1) + ': ' + brl(sum(all.filter(i => i.m === m).map(i => i.a))) }).join(' · ')}</small></div>
<details><summary>Compras e parcelas (${buys.length})</summary>${buys.map(b => { const l = instList(b), op = l.filter(i => !isPaid(i)); return `<div class="row"><span>${esc(b.desc)}<small>${b.n}x de ${brl(l[l.length - 1].a)} · total ${brl(b.total)} · ${op.length ? 'faltam ' + op.length + ' de ' + b.n + ' parcelas (' + brl(sum(op.map(i => i.a))) + ')' : 'quitada'}</small></span><button class="x" data-a="editbuy" data-id="${b.id}" aria-label="Editar compra" title="Editar">✎</button><button class="x" data-a="delbuy" data-id="${b.id}" aria-label="Excluir compra">✕</button></div><details style="margin:0 0 8px"><summary><small>Parcelas (${l.length - op.length}/${l.length} pagas)</small></summary>${l.map(i => `<div class="row"><label style="display:flex;gap:10px;align-items:center;margin:0;color:var(--tx);font-size:15px"><input type="checkbox" data-a="ip" data-id="${i.b}|${i.k}" ${isPaid(i) ? 'checked' : ''} aria-label="Parcela paga"><span>${i.k}/${i.n} · ${mLabel(i.m, 1)}</span></label><span>${brl(i.a)}</span></div>`).join('')}</details>` }).join('') || '<small>Nenhuma compra neste cartão.</small>'}</details></div>`
    }).join('');
}
function cardForm() { open(`<h2 style="margin-top:0">Novo cartão</h2><label>Nome<input name="n" required></label><label>Limite (R$)<input name="l" inputmode="decimal" required></label><label>Dia de fechamento<input name="c" type="number" min="1" max="31" required></label><label>Dia de vencimento<input name="v" type="number" min="1" max="31" required></label><label>Cor<input type="color" name="k" value="#0d9488"></label>`, fm => { const l = money(fm.get('l')), c = +fm.get('c'), v = +fm.get('v'); if (!fm.get('n').trim()) return 'Informe o nome.'; if (!(l > 0)) return 'Informe o limite.'; if (!(c >= 1 && c <= 31 && v >= 1 && v <= 31)) return 'Os dias devem ficar entre 1 e 31.'; S.cards.push({ id: uid(), name: fm.get('n').trim(), limit: l, close: c, due: v, color: fm.get('k') }) }) }
function buyForm(eid) {
    const ob = eid ? S.buys.find(x => x.id === eid) : null; if (!S.cards.length) { cardForm(); return }
    open(`<h2 style="margin-top:0">${ob ? 'Editar compra' : 'Nova compra no cartão'}</h2><label>Cartão<select name="cd">${S.cards.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label>Descrição<input name="n" required></label><label>Valor total (R$)<input name="a" inputmode="decimal" required></label><label>Parcelas<input name="p" type="number" min="1" max="48" value="1" required></label><label>Data da compra<input type="date" name="d" value="${today()}" required></label><label>Categoria<select name="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label><small style="color:var(--mu)">A primeira parcela vai para a fatura certa conforme o dia de fechamento.</small>`, fm => { const a = money(fm.get('a')), n = parseInt(fm.get('p'), 10), d = fm.get('d'), c = S.cards.find(x => x.id === fm.get('cd')); if (!fm.get('n').trim()) return 'Informe a descrição.'; if (!(a > 0)) return 'Informe um valor maior que zero.'; if (!(n >= 1 && n <= 48)) return 'Informe de 1 a 48 parcelas.'; if (!d) return 'Informe uma data válida.'; const mo = d.slice(0, 7); const nb = { id: ob ? ob.id : uid(), card: c.id, desc: fm.get('n').trim(), total: a, n, first: +d.slice(8, 10) > c.close ? shift(mo, 1) : mo, c: fm.get('c'), date: d }; if (ob) S.buys[S.buys.indexOf(ob)] = nb; else S.buys.push(nb) }); if (ob) { const E = n => $('#f').elements[n]; E('cd').value = ob.card; E('n').value = ob.desc; E('a').value = (ob.total / 100).toString().replace('.', ','); E('p').value = ob.n; E('d').value = ob.date || ob.first + '-01'; E('c').value = ob.c }
}
const recAmt = (r, m) => { let a = 0; for (const h of r.h) if (h.from <= m) a = h.a; return a };
const recOf = (m, k) => S.rec.filter(r => (!k || r.k === k) && r.start <= m && (!r.end || m <= r.end)).map(r => ({ ...r, a: recAmt(r, m) }));
const recM = (m, t) => sum(recOf(m, t).map(r => r.a));
const recToDate = () => { const cur = today().slice(0, 7), td = today(); let s = 0; for (const r of S.rec) { let m = r.start, n = 0; while (m <= cur && n++ < 600) { if (!r.end || m <= r.end) { const [y, o] = m.split('-').map(Number), dd = Math.min(r.day, new Date(y, o, 0).getDate()), d = m + '-' + String(dd).padStart(2, '0'); if (d <= td) s += (r.k === 'in' ? 1 : -1) * recAmt(r, m) } m = shift(m, 1) } } return s };
function recV() {
    const head = `<div class="top"><h1>Fixos</h1>${monthBar()}</div><p style="color:var(--mu)">Cadastre uma vez. Eles entram automaticamente em todos os meses, sem criar lançamentos duplicados. Aumentos valem só a partir do mês escolhido.</p><p><button class="btn p" data-a="newrec">Novo fixo</button></p>`;
    if (!S.rec.length) return head + '<div class="empty">Cadastre seu salário e seus gastos fixos, como aluguel, internet e assinaturas.</div>';
    const grp = (k, t) => { const l = S.rec.filter(r => r.k === k); return l.length ? `<h2>${t}</h2>` + l.map(r => { const on = r.start <= M && (!r.end || M <= r.end), a = recAmt(r, M); return `<div class="card" style="margin-bottom:10px"><div class="row" style="border:0;padding:0"><b>${esc(r.desc)} ${on ? '' : '<span class="tag r">inativo neste mês</span>'}</b><b class="${k === 'in' ? 'pos' : 'neg'}">${brl(a)}</b></div><small style="color:var(--mu)">dia ${r.day} · desde ${mLabel(r.start, 1)}${r.end ? ' · até ' + mLabel(r.end, 1) : ''}${k === 'out' ? ' · ' + esc(r.c) : ''}</small>${r.h.length > 1 ? `<details><summary>Histórico de valores</summary>${r.h.map(h => `<div class="row"><span>a partir de ${mLabel(h.from, 1)}</span><b>${brl(h.a)}</b></div>`).join('')}</details>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn" data-a="raise" data-id="${r.id}">${k === 'in' ? 'Registrar aumento' : 'Reajustar valor'}</button><button class="btn" data-a="editrec" data-id="${r.id}">Editar</button>${r.end ? `<button class="btn" data-a="resume" data-id="${r.id}">Retomar</button>` : `<button class="btn" data-a="endrec" data-id="${r.id}">Encerrar após ${mLabel(M, 1)}</button>`}<button class="btn" data-a="delrec" data-id="${r.id}">Excluir</button></div></div>` }).join('') : '' };
    return head + `<div class="grid"><div class="card"><div class="l">Receitas fixas no mês</div><div class="v pos">${brl(recM(M, 'in'))}</div></div><div class="card"><div class="l">Gastos fixos no mês</div><div class="v neg">${brl(recM(M, 'out'))}</div></div></div>` + grp('in', 'Salário e receitas fixas') + grp('out', 'Gastos fixos');
}
function recForm(eid) {
    const o = eid ? S.rec.find(x => x.id === eid) : null;
    open(`<h2 style="margin-top:0">${o ? 'Editar fixo' : 'Novo fixo'}</h2><label>Tipo<select name="k" id="rk"><option value="in">Salário / receita fixa</option><option value="out">Gasto fixo</option></select></label><label>Descrição<input name="n" required></label>${o ? '' : '<label>Valor mensal (R$)<input name="a" inputmode="decimal" required></label>'}<label>Dia do mês<input name="dy" type="number" min="1" max="31" value="5" required></label><label>A partir de<input name="s" type="month" value="${M}" required></label><label id="rcl">Categoria<select name="c">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label>`, fm => {
        const a = o ? 0 : money(fm.get('a')), dy = +fm.get('dy'), s = fm.get('s'), k = fm.get('k');
        if (!fm.get('n').trim()) return 'Informe a descrição.'; if (!o && !(a > 0)) return 'Informe um valor maior que zero.'; if (!(dy >= 1 && dy <= 31)) return 'O dia deve ficar entre 1 e 31.'; if (!s || s.length !== 7) return 'Informe o mês inicial.';
        if (o) { Object.assign(o, { k, desc: fm.get('n').trim(), day: dy, start: s, c: fm.get('c') }); o.h[0].from = s; o.h.sort((x, y) => x.from.localeCompare(y.from)) }
        else S.rec.push({ id: uid(), k, desc: fm.get('n').trim(), day: dy, start: s, end: '', c: fm.get('c'), h: [{ from: s, a }] });
    });
    const sync = () => { $('#rcl').hidden = $('#rk').value === 'in' }; $('#rk').onchange = sync;
    if (o) { const E = n => $('#f').elements[n]; E('k').value = o.k; E('n').value = o.desc; E('dy').value = o.day; E('s').value = o.start; E('c').value = o.c || CATS[0] }
    sync()
}
function raiseForm(id) {
    const o = S.rec.find(x => x.id === id);
    open(`<h2 style="margin-top:0">${o.k === 'in' ? 'Registrar aumento' : 'Reajustar valor'}</h2><p style="color:var(--mu)">${esc(o.desc)}: valor atual ${brl(recAmt(o, today().slice(0, 7)))}. O novo valor vale a partir do mês escolhido e não altera os meses anteriores.</p><label>Novo valor mensal (R$)<input name="a" inputmode="decimal" required></label><label>A partir de<input name="s" type="month" value="${M}" required></label>`, fm => { const a = money(fm.get('a')), s = fm.get('s'); if (!(a > 0)) return 'Informe um valor maior que zero.'; if (!s || s.length !== 7) return 'Informe o mês.'; if (s < o.start) return 'O mês deve ser igual ou posterior ao início.'; o.h = o.h.filter(x => x.from !== s); o.h.push({ from: s, a }); o.h.sort((x, y) => x.from.localeCompare(y.from)) })
}
const prof = () => S.prof || {};
const av = z => { const p = prof(), st = `width:${z}px;height:${z}px;border-radius:50%;flex:none;display:inline-grid;place-items:center;overflow:hidden;background:${p.color || '#15803d'};color:#fff;font-size:${Math.round(z * .5)}px;font-weight:600`; return p.img ? `<span style="${st}"><img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover"></span>` : `<span style="${st}" aria-hidden="true">${esc(p.emoji || (p.name || 'R').trim().charAt(0).toUpperCase())}</span>` };
const applyCats = () => { CATS = S.cats && S.cats.length ? [...S.cats] : [...DEF_CATS] };
const migrate = () => { let ch = 0; for (const k of Object.keys(S.paid || {})) { if (!S.paid[k]) continue; const [c, m] = k.split('|'); allInst().filter(i => i.card === c && i.m === m).forEach(i => { S.ip[i.b + '|' + i.k] = true }); delete S.paid[k]; ch = 1 } if (ch) save() };
function cfgV() {
    const p = prof();
    return `<div class="top"><h1>Configurações</h1></div><div class="card" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${av(64)}<div style="flex:1;min-width:140px"><b>${esc(p.name) || 'Sem nome'}</b><small style="color:var(--mu);display:block">Seu perfil neste app</small></div><button class="btn" data-a="editprof">Editar perfil</button></div>${privSec()}<h2>Categorias de gasto</h2><div class="card"><div style="display:flex;gap:8px;margin-bottom:10px"><input id="nc" maxlength="30" placeholder="Nova categoria" aria-label="Nova categoria"><button class="btn p" data-a="addcat" style="white-space:nowrap">Adicionar</button></div>${CATS.map(c => `<div class="row"><span>${esc(c)}</span><button class="x" data-a="delcat" data-id="${esc(c)}" aria-label="Remover ${esc(c)}">✕</button></div>`).join('')}<p style="margin-bottom:0"><button class="btn" data-a="rescat">Restaurar categorias padrão</button></p><small style="color:var(--mu)">Remover uma categoria não apaga lançamentos antigos: eles mantêm o nome.</small></div>`
}
function profForm() {
    const p = prof(); let pend = p.img || '';
    open(`<h2 style="margin-top:0">Meu perfil</h2><div style="display:flex;gap:12px;align-items:center">${av(56)}<span style="color:var(--mu)">Foto, emoji ou inicial do nome.</span></div><label>Nome<input name="n" maxlength="30" value="${esc(p.name)}"></label><label>Emoji (opcional)<input name="e" maxlength="4" value="${esc(p.emoji)}" placeholder="ex.: 🌱"></label><label>Cor do avatar<input type="color" name="c" value="${p.color || '#15803d'}"></label><label>Foto (opcional)<input type="file" id="pf" accept="image/*"></label><p><button type="button" class="btn" id="pr">Remover foto</button></p>`, fm => { S.prof = { name: fm.get('n').trim(), emoji: fm.get('e').trim(), color: fm.get('c'), img: pend } });
    $('#pf').onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const z = 128, cv = document.createElement('canvas'); cv.width = cv.height = z; const s = Math.min(im.width, im.height); cv.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, z, z); pend = cv.toDataURL('image/jpeg', .8); $('#er').textContent = 'Foto carregada. Toque em Salvar.' }; im.src = r.result }; r.readAsDataURL(f) };
    $('#pr').onclick = () => { pend = ''; $('#er').textContent = 'Foto removida. Toque em Salvar.' }
}
const SB_URL = 'COLE_AQUI_A_URL_DO_PROJETO', SB_KEY = 'COLE_AQUI_A_ANON_KEY', POLICY_V = '1';
const sb = (SB_URL.startsWith('https://') && window.supabase) ? supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
const AUTHS = ['auth', 'recover', 'force', 'consent'];
let authMode = 'in', authMsg = '';
function authHtml() {
    const W = '<div class="card" style="max-width:380px;margin:10vh auto">', AM = `<div id="am" role="alert" style="color:var(--mu)">${esc(authMsg)}</div>`;
    if (ready === 'consent') return `${W}<h1 style="font-size:22px">Antes de começar</h1><p>Para usar o Reserva, leia e aceite a <a href="#" id="pp">Política de Privacidade</a> (LGPD).</p><p><button class="btn p" id="ok" style="width:100%">Li e aceito</button></p><p><a href="#" id="so">Sair</a></p>${AM}</div>`;
    if (ready === 'recover' || ready === 'force') return `${W}<h1 style="font-size:22px">Nova senha</h1><p style="color:var(--mu)">${ready === 'force' ? 'Sua senha foi definida pelo administrador. Escolha uma senha só sua.' : 'Escolha a nova senha.'}</p><form id="af"><label>Nova senha (mín. 10 caracteres)<input type="password" name="p" minlength="10" autocomplete="new-password" required></label><p><button class="btn p" style="width:100%">Salvar senha</button></p></form>${AM}</div>`;
    const t = authMode === 'fg' ? 'Recuperar senha' : 'Entrar';
    return `${W}<div class="logo" style="padding:0 0 8px">Reserva</div><h1 style="font-size:22px">${t}</h1><form id="af"><label>E-mail<input type="email" name="e" autocomplete="email" required></label>${authMode === 'fg' ? '' : '<label>Senha<input type="password" name="p" autocomplete="current-password" required></label>'}<p><button class="btn p" style="width:100%">${t}</button></p></form>${AM}<p style="font-size:13px">${authMode === 'fg' ? '<a href="#" data-m2="in">Voltar</a>' : '<a href="#" data-m2="fg">Esqueci a senha</a>'} · <a href="#" id="pp">Privacidade</a></p><p style="font-size:12px;color:var(--mu)">As contas são criadas pelo administrador.</p></div>`
}
function bindAuth() {
    document.querySelectorAll('[data-m2]').forEach(a => a.onclick = e => { e.preventDefault(); authMode = a.dataset.m2; authMsg = ''; render() });
    const pp = $('#pp'); if (pp) pp.onclick = e => { e.preventDefault(); policy() };
    const so = $('#so'); if (so) so.onclick = e => { e.preventDefault(); DB = null; sb.auth.signOut().then(() => { location.hash = ''; location.reload() }) };
    const ok = $('#ok'); if (ok) ok.onclick = async () => { ok.disabled = true; const r = await sb.rpc('accept_consent', { p_version: POLICY_V }); if (r.error) { authMsg = 'Não foi possível registrar. Tente de novo.'; render(); return } const u = me; me = null; enter(u) };
    const f = $('#af'); if (f) f.onsubmit = async e => {
        e.preventDefault(); const fd = new FormData(f), em = (fd.get('e') || '').trim(), pw = fd.get('p') || ''; authMsg = ''; f.querySelector('button').disabled = true;
        try {
            if (ready === 'recover' || ready === 'force') { const { data, error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; await sb.rpc('password_changed'); history.replaceState(null, '', location.pathname); me = null; ready = 'load'; enter(data.user); return }
            if (authMode === 'in') { const { error } = await sb.auth.signInWithPassword({ email: em, password: pw }); if (error) throw error; return }
            await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); authMsg = 'Se o e-mail estiver cadastrado, enviaremos o link de recuperação.'
        } catch (er) { authMsg = (authMode === 'in' && ready === 'auth') ? 'E-mail ou senha inválidos.' : 'Não foi possível concluir. Verifique os dados e tente de novo.' }
        render()
    };
}
function policy() { dlg.innerHTML = `<h2 style="margin-top:0">Política de Privacidade</h2><div style="max-height:55vh;overflow:auto;font-size:14px"><p><b>Modelo: revise com um profissional jurídico antes de publicar.</b></p><p><b>Controlador:</b> [NOME / CPF ou CNPJ] · <b>Encarregado (DPO):</b> [E-MAIL DE CONTATO]</p><p><b>Dados tratados:</b> e-mail; senha (guardada só como hash pelo provedor de autenticação); nome e avatar opcionais; dados financeiros que você registra; e, nos cofrinhos compartilhados, seu nome de exibição e seus depósitos e retiradas.</p><p><b>Finalidade e base legal:</b> prestar o serviço de organização financeira (execução de contrato) e registrar seu consentimento (art. 7º, I, LGPD). Não vendemos dados nem os usamos para publicidade.</p><p><b>Compartilhamento:</b> com operadores de infraestrutura (banco de dados, autenticação e hospedagem) e, no cofrinho, com os membros que você aceitar. O administrador cria sua conta e pode redefinir sua senha, mas nunca a vê (ela é guardada criptografada), e vê apenas e-mail e datas de cadastro e de acesso, nunca seus dados financeiros.</p><p><b>Retenção:</b> até você excluir a conta. Ao excluir, seus dados são apagados e seus lançamentos em cofrinhos passam a aparecer como “Usuário removido”.</p><p><b>Seus direitos (art. 18):</b> confirmação, acesso, correção, anonimização ou eliminação, portabilidade, informação sobre compartilhamento e revogação do consentimento. Em Configurações você exporta e exclui seus dados; outros pedidos, fale com o encarregado.</p><p><b>Segurança:</b> conexão criptografada, isolamento por usuário no banco e acesso administrativo restrito.</p></div><p style="text-align:right"><button class="btn p" id="pcl">Fechar</button></p>`; $('#pcl').onclick = () => dlg.close(); dlg.showModal() }
function privSec() { return `<h2>Conta e privacidade</h2><div class="card"><div class="row"><span>${esc(me ? me.email : '')}</span><button class="btn" data-a="logout">Sair</button></div><div class="row"><span>Alterar minha senha</span><button class="btn" data-a="chpw">Alterar</button></div><div class="row"><span>Exportar meus dados<small>Cópia em JSON (LGPD, art. 18)</small></span><button class="btn" data-a="export">Exportar</button></div><div class="row"><span>Excluir minha conta<small>Apaga seus dados de forma definitiva</small></span><button class="btn" data-a="delacct">Excluir</button></div><div class="row"><span>Política de privacidade</span><button class="btn" data-a="policy">Ler</button></div></div>` }
async function exportMine() { const { data, error } = await sb.rpc('export_my_data'); if (error) return setSt('Erro ao exportar'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'reserva-meus-dados.json'; a.click() }
// cofrinhos compartilhados
const PG = { pigs: [], goals: [], mem: [], tx: [], loaded: false, busy: false, err: 0 };
const dn = () => ((S.prof && S.prof.name) || '').trim().slice(0, 30);
const reloadPigs = () => { PG.loaded = false; PG.err = 0; render() };
async function loadPigs() { PG.busy = true; try { const r = await Promise.all([sb.from('pigs').select('id,name,photo'), sb.from('pig_goals').select('id,pig_id,name,target_cents'), sb.from('pig_members').select('pig_id,user_id,display_name,role'), sb.from('pig_tx').select('id,pig_id,goal_id,user_id,kind,amount_cents,note,created_at').order('created_at', { ascending: false }).limit(1000)]); if (r.some(x => x.error)) throw 1;[PG.pigs, PG.goals, PG.mem, PG.tx] = r.map(x => x.data); PG.loaded = true } catch (e) { PG.err = 1 } PG.busy = false; render() }
const ROLE = { owner: 'Criador', manager: 'Gerenciar', viewer: 'Visualizar' };
const pigAv = (p, z) => p.photo ? `<span style="width:${z}px;height:${z}px;border-radius:50%;overflow:hidden;flex:none;display:inline-block"><img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover"></span>` : `<span style="width:${z}px;height:${z}px;border-radius:50%;flex:none;display:inline-grid;place-items:center;background:var(--gr2);color:var(--gr);font-weight:700;font-size:${Math.round(z * .45)}px" aria-hidden="true">${esc((p.name || '?').charAt(0).toUpperCase())}</span>`;
function pigV() {
    const head = '<div class="top"><h1>Cofrinhos</h1><button class="btn p" data-a="newpig">Novo cofrinho</button></div>';
    if (!PG.loaded && !PG.busy && !PG.err) loadPigs();
    if (PG.err) return head + '<div class="empty">Não foi possível carregar. Recarregue a página.</div>';
    if (!PG.loaded) return head + '<div class="empty">Carregando…</div>';
    if (!PG.pigs.length) return head + '<div class="empty">Crie um cofrinho e convide pessoas por link para guardarem juntas.</div>';
    return head + PG.pigs.map(p => {
        const tx = PG.tx.filter(t => t.pig_id === p.id), bal = g => sum(tx.filter(t => g === undefined || t.goal_id === g).map(t => t.kind === 'deposit' ? t.amount_cents : -t.amount_cents)), mem = PG.mem.filter(m => m.pig_id === p.id), my = (mem.find(m => m.user_id === me.id) || {}).role, mg = my === 'owner' || my === 'manager', nm = u => { const m = mem.find(x => x.user_id === u); return m ? m.display_name : 'Usuário removido' }, gs = PG.goals.filter(g => g.pig_id === p.id);
        const row = t => `<div class="row"><span>${esc(nm(t.user_id))}<small>${new Date(t.created_at).toLocaleDateString('pt-BR')} · ${t.kind === 'deposit' ? 'Depósito' : 'Retirada'}${t.goal_id ? ' · ' + esc((gs.find(g => g.id === t.goal_id) || { name: '' }).name) : ''}${t.note ? ' · ' + esc(t.note) : ''}</small></span><b class="${t.kind === 'deposit' ? 'pos' : 'neg'}">${t.kind === 'deposit' ? '+' : '−'}${brl(t.amount_cents)}</b></div>`;
        const months = {}; tx.forEach(t => { const d = new Date(t.created_at), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); (months[k] = months[k] || []).push(t) });
        const keys = Object.keys(months).sort().reverse();
        const hist = keys.map((k, i) => { const l = months[k], dep = sum(l.filter(t => t.kind === 'deposit').map(t => t.amount_cents)), wd = sum(l.filter(t => t.kind === 'withdraw').map(t => t.amount_cents)); return `<details ${i === 0 ? 'open' : ''} style="margin-top:8px"><summary style="text-transform:capitalize"><b>${mLabel(k)}</b> <small>· +${brl(dep)} · −${brl(wd)} · saldo do mês ${brl(dep - wd)}</small></summary>${l.map(row).join('')}</details>` }).join('');
        const loose = bal(null);
        return `<div class="card" style="margin-bottom:16px"><div style="display:flex;gap:12px;align-items:center">${pigAv(p, 48)}<div style="flex:1"><b style="font-size:18px">${esc(p.name)}</b> <span class="tag">${ROLE[my] || ''}</span><small style="display:block;color:var(--mu)">${mem.map(m => esc(m.display_name)).join(', ')}</small></div><b class="pos">${brl(bal())}</b></div>${gs.map(g => { const a = Math.max(0, bal(g.id)), pc = Math.min(100, Math.round(a / g.target_cents * 100)); return `<div style="margin-top:10px"><div class="row" style="border:0;padding:0"><span>${esc(g.name)}${mg ? ` <button class="x" data-a="editpgoal" data-id="${g.id}" aria-label="Editar objetivo">✎</button><button class="x" data-a="delpgoal" data-id="${g.id}" aria-label="Excluir objetivo">✕</button>` : ''}</span><span>${brl(a)} de ${brl(g.target_cents)} (${pc}%)</span></div><div class="bar"><i style="width:${pc}%"></i></div></div>` }).join('')}${loose && gs.length ? `<div class="row" style="border:0;padding:6px 0 0"><span>Sem objetivo</span><span>${brl(loose)}</span></div>` : ''}<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn p" data-a="pigtx" data-id="${p.id}">Depositar / retirar</button><button class="btn" data-a="members" data-id="${p.id}">Membros</button>${mg ? `<button class="btn" data-a="invite" data-id="${p.id}">Convidar por link</button><button class="btn" data-a="editpig" data-id="${p.id}">Editar cofrinho</button><button class="btn" data-a="newpgoal" data-id="${p.id}">Novo objetivo</button>` : ''}<button class="btn" data-a="leavepig" data-id="${p.id}">Sair</button></div><div><b>Histórico por mês</b>${hist || '<br><small>Sem movimentos.</small>'}</div></div>`
    }).join('');
}
function shrink(f, cb) { const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const z = 128, cv = document.createElement('canvas'); cv.width = cv.height = z; const s = Math.min(im.width, im.height); cv.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, z, z); cb(cv.toDataURL('image/jpeg', .8)) }; im.src = r.result }; r.readAsDataURL(f) }
function pigEditForm(pid) {
    const p = PG.pigs.find(x => x.id === pid); let pend = p.photo || '';
    open(`<h2 style="margin-top:0">Editar cofrinho</h2><div>${pigAv(p, 56)}</div><label>Nome<input name="n" maxlength="60" value="${esc(p.name)}" required></label><label>Foto (opcional)<input type="file" id="pf2" accept="image/*"></label><p><button type="button" class="btn" id="pr2">Remover foto</button></p>`, fm => { const n = fm.get('n').trim(); if (!n) return 'Informe o nome.'; sb.rpc('update_pig', { p_pig: pid, p_name: n, p_photo: pend }).then(r => { if (r.error) setSt('Erro ao salvar'); reloadPigs() }) });
    $('#pf2').onchange = e => { const f = e.target.files[0]; if (f) shrink(f, d => { pend = d; $('#er').textContent = 'Foto carregada. Toque em Salvar.' }) };
    $('#pr2').onclick = () => { pend = ''; $('#er').textContent = 'Foto removida. Toque em Salvar.' }
}
function pgoalEdit(gid) { const g = PG.goals.find(x => x.id === gid); open(`<h2 style="margin-top:0">Editar objetivo</h2><label>Nome<input name="n" maxlength="60" value="${esc(g.name)}" required></label><label>Valor desejado (R$)<input name="t" inputmode="decimal" value="${(g.target_cents / 100).toString().replace('.', ',')}" required></label>`, fm => { const t = money(fm.get('t')), n = fm.get('n').trim(); if (!n || !(t > 0)) return 'Informe nome e um valor maior que zero.'; sb.from('pig_goals').update({ name: n, target_cents: t }).eq('id', gid).then(r => { if (r.error) setSt('Erro ao salvar'); reloadPigs() }) }) }
function membersDlg(pid) {
    const mem = PG.mem.filter(m => m.pig_id === pid), my = (mem.find(m => m.user_id === me.id) || {}).role;
    dlg.innerHTML = `<h2 style="margin-top:0">Membros</h2><p style="color:var(--mu);font-size:13px"><b>Visualizar:</b> deposita e retira, sem editar o cofrinho. <b>Gerenciar:</b> também edita o cofrinho, convida e remove membros do tipo visualizar. Só o criador altera permissões.</p>${mem.map(m => { const you = m.user_id === me.id, canRole = my === 'owner' && !you && m.role !== 'owner', canRm = !you && m.role !== 'owner' && (my === 'owner' || (my === 'manager' && m.role === 'viewer')); return `<div class="row"><span>${esc(m.display_name)}${you ? ' (você)' : ''}<small>${ROLE[m.role]}</small></span><span style="display:flex;gap:6px;align-items:center">${canRole ? `<select data-role="${m.user_id}" style="width:auto"><option value="viewer" ${m.role === 'viewer' ? 'selected' : ''}>Visualizar</option><option value="manager" ${m.role === 'manager' ? 'selected' : ''}>Gerenciar</option></select>` : ''}${canRm ? `<button class="x" data-rm="${m.user_id}" aria-label="Remover membro">✕</button>` : ''}</span></div>` }).join('')}<p style="text-align:right"><button class="btn p" id="mcl">Fechar</button></p>`;
    $('#mcl').onclick = () => dlg.close();
    dlg.querySelectorAll('[data-role]').forEach(x => x.onchange = async () => { const r = await sb.rpc('set_member_role', { p_pig: pid, p_user: x.dataset.role, p_role: x.value }); if (r.error) setSt('Erro ao alterar a permissão'); await loadPigs(); membersDlg(pid) });
    dlg.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { const r = await sb.rpc('remove_member', { p_pig: pid, p_user: b.dataset.rm }); if (r.error) setSt('Erro ao remover'); await loadPigs(); membersDlg(pid) });
    if (!dlg.open) dlg.showModal()
}
function chpwForm() { open(`<h2 style="margin-top:0">Alterar senha</h2><label>Nova senha (mín. 10 caracteres)<input type="password" name="p" minlength="10" autocomplete="new-password" required></label>`, fm => { const p = fm.get('p') || ''; if (p.length < 10) return 'Mínimo de 10 caracteres.'; sb.auth.updateUser({ password: p }).then(r => setSt(r.error ? 'Erro ao alterar a senha' : 'Senha alterada')) }) }
function pigForm() { open(`<h2 style="margin-top:0">Novo cofrinho</h2><label>Nome<input name="n" maxlength="60" required></label>`, fm => { const n = fm.get('n').trim(); if (!n) return 'Informe o nome.'; sb.rpc('create_pig', { p_name: n, p_display: dn() }).then(r => { if (r.error) setSt('Erro ao criar cofrinho'); reloadPigs() }) }) }
function pgoalForm(pid) { open(`<h2 style="margin-top:0">Novo objetivo do cofrinho</h2><label>Nome<input name="n" maxlength="60" required></label><label>Valor desejado (R$)<input name="t" inputmode="decimal" required></label>`, fm => { const t = money(fm.get('t')), n = fm.get('n').trim(); if (!n || !(t > 0)) return 'Informe nome e um valor maior que zero.'; sb.from('pig_goals').insert({ pig_id: pid, name: n, target_cents: t }).then(r => { if (r.error) setSt('Erro ao criar objetivo'); reloadPigs() }) }) }
function pigTxForm(pid) { const gs = PG.goals.filter(g => g.pig_id === pid); open(`<h2 style="margin-top:0">Depositar ou retirar</h2><label>Tipo<select name="k"><option value="deposit">Depósito</option><option value="withdraw">Retirada</option></select></label><label>Valor (R$)<input name="a" inputmode="decimal" required></label><label>Objetivo<select name="g"><option value="">Sem objetivo</option>${gs.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label><label>Observação (opcional)<input name="o" maxlength="140"></label>`, fm => { const a = money(fm.get('a')); if (!(a > 0)) return 'Informe um valor maior que zero.'; sb.from('pig_tx').insert({ pig_id: pid, goal_id: fm.get('g') || null, user_id: me.id, kind: fm.get('k'), amount_cents: a, note: (fm.get('o') || '').trim() || null }).then(r => { if (r.error) setSt(/saldo/.test(r.error.message) ? 'Saldo insuficiente para a retirada' : 'Erro ao registrar'); reloadPigs() }) }) }
async function inviteLink(pid) { const r = await sb.rpc('create_invite', { p_pig: pid }); if (r.error) return setSt('Erro ao criar convite'); const l = location.origin + location.pathname + '#convite=' + r.data; dlg.innerHTML = `<h2 style="margin-top:0">Convite</h2><p style="color:var(--mu)">Envie este link. Vale por 7 dias e para até 10 pessoas. Quem abrir precisa criar conta ou entrar.</p><input id="il" readonly value="${esc(l)}"><p style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" id="icp">Copiar</button><button class="btn p" id="icl">Fechar</button></p>`; $('#il').onfocus = e => e.target.select(); $('#icp').onclick = () => { try { navigator.clipboard.writeText(l) } catch (e) { } $('#il').select() }; $('#icl').onclick = () => dlg.close(); dlg.showModal() }
async function acceptInvite(t) { const r = await sb.rpc('accept_invite', { p_token: t, p_display: dn() }); history.replaceState(null, '', location.pathname); tab = 'pig'; PG.loaded = false; setSt(r.error ? 'Convite inválido ou expirado' : 'Você entrou no cofrinho') }
// administração
const AD = { rows: null, err: 0, busy: 0 };
async function admCall(body) { const r = await sb.functions.invoke('admin-users', { body }); if (r.error || (r.data && r.data.error)) { setSt('Não foi possível concluir a ação'); return false } setSt('Feito'); return true }
function admNewForm() { open(`<h2 style="margin-top:0">Novo usuário</h2><label>E-mail<input type="email" name="e" required></label><label>Senha temporária (mín. 10 caracteres)<input type="password" name="p" minlength="10" autocomplete="new-password" required></label><small style="color:var(--mu)">A pessoa será obrigada a trocar a senha no primeiro acesso. Depois disso, nem você sabe a senha dela.</small>`, fm => { const e = (fm.get('e') || '').trim(), p = fm.get('p') || ''; if (!e) return 'Informe o e-mail.'; if (p.length < 10) return 'A senha precisa de ao menos 10 caracteres.'; admCall({ action: 'create', email: e, password: p }).then(() => { AD.rows = null; render() }) }) }
function admPwForm(id, em) { open(`<h2 style="margin-top:0">Definir senha</h2><p style="color:var(--mu)">${esc(em)}</p><label>Nova senha temporária (mín. 10 caracteres)<input type="password" name="p" minlength="10" autocomplete="new-password" required></label><small style="color:var(--mu)">A pessoa precisará trocá-la no próximo acesso.</small>`, fm => { const p = fm.get('p') || ''; if (p.length < 10) return 'A senha precisa de ao menos 10 caracteres.'; admCall({ action: 'set_password', user_id: id, password: p }) }) }
function admV() {
    if (!isAdm) return '<div class="empty">Acesso restrito.</div>';
    if (!AD.rows && !AD.err && !AD.busy) { AD.busy = 1; sb.rpc('admin_list_users').then(r => { AD.busy = 0; if (r.error) AD.err = 1; else AD.rows = r.data; render() }) }
    const h = '<div class="top"><h1>Administração</h1><span><button class="btn" data-a="admref">Atualizar</button> <button class="btn p" data-a="admnew">Novo usuário</button></span></div><div class="msg">Você cria contas e pode redefinir senhas, mas nunca vê a senha de ninguém. Os dados financeiros dos usuários não são acessíveis.</div>';
    if (AD.err) return h + '<div class="empty">Não foi possível carregar.</div>';
    if (!AD.rows) return h + '<div class="empty">Carregando…</div>';
    const f = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
    return h + `<div class="card"><b>${AD.rows.length} usuários</b>${AD.rows.map(u => `<div class="row"><span>${esc(u.email)}<small>criado em ${f(u.created_at)} · último acesso ${f(u.last_sign_in_at)} · LGPD ${u.consent_at ? 'aceita' : 'pendente'}</small></span><span style="display:flex;gap:6px;align-items:center"><span class="tag">${esc(u.role)}</span><button class="btn" data-a="admpw" data-id="${u.id}">Definir senha</button></span></div>`).join('')}</div>`
}
// sessão
if (/type=recovery/.test(location.hash)) ready = 'recover';
async function enter(user) {
    me = user; let pr = null;
    try { const p = await sb.from('profiles').select('role,consent_at,must_change_password').eq('id', me.id).single(); if (p.error) throw p.error; pr = p.data } catch (e) { ready = 'err'; render(); return }
    isAdm = pr.role === 'admin';
    if (pr.must_change_password) { ready = 'force'; render(); return }
    if (!pr.consent_at) { ready = 'consent'; render(); return }
    try { const a = await sb.from('app_state').select('data').eq('user_id', me.id).maybeSingle(); if (a.error) throw a.error; if (a.data && a.data.data) S = Object.assign(S, a.data.data) } catch (e) { ready = 'err'; render(); return }
    DB = true; ready = 'ok'; migrate(); applyCats(); if (S.theme) document.documentElement.dataset.theme = S.theme;
    if (location.hash.startsWith('#convite=')) await acceptInvite(location.hash.slice(9));
    render()
}
$('#fab').onclick = () => txForm();
render();
render();
if (!sb) { ready = 'nocfg'; render() } else sb.auth.onAuthStateChange((ev, ses) => {
    if (ev === 'PASSWORD_RECOVERY') { ready = 'recover'; render() }
    else if (ev === 'SIGNED_OUT') { }
    else if (ses && !me && ready !== 'recover') { setTimeout(() => enter(ses.user), 0) }
    else if (!ses && ev === 'INITIAL_SESSION' && ready !== 'recover') { ready = 'auth'; render() }
});
