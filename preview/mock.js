/* =====================================================
   PRÉVIA — imita o Supabase dentro do navegador, com dados fictícios.
   Usado só na página de demonstração. O site real usa o Supabase.
   ===================================================== */
(function () {
  const LS = 'portal-colab-previa-v8';
  const uid = () => 'u' + Math.random().toString(16).slice(2, 10) + '-0000-0000-0000-000000000000';
  const pad = n => String(n).padStart(2, '0');
  const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);

  function seed() {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const DB = {users: [], admins: [], empresa: [{id: 1, nome: 'Lago Engenharia', cnpj: '00.000.000/0001-00', logo: null}],
      colaboradores: [], pontos: [], holerites: [], avisos: [], confirmacoes: [], seq: 100};
    const rh = {id: uid(), email: 'rh@empresa.com', password: 'demo123'}; DB.users.push(rh); DB.admins.push(rh.id);
    const maria = {id: uid(), email: '11111111111@colaborador.portal-rh.app', password: '123456'}; DB.users.push(maria);
    const jor = ['', '09:00', '09:00', '09:00', '09:00', '08:00', ''];
    DB.colaboradores.push(
      {id: 'c1', user_id: maria.id, nome: 'Maria da Silva Exemplo', cpf: '11111111111', codigo: '30', cargo: 'Pedreira', cbo: '715210', departamento: '2', filial: '1',
       centro_custo: 'CT0001', lotacao: 'Operacional', tipo_salario: 'Mensalista', admissao: '2025-06-08', email: 'maria@exemplo.com', tel: '(00) 90000-0000',
       salario: 2800, ajuda_custo: 0, dependentes: 1, obra: 'Residencial Lago Azul', banco: 'Banco Exemplo · Ag 0001 · CC 12345-6', jornada: jor, codigo_acesso: null},
      {id: 'c2', user_id: null, nome: 'João Pereira Exemplo', cpf: '22222222222', codigo: '31', cargo: 'Servente', cbo: '717020', departamento: '2', filial: '1',
       centro_custo: 'CT0001', lotacao: 'Operacional', tipo_salario: 'Mensalista', admissao: '2026-02-01', email: '', tel: '', salario: 1900, ajuda_custo: 0, dependentes: 0, obra: 'Galpão Industrial Norte',
       banco: '', jornada: jor, codigo_acesso: 'ABC123'}
    );
    // ponto: mês passado inteiro + mês atual até ontem
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    for (const c of ['c1', 'c2']) {
      for (let d = new Date(ini), k = 0; d < hoje; d.setDate(d.getDate() + 1), k++) {
        const dw = d.getDay(), iso = isoDe(d), v = (k * 7 + (c === 'c2' ? 3 : 0)) % 5 - 2;
        if (dw === 0) continue;
        if (dw === 6) { if (k % 3 === 0) DB.pontos.push({id: DB.seq++, colaborador_id: c, dia: iso, marcacoes: [hm(420 + v), hm(698 + v), hm(759), '16:00'], ocorrencia: null, observacao: null}); continue; }
        const longo = (dw === 3 || dw === 4) && k % 2 === 0;
        const saida = dw === 5 ? 960 : longo ? 1140 + v : 1020 + v;
        DB.pontos.push({id: DB.seq++, colaborador_id: c, dia: iso, marcacoes: [hm(420 + v), hm(700 + v), hm(760 + (k % 3)), hm(saida)], ocorrencia: null, observacao: longo ? 'Efetivo até 19h' : null});
      }
    }
    const refAnt = `${ini.getFullYear()}-${pad(ini.getMonth() + 1)}`;
    DB.holerites.push({id: DB.seq++, colaborador_id: 'c1', ref: refAnt, obs: null, criado_em: new Date().toISOString(),
      itens: [{codigo: '1', desc: 'HORAS NORMAIS', ref: '220,00', tipo: 'p', valor: 2800}, {codigo: '250', desc: 'REFLEXO EXTRAS DSR', ref: '0,00', tipo: 'p', valor: 158.4},
              {codigo: '200', desc: 'HORAS EXTRAS 100%', ref: '16,00', tipo: 'p', valor: 407.27}, {codigo: '201', desc: 'HORAS EXTRAS 50%', ref: '10,00', tipo: 'p', valor: 190.91},
              {codigo: '998', desc: 'I.N.S.S.', ref: '9,00', tipo: 'd', valor: 320.5}, {codigo: '981', desc: 'DESC.ADIANT.SALARIAL', ref: '1.120,00', tipo: 'd', valor: 1120}],
      rodape: {salario_base: 2800, sal_contr_inss: 3556.58, base_fgts: 3556.58, fgts_mes: 284.53, base_irrf: 2116.08, faixa_irrf: 0}});
    DB.avisos.push({id: DB.seq++, titulo: 'Holerite disponível', texto: 'O holerite do mês passado já está na aba Holerites.', criado_em: new Date().toISOString()},
                   {id: DB.seq++, titulo: 'Confraternização de fim de ano', texto: 'Dia 18/12, a partir das 17h. Confirme presença com o RH.', criado_em: new Date(Date.now() - 3 * 864e5).toISOString()});
    DB.assinaturas_holerite = [];
    return DB;
  }
  let DB; try { DB = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
  if (!DB || !DB.empresa || !DB.confirmacoes || !DB.assinaturas_holerite) DB = seed();
  const salvar = () => { try { localStorage.setItem(LS, JSON.stringify(DB)); } catch (e) {} };
  salvar();
  window.restaurarPrevia = () => { try { localStorage.removeItem(LS); } catch (e) {} location.reload(); };
  let session = null;
  const me = () => session && session.user.id;
  const isAdmin = () => DB.admins.includes(me());
  const meuColab = () => (DB.colaboradores.find(c => c.user_id === me()) || {}).id;
  const OCULTOS = ['codigo_acesso', 'tentativas'];
  const codigoFake = () => Array.from({length: 16}, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');
  // Mesmo efeito dos gatilhos do banco: mudou a folha ou o holerite, a assinatura cai
  const invalidaFolha = (cid, dia) => { DB.confirmacoes = DB.confirmacoes.filter(c => !(c.colaborador_id === cid && c.ref === String(dia).slice(0, 7))); };
  const invalidaHol = id => { DB.assinaturas_holerite = DB.assinaturas_holerite.filter(a => a.holerite_id !== id); };
  // Mesmas regras de permissão do banco real
  const podeVer = (t, r) => {
    if (!me()) return false;
    if (t === 'avisos' || t === 'empresa' || isAdmin()) return true;
    if (t === 'colaboradores') return r.user_id === me();
    return r.colaborador_id === meuColab();
  };
  const podeGravar = () => isAdmin();

  function builder(t) {
    let filters = [], ord = null, lim = null, rng = null, op = 'select', payload = null, single = false, maybe = false, conflict = null;
    const b = {
      select() { return b; }, eq(k, v) { filters.push(r => r[k] == v); return b; }, gte(k, v) { filters.push(r => r[k] >= v); return b; }, lte(k, v) { filters.push(r => r[k] <= v); return b; },
      order(k, o) { ord = [k, o && o.ascending === false ? -1 : 1]; return b; }, limit(n) { lim = n; return b; }, range(a, z) { rng = [a, z]; return b; },
      single() { single = true; return b; }, maybeSingle() { maybe = true; return b; },
      insert(p) { op = 'insert'; payload = p; return b; }, update(p) { op = 'update'; payload = p; return b; },
      upsert(p, o) { op = 'upsert'; payload = p; conflict = o.onConflict.split(','); return b; },
      then(res) { setTimeout(() => { try { const r = run(); if (op !== 'select') salvar(); res(r); } catch (e) { res({data: null, error: {message: e.message}}); } }, 60); }
    };
    b['delete'] = () => { op = 'del'; return b; };
    function run() {
      const T = DB[t];
      if (op !== 'select' && !podeGravar()) throw new Error('new row violates row-level security policy');
      if (op === 'insert') {
        const arr = [].concat(payload).map(p => ({id: t === 'colaboradores' ? 'c' + (DB.seq++) : DB.seq++, criado_em: new Date().toISOString(), ...(t === 'colaboradores' ? {user_id: null, codigo_acesso: Math.random().toString(16).slice(2, 8).toUpperCase(), jornada: ['', '09:00', '09:00', '09:00', '09:00', '08:00', '']} : {}), ...p}));
        if (t === 'colaboradores') arr.forEach(r => { if (T.some(x => x.cpf === r.cpf)) throw new Error('duplicate key value violates unique constraint "colaboradores_cpf_key"'); });
        if (t === 'holerites') arr.forEach(r => { if (T.some(x => x.colaborador_id === r.colaborador_id && x.ref === r.ref)) throw new Error('duplicate key value violates unique constraint "holerites_colaborador_id_ref_key"'); });
        T.push(...arr); if (t === 'pontos') arr.forEach(x => invalidaFolha(x.colaborador_id, x.dia)); return {data: single ? {id: arr[0].id} : arr.map(x => ({id: x.id, cpf: x.cpf})), error: null};
      }
      if (op === 'upsert') {
        [].concat(payload).forEach(p => { const ex = T.find(r => conflict.every(k => r[k] == p[k])); if (t === 'pontos') invalidaFolha(p.colaborador_id, p.dia); if (ex) { if (t === 'holerites' && JSON.stringify([ex.itens, ex.rodape, ex.obs]) !== JSON.stringify([p.itens ?? ex.itens, p.rodape ?? ex.rodape, p.obs ?? ex.obs])) invalidaHol(ex.id); Object.assign(ex, p); } else T.push({id: DB.seq++, ...p}); });
        return {data: null, error: null};
      }
      let r = T.filter(x => filters.every(f => f(x)));
      if (op === 'update') {
        if (t === 'holerites' && payload.ref) r.forEach(x => { if (T.some(y => y !== x && y.colaborador_id === x.colaborador_id && y.ref === payload.ref)) throw new Error('duplicate key value violates unique constraint "holerites_colaborador_id_ref_key"'); });
        r.forEach(x => { if (t === 'pontos') invalidaFolha(x.colaborador_id, x.dia); if (t === 'holerites') invalidaHol(x.id); Object.assign(x, payload); }); return {data: null, error: null};
      }
      if (op === 'del') {
        DB[t] = T.filter(x => !r.includes(x));
        if (t === 'pontos') r.forEach(x => invalidaFolha(x.colaborador_id, x.dia));
        if (t === 'holerites') r.forEach(x => invalidaHol(x.id));
        if (t === 'colaboradores') r.forEach(c => { DB.confirmacoes = DB.confirmacoes.filter(p => p.colaborador_id !== c.id); DB.pontos = DB.pontos.filter(p => p.colaborador_id !== c.id); DB.holerites = DB.holerites.filter(h => h.colaborador_id !== c.id); });
        return {data: null, error: null};
      }
      r = r.filter(x => podeVer(t, x)).map(x => { const o = JSON.parse(JSON.stringify(x)); OCULTOS.forEach(k => delete o[k]); return o; });
      if (ord) r.sort((a, b) => (a[ord[0]] > b[ord[0]] ? 1 : a[ord[0]] < b[ord[0]] ? -1 : 0) * ord[1]);
      if (lim) r = r.slice(0, lim);
      if (rng) r = r.slice(rng[0], rng[1] + 1);
      if (single) { if (!r[0]) throw new Error('Registro não encontrado'); return {data: r[0], error: null}; }
      if (maybe) return {data: r[0] || null, error: null};
      return {data: r, error: null};
    }
    return b;
  }
  const rpcs = {
    tem_admin: () => DB.admins.length > 0,
    criar_primeiro_admin: () => { if (DB.admins.length) return false; DB.admins.push(me()); return true; },
    is_admin: () => isAdmin(),
    checar_codigo: ({p_cpf, p_codigo}) => { const c = DB.colaboradores.find(x => x.cpf === p_cpf); return c && !c.user_id && c.codigo_acesso === String(p_codigo).trim().toUpperCase() ? 'ok' : 'invalido'; },
    confirmar_folha: ({p_ref, p_assinatura, p_aparelho}) => { const c = meuColab(); if (!c) throw new Error('Conta sem cadastro de colaborador'); let x = DB.confirmacoes.find(y => y.colaborador_id === c && y.ref === p_ref); if (!x) { x = {colaborador_id: c, ref: p_ref, confirmado_em: new Date().toISOString(), assinatura: p_assinatura || null, codigo: codigoFake(), ip: '(prévia)', aparelho: p_aparelho || null}; DB.confirmacoes.push(x); salvar(); } return x.confirmado_em; },
    assinar_holerite: ({p_id, p_assinatura, p_aparelho}) => { const c = meuColab(); if (!c) throw new Error('Conta sem cadastro de colaborador'); const h = DB.holerites.find(y => y.id === p_id && y.colaborador_id === c); if (!h) throw new Error('Holerite não encontrado'); if (!/^data:image\/png;base64,/.test(p_assinatura || '')) throw new Error('Assinatura inválida'); let x = DB.assinaturas_holerite.find(y => y.holerite_id === p_id); if (!x) { x = {holerite_id: p_id, colaborador_id: c, assinado_em: new Date().toISOString(), assinatura: p_assinatura, codigo: codigoFake(), ip: '(prévia)', aparelho: p_aparelho || null}; DB.assinaturas_holerite.push(x); salvar(); } return x.assinado_em; },
    vincular_conta: ({p_cpf, p_codigo}) => { const c = DB.colaboradores.find(x => x.cpf === p_cpf && !x.user_id && x.codigo_acesso === String(p_codigo).trim().toUpperCase()); if (!c) return false; c.user_id = me(); c.codigo_acesso = null; return true; },
    codigo_acesso: ({p_colab}) => { if (!isAdmin()) throw new Error('Apenas o RH pode fazer isso'); return DB.colaboradores.find(x => x.id === p_colab).codigo_acesso; },
    resetar_acesso: ({p_colab}) => { if (!isAdmin()) throw new Error('Apenas o RH pode fazer isso'); const c = DB.colaboradores.find(x => x.id === p_colab); DB.users = DB.users.filter(u => u.id !== c.user_id); c.user_id = null; c.codigo_acesso = Math.random().toString(16).slice(2, 8).toUpperCase(); return c.codigo_acesso; }
  };
  const resp = data => new Promise(r => setTimeout(() => { salvar(); r({data, error: null}); }, 60));
  window.supabase = {createClient: () => ({
    from: builder,
    rpc: (n, a) => { try { return resp(rpcs[n](a || {})); } catch (e) { return Promise.resolve({data: null, error: {message: e.message}}); } },
    auth: {
      getSession: async () => ({data: {session}}),
      signInWithPassword: async ({email, password}) => { const u = DB.users.find(x => x.email.toLowerCase() === email.toLowerCase() && x.password === password); if (!u) return {data: null, error: {message: 'Invalid login credentials'}}; session = {user: u}; return {data: {session}, error: null}; },
      signUp: async ({email, password}) => { if (DB.users.some(x => x.email === email)) return {data: null, error: {message: 'User already registered'}}; const u = {id: uid(), email, password}; DB.users.push(u); salvar(); session = {user: u}; return {data: {session, user: u}, error: null}; },
      signOut: async () => { session = null; return {error: null}; },
      updateUser: async ({password}) => { const u = DB.users.find(x => x.id === me()); u.password = password; salvar(); return {data: {}, error: null}; },
      onAuthStateChange: () => {}
    }
  })};
})();
