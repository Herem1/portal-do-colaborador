/* =====================================================
   Portal do Colaborador — app (Supabase)
   Colaborador: só consulta (folha de ponto, holerites, avisos, dados).
   RH: cadastra colaboradores e preenche tudo.
   ===================================================== */
const CFG = window.PORTAL_CONFIG || {};

/* ---------- utilitários ---------- */
const $ = id => document.getElementById(id);
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => (+v || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
const BRL = v => (+v || 0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const soDig = t => String(t || '').replace(/\D/g, '');
const fmtCPF = v => { v = soDig(v).slice(0, 11); return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4'); };
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ROT = ['Entrada','Saída almoço','Retorno almoço','Saída'];
const OCORRENCIAS = ['', 'Feriado', 'Sem expediente', 'Folga', 'Atestado', 'Abonado', 'Férias', 'Falta'];
// Atestado e Abonado: as horas que faltaram (dia inteiro ou parte) são abonadas e não contam como atraso/falta
const ABONA_HORAS = ['Atestado', 'Abonado'];
const ini = n => String(n || '?').trim().split(/\s+/).filter(Boolean).map((p, i, a) => i === 0 || i === a.length - 1 ? p[0] : '').join('').toUpperCase().slice(0, 2);
const primeiro = n => String(n || '').trim().split(/\s+/)[0];
const toMin = t => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hm = m => (m < 0 ? '-' : '') + Math.floor(Math.abs(m) / 60) + ':' + String(Math.abs(m) % 60).padStart(2, '0');
const hmOu = m => m ? hm(m) : '-';
const isoBR = iso => iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—';
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const refLabel = ref => { const [y, m] = ref.split('-'); return cap(MESES[+m - 1]) + ' ' + y; };
const refCurta = ref => { const [y, m] = ref.split('-'); return MESES[+m - 1] + '/' + y; };
const sv = (p, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  receipt:'<path d="M5 3h14v18l-7-4-7 4z"/><path d="M9 8h6M9 12h6"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c0-2.8-1.7-4.6-4-5.2"/>',
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  chev:'<path d="M9 6l6 6-6 6"/>', plus:'<path d="M12 5v14M5 12h14"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>',
  print:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
  swipe:'<path d="M4 12h16M15 7l5 5-5 5"/>'
};

/* Data e hora de Brasília */
function agoraBR() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date()).map(x => [x.type, x.value]));
  return {iso:`${p.year}-${p.month}-${p.day}`, hm:`${p.hour}:${p.minute}`};
}
const dataObj = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const isoDe = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const diasNoMes = ref => { const [y, m] = ref.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const fimDoMes = ref => `${ref}-${String(diasNoMes(ref)).padStart(2, '0')}`;
const mesAnterior = () => { const [y, m] = agoraBR().iso.split('-').map(Number); const d = new Date(y, m - 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const somaMes = (ref, n) => { const [y, m] = ref.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

/* Feriados nacionais (fixos + Sexta-feira Santa) */
function feriadosDoAno(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  const sexta = new Date(y, mes - 1, dia - 2);
  const f2 = {'01-01':'Confraternização Universal','04-21':'Tiradentes','05-01':'Dia do Trabalho','09-07':'Independência','10-12':'N. Sra. Aparecida','11-02':'Finados','11-15':'Proclamação da República','11-20':'Consciência Negra','12-25':'Natal'};
  const out = {}; Object.keys(f2).forEach(k => out[`${y}-${k}`] = f2[k]);
  out[isoDe(sexta)] = 'Sexta-feira Santa';
  return out;
}

function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(window._t); window._t = setTimeout(() => t.classList.remove('on'), 3200); }
const erroMsg = e => {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Invalid login credentials/i.test(m)) return 'Login ou senha incorretos.';
  if (/already registered/i.test(m)) return 'Esta conta já existe. Use “Entrar”.';
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.';
  if (/duplicate key.*cpf/i.test(m)) return 'Já existe um colaborador com este CPF.';
  if (/duplicate key.*colaborador_id_ref/i.test(m)) return 'Esse colaborador já tem holerite neste mês. Abra o existente para editar.';
  return m;
};
const emailDoCPF = cpf => `${soDig(cpf)}@${CFG.DOMINIO_LOGIN || 'colaborador.portal-rh.app'}`;
function imprimir() { try { window.print(); } catch (e) { toast('Não foi possível imprimir neste navegador.'); } }

/* ---------- Supabase ---------- */
const configurado = CFG.SUPABASE_URL && /^https:\/\//.test(CFG.SUPABASE_URL) && CFG.SUPABASE_ANON_KEY && !/COLE_AQUI/.test(CFG.SUPABASE_ANON_KEY);
const sb = configurado ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {auth:{persistSession:true, autoRefreshToken:true}}) : null;
const COLS = 'id,user_id,nome,cpf,codigo,cargo,cbo,departamento,filial,centro_custo,lotacao,tipo_salario,admissao,email,tel,salario,dependentes,banco,jornada,obra,horario,ponto_auto,situacao,demissao';
async function q(promise) { const {data, error} = await promise; if (error) throw error; return data; }

/* ---------- estado ---------- */
let sess = null;          // {tipo:'colab', colab} | {tipo:'rh', email}
let empresa = {nome: CFG.NOME_EMPRESA || 'Portal do Colaborador', logo: CFG.LOGO || null};
const comLogoPadrao = e => ({...e, logo: e.logo || CFG.LOGO || null});
let filtroSit = 'Ativo', filtroObra = '', view = 'inicio', busca = '', cacheEquipe = [], renderTok = 0, mesPonto = null, holTodos = false;
// Mês de trabalho do RH: vale para Equipe, Holerites, cálculo e resumo (fica salvo no aparelho)
let mesRH = null;
// Mês em que o portal começou a ser usado: antes dele não há ponto automático nem navegação
const INICIO_PORTAL = (window.PORTAL_CONFIG && /^\d{4}-\d{2}$/.test(window.PORTAL_CONFIG.INICIO || '')) ? window.PORTAL_CONFIG.INICIO : '2000-01';
function mesTrab() {
  const atual = agoraBR().iso.slice(0, 7);
  if (!mesRH) { try { mesRH = localStorage.getItem('portal-rh-mes'); } catch (e) {} }
  if (!/^\d{4}-\d{2}$/.test(mesRH || '') || mesRH > atual) mesRH = atual;
  if (mesRH < INICIO_PORTAL) mesRH = INICIO_PORTAL;
  return mesRH;
}
function trocarMesRH(v) { if (!/^\d{4}-\d{2}$/.test(v || '')) return; if (v < INICIO_PORTAL) v = INICIO_PORTAL; mesRH = v; try { localStorage.setItem('portal-rh-mes', v); } catch (e) {} render(); }
function barraMesRH() {
  const ref = mesTrab(), atual = agoraBR().iso.slice(0, 7);
  return `<div class="mes-rh"><span class="mes-rh-l">Mês de trabalho</span>
    <div class="mes-rh-c"><button class="btn btn-ghost btn-sm" aria-label="Mês anterior" onclick="trocarMesRH('${somaMes(ref, -1)}')" ${ref <= INICIO_PORTAL ? 'disabled' : ''}>‹</button>
    <label class="mes-rh-v">${refLabel(ref)}<input type="month" aria-label="Escolher mês de trabalho" value="${ref}" min="${INICIO_PORTAL}" max="${atual}" onchange="trocarMesRH(this.value)"></label>
    <button class="btn btn-ghost btn-sm" aria-label="Próximo mês" onclick="trocarMesRH('${somaMes(ref, 1)}')" ${ref >= atual ? 'disabled' : ''}>›</button></div></div>`;
}

/* =====================================================
   LOGIN
   ===================================================== */
let telaLogin = 'colab';
async function mostrarLogin(tela, msg) {
  telaLogin = tela || 'colab';
  $('boot').classList.add('hide'); $('app').classList.add('hide'); $('login').classList.remove('hide');
  const abas = `<div class="tabs" role="tablist">
      <button type="button" class="${telaLogin === 'colab' || telaLogin === 'primeiro' ? 'on' : ''}" onclick="mostrarLogin('colab')">Colaborador</button>
      <button type="button" class="${telaLogin === 'rh' || telaLogin === 'rhNovo' ? 'on' : ''}" onclick="mostrarLogin('rh')">RH</button></div>`;
  const err = `<div class="err ${msg ? '' : 'hide'}" id="lErr">${esc(msg || '')}</div>`;
  let corpo = '';
  if (telaLogin === 'colab') corpo = `
    <form id="fLogin" novalidate>
      <div class="field"><label for="lCpf">CPF</label><input id="lCpf" inputmode="numeric" autocomplete="username" placeholder="000.000.000-00" oninput="this.value=fmtCPF(this.value)"></div>
      <div class="field"><label for="lPwd">Senha</label><input id="lPwd" type="password" autocomplete="current-password"></div>
      ${err}<button class="btn btn-primary" type="submit">Entrar</button>
    </form>
    <div style="text-align:center;margin-top:12px"><button class="linkbtn" onclick="mostrarLogin('primeiro')">Primeiro acesso ou esqueci a senha</button></div>`;
  else if (telaLogin === 'primeiro') corpo = `
    <p class="muted" style="margin-bottom:14px">Use o <b>código de acesso</b> que o RH te passou para criar sua senha.</p>
    <form id="fLogin" novalidate>
      <div class="field"><label for="lCpf">CPF</label><input id="lCpf" inputmode="numeric" autocomplete="username" placeholder="000.000.000-00" oninput="this.value=fmtCPF(this.value)"></div>
      <div class="field"><label for="lCod">Código de acesso</label><input id="lCod" autocomplete="one-time-code" autocapitalize="characters" maxlength="6" placeholder="Ex.: 3F9A2C" style="text-transform:uppercase;letter-spacing:2px"></div>
      <div class="field"><label for="lPwd">Crie sua senha (mínimo 6 caracteres)</label><input id="lPwd" type="password" autocomplete="new-password"></div>
      <div class="field"><label for="lPwd2">Repita a senha</label><input id="lPwd2" type="password" autocomplete="new-password"></div>
      ${err}<button class="btn btn-primary" type="submit">Criar senha e entrar</button>
    </form>
    <div style="text-align:center;margin-top:12px"><button class="linkbtn" onclick="mostrarLogin('colab')">Voltar</button></div>
    <p class="muted" style="margin-top:8px;font-size:12.5px">Esqueceu a senha? Peça ao RH um novo código de acesso.</p>`;
  else if (telaLogin === 'rh') corpo = `
    <form id="fLogin" novalidate>
      <div class="field"><label for="lEmail">E-mail do RH</label><input id="lEmail" type="email" autocomplete="username" placeholder="rh@suaempresa.com.br"></div>
      <div class="field"><label for="lPwd">Senha</label><input id="lPwd" type="password" autocomplete="current-password"></div>
      ${err}<button class="btn btn-primary" type="submit">Entrar</button>
    </form>
    <div id="rhPrimeiro" style="text-align:center;margin-top:12px"></div>`;
  else if (telaLogin === 'rhNovo') corpo = `
    <p class="muted" style="margin-bottom:14px">Crie a conta de administrador do RH. Isso só pode ser feito uma vez: depois, ninguém mais consegue criar outra por aqui.</p>
    <form id="fLogin" novalidate>
      <div class="field"><label for="lEmail">E-mail do RH</label><input id="lEmail" type="email" autocomplete="username"></div>
      <div class="field"><label for="lPwd">Senha (mínimo 6 caracteres)</label><input id="lPwd" type="password" autocomplete="new-password"></div>
      <div class="field"><label for="lPwd2">Repita a senha</label><input id="lPwd2" type="password" autocomplete="new-password"></div>
      ${err}<button class="btn btn-primary" type="submit">Criar conta do RH</button>
    </form>
    <div style="text-align:center;margin-top:12px"><button class="linkbtn" onclick="mostrarLogin('rh')">Voltar</button></div>`;
  $('loginCard').innerHTML = abas + corpo + (CFG.DICA_LOGIN ? `<div class="demo" style="margin:16px 0 0">${CFG.DICA_LOGIN}</div>` : '');
  $('fLogin').addEventListener('submit', enviarLogin);
  if (telaLogin === 'rh') {
    try { if (!(await q(sb.rpc('tem_admin')))) $('rhPrimeiro').innerHTML = `<button class="linkbtn" onclick="mostrarLogin('rhNovo')">Primeira vez? Criar conta do RH</button>`; } catch (e) {}
  }
}
function erroLogin(m) { const e = $('lErr'); e.textContent = m; e.classList.remove('hide'); }
async function enviarLogin(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('button[type=submit]'), txt = btn.textContent;
  const v = id => ($(id) ? $(id).value.trim() : '');
  btn.disabled = true; btn.textContent = 'Aguarde…';
  try {
    if (telaLogin === 'colab') {
      const cpf = soDig(v('lCpf'));
      if (cpf.length !== 11 || !v('lPwd')) throw new Error('Informe o CPF completo e a senha.');
      await q(sb.auth.signInWithPassword({email: emailDoCPF(cpf), password: $('lPwd').value}));
    } else if (telaLogin === 'primeiro') {
      const cpf = soDig(v('lCpf')), cod = v('lCod').toUpperCase(), p = $('lPwd').value;
      if (cpf.length !== 11) throw new Error('Informe o CPF completo.');
      if (!cod) throw new Error('Informe o código de acesso que o RH te passou.');
      if (p.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      if (p !== $('lPwd2').value) throw new Error('As duas senhas não são iguais.');
      const r = await q(sb.rpc('checar_codigo', {p_cpf: cpf, p_codigo: cod}));
      if (r === 'bloqueado') throw new Error('Muitas tentativas erradas. Peça um novo código ao RH.');
      if (r !== 'ok') throw new Error('CPF ou código de acesso incorretos.');
      const {data, error} = await sb.auth.signUp({email: emailDoCPF(cpf), password: p});
      if (error) throw error;
      if (!data.session) throw new Error('Conta criada, mas o login automático está desligado no Supabase. Desative “Confirm email” (veja o LEIAME).');
      const ok = await q(sb.rpc('vincular_conta', {p_cpf: cpf, p_codigo: cod}));
      if (!ok) { await sb.auth.signOut(); throw new Error('Não foi possível ligar sua conta ao cadastro. Fale com o RH.'); }
    } else if (telaLogin === 'rh') {
      if (!v('lEmail') || !v('lPwd')) throw new Error('Informe e-mail e senha.');
      await q(sb.auth.signInWithPassword({email: v('lEmail'), password: $('lPwd').value}));
    } else if (telaLogin === 'rhNovo') {
      const p = $('lPwd').value;
      if (!/^\S+@\S+\.\S+$/.test(v('lEmail'))) throw new Error('Informe um e-mail válido.');
      if (p.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      if (p !== $('lPwd2').value) throw new Error('As duas senhas não são iguais.');
      if (await q(sb.rpc('tem_admin'))) throw new Error('Já existe uma conta de RH. Use “Entrar”.');
      const {data, error} = await sb.auth.signUp({email: v('lEmail'), password: p});
      if (error) throw error;
      if (!data.session) throw new Error('Conta criada, mas o login automático está desligado no Supabase. Desative “Confirm email” (veja o LEIAME).');
      if (!(await q(sb.rpc('criar_primeiro_admin')))) { await sb.auth.signOut(); throw new Error('Já existe uma conta de RH.'); }
    }
    await iniciarSessao();
  } catch (e) {
    btn.disabled = false; btn.textContent = txt; erroLogin(erroMsg(e));
  }
}

async function iniciarSessao() {
  const {data: {session}} = await sb.auth.getSession();
  if (!session) return mostrarLogin('colab');
  try {
    empresa = comLogoPadrao((await q(sb.from('empresa').select('*').maybeSingle())) || empresa);
    if (await q(sb.rpc('is_admin'))) {
      sess = {tipo:'rh', email: session.user.email}; view = 'equipe';
    } else {
      const c = await q(sb.from('colaboradores').select(COLS).eq('user_id', session.user.id).maybeSingle());
      if (!c) { await sb.auth.signOut(); return mostrarLogin('colab', 'Sua conta não está ligada a nenhum cadastro. Fale com o RH.'); }
      sess = {tipo:'colab', colab: c}; view = 'inicio';
    }
  } catch (e) { return mostrarLogin('colab', erroMsg(e)); }
  mesPonto = null;
  $('boot').classList.add('hide'); $('login').classList.add('hide'); $('app').classList.remove('hide');
  render();
}
async function sair() { fecharSheet(); sess = null; await sb.auth.signOut(); mostrarLogin(telaLogin === 'rh' ? 'rh' : 'colab'); }

/* =====================================================
   NAVEGAÇÃO
   ===================================================== */
const TABS = {
  colab: [['inicio','Início','home'], ['ponto','Folha de ponto','clock'], ['holerites','Holerites','receipt'], ['perfil','Meus dados','user']],
  rh: [['equipe','Equipe','users'], ['rhHol','Holerites','receipt'], ['avisos','Avisos','bell'], ['mais','Empresa','more']]
};
function ir(v) { view = v; busca = ''; render(); window.scrollTo(0, 0); }
const saudacao = () => { const h = +agoraBR().hm.slice(0, 2); return h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,'; };
async function render() {
  if (!sess) return;
  const tabs = TABS[sess.tipo], tok = ++renderTok;
  $('tabbar').innerHTML = `<div class="tb-brand">${empresa.logo ? `<img src="${esc(empresa.logo)}" alt="" style="max-height:34px;max-width:72px;border-radius:5px">` : `<div class="logo">${esc(ini(empresa.nome))}</div>`}<span>${esc(empresa.nome)}</span></div>`
    + tabs.map(([id, nm, ic]) => `<button class="${view === id ? 'on' : ''}" ${view === id ? 'aria-current="page"' : ''} onclick="ir('${id}')">${sv(IC[ic])}${nm}</button>`).join('')
    + `<button class="tb-sair" onclick="sair()">${sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>')}Sair</button>`;
  const nomeTab = (tabs.find(t => t[0] === view) || [])[1];
  if (sess.tipo === 'colab') {
    const c = sess.colab;
    $('topSub').textContent = view === 'inicio' ? saudacao() : empresa.nome;
    $('topTit').textContent = view === 'inicio' ? primeiro(c.nome) : (view === 'perfil' ? c.nome : nomeTab);
    $('topRole').textContent = c.cargo || 'Colaborador';
  } else {
    $('topSub').textContent = 'Painel do RH · ' + empresa.nome; $('topTit').textContent = nomeTab; $('topRole').textContent = 'Administrador';
  }
  if ($('view').dataset.v !== view) $('view').innerHTML = '<div class="loading"><div class="spin"></div>Carregando…</div>';
  try {
    const html = await ({inicio:vInicio, ponto:vPonto, holerites:vHolerites, perfil:vPerfil, equipe:vEquipe, rhHol:vRhHol, avisos:vAvisos, mais:vMais})[view]();
    if (tok !== renderTok) return;
    $('view').innerHTML = html; $('view').dataset.v = view;
    if ($('padFolha')) iniciarPad('padFolha');
    if ($('contEq')) contarEquipe();
  } catch (e) {
    if (tok !== renderTok) return;
    if (/JWT|session/i.test(e.message || '')) return sair();
    $('view').innerHTML = `<div class="card"><div class="empty">Não foi possível carregar.<br>${esc(erroMsg(e))}<br><br><button class="btn btn-ghost btn-sm" onclick="render()">Tentar de novo</button></div></div>`;
  }
}

/* Painel deslizante */
function sheet(titulo, corpo, botoes) {
  $('sheetHost').innerHTML = `<div class="sheet-bg" onclick="if(event.target===this)fecharSheet()"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shT">
    <div class="sheet-h"><h3 id="shT">${titulo}</h3><button aria-label="Fechar" onclick="fecharSheet()">${sv(IC.x)}</button></div>
    <div class="sheet-b">${corpo}</div>
    ${botoes && botoes.length ? `<div class="sheet-f">${botoes.map(b => `<button class="btn btn-${b[1]}" onclick="${b[2]}">${b[0]}</button>`).join('')}</div>` : ''}
  </div></div>`;
  document.body.style.overflow = 'hidden';
}
function sheetCarregando(titulo) { sheet(titulo, '<div class="loading"><div class="spin"></div>Carregando…</div>'); }
function fecharSheet() { $('sheetHost').innerHTML = ''; document.body.style.overflow = ''; document.body.classList.remove('imprimindo-sheet'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharSheet(); });
async function comBotao(btn, fn) {
  const t = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
  try { await fn(); } finally { if (btn && btn.isConnected) { btn.disabled = false; btn.innerHTML = t; } }
}
const kv = (k, v) => `<div class="kv"><span>${k}</span><span>${esc(v || '—')}</span></div>`;
const avisoHTML = a => `<div class="aviso"><div class="t">${esc(a.titulo)}</div><div class="x">${esc(a.texto)}</div><div class="d">${isoBR(a.criado_em)}</div></div>`;

/* =====================================================
   FOLHA DE PONTO — cálculo (mesmas regras do modelo)
   • Horas extras / atrasos: diferença entre trabalhado e previsto,
     ignorando variações de até 10 min no dia (art. 58 §1º da CLT).
   • Extras 50%: seg a sex · 100%: sábado · 110%: domingo e feriado.
   ===================================================== */
const TOLERANCIA = 10;
// Converte as marcações em minutos corridos: se um horário é menor que o anterior, passou da meia-noite.
// Ex.: 22:00, 02:00, 03:00, 06:00 → 1320, 1560, 1620, 1800. Devolve null se o turno passar de 24 h.
function minutosCorridos(m) {
  m = (m || []).filter(Boolean); const out = []; let dia = 0;
  for (let i = 0; i < m.length; i++) { let v = toMin(m[i]) + dia; if (i && v <= out[i - 1]) { dia += 1440; v += 1440; } out.push(v); }
  return out.length && out[out.length - 1] - out[0] >= 1440 ? null : out;
}
function trabalhado(m) {
  const a = minutosCorridos(m) || [];
  let t = 0;
  if (a.length >= 2) t += a[1] - a[0];
  if (a.length >= 4) t += a[3] - a[2];
  return Math.max(t, 0);
}
// Minutos trabalhados entre 22h e 5h (horário noturno, art. 73 da CLT)
function noturno(m) {
  const a = minutosCorridos(m) || [], jan = [[-120, 300], [1320, 1740], [2760, 3180]];
  let t = 0;
  for (const [i, f] of [[0, 1], [2, 3]]) if (a[f] != null) for (const [j0, j1] of jan) t += Math.max(0, Math.min(a[f], j1) - Math.max(a[i], j0));
  return t;
}
const HORA_NOTURNA = 52.5; // hora noturna reduzida: 52 min 30 s
/* ---- Horário padrão e ponto automático ----
   Cada dia de trabalho que passou e não tem lançamento do RH conta como trabalhado no horário padrão.
   O RH só lança o que foge disso: falta (ocorrência "Falta"), atestado, horário diferente etc. */
const JOR_PADRAO = ['', '09:00', '09:00', '09:00', '09:00', '08:00', ''];
const minHora = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function horarioDia(colab, dw) {
  if (Array.isArray(colab.horario) && colab.horario.length === 7) return (colab.horario[dw] || []).filter(Boolean);
  const min = toMin((colab.jornada && colab.jornada.length === 7 ? colab.jornada : JOR_PADRAO)[dw]);
  if (!min) return [];
  return min <= 360 ? ['07:00', minHora(420 + min)] : ['07:00', '12:00', '13:00', minHora(780 + min - 300)];
}
const jornadaDoHorario = h => h.map(d => { const t = trabalhado(d); return t ? minHora(t) : ''; });
const pontoAuto = c => c.ponto_auto !== false;
const desligado = c => c.situacao === 'Desligado';
const noContrato = (c, iso) => (!c.admissao || iso >= String(c.admissao).slice(0, 10)) && (!c.demissao || iso <= String(c.demissao).slice(0, 10));
const mesNoContrato = (c, ref) => (!c.admissao || String(c.admissao).slice(0, 10) <= fimDoMes(ref)) && (!c.demissao || String(c.demissao).slice(0, 10) >= ref + '-01');
// O mês tem folha? (dias lançados ou ponto automático com o colaborador contratado no mês, até hoje)
const temFolha = (c, ref, regs) => (regs && regs.length > 0) || (pontoAuto(c) && ref >= INICIO_PORTAL && mesNoContrato(c, ref) && ref + '-01' <= agoraBR().iso);

function calcularFolha(colab, ref, registros) {
  const [y] = ref.split('-').map(Number), fer = feriadosDoAno(y), hoje = agoraBR().iso;
  const porDia = Object.fromEntries((registros || []).map(r => [String(r.dia).slice(0, 10), r]));
  const jor = colab.jornada && colab.jornada.length === 7 ? colab.jornada : ['', '09:00', '09:00', '09:00', '09:00', '08:00', ''];
  const dias = [], T = {trab:0, prev:0, extra:0, atraso:0, abono:0, e50:0, e100:0, e110:0, not:0, n20:0, n100:0, n110:0};
  for (let d = 1; d <= diasNoMes(ref); d++) {
    const iso = `${ref}-${String(d).padStart(2, '0')}`, dw = dataObj(iso).getDay(), r = porDia[iso] || {};
    const fora = !noContrato(colab, iso), lancado = !!porDia[iso];
    let m = (r.marcacoes || []).filter(Boolean), auto = false;
    if (!lancado && !fora && pontoAuto(colab) && iso <= hoje && iso >= INICIO_PORTAL + '-01' && !fer[iso] && toMin(jor[dw])) { m = horarioDia(colab, dw); auto = m.length > 0; }
    const oc = r.ocorrencia || '', feriado = fer[iso] || (oc === 'Feriado' ? 'Feriado' : '');
    const futuro = iso >= hoje && !m.length;
    const abona = feriado || ['Sem expediente', 'Folga', 'Férias'].includes(oc), abonaHoras = !abona && ABONA_HORAS.includes(oc);
    const prev = futuro || abona || fora ? 0 : toMin(jor[dw]);
    const trab = trabalhado(m), not = noturno(m);
    let extra = 0, atraso = 0, abono = 0;
    if (!futuro || (abonaHoras && iso <= hoje)) {
      const dif = trab - prev;
      if (prev === 0) extra = trab;
      else if (dif > TOLERANCIA) extra = dif;
      else if (-dif > TOLERANCIA) atraso = -dif;
    }
    if (abonaHoras && atraso) { abono = atraso; atraso = 0; }
    const faixa = feriado || dw === 0 ? 110 : dw === 6 ? 100 : 50;
    if (extra) T['e' + faixa] += extra;
    if (not) T['n' + (faixa === 50 ? 20 : faixa)] += not;
    T.trab += trab; T.not += not; T.prev += prev; T.extra += extra; T.atraso += atraso; T.abono += abono;
    dias.push({iso, d, dw, m, not, auto, fora, oc: oc || (fer[iso] ? '' : ''), feriado, obs: r.observacao || '', trab, prev, extra, atraso, abono, futuro,
      cinza: dw === 0 || dw === 6 || !!feriado});
  }
  return {dias, T};
}

function cabecalhoFolha(colab, ref) {
  return `<div class="fp-head">${empresa.logo ? `<img src="${esc(empresa.logo)}" alt="">` : `<div class="logo">${esc(ini(empresa.nome))}</div>`}<div class="ttl">FOLHA DE PONTO</div></div>
  <div class="fp-sub">Controle mensal de jornada</div>
  <div class="fp-info">
    <div><b>Empresa:</b><span>${esc(empresa.nome)}</span></div>
    <div><b>Colaborador:</b><span>${esc(colab.nome)}</span></div>
    <div><b>Cargo:</b><span>${esc(colab.cargo || '—')}</span></div>
    <div><b>CPF:</b><span>${fmtCPF(colab.cpf)}</span></div>
    <div><b>Mês de referência:</b><span>${refCurta(ref)}</span></div>
    <div><b>Jornada mensal prevista:</b><span id="jmp"></span></div>
    <div><b>Centro de custo:</b><span>${esc(colab.centro_custo || '—')}</span></div>
  </div>`;
}
let modoFolha = window.matchMedia && matchMedia('(min-width:900px)').matches ? 'tabela' : 'lista';
function trocarModoFolha(m) {
  modoFolha = m;
  document.querySelectorAll('.fp-modo button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  document.querySelectorAll('.fp-lista').forEach(e => e.classList.toggle('hide-tela', m !== 'lista'));
  document.querySelectorAll('.fp-tabela').forEach(e => e.classList.toggle('hide-tela', m !== 'tabela'));
}
function folhaHTML(colab, ref, registros, conf) {
  const {dias, T} = calcularFolha(colab, ref, registros);
  const saldo = T.extra - T.atraso;
  // ----- tabela (igual ao modelo em PDF; também usada na impressão) -----
  const linhas = dias.map(x => {
    const dt = `${String(x.d).padStart(2, '0')}/${ref.slice(5, 7)}/${ref.slice(0, 4)}`;
    const t = i => x.m[i] || '';
    const oc = x.oc || (x.feriado ? 'Feriado' : '');
    const obs = x.obs || (x.feriado && x.feriado !== 'Feriado' ? x.feriado : '');
    return `<tr class="${x.cinza ? 'cinza' : ''}"><td>${dt}</td><td>${DIAS[x.dw]}</td>
      <td class="hr">${t(0)}</td><td class="hr">${t(1)}</td><td class="hr">${t(2)}</td><td class="hr">${t(3)}</td>
      <td>${x.futuro ? '' : hmOu(x.trab)}</td><td>${x.futuro ? '' : hmOu(x.prev)}</td>
      <td class="ex">${x.futuro ? '' : hmOu(x.extra)}</td><td class="at">${x.abono ? `<span class="ab">abon. ${hm(x.abono)}</span>` : x.futuro ? '' : hmOu(x.atraso)}</td>${T.not ? `<td>${hmOu(x.not)}</td>` : ''}
      <td class="ob">${esc(oc)}</td><td class="ob">${esc(obs)}</td></tr>`;
  }).join('');
  const tabela = `<div class="fp-tabela ${modoFolha === 'tabela' ? '' : 'hide-tela'}">
    <div class="hint no-print">${sv(IC.swipe, 15)} Arraste a tabela para o lado para ver todas as colunas.</div>
    <div class="fp-scroll"><table class="fp">
      <thead><tr><th>Data</th><th>Dia</th><th>Entrada</th><th>Saída almoço</th><th>Retorno almoço</th><th>Saída</th><th>Horas trabalhadas</th><th>Jornada prevista</th><th>Horas extras</th><th>Atrasos / faltas</th>${T.not ? '<th>Noturno (22h–5h)</th>' : ''}<th>Ocorrência</th><th style="min-width:150px">Observações</th></tr></thead>
      <tbody>${linhas}
        <tr class="tot"><td colspan="6">TOTAIS DO MÊS</td><td>${hm(T.trab)}</td><td>${hm(T.prev)}</td><td>${hmOu(T.extra)}</td><td>${hmOu(T.atraso)}</td>${T.not ? `<td>${hm(T.not)}</td>` : ''}<td></td><td></td></tr>
      </tbody></table></div></div>`;
  // ----- lista (feita para a tela do celular) -----
  const lista = `<div class="fp-lista ${modoFolha === 'lista' ? '' : 'hide-tela'}">${dias.map(x => {
    const oc = x.oc || (x.feriado ? (x.feriado === 'Feriado' ? 'Feriado' : 'Feriado · ' + x.feriado) : '');
    const fds = x.dw === 0 || x.dw === 6;
    let meio;
    if (x.m.length) meio = `<div class="dl-h"><span>${x.m[0] || ''}</span><i>→</i><span>${x.m[1] || '…'}</span>${x.m.length > 2 ? `<em></em><span>${x.m[2]}</span><i>→</i><span>${x.m[3] || '…'}</span>` : ''}</div>`;
    else if (x.futuro) meio = `<div class="dl-vazio">—</div>`;
    else meio = `<div class="dl-vazio">${esc(oc || (fds ? 'Descanso' : (x.prev ? 'Sem marcação' : 'Sem expediente')))}</div>`;
    const sub = [x.m.length && oc ? esc(oc) : '', esc(x.obs), x.auto ? '<span class="autot">horário padrão</span>' : '', x.fora && !x.m.length ? 'fora do período de contrato' : ''].filter(Boolean).join(' · ');
    const dir = (x.futuro && !x.abono) || (!x.trab && !x.atraso && !x.abono) ? '' : `<div class="dl-r"><b>${hmOu(x.trab)}</b>${x.not ? `<span class="nt">🌙 ${hm(x.not)}</span>` : ''}${x.extra ? `<span class="ex">+${hm(x.extra)}</span>` : x.atraso ? `<span class="at">−${hm(x.atraso)}</span>` : x.abono ? `<span class="ab">abonado ${hm(x.abono)}</span>` : `<span class="ok">✓</span>`}</div>`;
    return `<div class="dl ${x.cinza ? 'cinza' : ''} ${!x.m.length ? 'vazio' : ''}">
      <div class="dl-d"><b>${String(x.d).padStart(2, '0')}</b><small>${DIAS[x.dw]}</small></div>
      <div class="dl-m">${meio}${sub ? `<div class="dl-o">${sub}</div>` : ''}</div>${dir}</div>`;
  }).join('')}</div>`;
  return `<div class="doc-wrap">
    <div class="fp-head">${empresa.logo ? `<img src="${esc(empresa.logo)}" alt="">` : `<div class="logo">${esc(ini(empresa.nome))}</div>`}<div class="ttl">FOLHA DE PONTO<small>${refCurta(ref)}</small></div></div>
    <div class="fp-id">
      <div class="nm">${esc(colab.nome)}</div>
      <div class="muted">${esc(colab.cargo || '')}${colab.cargo ? ' · ' : ''}CPF ${fmtCPF(colab.cpf)}</div>
      <div class="muted">${esc(empresa.nome)}${colab.obra ? ' · Obra ' + esc(colab.obra) : ''}${colab.centro_custo ? ' · Centro de custo ' + esc(colab.centro_custo) : ''}</div>
    </div>
    <div class="fp-kpi">
      <div><small>Trabalhadas</small><b>${hm(T.trab)}</b></div>
      <div><small>Previstas</small><b>${hm(T.prev)}</b></div>
      <div><small>Extras</small><b class="ex">${hmOu(T.extra)}</b></div>
      <div><small>Atrasos/faltas</small><b class="${T.atraso ? 'at' : ''}">${hmOu(T.atraso)}</b></div>
    </div>
    <div class="seg fp-modo no-print"><button data-m="lista" class="${modoFolha === 'lista' ? 'on' : ''}" onclick="trocarModoFolha('lista')">Dia a dia</button><button data-m="tabela" class="${modoFolha === 'tabela' ? 'on' : ''}" onclick="trocarModoFolha('tabela')">Tabela completa</button></div>
    ${lista}${tabela}
    <div class="fp-bl">
      <h4>Resumo do mês</h4>
      <table class="mini"><thead><tr><th style="text-align:left">Descrição</th><th>Horas</th><th>Adicional</th></tr></thead><tbody>
        <tr><td>Extras 50% (segunda a sexta)</td><td class="n">${hmOu(T.e50)}</td><td class="g">50%</td></tr>
        <tr><td>Extras 100% (sábado)</td><td class="n">${hmOu(T.e100)}</td><td class="g">100%</td></tr>
        <tr><td>Extras 110% (domingo e feriado)</td><td class="n">${hmOu(T.e110)}</td><td class="g">110%</td></tr>
        ${[[20, 'segunda a sexta'], [100, 'sábado'], [110, 'domingo e feriado']].filter(([k]) => T['n' + k]).map(([k, lb]) => `<tr><td>Adicional noturno ${k}% (${lb} · 22h às 5h)</td><td class="n">${hm(T['n' + k])}</td><td class="g">${k}%</td></tr>`).join('')}
        <tr><td>Atrasos / faltas</td><td class="n">${hmOu(T.atraso)}</td><td></td></tr>
        ${T.abono ? `<tr><td>Horas abonadas (atestado / abono)</td><td class="n">${hm(T.abono)}</td><td></td></tr>` : ''}
        <tr class="tot"><td>Saldo (extras – atrasos)</td><td class="n">${hm(saldo)}</td><td></td></tr>
      </tbody></table>
    </div>
    ${conf ? seloAssinatura(conf.assinatura, conf.confirmado_em, conf.codigo, conf.ip, colab.nome) : ''}
    <div class="assin"><div>Assinatura do colaborador<br><small>${esc(colab.nome)}</small>${conf && !conf.assinatura ? `<br><small style="color:var(--green)">✓ Confirmado pelo portal em ${dataHora(conf.confirmado_em)}</small>` : ''}</div><div>Assinatura do responsável</div></div>
  </div>`;
}

/* =====================================================
   HOLERITE — recibo de pagamento
   ===================================================== */
const totais = h => { const it = h.itens || []; const p = it.filter(i => i.tipo === 'p').reduce((a, i) => a + (+i.valor || 0), 0), d = it.filter(i => i.tipo === 'd').reduce((a, i) => a + (+i.valor || 0), 0); return {p, d, l: p - d}; };
function holeriteHTML(h, c, ass) {
  const t = totais(h), r = h.rodape || {}, it = h.itens || [];
  const nv = v => (v === '' || v == null) ? '' : num(v);
  return `<div class="hol">
    <div class="hb">
      <div class="r"><div>${esc((empresa.nome || '').toUpperCase())}<br><span class="nw">CNPJ: ${esc(empresa.cnpj || '')}</span></div>
        <div style="text-align:center">CC: ${esc((c.lotacao || '').toUpperCase())}<br>${esc(c.tipo_salario || 'Mensalista')}</div>
        <div style="text-align:right" class="nw">Folha Mensal<br>${cap(MESES[+h.ref.slice(5, 7) - 1])} de ${h.ref.slice(0, 4)}</div></div>
    </div>
    <div class="hb">
      <div class="r"><div style="flex:0 0 auto"><span class="lb">Código</span>${esc(c.codigo || '')}</div>
        <div style="flex:1"><span class="lb">Nome do Funcionário</span>${esc((c.nome || '').toUpperCase())}<br>${esc((c.cargo || '').toUpperCase())}</div>
        <div style="text-align:right"><span class="lb">CBO · Depto · Filial</span>${esc(c.cbo || '')} · ${esc(c.departamento || '')} · ${esc(c.filial || '')}<br>Admissão: ${isoBR(c.admissao)}</div></div>
    </div>
    <table>
      <colgroup><col style="width:11%"><col><col style="width:17%"><col style="width:19%"><col style="width:19%"></colgroup>
      <thead><tr><th>Código</th><th>Descrição</th><th>Referência</th><th>Vencimentos</th><th>Descontos</th></tr></thead>
      <tbody>
        ${it.map(i => `<tr><td class="n">${esc(i.codigo || '')}</td><td>${esc((i.desc || '').toUpperCase())}</td><td class="n">${esc(i.ref || '')}</td><td class="n">${i.tipo === 'p' ? num(i.valor) : ''}</td><td class="n">${i.tipo === 'd' ? num(i.valor) : ''}</td></tr>`).join('')}
        <tr class="fill"><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody>
    </table>
    <div class="tt"><div></div><div><span class="lb">Total de Vencimentos</span>${num(t.p)}</div><div><span class="lb">Total de Descontos</span>${num(t.d)}</div></div>
    <div class="liq"><div></div><div class="seta"><span>Valor Líquido</span><span>⇨</span></div><div class="vl">${num(t.l)}</div></div>
    <div class="rod">
      <div><span class="lb">Salário Base</span>${nv(r.salario_base)}</div>
      <div><span class="lb">Sal. Contr. INSS</span>${nv(r.sal_contr_inss)}</div>
      <div><span class="lb">Base Cálc. FGTS</span>${nv(r.base_fgts)}</div>
      <div><span class="lb">F.G.T.S do Mês</span>${nv(r.fgts_mes)}</div>
      <div><span class="lb">Base Cálc. IRRF</span>${nv(r.base_irrf)}</div>
      <div><span class="lb">Faixa IRRF</span>${nv(r.faixa_irrf)}</div>
    </div>
    ${h.obs ? `<div class="decl" style="font-family:inherit">${esc(h.obs)}</div>` : ''}
    <div class="decl"><span>Declaro ter recebido a importância líquida discriminada neste recibo.</span><span>${ass ? isoBR(ass.assinado_em) + ' &nbsp; ✓ Assinado eletronicamente' : '____/____/______ &nbsp; Assinatura do Funcionário'}</span></div>
    ${ass ? seloAssinatura(ass.assinatura, ass.assinado_em, ass.codigo, ass.ip, c.nome || '') : ''}
  </div>`;
}

/* =====================================================
   ASSINATURA COM O DEDO (ou mouse)
   ===================================================== */
const padHTML = id => `<div class="pad-wrap"><canvas id="${id}" class="pad" aria-label="Área para assinar"></canvas>
  <div class="pad-linha">Assine aqui com o dedo</div><button type="button" class="linkbtn pad-limpar" onclick="limparPad('${id}')">Limpar</button></div>`;
const PADS = {};
function iniciarPad(id) {
  const cv = $(id); if (!cv) return;
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#13235a';
  const st = PADS[id] = {tracos: 0, ult: null};
  const pos = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); st.ult = pos(e); st.tracos++; ctx.beginPath(); ctx.arc(st.ult[0], st.ult[1], 1, 0, 7); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); };
  cv.onpointermove = e => { if (!st.ult) return; e.preventDefault(); const p = pos(e); ctx.beginPath(); ctx.moveTo(st.ult[0], st.ult[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); st.ult = p; st.pontos = (st.pontos || 0) + 1; };
  cv.onpointerup = cv.onpointercancel = () => { st.ult = null; };
}
function limparPad(id) { const cv = $(id); if (!cv) return; cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); PADS[id] = {...PADS[id], tracos: 0, pontos: 0}; }
const padVazio = id => !PADS[id] || !PADS[id].tracos || (PADS[id].pontos || 0) < 8;
// recorta o desenho e reduz para no máximo 600 x 200
function padImagem(id) {
  const cv = $(id), ctx = cv.getContext('2d'), {width: w, height: h} = cv, d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const m = 8; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
  const sw = x1 - x0, sh = y1 - y0, k = Math.min(1, 600 / sw, 200 / sh), o = document.createElement('canvas');
  o.width = Math.max(1, Math.round(sw * k)); o.height = Math.max(1, Math.round(sh * k));
  o.getContext('2d').drawImage(cv, x0, y0, sw, sh, 0, 0, o.width, o.height);
  return o.toDataURL('image/png');
}
const aparelho = () => navigator.userAgent.slice(0, 300);
const seloAssinatura = (img, quando, codigo, ip, nome) => `<div class="selo">${img ? `<img src="${esc(img)}" alt="Assinatura de ${esc(nome)}">` : ''}
  <div class="selo-t">Assinado eletronicamente por ${esc(nome)} em ${dataHora(quando)}${ip ? ` · IP ${esc(ip)}` : ''}${codigo ? ` · Código ${esc(codigo)}` : ''}</div></div>`;

/* Assinatura da folha do mês */
const dataHora = ts => { const d = new Date(ts); return d.toLocaleDateString('pt-BR', {timeZone:'America/Sao_Paulo'}) + ' às ' + d.toLocaleTimeString('pt-BR', {timeZone:'America/Sao_Paulo', hour:'2-digit', minute:'2-digit'}); };
// Mês fechado com marcações e ainda sem OK do colaborador?
async function folhasPendentes(colabId, refs, colab) {
  const atual = agoraBR().iso.slice(0, 7);
  refs = [...new Set(refs)].filter(r => r < atual);
  if (!refs.length) return new Set();
  const min = refs.slice().sort()[0];
  const [pts, confs] = await Promise.all([
    q(sb.from('pontos').select('dia').eq('colaborador_id', colabId).gte('dia', min + '-01').lte('dia', fimDoMes(somaMes(atual, -1)))),
    q(sb.from('confirmacoes').select('ref').eq('colaborador_id', colabId))
  ]);
  const comPonto = new Set(pts.map(p => String(p.dia).slice(0, 7))), ok = new Set(confs.map(c => c.ref));
  if (colab) refs.forEach(r => { if (temFolha(colab, r, [])) comPonto.add(r); });
  return new Set(refs.filter(r => comPonto.has(r) && !ok.has(r)));
}
function irParaFolha(ref) { fecharSheet(); mesPonto = ref; ir('ponto'); }
async function darOk(ref, btn) {
  if (!$('okCheck').checked) return toast('Marque que você conferiu a folha.');
  if (padVazio('padFolha')) return toast('Faça a sua assinatura no quadro.');
  await comBotao(btn, async () => {
    try { await q(sb.rpc('confirmar_folha', {p_ref: ref, p_assinatura: padImagem('padFolha'), p_aparelho: aparelho()})); toast(`Folha de ${refLabel(ref)} assinada. O holerite já pode ser aberto.`); render(); }
    catch (e) { toast(erroMsg(e)); }
  });
}

/* =====================================================
   TELAS DO COLABORADOR (somente consulta)
   ===================================================== */
async function vInicio() {
  const c = sess.colab, ref = agoraBR().iso.slice(0, 7);
  const [regs, hs, av] = await Promise.all([
    q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', c.id).gte('dia', ref + '-01').lte('dia', fimDoMes(ref))),
    q(sb.from('holerites').select('id,ref,itens').eq('colaborador_id', c.id).order('ref', {ascending:false}).limit(1)),
    q(sb.from('avisos').select('*').order('criado_em', {ascending:false}).limit(5))
  ]);
  const {T} = calcularFolha(c, ref, regs), h = hs[0];
  const pend = await folhasPendentes(c.id, [mesAnterior(), ...(h ? [h.ref] : [])], c);
  const p1 = [...pend].sort()[0];
  return `
  ${p1 ? `<div class="card" style="border-color:#f1d59a;background:var(--amber-soft)"><div class="card-b">
    <div style="font-weight:600;color:#8a5d10">Confira e assine a sua folha de ${refLabel(p1)}</div>
    <div class="muted" style="margin:4px 0 10px;color:#8a5d10">O holerite desse mês só abre depois da sua assinatura.</div>
    <button class="btn btn-primary" onclick="irParaFolha('${p1}')">Conferir folha</button></div></div>` : ''}
  <button class="card item" style="border:1px solid var(--line);display:block" onclick="mesPonto='${ref}';ir('ponto')">
    <div style="display:flex;align-items:center"><div class="d">Folha de ponto · ${refLabel(ref)}</div><span class="chev">${sv(IC.chev)}</span></div>
    <div style="display:flex;gap:12px;margin-top:6px">
      <div style="flex:1"><div class="big">${hm(T.trab)}</div><div class="muted">horas trabalhadas</div></div>
      <div style="flex:1"><div class="big" style="color:var(--green)">${hm(T.extra)}</div><div class="muted">horas extras</div></div>
    </div>
  </button>
  ${h ? `<button class="card item" style="border:1px solid var(--line)" onclick="${pend.has(h.ref) ? `irParaFolha('${h.ref}');toast('Assine a folha de ${refLabel(h.ref)} para abrir o holerite.')` : `verHolerite(${h.id})`}">
    <div><div class="d">Último holerite · ${refLabel(h.ref)}</div>${pend.has(h.ref) ? `<div class="t" style="font-size:16px;margin-top:2px">🔒 Assine a folha para abrir</div>` : `<div class="t" style="font-size:22px;margin-top:2px">${BRL(totais(h).l)}</div><div class="d">valor líquido</div>`}</div>
    <span class="chev">${sv(IC.chev)}</span></button>` : `<div class="card"><div class="empty">Nenhum holerite disponível ainda.</div></div>`}
  <div class="card"><div class="card-h"><h3>Avisos do RH</h3></div>
    ${av.length ? av.map(avisoHTML).join('') : '<div class="empty">Nenhum aviso no momento.</div>'}
  </div>`;
}

function mudarMes(delta) { mesPonto = somaMes(mesPonto, delta); render(); }
async function vPonto() {
  const atual = agoraBR().iso.slice(0, 7); if (!mesPonto || mesPonto > atual) mesPonto = atual; if (mesPonto < INICIO_PORTAL) mesPonto = INICIO_PORTAL;
  const c = sess.colab, ref = mesPonto;
  const [regs, conf] = await Promise.all([
    q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', c.id).gte('dia', ref + '-01').lte('dia', fimDoMes(ref))),
    q(sb.from('confirmacoes').select('ref,confirmado_em,assinatura,codigo,ip').eq('colaborador_id', c.id).eq('ref', ref).maybeSingle())
  ]);
  const podeConfirmar = ref < atual && temFolha(c, ref, regs);
  const caixaOk = !podeConfirmar ? (ref === atual ? '<div class="notice-mes muted no-print" style="padding:0 4px 10px">Mês em andamento. A confirmação fica disponível quando o mês fechar.</div>' : '')
    : conf ? `<div class="card no-print" style="border-color:#bfe6d2;background:var(--green-soft)"><div class="card-b" style="color:var(--green);font-weight:600">✓ Você assinou esta folha em ${dataHora(conf.confirmado_em)}.</div></div>`
    : `<div class="card no-print" style="border-color:#f1d59a"><div class="card-b">
        <div style="font-weight:600">Confira sua folha de ${refLabel(ref)}</div>
        <div class="muted" style="margin:4px 0 10px">Confira os dias abaixo e assine no fim da folha. Depois da assinatura, o holerite deste mês fica liberado. Se algo estiver errado, não assine e fale com o RH.</div>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('assinarFolha').scrollIntoView({behavior:'smooth',block:'center'})">Ir para a assinatura</button>
      </div></div>`;
  return `
  <div class="mes-nav">
    <button class="btn btn-ghost btn-sm" aria-label="Mês anterior" onclick="mudarMes(-1)" ${ref <= INICIO_PORTAL ? 'style="visibility:hidden"' : ''}>‹</button>
    <div>${refLabel(ref)}</div>
    <button class="btn btn-ghost btn-sm" aria-label="Próximo mês" onclick="mudarMes(1)" ${ref >= atual ? 'style="visibility:hidden"' : ''}>›</button>
  </div>
  ${podeConfirmar && !conf ? caixaOk : ''}
  ${folhaHTML(c, ref, regs, conf)}
  ${podeConfirmar && !conf ? `<div class="card no-print" id="assinarFolha" style="border-color:#f1d59a"><div class="card-b">
      <div style="font-weight:600;margin-bottom:8px">Assinar a folha de ${refLabel(ref)}</div>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-bottom:12px"><input type="checkbox" id="okCheck" style="width:20px;height:20px;margin-top:1px;flex:none"> Conferi os horários e estou de acordo com esta folha de ponto.</label>
      ${padHTML('padFolha')}
      <button class="btn btn-primary" style="margin-top:12px" onclick="darOk('${ref}',this)">Assinar folha</button>
    </div></div>` : caixaOk}
  <div class="stack no-print"><button class="btn btn-ghost" onclick="imprimir()">${sv(IC.print, 18)} Imprimir / salvar em PDF</button></div>
  <p class="muted no-print" style="padding:10px 4px 0">Viu algum horário errado? Fale com o RH para corrigir.</p>`;
}

async function vHolerites() {
  const [l, as] = await Promise.all([q(sb.from('holerites').select('id,ref,itens').eq('colaborador_id', sess.colab.id).order('ref', {ascending:false})),
    q(sb.from('assinaturas_holerite').select('holerite_id').eq('colaborador_id', sess.colab.id))]);
  const pend = await folhasPendentes(sess.colab.id, l.map(h => h.ref), sess.colab), assinados = new Set(as.map(a => a.holerite_id));
  return `<div class="card">${l.length ? l.map(h => pend.has(h.ref)
      ? `<button class="item" onclick="irParaFolha('${h.ref}');toast('Assine a folha de ${refLabel(h.ref)} para abrir o holerite.')">
      <div><div class="t">🔒 ${refLabel(h.ref)}</div><div class="d" style="color:var(--amber)">Assine a folha de ponto para abrir</div></div><span class="chev">${sv(IC.chev)}</span></button>`
      : `<button class="item" onclick="verHolerite(${h.id})">
      <div><div class="t">${refLabel(h.ref)}</div><div class="d">Líquido ${BRL(totais(h).l)} · ${assinados.has(h.id) ? '<span style="color:var(--green)">✓ assinado</span>' : '<span style="color:var(--amber)">falta assinar</span>'}</div></div><span class="chev">${sv(IC.chev)}</span></button>`).join('')
    : '<div class="empty">Nenhum holerite disponível ainda.</div>'}</div>`;
}
async function verHolerite(id) {
  sheetCarregando('Holerite');
  try {
    const [h, ass] = await Promise.all([q(sb.from('holerites').select('*').eq('id', id).single()), q(sb.from('assinaturas_holerite').select('*').eq('holerite_id', id).maybeSingle())]);
    const c = sess.tipo === 'colab' ? sess.colab : (cacheEquipe.find(x => x.id === h.colaborador_id) || {});
    if (sess.tipo === 'colab' && (await folhasPendentes(c.id, [h.ref], c)).has(h.ref)) { irParaFolha(h.ref); return toast(`Assine a folha de ${refLabel(h.ref)} para abrir o holerite.`); }
    const assinar = sess.tipo === 'colab' && !ass;
    document.body.classList.add('imprimindo-sheet');
    sheet(`Holerite · ${refLabel(h.ref)}`, holeriteHTML(h, c, ass) + (assinar ? `<div class="card no-print" id="assinarHol" style="border-color:#f1d59a;margin-top:14px"><div class="card-b">
        <div style="font-weight:600;margin-bottom:4px">Assinar o recebimento</div>
        <div class="muted" style="margin-bottom:10px">Ao assinar, você declara que recebeu o valor líquido deste holerite.</div>
        ${padHTML('padHol')}
        <button class="btn btn-primary" style="margin-top:12px" onclick="assinarHolerite(${id},this)">Assinar holerite</button></div></div>`
      : sess.tipo === 'rh' && !ass ? '<p class="muted no-print" style="margin-top:10px">O colaborador ainda não assinou este holerite.</p>' : ''),
      [['Fechar', 'ghost', 'fecharSheet()'], [sv(IC.print, 18) + ' Imprimir', 'primary', 'imprimir()']]);
    document.body.classList.add('imprimindo-sheet');
    if (assinar) iniciarPad('padHol');
  } catch (e) { fecharSheet(); toast(erroMsg(e)); }
}

async function assinarHolerite(id, btn) {
  if (padVazio('padHol')) return toast('Faça a sua assinatura no quadro.');
  await comBotao(btn, async () => {
    try { await q(sb.rpc('assinar_holerite', {p_id: id, p_assinatura: padImagem('padHol'), p_aparelho: aparelho()})); toast('Holerite assinado. Obrigado!'); verHolerite(id); render(); }
    catch (e) { toast(erroMsg(e)); }
  });
}

async function vPerfil() {
  const c = sess.colab = await q(sb.from('colaboradores').select(COLS).eq('id', sess.colab.id).single());
  return `
  <div class="card"><div class="card-h"><h3>Dados pessoais</h3></div><div class="card-b">
    ${kv('Nome', c.nome)}${kv('CPF', fmtCPF(c.cpf))}${kv('E-mail', c.email)}${kv('Telefone', c.tel)}
  </div></div>
  <div class="card"><div class="card-h"><h3>Trabalho</h3></div><div class="card-b">
    ${kv('Empresa', empresa.nome)}${kv('Cargo', c.cargo)}${kv('Código', c.codigo)}${kv('Departamento', c.departamento)}${c.obra ? kv('Obra', c.obra) : ''}${kv('Centro de custo', c.centro_custo)}${kv('Admissão', isoBR(c.admissao))}
    ${kv('Jornada', jornadaTexto(c.jornada))}
  </div></div>
  <div class="card"><div class="card-h"><h3>Pagamento</h3></div><div class="card-b">
    ${kv('Salário base', BRL(c.salario))}${kv('Conta', c.banco)}
  </div></div>
  <p class="muted" style="padding:0 4px 12px">Algum dado errado? Peça a correção ao RH.</p>
  <div class="stack">
    <button class="btn btn-ghost" onclick="trocarSenha()">Alterar minha senha</button>
    <button class="btn btn-danger" onclick="sair()">Sair</button>
  </div>`;
}
function horarioTexto(c) {
  const grupos = [];
  [1, 2, 3, 4, 5, 6, 0].forEach(i => { const h = horarioDia(c, i), t = h.length ? h.join(' – ').replace(/^(\S+) – (\S+) – (\S+) – (\S+)$/, '$1–$2 · $3–$4') : ''; if (!t) return; const g = grupos.find(x => x.t === t); if (g) g.d.push(i); else grupos.push({t, d: [i]}); });
  return grupos.map(g => `${g.d.length > 2 ? DIAS[g.d[0]] + ' a ' + DIAS[g.d[g.d.length - 1]] : g.d.map(i => DIAS[i]).join(' e ')}: ${g.t}`).join(' | ') || '—';
}
function jornadaTexto(j) {
  if (!j || j.length !== 7) return '';
  return [1, 2, 3, 4, 5, 6, 0].filter(i => j[i]).map(i => `${DIAS[i]} ${hm(toMin(j[i]))}`).join(' · ') || '—';
}
function trocarSenha() {
  sheet('Alterar senha', `
    <div class="field"><label for="pN">Nova senha (mínimo 6 caracteres)</label><input id="pN" type="password" autocomplete="new-password"></div>
    <div class="field"><label for="pC">Repita a nova senha</label><input id="pC" type="password" autocomplete="new-password"></div>
    <div class="err hide" id="pErr"></div>`,
    [['Cancelar', 'ghost', 'fecharSheet()'], ['Salvar', 'primary', 'salvarSenha(this)']]);
}
async function salvarSenha(btn) {
  const n = $('pN').value, c = $('pC').value, e = $('pErr');
  const erro = m => { e.textContent = m; e.classList.remove('hide'); };
  if (n.length < 6) return erro('A nova senha precisa ter pelo menos 6 caracteres.');
  if (n !== c) return erro('As duas senhas não são iguais.');
  await comBotao(btn, async () => {
    try { await q(sb.auth.updateUser({password: n})); fecharSheet(); toast('Senha alterada.'); }
    catch (x) { erro(erroMsg(x)); }
  });
}

/* =====================================================
   TELAS DO RH
   ===================================================== */
async function carregarEquipe() { cacheEquipe = await q(sb.from('colaboradores').select(COLS).order('nome')); return cacheEquipe; }
const nomeDe = id => (cacheEquipe.find(c => c.id === id) || {}).nome || '—';

let statusOk = {};
async function vEquipe() {
  const ant = mesTrab();
  const [l, pts, confs] = await Promise.all([carregarEquipe(),
    q(sb.from('pontos').select('colaborador_id').gte('dia', ant + '-01').lte('dia', fimDoMes(ant))),
    q(sb.from('confirmacoes').select('colaborador_id').eq('ref', ant))]);
  const com = new Set(pts.map(p => p.colaborador_id)), ok = new Set(confs.map(c => c.colaborador_id));
  if (filtroObra && !obras().includes(filtroObra)) filtroObra = '';
  statusOk = Object.fromEntries(l.map(c => [c.id, !(com.has(c.id) || temFolha(c, ant, [])) ? '' : ok.has(c.id) ? 'ok' : 'pend']));
  return `${barraMesRH()}
  <div class="row2" style="margin-bottom:10px"><button class="btn btn-ghost" onclick="abrirImportacao()">Importar planilha (Excel)</button><button class="btn btn-ghost" onclick="abrirResumo()">Resumo de horas (Excel)</button></div>
  <div class="filtros"><input class="srch" type="search" placeholder="Buscar por nome, CPF ou cargo" aria-label="Buscar colaborador" value="${esc(busca)}" oninput="busca=this.value;$('lista').innerHTML=listaEquipe();contarEquipe()">
    <select class="srch" aria-label="Filtrar por situação" onchange="filtroSit=this.value;$('lista').innerHTML=listaEquipe();contarEquipe()">${[['Ativo', 'Ativos'], ['Desligado', 'Desligados'], ['', 'Todos']].map(([v, lb]) => `<option value="${v}" ${v === filtroSit ? 'selected' : ''}>${lb} (${l.filter(c => !v || (c.situacao || 'Ativo') === v).length})</option>`).join('')}</select>
    ${obras().length ? `<select class="srch" aria-label="Filtrar por obra" onchange="filtroObra=this.value;$('lista').innerHTML=listaEquipe();contarEquipe()"><option value="">Todas as obras / projetos</option>${obras().map(o => `<option ${o === filtroObra ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}</div>
  <div class="sec-t" id="contEq"></div>
  <div class="card" id="lista">${listaEquipe()}</div>
  <button class="fab" aria-label="Adicionar colaborador" onclick="editarColab()">${sv(IC.plus, 24)}</button>`;
}
const obras = () => [...new Set(cacheEquipe.map(c => (c.obra || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
function contarEquipe() { const n = document.querySelectorAll('#lista .item').length, e = $('contEq'); if (e) e.textContent = `${n} colaborador${n === 1 ? '' : 'es'}${filtroSit ? ' ' + (filtroSit === 'Ativo' ? 'ativo' : 'desligado') + (n === 1 ? '' : 's') : ''}${filtroObra ? ' · ' + filtroObra : ''}`; }
function listaEquipe() {
  const t = busca.toLowerCase().trim(), dq = soDig(busca);
  const l = cacheEquipe.filter(c => (!filtroSit || (c.situacao || 'Ativo') === filtroSit) && (!filtroObra || (c.obra || '') === filtroObra)).filter(c => !t || c.nome.toLowerCase().includes(t) || (c.cargo || '').toLowerCase().includes(t) || (dq && c.cpf.includes(dq)));
  return l.length ? l.map(c => `<button class="item" onclick="verColab('${c.id}')"><div class="av">${esc(ini(c.nome))}</div>
      <div style="min-width:0;flex:1"><div class="t">${esc(c.nome)}</div><div class="d">${esc(c.cargo || 'Sem cargo')}${c.obra ? ' · ' + esc(c.obra) : ''} · ${fmtCPF(c.cpf)}</div>
      <div style="margin-top:4px;display:flex;gap:5px;flex-wrap:wrap">${desligado(c) ? `<span class="tag t-neutral">Desligado${c.demissao ? ' em ' + isoBR(c.demissao) : ''}</span>` : c.user_id ? '' : '<span class="tag t-warn">Aguardando 1º acesso</span>'}${desligado(c) ? '' : statusOk[c.id] === 'ok' ? `<span class="tag t-ok">Folha assinada · ${MESES[+mesTrab().slice(5) - 1]}</span>` : statusOk[c.id] === 'pend' ? (mesTrab() >= agoraBR().iso.slice(0, 7) ? `<span class="tag t-neutral">Folha de ${MESES[+mesTrab().slice(5) - 1]} em andamento</span>` : `<span class="tag t-neutral">Folha de ${MESES[+mesTrab().slice(5) - 1]} sem assinatura</span>`) : ''}</div></div>
      <span class="chev">${sv(IC.chev)}</span></button>`).join('')
    : `<div class="empty">${cacheEquipe.length ? 'Ninguém encontrado.' : 'Nenhum colaborador cadastrado ainda.<br>Toque no botão + para adicionar.'}</div>`;
}
async function verColab(id, refSel) {
  const c = cacheEquipe.find(x => x.id === id); if (!c) return;
  const atual = agoraBR().iso.slice(0, 7), ref = refSel || mesTrab();
  sheetCarregando(esc(c.nome));
  try {
    const [hs, confs, cod, as, regs] = await Promise.all([
      q(sb.from('holerites').select('id,ref,itens').eq('colaborador_id', id).order('ref', {ascending:false})),
      q(sb.from('confirmacoes').select('ref,confirmado_em').eq('colaborador_id', id)),
      c.user_id ? Promise.resolve(null) : q(sb.rpc('codigo_acesso', {p_colab: id})),
      q(sb.from('assinaturas_holerite').select('holerite_id,assinado_em').eq('colaborador_id', id)),
      q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', id).gte('dia', ref + '-01').lte('dia', fimDoMes(ref)))
    ]);
    const assDe = hid => as.find(a => a.holerite_id === hid);
    const tem = temFolha(c, ref, regs), r = resumoColab(c, ref, regs), T = r.T, cf = confs.find(x => x.ref === ref), hRef = hs.find(h => h.ref === ref);
    const kpi = (lb, v, cls = '') => `<div><small>${lb}</small><b class="${cls}">${v}</b></div>`;
    const statusFolha = !tem ? `<span class="tag t-neutral">Folha não lançada</span>`
      : cf ? `<span class="tag t-ok">✓ Assinada em ${dataHora(cf.confirmado_em)}</span>`
      : ref >= atual ? `<span class="tag t-neutral">Mês em andamento</span>` : `<span class="tag t-warn">Aguardando assinatura</span>`;
    const statusHol = !hRef ? `<span class="tag t-neutral">Sem holerite</span>`
      : assDe(hRef.id) ? `<span class="tag t-ok">✓ Holerite assinado</span>` : `<span class="tag t-warn">Holerite sem assinatura</span>`;
    const jornadaCurta = jornadaTexto(c.jornada);
    sheet('Colaborador', `
      <div class="cx-head">
        <div class="av cx-av">${esc(ini(c.nome))}</div>
        <div style="min-width:0">
          <div class="cx-nome">${esc(c.nome)}</div>
          <div class="muted">${esc(c.cargo || 'Sem cargo')}${c.departamento ? ' · ' + esc(c.departamento) : ''} · CPF ${fmtCPF(c.cpf)}</div>
          <div class="cx-tags">${desligado(c) ? `<span class="tag t-neutral">Desligado${c.demissao ? ' em ' + isoBR(c.demissao) : ''}</span>` : ''}${c.user_id ? '<span class="tag t-ok">Acesso ativo</span>' : '<span class="tag t-warn">Aguardando 1º acesso</span>'}${pontoAuto(c) ? '<span class="tag t-info">Ponto automático</span>' : ''}${c.obra ? `<span class="tag t-info">Obra: ${esc(c.obra)}</span>` : ''}${c.admissao ? `<span class="tag t-neutral">Admissão ${isoBR(c.admissao)}</span>` : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm cx-edit" onclick="editarColab('${id}')">Editar dados</button>
      </div>

      <div class="mes-nav cx-mes">
        <button class="btn btn-ghost btn-sm" aria-label="Mês anterior" onclick="verColab('${id}','${somaMes(ref, -1)}')" ${ref <= INICIO_PORTAL ? 'style="visibility:hidden"' : ''}>‹</button>
        <div>${refLabel(ref)}</div>
        <button class="btn btn-ghost btn-sm" aria-label="Próximo mês" onclick="verColab('${id}','${somaMes(ref, 1)}')" ${ref >= atual ? 'style="visibility:hidden"' : ''}>›</button>
      </div>

      <div class="cx-grid">
        <div class="card cx-card"><div class="card-b">
          <div class="cx-t"><span>Folha de ponto</span>${statusFolha}</div>
          ${tem ? `<div class="fp-kpi cx-kpi">
            ${kpi('Trabalhadas', hm(T.trab))}${kpi('Normais', hm(r.normais))}
            ${kpi('Extras', hmOu(T.extra), 'ex')}${kpi('Atrasos', hmOu(r.atraso), r.atraso ? 'at' : '')}
            ${kpi('Faltas', r.faltas ? r.faltas + (r.faltas === 1 ? ' dia' : ' dias') : '-', r.faltas ? 'at' : '')}${kpi('Noturno', hmOu(T.not))}
          </div>
          ${T.extra ? `<div class="cx-linha"><span>Extras 50% · 100% · 110%</span><b>${hmOu(T.e50)} · ${hmOu(T.e100)} · ${hmOu(T.e110)}</b></div>` : ''}
          ${r.faltas ? `<div class="cx-linha"><span>Dias das faltas</span><b>${esc(r.datasFalta)}</b></div>` : ''}
          ${T.abono ? `<div class="cx-linha"><span>Horas abonadas · ${hm(T.abono)}</span><b>${esc(r.abonados)}</b></div>` : ''}
          ${r.ocorr ? `<div class="cx-linha"><span>Ocorrências</span><b>${esc(r.ocorr)}</b></div>` : ''}` : `<div class="muted" style="margin:6px 0 4px">Nenhum dia lançado em ${refLabel(ref)}.</div>`}
          <div class="cx-acoes">
            <button class="btn btn-primary btn-sm" onclick="editarFolha('${id}','${ref}')">${tem ? 'Lançar faltas / ajustes' : 'Preencher folha'}</button>
            ${tem ? `<button class="btn btn-ghost btn-sm" onclick="verFolhaRH('${id}','${ref}')">Ver folha completa</button>` : ''}
          </div>
        </div></div>

        <div class="card cx-card"><div class="card-b">
          <div class="cx-t"><span>Holerite de ${refLabel(ref)}</span>${statusHol}</div>
          ${hRef ? `<div class="cx-liq"><small>Valor líquido</small><b>${BRL(totais(hRef).l)}</b></div>
            <div class="cx-acoes"><button class="btn btn-primary btn-sm" onclick="editarHolerite(${hRef.id})">Abrir / editar</button>${assDe(hRef.id) ? `<button class="btn btn-ghost btn-sm" onclick="verHolerite(${hRef.id})">Ver assinado</button>` : ''}</div>`
          : `<div class="muted" style="margin:6px 0 4px">Ainda não há holerite deste mês.</div>
            <div class="cx-acoes"><button class="btn btn-primary btn-sm" onclick="abrirGerador('${id}','${ref}')">Calcular pela folha</button><button class="btn btn-ghost btn-sm" onclick="editarHolerite(null,'${id}')">Lançar à mão</button></div>`}
          ${hs.filter(h => h.ref !== ref).length ? `<div class="cx-sub">Outros meses</div>
            ${hs.filter(h => h.ref !== ref).slice(0, 6).map(h => `<button class="cx-mini" onclick="editarHolerite(${h.id})"><span>${refLabel(h.ref)}</span><span>${BRL(totais(h).l)} ${assDe(h.id) ? '<i class="ok">✓</i>' : '<i class="pend">•</i>'}</span></button>`).join('')}` : ''}
        </div></div>

        <div class="card cx-card"><div class="card-b">
          <div class="cx-t"><span>Dados</span></div>
          ${kv('Horário', horarioTexto(c))}${kv('Centro de custo', c.centro_custo)}${kv('Código', c.codigo)}
          ${kv('Telefone', c.tel)}${kv('E-mail', c.email)}
        </div></div>

        <div class="card cx-card"><div class="card-b">
          <div class="cx-t"><span>Acesso ao portal</span></div>
          ${c.user_id ? `<div class="muted">${esc(primeiro(c.nome))} já criou a senha e entra com o CPF.</div>
            <div class="cx-acoes"><button class="btn btn-ghost btn-sm" onclick="confirmarReset('${id}')">Esqueceu a senha? Gerar novo código</button></div>`
          : `<div class="muted">Código de primeiro acesso:</div><div class="codigo">${esc(cod || '—')}</div>
            <div class="muted" style="font-size:13px">No celular, a pessoa toca em “Primeiro acesso”, digita o CPF e este código e cria a senha.</div>
            <div class="cx-acoes"><button class="btn btn-primary btn-sm" onclick="copiarConvite('${id}','${esc(cod || '')}')">Copiar mensagem para o WhatsApp</button><button class="btn btn-ghost btn-sm" onclick="confirmarReset('${id}')">Gerar novo código</button></div>
            <div class="muted" style="font-size:13px;margin-top:6px">Se a pessoa errou o código muitas vezes e apareceu “Muitas tentativas erradas”, gere um novo código e mande de novo.</div>`}
        </div></div>
      </div>`,
      [['Fechar', 'ghost', 'fecharSheet()']]);
    document.querySelector('.sheet')?.classList.add('sheet-larga');
  } catch (e) { fecharSheet(); toast(erroMsg(e)); }
}
function copiarConvite(id, cod) {
  const c = cacheEquipe.find(x => x.id === id);
  const txt = `Olá, ${primeiro(c.nome)}! Seu acesso ao Portal do Colaborador (${empresa.nome}):\n\nSite: ${location.origin + location.pathname}\nCPF: ${fmtCPF(c.cpf)}\nCódigo de acesso: ${cod}\n\nAbra o site no celular, toque em "Primeiro acesso", digite o CPF e o código e crie a sua senha.`;
  try { navigator.clipboard.writeText(txt).then(() => toast('Mensagem copiada. Cole no WhatsApp ou e-mail.'), () => toast('Não foi possível copiar.')); }
  catch (e) { toast('Não foi possível copiar.'); }
}
function confirmarReset(id) {
  const c = cacheEquipe.find(x => x.id === id);
  const txt = c.user_id
    ? `A senha atual de <b>${esc(c.nome)}</b> deixa de funcionar e será gerado um novo código de primeiro acesso para a pessoa criar outra senha.`
    : `O código atual de <b>${esc(c.nome)}</b> deixa de funcionar e será gerado um novo. Se a pessoa estava bloqueada por errar muitas vezes, ela volta a poder entrar com o código novo.`;
  sheet('Gerar novo código', `<p>${txt}</p>`,
    [['Voltar', 'ghost', `verColab('${id}')`], ['Gerar código', 'primary', `resetarAcesso('${id}',this)`]]);
}
async function resetarAcesso(id, btn) {
  await comBotao(btn, async () => {
    try { await q(sb.rpc('resetar_acesso', {p_colab: id})); await carregarEquipe(); render(); verColab(id); toast('Novo código gerado.'); }
    catch (e) { toast(erroMsg(e)); }
  });
}

/* ---- cadastro do colaborador ---- */
function editarColab(id) {
  const c = id ? cacheEquipe.find(x => x.id === id) : {nome:'', cpf:'', codigo:'', cargo:'', cbo:'', departamento:'', filial:'', centro_custo:'', lotacao:'', tipo_salario:'Mensalista', admissao: agoraBR().iso, email:'', tel:'', salario:'', dependentes:0, banco:'', jornada:['', '09:00', '09:00', '09:00', '09:00', '08:00', '']};
  const f = (k, lb, tipo = 'text', extra = '') => `<div class="field"><label for="f_${k}">${lb}</label><input id="f_${k}" type="${tipo}" value="${esc(k === 'cpf' ? fmtCPF(c[k]) : (c[k] ?? ''))}" ${extra}></div>`;
  const jor = c.jornada && c.jornada.length === 7 ? c.jornada : ['', '', '', '', '', '', ''];
  sheet(id ? 'Editar colaborador' : 'Novo colaborador', `
    ${f('nome', 'Nome completo *')}
    <div class="row2">${f('cpf', 'CPF *', 'text', `inputmode="numeric" oninput="this.value=fmtCPF(this.value)" ${id ? 'readonly style="background:#f4f6fa"' : ''}`)}${f('codigo', 'Código (holerite)')}</div>
    <div class="row2">${f('cargo', 'Cargo')}${f('cbo', 'CBO', 'text', 'inputmode="numeric"')}</div>
    <div class="row2">${f('departamento', 'Departamento')}${f('filial', 'Filial')}</div>
    <div class="field"><label for="f_obra">Obra</label><input id="f_obra" list="listaObras" value="${esc(c.obra || '')}" placeholder="Ex.: Residencial Lago Azul"><datalist id="listaObras">${obras().map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>
    <div class="row2">${f('centro_custo', 'Centro de custo (folha)')}${f('lotacao', 'CC do holerite')}</div>
    <div class="row2">${f('admissao', 'Admissão', 'date')}<div class="field"><label for="f_tipo_salario">Tipo</label><select id="f_tipo_salario">${['Mensalista', 'Horista', 'Diarista'].map(o => `<option ${o === c.tipo_salario ? 'selected' : ''}>${o}</option>`).join('')}</select></div></div>
    <div class="row2"><div class="field"><label for="f_situacao">Situação</label><select id="f_situacao" onchange="$('demBox').style.display=this.value==='Desligado'?'':'none'">${['Ativo', 'Desligado'].map(o => `<option ${o === (c.situacao || 'Ativo') ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field" id="demBox" style="${c.situacao === 'Desligado' ? '' : 'display:none'}"><label for="f_demissao">Data do desligamento</label><input id="f_demissao" type="date" value="${esc(c.demissao || '')}"></div></div>
    <div class="field"><label>Horário padrão (deixe a linha vazia nos dias sem expediente)</label>
      <table class="hor"><thead><tr><th></th><th>Entrada</th><th>Saída</th><th>Entrada</th><th>Saída</th></tr></thead><tbody>
      ${[1, 2, 3, 4, 5, 6, 0].map(i => { const h = horarioDia(c, i); return `<tr><th>${DIAS[i]}</th>${[0, 1, 2, 3].map(k => `<td><input id="h${i}_${k}" inputmode="numeric" maxlength="5" value="${esc(h[k] || '')}" onblur="this.value=normHora(this.value)??this.value"></td>`).join('')}</tr>`; }).join('')}
      </tbody></table>
      <button type="button" class="linkbtn" style="font-size:13px" onclick="copiarSegunda()">Copiar o horário de segunda para terça a quinta</button>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:14px;margin-top:10px"><input type="checkbox" id="f_ponto_auto" ${pontoAuto(c) ? 'checked' : ''} style="width:20px;height:20px;flex:none"> <span><b>Ponto automático</b>: todo dia de trabalho já entra com este horário. O RH só lança faltas e mudanças.</span></label></div>
    <div class="row2">${f('dependentes', 'Dependentes (IRRF)', 'number', 'step="1" min="0" inputmode="numeric"')}<div></div></div>
    <div class="row2">${f('email', 'E-mail', 'email')}${f('tel', 'Telefone', 'tel')}</div>
    ${f('banco', 'Banco / conta')}
    <div class="err hide" id="cErr"></div>
    ${id ? `<button class="btn btn-danger" style="margin-top:6px" onclick="excluirColab('${id}')">Excluir colaborador</button>` : '<p class="muted">Depois de salvar, aparece o código de primeiro acesso para enviar à pessoa.</p>'}`,
    [['Cancelar', 'ghost', id ? `verColab('${id}')` : 'fecharSheet()'], ['Salvar', 'primary', `salvarColab('${id || ''}',this)`]]);
}
function copiarSegunda() { [2, 3, 4].forEach(i => [0, 1, 2, 3].forEach(k => $(`h${i}_${k}`).value = $(`h1_${k}`).value)); toast('Horário copiado para terça, quarta e quinta.'); }
const normHora = v => { v = String(v || '').trim(); if (!v) return ''; const d = soDig(v); if (!d) return null; const h = d.length <= 2 ? +d : +d.slice(0, d.length - 2), m = d.length <= 2 ? 0 : +d.slice(-2); if (h > 23 || m > 59) return null; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
async function salvarColab(id, btn) {
  const v = k => $('f_' + k).value.trim(), e = $('cErr');
  const erro = m => { e.textContent = m; e.classList.remove('hide'); e.scrollIntoView({block:'center'}); };
  const cpf = soDig(v('cpf'));
  if (!v('nome')) return erro('Informe o nome.');
  if (cpf.length !== 11) return erro('O CPF precisa ter 11 dígitos.');
  const horario = [];
  for (let i = 0; i < 7; i++) {
    const vals = [0, 1, 2, 3].map(k => normHora($(`h${i}_${k}`).value));
    if (vals.some(x => x === null)) return erro(`Horário de ${DIAS[i]}: use o formato 07:00.`);
    const ult = vals.map(x => !!x).lastIndexOf(true), h = vals.slice(0, ult + 1);
    if (h.some(x => !x) || h.length % 2) return erro(`Horário de ${DIAS[i]}: preencha entrada e saída (e o almoço, se tiver).`);
    if (h.length && !minutosCorridos(h)) return erro(`Horário de ${DIAS[i]}: confira a ordem dos horários.`);
    horario.push(h);
  }
  const jornada = jornadaDoHorario(horario);
  const situacao = $('f_situacao').value, demissao = situacao === 'Desligado' ? (v('demissao') || null) : null;
  if (situacao === 'Desligado' && !demissao) return erro('Informe a data do desligamento.');
  const o = k => v(k) || null;
  const dados = {nome: v('nome'), codigo: o('codigo'), cargo: o('cargo'), cbo: o('cbo'), departamento: o('departamento'), filial: o('filial'), centro_custo: o('centro_custo'), lotacao: o('lotacao'), obra: o('obra'),
    tipo_salario: v('tipo_salario'), admissao: o('admissao'), jornada, horario, ponto_auto: $('f_ponto_auto').checked, situacao, demissao, email: o('email'), tel: o('tel'), dependentes: Math.max(0, Math.round(+v('dependentes') || 0)), banco: o('banco')};
  await comBotao(btn, async () => {
    try {
      let novoId = id;
      if (id) await q(sb.from('colaboradores').update(dados).eq('id', id));
      else novoId = (await q(sb.from('colaboradores').insert({...dados, cpf}).select('id').single())).id;
      await carregarEquipe(); render(); verColab(novoId);
      toast(id ? 'Cadastro atualizado.' : `${primeiro(dados.nome)} cadastrado(a).`);
    } catch (x) { erro(erroMsg(x)); }
  });
}
function excluirColab(id) {
  const c = cacheEquipe.find(x => x.id === id);
  sheet('Excluir colaborador', `<p>Excluir <b>${esc(c.nome)}</b>? A folha de ponto e os holerites dessa pessoa também serão apagados. Isso não pode ser desfeito.</p>`,
    [['Voltar', 'ghost', `editarColab('${id}')`], ['Excluir', 'danger', `confirmarExclusao('${id}',this)`]]);
}
async function confirmarExclusao(id, btn) {
  await comBotao(btn, async () => {
    try {
      const c = cacheEquipe.find(x => x.id === id);
      if (c && c.user_id) await q(sb.rpc('resetar_acesso', {p_colab: id}));   // remove o login
      await q(sb.from('colaboradores').delete().eq('id', id));
      fecharSheet(); render(); toast('Colaborador excluído.');
    } catch (e) { toast(erroMsg(e)); }
  });
}

/* ---- folha de ponto: RH preenche o mês inteiro ---- */
let edFolha = null;
async function editarFolha(id, ref) {
  const c = cacheEquipe.find(x => x.id === id);
  sheetCarregando('Folha de ponto');
  const regs = await q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', id).gte('dia', ref + '-01').lte('dia', fimDoMes(ref)));
  edFolha = {id, ref, orig: Object.fromEntries(regs.map(r => [String(r.dia).slice(0, 10), r]))};
  const fer = feriadosDoAno(+ref.slice(0, 4)), jor = c.jornada || [];
  let html = `<div class="muted" style="margin-bottom:8px">${esc(c.nome)} · ${refLabel(ref)}</div>
    <div class="card no-print"><div class="card-b">
      <div style="font-weight:600;margin-bottom:6px">Preencher rápido</div>
      <div class="t4">${ROT.map((r, i) => `<input id="pd${i}" inputmode="numeric" placeholder="${['07:00', '12:00', '13:00', '17:00'][i]}" aria-label="${r} padrão">`).join('')}</div>
      <button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="preencherPadrao()">Copiar para os dias de trabalho vazios</button>
    </div></div>
    ${pontoAuto(c) ? `<div class="aviso-auto">⏱ <b>Ponto automático ligado.</b> Dias em branco contam como trabalhados no horário padrão (o cinza claro). Lance só o que mudou: horário diferente, ou escolha <b>Falta</b>, Atestado, Folga etc. em Ocorrência. Para <b>abonar</b> uma falta ou horas a menos, escolha <b>Abonado</b> (ou Atestado) e escreva o motivo em Observação.</div>` : ''}
    <div class="muted" style="font-size:12.5px;margin:2px 2px 8px">Digite só números (0700 vira 07:00). Turno que passa da meia-noite pode: ex. entrada 22:00 e saída 06:00. Também dá para copiar as horas de uma planilha do Excel e colar na primeira célula.</div>
    <div class="ed-scroll"><table class="ed"><thead><tr><th>Dia</th><th>Entrada</th><th>Saída</th><th>Entrada</th><th>Saída</th><th>Ocorrência</th><th>Observação</th></tr></thead><tbody>`;
  for (let d = 1; d <= diasNoMes(ref); d++) {
    const iso = `${ref}-${String(d).padStart(2, '0')}`, dw = dataObj(iso).getDay(), r = edFolha.orig[iso] || {}, m = r.marcacoes || [];
    const cinza = dw === 0 || dw === 6 || fer[iso];
    const ph = !edFolha.orig[iso] && pontoAuto(c) && noContrato(c, iso) && !fer[iso] && toMin(jor[dw]) ? horarioDia(c, dw) : [];
    html += `<tr class="${cinza ? 'cinza' : ''}" data-iso="${iso}" data-trab="${jor[dw] && !fer[iso] ? 1 : 0}">
      <th title="${esc(fer[iso] || '')}">${String(d).padStart(2, '0')}/${ref.slice(5, 7)}<small>${DIAS[dw]}${fer[iso] ? ' · feriado' : ''}</small></th>
      ${ROT.map((rt, i) => `<td><input class="hr-in" inputmode="numeric" aria-label="${rt} ${d}" value="${esc(m[i] || '')}" placeholder="${esc(ph[i] || '')}" maxlength="5" data-l="${d - 1}" data-c="${i}" onblur="this.value=normHora(this.value)??this.value" onkeydown="navFolha(event,this)" onpaste="colarFolha(event,this)"></td>`).join('')}
      <td><select aria-label="Ocorrência ${d}" data-l="${d - 1}" data-c="4">${OCORRENCIAS.map(o => `<option value="${o}" ${o === (r.ocorrencia || '') ? 'selected' : ''}>${o || '—'}</option>`).join('')}</select></td>
      <td><input class="obs-in" aria-label="Observação ${d}" value="${esc(r.observacao || '')}" maxlength="80" data-l="${d - 1}" data-c="5" onkeydown="navFolha(event,this)" onpaste="colarFolha(event,this)"></td>
    </tr>`;
  }
  html += '</tbody></table></div><div class="err hide" id="fErr" style="margin-top:10px"></div>';
  sheet('Folha de ponto', html, [['Cancelar', 'ghost', `verColab('${id}')`], ['Salvar mês', 'primary', 'salvarFolha(this)']]);
  document.querySelector('.sheet')?.classList.add('sheet-larga');
}
const celFolha = (l, c) => document.querySelector(`table.ed [data-l="${l}"][data-c="${c}"]`);
// Enter ou seta para baixo/cima: muda de linha, como no Excel
function navFolha(ev, el) {
  const l = +el.dataset.l, c = +el.dataset.c, mv = {Enter: [1, 0], ArrowDown: [1, 0], ArrowUp: [-1, 0]}[ev.key];
  if (!mv) return;
  const alvo = celFolha(l + mv[0], c + mv[1]); if (alvo) { ev.preventDefault(); alvo.focus(); alvo.select && alvo.select(); }
}
// Colar um bloco copiado do Excel (linhas = dias, colunas = Entrada, Saída, Entrada, Saída, Ocorrência, Observação)
function colarFolha(ev, el) {
  const txt = (ev.clipboardData || window.clipboardData).getData('text');
  if (!/[\t\n]/.test(txt.trim())) return;
  ev.preventDefault();
  const l0 = +el.dataset.l, c0 = +el.dataset.c; let n = 0;
  txt.replace(/\r/g, '').replace(/\n$/, '').split('\n').forEach((linha, i) => linha.split('\t').forEach((v, j) => {
    const cel = celFolha(l0 + i, c0 + j); if (!cel) return; v = v.trim();
    if (cel.tagName === 'SELECT') { const o = OCORRENCIAS.find(x => x && semAcento(x) === semAcento(v)); cel.value = o || ''; }
    else cel.value = cel.classList.contains('hr-in') ? (normHora(v) ?? v) : v;
    n++;
  }));
  toast(`${n} célula(s) colada(s). Confira e toque em Salvar mês.`);
}
function preencherPadrao() {
  const p = ROT.map((_, i) => normHora($('pd' + i).value));
  if (p.some(x => !x)) return toast('Preencha os 4 horários padrão (ex.: 0700, 1200, 1300, 1700).');
  let n = 0;
  document.querySelectorAll('table.ed tbody tr').forEach(el => {
    if (el.dataset.trab !== '1') return;
    const ins = el.querySelectorAll('.hr-in'), oc = el.querySelector('select').value;
    if (oc || [...ins].some(i => i.value.trim())) return;
    ins.forEach((inp, i) => inp.value = p[i]); n++;
  });
  toast(n ? `${n} dia(s) preenchido(s). Ajuste os que forem diferentes.` : 'Nenhum dia de trabalho vazio para preencher.');
}
async function salvarFolha(btn) {
  const {id, ref, orig} = edFolha, ups = [], dels = [], e = $('fErr');
  const erro = m => { e.textContent = m; e.classList.remove('hide'); e.scrollIntoView({block:'center'}); };
  for (const el of document.querySelectorAll('table.ed tbody tr')) {
    const iso = el.dataset.iso, d = isoBR(iso).slice(0, 5);
    const vals = [...el.querySelectorAll('.hr-in')].map(i => normHora(i.value));
    if (vals.some(v => v === null)) return erro(`Dia ${d}: horário inválido. Use o formato 07:00.`);
    const ult = vals.map(v => !!v).lastIndexOf(true);
    if (vals.slice(0, ult + 1).some(v => !v)) return erro(`Dia ${d}: preencha os horários em ordem, sem pular.`);
    const m = vals.slice(0, ult + 1);
    if (m.length && !minutosCorridos(m)) return erro(`Dia ${d}: os horários passam de 24 horas. Confira a ordem.`);
    const oc = el.querySelector('select').value || null, obs = el.querySelector('.obs-in').value.trim() || null;
    if (m.length || oc || obs) ups.push({colaborador_id: id, dia: iso, marcacoes: m, ocorrencia: oc, observacao: obs});
    else if (orig[iso]) dels.push(iso);
  }
  await comBotao(btn, async () => {
    try {
      if (ups.length) await q(sb.from('pontos').upsert(ups, {onConflict: 'colaborador_id,dia'}));
      for (const iso of dels) await q(sb.from('pontos').delete().eq('colaborador_id', id).eq('dia', iso));
      const tinhaOk = (await q(sb.from('confirmacoes').select('ref').eq('colaborador_id', id).eq('ref', ref))).length;
      if (tinhaOk) await q(sb.from('confirmacoes').delete().eq('colaborador_id', id).eq('ref', ref));
      toast(tinhaOk ? `Folha salva. Como mudou, o colaborador precisa assinar de novo.` : `Folha de ${refLabel(ref)} salva.`); verFolhaRH(id, ref);
    } catch (x) { erro(erroMsg(x)); }
  });
}
async function verFolhaRH(id, ref) {
  const c = cacheEquipe.find(x => x.id === id);
  sheetCarregando('Folha de ponto');
  const [regs, conf] = await Promise.all([
    q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', id).gte('dia', ref + '-01').lte('dia', fimDoMes(ref))),
    q(sb.from('confirmacoes').select('ref,confirmado_em,assinatura,codigo,ip').eq('colaborador_id', id).eq('ref', ref).maybeSingle())]);
  document.body.classList.add('imprimindo-sheet');
  sheet(`Folha · ${refLabel(ref)}`, `<div class="mes-nav no-print">
      <button class="btn btn-ghost btn-sm" aria-label="Mês anterior" onclick="verFolhaRH('${id}','${somaMes(ref, -1)}')">‹</button><div>${refLabel(ref)}</div>
      <button class="btn btn-ghost btn-sm" aria-label="Próximo mês" onclick="verFolhaRH('${id}','${somaMes(ref, 1)}')">›</button></div>
    <div class="muted no-print" style="margin-bottom:8px">${conf ? `<span style="color:var(--green)">✓ Colaborador assinou em ${dataHora(conf.confirmado_em)}</span>` : 'Ainda sem assinatura do colaborador.'}</div>
    ${folhaHTML(c, ref, regs, conf)}`,
    [['Voltar', 'ghost', `verColab('${id}')`], ['Editar', 'primary', `editarFolha('${id}','${ref}')`]]);
  document.body.classList.add('imprimindo-sheet');
}

/* ---- holerites ---- */
async function vRhHol() {
  const [l] = await Promise.all([q(sb.from('holerites').select('id,colaborador_id,ref,itens').order('ref', {ascending:false}).limit(500)), carregarEquipe()]);
  const grupos = {};
  const mt = mesTrab();
  l.sort((a, b) => b.ref.localeCompare(a.ref) || nomeDe(a.colaborador_id).localeCompare(nomeDe(b.colaborador_id))).filter(h => holTodos || h.ref === mt).forEach(h => (grupos[h.ref] = grupos[h.ref] || []).push(h));
  const outros = l.filter(h => h.ref !== mt).length;
  return `${barraMesRH()}<div class="stack" style="margin-bottom:14px"><button class="btn btn-primary" onclick="abrirImportacao()">Importar holerites (Excel)</button><button class="btn btn-ghost" onclick="editarHolerite()">${sv(IC.plus, 18)} Lançar holerite à mão</button></div>
  ${Object.keys(grupos).length ? Object.keys(grupos).map(ref => `<div class="sec-t">${refLabel(ref)}</div><div class="card">${grupos[ref].map(h => `<button class="item" onclick="editarHolerite(${h.id})">
    <div class="av">${esc(ini(nomeDe(h.colaborador_id)))}</div><div><div class="t">${esc(nomeDe(h.colaborador_id))}</div><div class="d">Líquido ${BRL(totais(h).l)}</div></div><span class="chev">${sv(IC.chev)}</span></button>`).join('')}</div>`).join('')
  : `<div class="card"><div class="empty">Nenhum holerite lançado em ${refLabel(mt)}.</div></div>`}
  ${outros || holTodos ? `<button class="btn btn-ghost" style="margin-top:12px;width:100%" onclick="holTodos=!holTodos;render()">${holTodos ? 'Mostrar só ' + refLabel(mt) : 'Ver holerites de todos os meses (' + outros + ')'}</button>` : ''}`;
}
/* =====================================================
   CÁLCULO DA FOLHA DE PAGAMENTO (tabelas de 2026)
   INSS: Portaria Interministerial MPS/MF nº 13/2026.
   IRRF: tabela mensal 2026 + redução da Lei 15.270/2025.
   ===================================================== */
const PARAM = {
  ano: 2026,
  inss: [[1621.00, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]],
  irrf: [[2428.80, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]],
  dependente: 189.59, simplificado: 607.20, fgts: 0.08
};
const r2 = v => Math.round((+v || 0) * 100) / 100;
const dec = v => num(v);   // 10,50
function calcINSS(base) {
  let ant = 0, imp = 0;
  for (const [lim, al] of PARAM.inss) { if (base > ant) imp += (Math.min(base, lim) - ant) * al; ant = lim; }
  return r2(imp);
}
function calcIRRF(tributavel, inss, dependentes) {
  const legal = tributavel - inss - dependentes * PARAM.dependente, simpl = tributavel - PARAM.simplificado;
  const base = r2(Math.max(0, Math.min(legal, simpl)));
  const fx = PARAM.irrf.find(([lim]) => base <= lim);
  let imp = Math.max(0, base * fx[1] - fx[2]);
  let red = 0;
  if (tributavel <= 5000) red = imp;
  else if (tributavel <= 7350) red = Math.max(0, 978.62 - 0.133145 * tributavel);
  imp = r2(Math.max(0, imp - red));
  return {base, aliquota: r2(fx[1] * 100), imposto: imp, simplificado: simpl < legal};
}
// horas do mês pela jornada semanal (44h → 220h)
function horasMes(colab) {
  const jor = colab.jornada && colab.jornada.length === 7 ? colab.jornada : ['', '09:00', '09:00', '09:00', '09:00', '08:00', ''];
  const sem = jor.reduce((a, t) => a + toMin(t), 0) / 60;
  return sem ? Math.round(sem * 5) : 220;
}
const valorHora = colab => (+colab.salario || 0) / horasMes(colab);
// Dias úteis (seg a sáb, sem feriado) e dias de repouso (domingos e feriados) do mês — base do DSR
function diasDSR(ref) {
  const fer = feriadosDoAno(+ref.slice(0, 4)); let uteis = 0, rep = 0;
  for (let d = 1; d <= diasNoMes(ref); d++) { const iso = `${ref}-${String(d).padStart(2, '0')}`; if (dataObj(iso).getDay() === 0 || fer[iso]) rep++; else uteis++; }
  return {uteis, rep};
}
function gerarHolerite(colab, ref, registros, op = {}) {
  const {T} = calcularFolha(colab, ref, registros);
  const sal = +colab.salario || 0, hMes = horasMes(colab), vh = sal / hMes;
  const dep = op.dependentes ?? (+colab.dependentes || 0), adiant = +op.adiantamento || 0;
  const it = [], P = (codigo, desc, refx, valor, tipo = 'p') => { valor = r2(valor); if (valor > 0) it.push({codigo, desc, ref: refx, tipo, valor}); };
  P('1', 'HORAS NORMAIS', dec(hMes), sal);
  const h = m => m / 60;
  const e50 = h(T.e50) * vh * 1.5, e100 = h(T.e100) * vh * 2, e110 = h(T.e110) * vh * 2.1;
  P('201', 'HORAS EXTRAS 50%', dec(h(T.e50)), e50);
  P('200', 'HORAS EXTRAS 100%', dec(h(T.e100)), e100);
  P('205', 'HORAS EXTRAS 110%', dec(h(T.e110)), e110);
  let vnot = 0;
  for (const [k, cod] of [[20, '25'], [100, '26'], [110, '27']]) { const hn = T['n' + k] / HORA_NOTURNA, v = r2(hn * vh * k / 100); vnot += v; P(cod, `ADICIONAL NOTURNO ${k}%`, dec(hn), v); }
  const {uteis, rep} = diasDSR(ref), he = r2(e50) + r2(e100) + r2(e110) + r2(vnot);
  const dsr = uteis ? he / uteis * rep : 0;
  P('250', T.not ? 'REFLEXO EXTRAS/NOTURNO DSR' : 'REFLEXO EXTRAS DSR', `${rep}/${uteis}`, dsr);
  const atr = h(T.atraso) * vh;
  P('910', 'ATRASOS / FALTAS', dec(h(T.atraso)), atr, 'd');
  const tributavel = r2(it.filter(i => i.tipo === 'p').reduce((a, i) => a + i.valor, 0) - r2(atr));
  const baseINSS = Math.max(0, tributavel), contrib = Math.min(baseINSS, PARAM.inss.at(-1)[0]), inss = calcINSS(baseINSS);
  P('998', 'I.N.S.S.', dec(contrib ? inss / contrib * 100 : 0), inss, 'd');
  const ir = calcIRRF(baseINSS, inss, dep);
  P('999', 'I.R.R.F.', dec(ir.aliquota), ir.imposto, 'd');
  P('981', 'DESC.ADIANT.SALARIAL', '', adiant, 'd');
  return {itens: it, rodape: {salario_base: r2(sal), sal_contr_inss: r2(contrib), base_fgts: baseINSS, fgts_mes: r2(baseINSS * PARAM.fgts), base_irrf: ir.base, faixa_irrf: ir.aliquota},
    info: {hMes, vh, uteis, rep, dep, simplificado: ir.simplificado, T}};
}
/* ---- tela: gerar holerite pela folha ---- */
function abrirGerador(colabId, ref, hid) {
  const c = cacheEquipe.find(x => x.id === colabId); if (!c) return;
  if (!(+c.salario)) return toast('Este colaborador não tem salário base. Importe o salário pela planilha (aba Colaboradores) antes de calcular.');
  sheet('Calcular holerite pela folha', `
    <p class="muted" style="margin-top:0">O portal lê a folha de ponto de <b>${esc(c.nome)}</b> e monta o holerite: horas normais, extras 50%/100%/110%, DSR sobre extras, atrasos e faltas, INSS, IRRF e FGTS (tabelas de ${PARAM.ano}). Depois você confere e salva.</p>
    <div class="field"><label for="gRef">Mês da folha</label><input id="gRef" type="month" value="${ref || mesTrab()}"></div>
    <div class="row2">
      <div class="field"><label for="gDep">Dependentes (IRRF)</label><input id="gDep" type="number" min="0" step="1" inputmode="numeric" value="${+c.dependentes || 0}"></div>
      <div class="field"><label for="gAd">Adiantamento já pago (R$)</label><input id="gAd" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00"></div>
    </div>
    <div class="err hide" id="gErr"></div>`,
    [['Cancelar', 'ghost', hid ? 'desenharHolerite()' : `verColab('${colabId}')`], ['Calcular', 'primary', `calcularPelaFolha('${colabId}',${hid || 0},this)`]]);
}
async function calcularPelaFolha(colabId, hid, btn) {
  const c = cacheEquipe.find(x => x.id === colabId), ref = $('gRef').value, e = $('gErr');
  if (!ref) { e.textContent = 'Escolha o mês.'; return e.classList.remove('hide'); }
  const dep = Math.max(0, Math.round(+$('gDep').value || 0)), adiant = +$('gAd').value || 0;
  await comBotao(btn, async () => {
    try {
      const [regs, ex] = await Promise.all([
        q(sb.from('pontos').select('dia,marcacoes,ocorrencia,observacao').eq('colaborador_id', colabId).gte('dia', ref + '-01').lte('dia', fimDoMes(ref))),
        q(sb.from('holerites').select('id,obs').eq('colaborador_id', colabId).eq('ref', ref).maybeSingle())]);
      if (!temFolha(c, ref, regs)) { e.textContent = `Não há folha de ponto em ${refLabel(ref)}. Preencha a folha primeiro.`; return e.classList.remove('hide'); }
      const g = gerarHolerite(c, ref, regs, {dependentes: dep, adiantamento: adiant});
      const id = hid || (ex && ex.id) || 0;
      rascunho = {id, colabId, ref, obs: rascunho && rascunho.id === id && rascunho.colabId === colabId ? rascunho.obs : (ex && ex.obs) || '', itens: g.itens, rodape: g.rodape, calc: g.info};
      desenharHolerite();
      toast(id ? `Holerite de ${refLabel(ref)} recalculado. Confira e salve.` : 'Holerite calculado. Confira e salve.');
    } catch (x) { e.textContent = erroMsg(x); e.classList.remove('hide'); }
  });
}
function notaCalculo(i) {
  if (!i) return '';
  return `<div class="calc-nota">Calculado pela folha de ponto: ${dec(i.hMes)} h/mês · valor da hora ${BRL(i.vh)} · DSR com ${i.rep} dias de repouso e ${i.uteis} dias úteis · ${i.dep} dependente(s)${i.simplificado ? ' · IRRF pelo desconto simplificado' : ''}. Você pode ajustar qualquer linha antes de salvar.</div>`;
}
let rascunho = null;
const ITENS_PADRAO = sal => [
  {codigo:'1', desc:'HORAS NORMAIS', ref:'220,00', tipo:'p', valor: sal || ''},
  {codigo:'200', desc:'HORAS EXTRAS 100%', ref:'', tipo:'p', valor:''},
  {codigo:'998', desc:'I.N.S.S.', ref:'', tipo:'d', valor:''}
];
async function editarHolerite(hid, colabId) {
  if (!cacheEquipe.length) await carregarEquipe();
  if (!cacheEquipe.length) return toast('Cadastre um colaborador primeiro.');
  let h = null;
  if (hid) { sheetCarregando('Holerite'); try { h = await q(sb.from('holerites').select('*').eq('id', hid).single()); } catch (e) { fecharSheet(); return toast(erroMsg(e)); } }
  const cid = h ? h.colaborador_id : (colabId || cacheEquipe[0].id);
  const sal = (cacheEquipe.find(c => c.id === cid) || {}).salario || '';
  // Holerite anterior serve de modelo (mesmos códigos e descrições)
  let modelo = null;
  if (!h) { try { modelo = (await q(sb.from('holerites').select('itens').eq('colaborador_id', cid).order('ref', {ascending:false}).limit(1)))[0]; } catch (e) {} }
  rascunho = {id: hid || 0, colabId: cid, ref: h ? h.ref : mesTrab(), obs: h ? (h.obs || '') : '',
    itens: h ? JSON.parse(JSON.stringify(h.itens)) : modelo ? modelo.itens.map(i => ({...i, valor: i.codigo === '1' ? sal : '', ref: i.codigo === '1' ? i.ref : ''})) : ITENS_PADRAO(sal),
    rodape: h ? {...(h.rodape || {})} : {salario_base: sal}};
  desenharHolerite();
}
function trocarColabHol(v) {
  rascunho.colabId = v;
  const sal = (cacheEquipe.find(c => c.id === v) || {}).salario || '';
  if (!rascunho.id) { rascunho.rodape.salario_base = sal; const s = rascunho.itens.find(i => i.codigo === '1'); if (s) s.valor = sal; desenharHolerite(); }
}
const RODAPE = [['salario_base', 'Salário base'], ['sal_contr_inss', 'Sal. contr. INSS'], ['base_fgts', 'Base cálc. FGTS'], ['fgts_mes', 'FGTS do mês'], ['base_irrf', 'Base cálc. IRRF'], ['faixa_irrf', 'Faixa IRRF']];
function desenharHolerite() {
  const r = rascunho, t = totais(r);
  sheet(r.id ? 'Editar holerite' : 'Lançar holerite', `
    <div class="field"><label for="hC">Colaborador</label><select id="hC" ${r.id ? 'disabled' : ''} onchange="trocarColabHol(this.value)">${cacheEquipe.map(c => `<option value="${c.id}" ${c.id === r.colabId ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></div>
    <div class="field"><label for="hR">Mês de referência</label><input id="hR" type="month" value="${r.ref}" onchange="rascunho.ref=this.value"></div>
    ${r.id ? `<div id="hAss" class="muted" style="margin:-4px 0 10px"></div>` : ''}
    ${notaCalculo(r.calc)}
    <button class="btn btn-ghost btn-sm" style="margin-bottom:6px" onclick="abrirGerador(rascunho.colabId, rascunho.ref, rascunho.id)">Calcular pela folha de ponto</button>
    <div class="sec-t">Verbas (código · descrição · referência · valor)</div>
    ${r.itens.map((i, k) => `<div class="hl-line">
      <input aria-label="Código" placeholder="Cód." inputmode="numeric" value="${esc(i.codigo || '')}" oninput="rascunho.itens[${k}].codigo=this.value">
      <input aria-label="Descrição" placeholder="Descrição" value="${esc(i.desc)}" oninput="rascunho.itens[${k}].desc=this.value">
      <button aria-label="Remover linha" onclick="rascunho.itens.splice(${k},1);desenharHolerite()">${sv(IC.x, 18)}</button>
      <div class="r2">
        <input aria-label="Referência" placeholder="Referência" value="${esc(i.ref || '')}" oninput="rascunho.itens[${k}].ref=this.value">
        <input aria-label="Valor" type="number" step="0.01" min="0" inputmode="decimal" placeholder="Valor" value="${esc(i.valor)}" oninput="rascunho.itens[${k}].valor=this.value;atualizarTot()">
        <select aria-label="Tipo" onchange="rascunho.itens[${k}].tipo=this.value;atualizarTot()"><option value="p" ${i.tipo === 'p' ? 'selected' : ''}>Vencimento</option><option value="d" ${i.tipo === 'd' ? 'selected' : ''}>Desconto</option></select>
      </div>
    </div>`).join('')}
    <button class="btn btn-ghost btn-sm" onclick="rascunho.itens.push({codigo:'',desc:'',ref:'',tipo:'p',valor:''});desenharHolerite()">${sv(IC.plus, 16)} Adicionar verba</button>
    <div id="hTot" style="margin-top:14px">${totHTML(t)}</div>
    <div class="sec-t" style="margin-top:12px">Rodapé do holerite</div>
    <div class="row2">${RODAPE.map(([k, lb]) => `<div class="field"><label for="hr_${k}">${lb}</label><input id="hr_${k}" type="number" step="0.01" min="0" inputmode="decimal" value="${esc(r.rodape[k] ?? '')}" oninput="rascunho.rodape['${k}']=this.value"></div>`).join('')}</div>
    <button class="btn btn-ghost btn-sm" onclick="calcRodape()">Calcular rodapé (bases INSS, FGTS e IRRF)</button>
    <div class="field" style="margin-top:12px"><label for="hO">Observação (opcional)</label><textarea id="hO" rows="2" oninput="rascunho.obs=this.value">${esc(r.obs)}</textarea></div>
    <div class="err hide" id="hErr"></div>
    <div class="stack">
      <button class="btn btn-ghost" onclick="previaHolerite()">Ver como o colaborador vê</button>
      ${r.id ? `<button class="btn btn-danger" onclick="excluirHolerite(${r.id})">Excluir holerite</button>` : ''}
    </div>`,
    [['Cancelar', 'ghost', 'fecharSheet()'], ['Salvar', 'primary', 'salvarHolerite(this)']]);
  if (r.id) q(sb.from('assinaturas_holerite').select('assinado_em').eq('holerite_id', r.id).maybeSingle()).then(a => { const e = $('hAss'); if (e) e.innerHTML = a
    ? `<span style="color:var(--green)">✓ Assinado pelo colaborador em ${dataHora(a.assinado_em)}.</span> Se você mudar e salvar, a assinatura é apagada e ele assina de novo. <button class="linkbtn" onclick="verHolerite(${r.id})">Ver holerite assinado</button>`
    : 'O colaborador ainda não assinou este holerite.'; }).catch(() => {});
}
function calcRodape() {
  const r = rascunho, c = cacheEquipe.find(x => x.id === r.colabId) || {}, it = r.itens.map(i => ({...i, valor: +i.valor || 0}));
  const isento = i => /AJUDA DE CUSTO/i.test(i.desc), reduz = i => i.tipo === 'd' && /ATRASO|FALTA/i.test(i.desc);
  const trib = Math.max(0, r2(it.filter(i => i.tipo === 'p' && !isento(i)).reduce((a, i) => a + i.valor, 0) - it.filter(reduz).reduce((a, i) => a + i.valor, 0)));
  const ir = calcIRRF(trib, calcINSS(trib), +c.dependentes || 0);
  Object.assign(r.rodape, {sal_contr_inss: r2(Math.min(trib, PARAM.inss.at(-1)[0])), base_fgts: trib, fgts_mes: r2(trib * PARAM.fgts), base_irrf: ir.base, faixa_irrf: ir.aliquota});
  if (!r.rodape.salario_base) r.rodape.salario_base = c.salario || '';
  RODAPE.forEach(([k]) => $('hr_' + k).value = r.rodape[k] ?? '');
  toast('Rodapé calculado com as tabelas de ' + PARAM.ano + '.');
}
function previaHolerite() {
  const c = cacheEquipe.find(x => x.id === rascunho.colabId) || {};
  const h = {...rascunho, itens: rascunho.itens.filter(i => i.desc || +i.valor)};
  sheet(`Prévia · ${refLabel(h.ref)}`, holeriteHTML(h, c), [['Voltar e editar', 'primary', 'desenharHolerite()']]);
}
const totHTML = t => `<div class="kv"><span>Total de vencimentos</span><span>${BRL(t.p)}</span></div><div class="kv"><span>Total de descontos</span><span>${BRL(t.d)}</span></div><div class="tot-row"><span>Valor líquido</span><span>${BRL(t.l)}</span></div>`;
function atualizarTot() { $('hTot').innerHTML = totHTML(totais(rascunho)); }
async function salvarHolerite(btn) {
  const r = rascunho, e = $('hErr'), erro = m => { e.textContent = m; e.classList.remove('hide'); e.scrollIntoView({block:'center'}); };
  const itens = r.itens.filter(i => String(i.desc).trim() || +i.valor).map(i => ({codigo: String(i.codigo || '').trim(), desc: String(i.desc).trim(), ref: String(i.ref || '').trim(), tipo: i.tipo, valor: Math.round((+i.valor || 0) * 100) / 100}));
  if (!r.ref) return erro('Escolha o mês de referência.');
  if (!itens.length) return erro('Adicione pelo menos uma verba.');
  if (itens.some(i => !i.desc)) return erro('Toda verba precisa de uma descrição.');
  const rodape = {}; RODAPE.forEach(([k]) => { const v = r.rodape[k]; if (v !== '' && v != null) rodape[k] = Math.round(+v * 100) / 100; });
  await comBotao(btn, async () => {
    try {
      if (r.id) await q(sb.from('holerites').update({ref: r.ref, itens, rodape, obs: r.obs || null}).eq('id', r.id));
      else await q(sb.from('holerites').insert({colaborador_id: r.colabId, ref: r.ref, itens, rodape, obs: r.obs || null}));
      fecharSheet(); render(); toast(`Holerite de ${refLabel(r.ref)} salvo para ${primeiro(nomeDe(r.colabId))}.`);
    } catch (x) { erro(erroMsg(x)); }
  });
}
function excluirHolerite(id) {
  sheet('Excluir holerite', '<p>Excluir este holerite? O colaborador deixa de vê-lo.</p>',
    [['Voltar', 'ghost', 'desenharHolerite()'], ['Excluir', 'danger', `apagarHolerite(${id},this)`]]);
}
async function apagarHolerite(id, btn) {
  await comBotao(btn, async () => {
    try { await q(sb.from('holerites').delete().eq('id', id)); fecharSheet(); render(); toast('Holerite excluído.'); }
    catch (e) { toast(erroMsg(e)); }
  });
}

/* ---- avisos ---- */
async function vAvisos() {
  const l = await q(sb.from('avisos').select('*').order('criado_em', {ascending:false}).limit(100));
  return `<div class="card"><div class="card-b">
    <div class="field"><label for="aT">Título</label><input id="aT" maxlength="80" placeholder="Ex.: Feriado na sexta"></div>
    <div class="field"><label for="aX">Mensagem</label><textarea id="aX" rows="3" maxlength="600" placeholder="O que os colaboradores precisam saber?"></textarea></div>
    <div class="err hide" id="aErr"></div>
    <button class="btn btn-primary" onclick="publicarAviso(this)">Publicar para todos</button>
  </div></div>
  <div class="sec-t">Publicados</div>
  <div class="card">${l.length ? l.map(a => `<div class="aviso" style="display:flex;gap:10px"><div style="flex:1;min-width:0"><div class="t">${esc(a.titulo)}</div><div class="x">${esc(a.texto)}</div><div class="d">${isoBR(a.criado_em)}</div></div>
    <button class="btn btn-danger btn-sm" style="align-self:flex-start" onclick="apagarAviso(${a.id},this)">Apagar</button></div>`).join('') : '<div class="empty">Nenhum aviso publicado.</div>'}</div>`;
}
async function publicarAviso(btn) {
  const t = $('aT').value.trim(), x = $('aX').value.trim();
  if (!t || !x) { $('aErr').textContent = 'Preencha título e mensagem.'; $('aErr').classList.remove('hide'); return; }
  await comBotao(btn, async () => {
    try { await q(sb.from('avisos').insert({titulo: t, texto: x})); render(); toast('Aviso publicado.'); }
    catch (e) { toast(erroMsg(e)); }
  });
}
async function apagarAviso(id, btn) {
  await comBotao(btn, async () => {
    try { await q(sb.from('avisos').delete().eq('id', id)); render(); toast('Aviso apagado.'); }
    catch (e) { toast(erroMsg(e)); }
  });
}

/* ---- empresa e conta do RH ---- */
async function vMais() {
  empresa = comLogoPadrao((await q(sb.from('empresa').select('*').maybeSingle())) || empresa);
  return `<div class="card"><div class="card-h"><h3>Dados da empresa</h3></div><div class="card-b">
    <p class="muted" style="margin-bottom:12px">Aparecem no topo da folha de ponto e do holerite.</p>
    <div class="field"><label for="eN">Razão social</label><input id="eN" value="${esc(empresa.nome || '')}"></div>
    <div class="field"><label for="eC">CNPJ</label><input id="eC" inputmode="numeric" value="${esc(empresa.cnpj || '')}" placeholder="00.000.000/0000-00"></div>
    <div class="field"><label>Logotipo (aparece na folha de ponto)</label>
      <div style="display:flex;gap:10px;align-items:center">
        <div id="eLogoPrev" style="width:120px;height:44px;border:1px dashed var(--line);border-radius:8px;display:grid;place-items:center;background:#2d4a9c;overflow:hidden">${empresa.logo ? `<img src="${esc(empresa.logo)}" style="max-width:110px;max-height:38px;background:#fff;padding:2px 4px;border-radius:4px">` : '<span style="color:#fff;font-size:11px">sem logo</span>'}</div>
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">Escolher imagem<input type="file" accept="image/*" style="display:none" onchange="carregarLogo(this.files[0])"></label>
        ${empresa.logo ? '<button class="linkbtn" onclick="removerLogo()">Remover</button>' : ''}
      </div></div>
    <button class="btn btn-primary" onclick="salvarEmpresa(this)">Salvar dados da empresa</button>
  </div></div>
  <div class="card"><div class="card-h"><h3>Conta do RH</h3></div><div class="card-b">${kv('E-mail', sess.email)}</div></div>
  <div class="stack">
    <button class="btn btn-ghost" onclick="trocarSenha()">Alterar senha do RH</button>
    <button class="btn btn-danger" onclick="sair()">Sair</button>
  </div>
  <p class="muted" style="margin-top:16px;padding:0 4px">Dica: no celular, use “Adicionar à tela de início” no navegador para o portal abrir como um aplicativo.</p>`;
}
function removerLogo() { empresa.logo = null; $('eLogoPrev').innerHTML = '<span style="color:#fff;font-size:11px">sem logo</span>'; toast('Logo removido. Toque em Salvar para gravar.'); }
function carregarLogo(file) {
  if (!file) return;
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const esc2 = Math.min(1, 360 / img.width, 120 / img.height), cv = document.createElement('canvas');
    cv.width = Math.round(img.width * esc2); cv.height = Math.round(img.height * esc2);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    empresa.logo = cv.toDataURL('image/png'); URL.revokeObjectURL(url);
    $('eLogoPrev').innerHTML = `<img src="${empresa.logo}" style="max-width:110px;max-height:38px;background:#fff;padding:2px 4px;border-radius:4px">`;
    toast('Logo carregado. Toque em Salvar para gravar.');
  };
  img.onerror = () => toast('Não consegui abrir essa imagem.');
  img.src = url;
}
async function salvarEmpresa(btn) {
  const nome = $('eN').value.trim(); if (!nome) return toast('Informe a razão social.');
  await comBotao(btn, async () => {
    try { await q(sb.from('empresa').update({nome, cnpj: $('eC').value.trim() || null, logo: empresa.logo || null}).eq('id', 1)); empresa = {...empresa, nome, cnpj: $('eC').value.trim()}; render(); toast('Dados da empresa salvos.'); }
    catch (e) { toast(erroMsg(e)); }
  });
}

/* =====================================================
   IMPORTAÇÃO POR PLANILHA (Excel .xlsx ou .csv)
   ===================================================== */
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
function carregarXLSX() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = XLSX_URL;
    s.onload = () => ok(window.XLSX); s.onerror = () => falha(new Error('Não foi possível carregar o leitor de planilhas. Verifique a internet.'));
    document.head.appendChild(s);
  });
}
const ABAS = {
  colab: ['CPF', 'Nome', 'Código', 'Cargo', 'Obra', 'CBO', 'Departamento', 'Filial', 'Centro de custo', 'CC holerite', 'Tipo', 'Admissão', 'Salário', 'Dependentes', 'E-mail', 'Telefone', 'Banco', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom', 'Situação', 'Desligamento'],
  ponto: ['CPF', 'Data', 'Entrada', 'Saída almoço', 'Retorno almoço', 'Saída', 'Ocorrência', 'Observação'],
  hol: ['CPF', 'Mês', 'Código', 'Descrição', 'Referência', 'Vencimento', 'Desconto'],
  bases: ['CPF', 'Mês', 'Salário base', 'Sal. contr. INSS', 'Base cálc. FGTS', 'FGTS do mês', 'Base cálc. IRRF', 'Faixa IRRF']
};
const NOMES_ABAS = {colab: 'Colaboradores', ponto: 'Ponto', hol: 'Holerites', bases: 'Bases holerite'};
function modeloPlanilha() {
  const ex = mesAnterior(), mm = ex.slice(5, 7) + '/' + ex.slice(0, 4);
  const d = n => `${String(n).padStart(2, '0')}/${mm}`;
  return {
    Instruções: [['PORTAL DO COLABORADOR — PLANILHA DE IMPORTAÇÃO'], [''],
      ['Preencha as abas e importe no portal (RH → Equipe → Importar planilha). Pode usar só as abas que precisar.'],
      ['Apague as linhas de exemplo antes de importar.'], [''],
      ['Colaboradores', 'Um colaborador por linha. O CPF identifica a pessoa: se já existir, os dados são atualizados (células vazias não apagam nada).'],
      ['', 'Seg a Dom = jornada prevista do dia (ex.: 09:00). Deixe vazio nos dias sem expediente.'],
      ['Ponto', 'Um dia por linha. Data no formato dd/mm/aaaa e horários no formato 07:00.'],
      ['', 'Ocorrência (opcional): Feriado, Sem expediente, Folga, Atestado, Abonado, Férias ou Falta.'],
      ['', 'Se o colaborador já tinha assinado a folha do mês, ele precisará assinar de novo.'],
      ['Holerites', 'Uma verba por linha (mesmo CPF e mês = mesmo holerite). Preencha Vencimento OU Desconto. Mês no formato mm/aaaa.'],
      ['', 'Importar de novo o mesmo CPF e mês substitui o holerite inteiro.'],
      ['Bases holerite', 'Opcional: rodapé do holerite (uma linha por CPF e mês).']],
    Colaboradores: [ABAS.colab,
      ['111.111.111-11', 'Maria da Silva Exemplo', '30', 'Pedreira', 'Obra Centro', '715210', '2', '1', 'CT0001', 'Operacional', 'Mensalista', '08/06/2025', '2800,00', '1', 'maria@exemplo.com', '(00) 90000-0000', 'Banco 001 Ag 0001 CC 12345-6', '09:00', '09:00', '09:00', '09:00', '08:00', '', '', 'Ativo', ''],
      ['222.222.222-22', 'João Pereira Exemplo', '31', 'Servente', 'Obra Centro', '717020', '2', '1', 'CT0001', 'Operacional', 'Mensalista', '01/02/2026', '1900,00', '0', '', '', '', '09:00', '09:00', '09:00', '09:00', '08:00', '', '', 'Ativo', '']],
    Ponto: [ABAS.ponto,
      ['111.111.111-11', d(1), '06:58', '11:40', '12:42', '16:58', '', ''],
      ['111.111.111-11', d(2), '07:00', '11:40', '12:40', '19:01', '', 'Efetivo até 19h'],
      ['111.111.111-11', d(3), '', '', '', '', 'Sem expediente', '']],
    Holerites: [ABAS.hol,
      ['111.111.111-11', mm, '1', 'HORAS NORMAIS', '220,00', '2800,00', ''],
      ['111.111.111-11', mm, '200', 'HORAS EXTRAS 100%', '16,00', '407,27', ''],
      ['111.111.111-11', mm, '998', 'I.N.S.S.', '9,00', '', '320,50'],
      ['111.111.111-11', mm, '981', 'DESC.ADIANT.SALARIAL', '1.120,00', '', '1120,00']],
    'Bases holerite': [ABAS.bases, ['111.111.111-11', mm, '2800,00', '3207,27', '3207,27', '256,58', '2886,77', '0,00']]
  };
}
async function baixarModelo() {
  try {
    const X = await carregarXLSX(), wb = X.utils.book_new(), m = modeloPlanilha();
    Object.keys(m).forEach(n => { const ws = X.utils.aoa_to_sheet(m[n]); ws['!cols'] = m[n][0].map((_, i) => ({wch: n === 'Instruções' ? (i ? 110 : 16) : 16})); X.utils.book_append_sheet(wb, ws, n); });
    X.writeFile(wb, 'modelo-portal-do-colaborador.xlsx');
    toast('Planilha modelo baixada.');
  } catch (e) { toast('Este navegador bloqueou o download. ' + (e.message || '')); }
}
/* ---- Resumo de horas do mês, um colaborador por linha (Excel) ---- */
function abrirResumo() {
  sheet('Resumo de horas', `<p class="muted" style="margin-top:0">Baixa uma planilha com uma linha por colaborador: horas normais, extras 50%, 100% e 110%, atrasos, faltas e adicional noturno do mês.</p>
    <div class="field"><label for="rRef">Mês</label><input id="rRef" type="month" value="${mesTrab()}"></div>
    ${obras().length ? `<div class="field"><label for="rObra">Obra</label><select id="rObra"><option value="">Todas as obras</option>${obras().map(o => `<option ${o === filtroObra ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>` : ''}`,
    [['Fechar', 'ghost', 'fecharSheet()'], ['Baixar Excel', 'primary', 'baixarResumo(this)']]);
}
async function pontosDoMes(ref) {
  const out = [];
  for (let i = 0; ; i += 1000) {
    const l = await q(sb.from('pontos').select('colaborador_id,dia,marcacoes,ocorrencia,observacao').gte('dia', ref + '-01').lte('dia', fimDoMes(ref)).order('id').range(i, i + 999));
    out.push(...l); if (l.length < 1000) return out;
  }
}
function resumoColab(c, ref, regs) {
  const {dias, T} = calcularFolha(c, ref, regs);
  const faltas = dias.filter(x => !x.futuro && x.prev && !x.trab && !x.m.length && !x.abono);
  const minFalta = faltas.reduce((a, x) => a + x.atraso, 0), conta = oc => dias.filter(x => x.oc === oc).length;
  return {T, datasFalta: faltas.map(x => isoBR(x.iso).slice(0, 5)).join(', '), trabalhados: dias.filter(x => x.trab).length, faltas: faltas.length, minFalta, atraso: T.atraso - minFalta,
    normais: T.trab - T.extra, abonados: dias.filter(x => x.abono).map(x => isoBR(x.iso).slice(0, 5) + (x.obs ? ' (' + x.obs + ')' : '')).join(', '), ocorr: ['Atestado', 'Abonado', 'Férias', 'Folga', 'Feriado', 'Sem expediente'].map(o => [o, conta(o)]).filter(([, n]) => n).map(([o, n]) => `${o}: ${n}`).join(' · ')};
}
async function baixarResumo(btn) {
  const ref = $('rRef').value, obraSel = $('rObra') ? $('rObra').value : ''; if (!ref) return toast('Escolha o mês.');
  await comBotao(btn, async () => {
    try {
      const [X, equipe, regs, confs] = await Promise.all([carregarXLSX(), carregarEquipe(), pontosDoMes(ref), q(sb.from('confirmacoes').select('colaborador_id,confirmado_em').eq('ref', ref))]);
      const porColab = {}; regs.forEach(r => (porColab[r.colaborador_id] = porColab[r.colaborador_id] || []).push(r));
      const assin = Object.fromEntries(confs.map(c => [c.colaborador_id, c.confirmado_em]));
      const H = m => ({t: 'n', v: (m || 0) / 1440, z: '[h]:mm'});
      const cab = ['Colaborador', 'CPF', 'Cargo', 'Obra', 'Centro de custo', 'Dias trabalhados', 'Horas previstas', 'Horas trabalhadas', 'Horas normais',
        'Extras 50%', 'Extras 100%', 'Extras 110%', 'Total de extras', 'Atrasos', 'Faltas (dias)', 'Horas de falta', 'Dias das faltas', 'Horas abonadas', 'Dias abonados',
        'Noturno 20%', 'Noturno 100%', 'Noturno 110%', 'Total noturno', 'Outras ocorrências', 'Folha assinada'];
      const linhas = equipe.filter(c => temFolha(c, ref, porColab[c.id]) && (!obraSel || (c.obra || '') === obraSel)).sort((a, b) => (a.obra || '').localeCompare(b.obra || '') || a.nome.localeCompare(b.nome)).map(c => {
        const r = resumoColab(c, ref, porColab[c.id] || []), T = r.T;
        return [c.nome, fmtCPF(c.cpf), c.cargo || '', c.obra || '', c.centro_custo || '', r.trabalhados, H(T.prev), H(T.trab), H(r.normais),
          H(T.e50), H(T.e100), H(T.e110), H(T.extra), H(r.atraso), r.faltas, H(r.minFalta), r.datasFalta, H(T.abono), r.abonados,
          H(T.n20), H(T.n100), H(T.n110), H(T.not), r.ocorr, assin[c.id] ? 'Sim · ' + dataHora(assin[c.id]) : 'Não'];
      });
      if (!linhas.length) return toast(`Nenhuma folha lançada em ${refLabel(ref)}${obraSel ? ' na obra ' + obraSel : ''}.`);
      const soma = k => linhas.reduce((a, l) => a + (typeof l[k] === 'object' ? l[k].v * 1440 : +l[k] || 0), 0);
      const total = cab.map((_, k) => k === 0 ? 'TOTAL' : k < 5 ? '' : linhas.every(l => typeof l[k] === 'object') ? H(soma(k)) : linhas.every(l => typeof l[k] === 'number') ? soma(k) : '');
      const ws = X.utils.aoa_to_sheet([[`Resumo de horas · ${refLabel(ref)} · ${empresa.nome}${obraSel ? ' · Obra ' + obraSel : ''}`], [], cab, ...linhas, total]);
      ws['!cols'] = cab.map((h, i) => ({wch: i === 0 ? 32 : ['Dias das faltas', 'Dias abonados', 'Outras ocorrências', 'Folha assinada', 'Obra'].includes(h) ? 24 : Math.max(11, h.length + 2)}));
      ws['!merges'] = [{s: {r: 0, c: 0}, e: {r: 0, c: 8}}];
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'Resumo');
      X.writeFile(wb, `resumo-horas-${ref}${obraSel ? '-' + semAcento(obraSel).replace(/[^a-z0-9]+/g, '-') : ''}.xlsx`);
      toast(`Resumo de ${refLabel(ref)} baixado (${linhas.length} colaborador${linhas.length === 1 ? '' : 'es'}).`);
    } catch (e) { toast(erroMsg(e)); }
  });
}
function abrirImportacao() {
  sheet('Importar planilha', `
    <p class="muted" style="margin-bottom:12px">Cadastre colaboradores, lance a folha de ponto e os holerites de uma vez a partir de uma planilha do Excel.</p>
    <div class="stack" style="margin-bottom:14px">
      <button class="btn btn-ghost" onclick="baixarModelo()">1. Baixar planilha modelo</button>
      <label class="btn btn-primary" style="cursor:pointer">2. Escolher planilha preenchida<input type="file" accept=".xlsx,.xls,.csv" style="display:none" onchange="lerPlanilha(this.files[0])"></label>
    </div>
    <div id="impRes"></div>`,
    [['Fechar', 'ghost', 'fecharSheet()']]);
}
/* conversões tolerantes ao que o Excel devolve */
const cel = v => v == null ? '' : (typeof v === 'string' ? v.trim() : v);
const lerCPF = v => { const d = soDig(typeof v === 'number' ? Math.round(v) : v); return d ? d.padStart(11, '0') : ''; };
function lerData(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }
  let m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function lerHora(v) {
  if (v === '' || v == null) return '';
  if (typeof v === 'number') { const min = Math.round((v % 1) * 1440) % 1440; return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`; }
  return normHora(String(v).replace(/h/i, ':'));
}
function lerMes(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return (lerData(v) || '').slice(0, 7) || null;
  const t = String(v).trim().toLowerCase();
  let m = t.match(/^(\d{1,2})\/(\d{4})$/); if (m) return `${m[2]}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})/); if (m) return `${m[1]}-${m[2]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (m) return `${m[3]}-${m[2].padStart(2, '0')}`;
  m = t.match(/^([a-zç]+)[\/ de]+(\d{4})$/); if (m) { const i = MESES.findIndex(x => x.startsWith(m[1].slice(0, 3))); if (i >= 0) return `${m[2]}-${String(i + 1).padStart(2, '0')}`; }
  return null;
}
function lerValor(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  let t = String(v).replace(/R\$|\s/g, '');
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
  const n = +t; return isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
function linhasDaAba(X, wb, chave) {
  // 1º pelo nome da aba; se não achar, pela linha de títulos (aba com outro nome, mas com as colunas certas)
  const obrig = {colab: ['CPF', 'Nome', 'Cargo'], ponto: ['CPF', 'Data', 'Entrada'], hol: ['CPF', 'Mês', 'Descrição'], bases: ['CPF', 'Mês', 'Base cálc. FGTS']}[chave].map(semAcento);
  const temCols = n => { const l = X.utils.sheet_to_json(wb.Sheets[n], {header: 1, defval: ''})[0] || []; const c = l.map(h => semAcento(String(h))); return obrig.every(h => c.includes(h)); };
  const nome = wb.SheetNames.find(n => semAcento(n) === semAcento(NOMES_ABAS[chave]))
    || wb.SheetNames.find(n => !Object.values(NOMES_ABAS).some(x => semAcento(x) === semAcento(n)) && temCols(n));
  if (!nome) return [];
  const linhas = X.utils.sheet_to_json(wb.Sheets[nome], {header: 1, raw: true, defval: ''});
  if (!linhas.length) return [];
  const cab = linhas[0].map(h => semAcento(String(h)));
  const idx = ABAS[chave].map(h => cab.indexOf(semAcento(h)));
  return linhas.slice(1).map((l, i) => ({n: i + 2, v: Object.fromEntries(ABAS[chave].map((h, k) => [h, idx[k] >= 0 ? cel(l[idx[k]]) : '']))}))
    .filter(r => Object.values(r.v).some(x => x !== ''));
}
const semAcento = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
let plano = null;
async function lerPlanilha(arq) {
  if (!arq) return;
  window._impArq = arq.name;
  const box = $('impRes'); box.innerHTML = '<div class="loading"><div class="spin"></div>Lendo a planilha…</div>';
  try {
    const X = await carregarXLSX();
    const wb = X.read(await arq.arrayBuffer(), {type: 'array'});
    await carregarEquipe();
    const porCPF = Object.fromEntries(cacheEquipe.map(c => [c.cpf, c]));
    const erros = [], novos = [], atualiza = [], pontos = [], hols = {}, bases = {};
    const E = (aba, n, m) => erros.push(`${aba}, linha ${n}: ${m}`);
    // Colaboradores
    const cpfsNaPlanilha = new Set();
    for (const {n, v} of linhasDaAba(X, wb, 'colab')) {
      const cpf = lerCPF(v.CPF); if (cpf.length !== 11) { E('Colaboradores', n, 'CPF inválido'); continue; }
      const adm = lerData(v['Admissão']); if (adm === null) { E('Colaboradores', n, 'data de admissão inválida (use dd/mm/aaaa)'); continue; }
      const sal = lerValor(v['Salário']);
      if (Number.isNaN(sal)) { E('Colaboradores', n, 'valor em reais inválido'); continue; }
      const jor = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => lerHora(v[d]));
      if (jor.some(x => x === null)) { E('Colaboradores', n, 'jornada inválida (use 09:00)'); continue; }
      const temJornada = jor.some(Boolean);
      const d = {nome: v.Nome, codigo: String(v['Código']), cargo: v.Cargo, obra: v.Obra ? String(v.Obra).trim() : '', cbo: String(v.CBO), departamento: String(v.Departamento), filial: String(v.Filial),
        centro_custo: v['Centro de custo'], lotacao: v['CC holerite'], tipo_salario: v.Tipo, admissao: adm, salario: sal, dependentes: v.Dependentes === '' || v.Dependentes == null ? '' : Math.max(0, Math.round(+String(v.Dependentes).replace(',', '.') || 0)), email: v['E-mail'], tel: String(v.Telefone), banco: v.Banco};
      Object.keys(d).forEach(k => { if (d[k] === '' || d[k] == null) delete d[k]; });
      if (temJornada) { d.jornada = jor; d.horario = null; }
      const sit = semAcento(v['Situação'] || ''), dem = lerData(v.Desligamento);
      if (dem === null) { E('Colaboradores', n, 'data de desligamento inválida (use dd/mm/aaaa)'); continue; }
      if (sit) { if (!['ativo', 'desligado', 'demitido'].includes(sit)) { E('Colaboradores', n, 'situação deve ser Ativo ou Desligado'); continue; } d.situacao = sit === 'ativo' ? 'Ativo' : 'Desligado'; if (d.situacao === 'Ativo') d.demissao = null; }
      if (dem) { d.demissao = dem; d.situacao = 'Desligado'; }
      cpfsNaPlanilha.add(cpf);
      if (porCPF[cpf]) atualiza.push({id: porCPF[cpf].id, cpf, d});
      else { if (!d.nome) { E('Colaboradores', n, 'nome obrigatório para cadastrar'); continue; } if (!temJornada) d.jornada = ['', '09:00', '09:00', '09:00', '09:00', '08:00', '']; novos.push({cpf, ...d}); }
    }
    const existe = cpf => porCPF[cpf] || novos.some(x => x.cpf === cpf);
    // Ponto
    for (const {n, v} of linhasDaAba(X, wb, 'ponto')) {
      const cpf = lerCPF(v.CPF); if (!existe(cpf)) { E('Ponto', n, 'CPF não cadastrado'); continue; }
      const dia = lerData(v.Data); if (!dia) { E('Ponto', n, 'data inválida (use dd/mm/aaaa)'); continue; }
      const hs = ['Entrada', 'Saída almoço', 'Retorno almoço', 'Saída'].map(k => lerHora(v[k]));
      if (hs.some(x => x === null)) { E('Ponto', n, 'horário inválido (use 07:00)'); continue; }
      const ult = hs.map(x => !!x).lastIndexOf(true), m = hs.slice(0, ult + 1);
      if (m.some(x => !x)) { E('Ponto', n, 'horários fora de ordem ou faltando no meio'); continue; }
      if (m.length && !minutosCorridos(m)) { E('Ponto', n, 'o turno passa de 24 horas'); continue; }
      const oc = OCORRENCIAS.find(o => o && semAcento(o) === semAcento(v['Ocorrência'])) || null;
      if (v['Ocorrência'] && !oc) { E('Ponto', n, `ocorrência "${v['Ocorrência']}" não reconhecida`); continue; }
      pontos.push({cpf, dia, marcacoes: m, ocorrencia: oc, observacao: v['Observação'] ? String(v['Observação']) : null});
    }
    // Holerites
    for (const {n, v} of linhasDaAba(X, wb, 'hol')) {
      const cpf = lerCPF(v.CPF); if (!existe(cpf)) { E('Holerites', n, 'CPF não cadastrado'); continue; }
      const ref = lerMes(v['Mês']); if (!ref) { E('Holerites', n, 'mês inválido (use mm/aaaa)'); continue; }
      const ve = lerValor(v.Vencimento), de = lerValor(v.Desconto);
      if (Number.isNaN(ve) || Number.isNaN(de)) { E('Holerites', n, 'valor inválido'); continue; }
      if (!v['Descrição']) { E('Holerites', n, 'descrição obrigatória'); continue; }
      if ((ve || 0) && (de || 0)) { E('Holerites', n, 'preencha vencimento OU desconto, não os dois'); continue; }
      const k = cpf + '|' + ref; (hols[k] = hols[k] || []).push({codigo: String(v['Código']), desc: String(v['Descrição']), ref: typeof v['Referência'] === 'number' ? num(v['Referência']) : String(v['Referência']), tipo: de ? 'd' : 'p', valor: de || ve || 0});
    }
    for (const {n, v} of linhasDaAba(X, wb, 'bases')) {
      const cpf = lerCPF(v.CPF), ref = lerMes(v['Mês']);
      if (!existe(cpf) || !ref) { E('Bases holerite', n, 'CPF não cadastrado ou mês inválido'); continue; }
      const r = {}; [['Salário base', 'salario_base'], ['Sal. contr. INSS', 'sal_contr_inss'], ['Base cálc. FGTS', 'base_fgts'], ['FGTS do mês', 'fgts_mes'], ['Base cálc. IRRF', 'base_irrf'], ['Faixa IRRF', 'faixa_irrf']]
        .forEach(([h, k]) => { const x = lerValor(v[h]); if (x != null && !Number.isNaN(x)) r[k] = x; });
      bases[cpf + '|' + ref] = r;
      if (!hols[cpf + '|' + ref]) E('Bases holerite', n, 'não há verbas para este CPF e mês na aba Holerites');
    }
    plano = {novos, atualiza, pontos, hols, bases};
    const nh = Object.keys(hols).length, meses = [...new Set(pontos.map(p => p.dia.slice(0, 7)))].map(refLabel).join(', ');
    const nada = !novos.length && !atualiza.length && !pontos.length && !nh;
    box.innerHTML = `<div class="card"><div class="card-b">
      <div style="font-weight:600;margin-bottom:6px">${esc(arq.name)}</div>
      ${kv('Colaboradores novos', String(novos.length))}${kv('Colaboradores atualizados', String(atualiza.length))}
      ${kv('Dias de ponto', pontos.length ? `${pontos.length} (${meses})` : '0')}${kv('Holerites', String(nh))}
      ${erros.length ? `<div class="err" style="margin:10px 0 0"><b>${erros.length} linha(s) com problema serão ignoradas:</b><br>${erros.slice(0, 30).map(esc).join('<br>')}${erros.length > 30 ? '<br>…' : ''}</div>` : ''}
    </div></div>
    ${nada ? '<div class="empty">Nada para importar. Confira se as abas têm os nomes do modelo (Colaboradores, Ponto, Holerites).</div>' : '<button class="btn btn-primary" onclick="executarImportacao(this)">Importar agora</button>'}`;
  } catch (e) { box.innerHTML = `<div class="err">${esc(erroMsg(e))}</div>`; }
}
async function executarImportacao(btn) {
  const {novos, atualiza, pontos, hols, bases} = plano;
  await comBotao(btn, async () => {
    try {
      btn.textContent = 'Importando…';
      for (const a of atualiza) if (Object.keys(a.d).length) await q(sb.from('colaboradores').update(a.d).eq('id', a.id));
      if (novos.length) await q(sb.from('colaboradores').insert(novos).select('id,cpf'));
      await carregarEquipe();
      const idDe = Object.fromEntries(cacheEquipe.map(c => [c.cpf, c.id]));
      if (pontos.length) {
        const linhas = pontos.map(p => ({colaborador_id: idDe[p.cpf], dia: p.dia, marcacoes: p.marcacoes, ocorrencia: p.ocorrencia, observacao: p.observacao}));
        for (let i = 0; i < linhas.length; i += 500) await q(sb.from('pontos').upsert(linhas.slice(i, i + 500), {onConflict: 'colaborador_id,dia'}));
        const afetados = [...new Set(linhas.map(l => l.colaborador_id + '|' + l.dia.slice(0, 7)))];
        for (const k of afetados) { const [cid, ref] = k.split('|'); await q(sb.from('confirmacoes').delete().eq('colaborador_id', cid).eq('ref', ref)); }
      }
      const hl = Object.keys(hols).map(k => { const [cpf, ref] = k.split('|'); return {colaborador_id: idDe[cpf], ref, itens: hols[k], rodape: bases[k] || {}}; });
      if (hl.length) await q(sb.from('holerites').upsert(hl, {onConflict: 'colaborador_id,ref'}));
      fecharSheet(); render();
      toast(`Importação concluída: ${novos.length} novo(s), ${atualiza.length} atualizado(s), ${pontos.length} dia(s) de ponto, ${hl.length} holerite(s).`);
    } catch (e) { toast(erroMsg(e)); }
  });
}

/* =====================================================
   INÍCIO
   ===================================================== */
(async function boot() {
  if (CFG.NOME_EMPRESA) $('nomeEmpresa').textContent = CFG.NOME_EMPRESA;
  if (CFG.LOGO) $('loginLogo').outerHTML = `<img class="login-logo" src="${esc(CFG.LOGO)}" alt="${esc(CFG.NOME_EMPRESA || '')}">`;
  if (!sb) {
    $('boot').innerHTML = '<div class="card" style="margin:16px;text-align:left"><div class="card-b"><b>Portal ainda não configurado.</b><p class="muted" style="margin-top:6px">Abra o arquivo <code>config.js</code> e preencha a Project URL e a chave anon public do Supabase. As instruções estão no LEIAME.</p></div></div>';
    return;
  }
  sb.auth.onAuthStateChange((evt) => { if (evt === 'SIGNED_OUT' && sess) { sess = null; mostrarLogin('colab'); } });
  await iniciarSessao();
})();
