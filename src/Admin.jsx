import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const C = {
  crimson: '#721919', cream: '#FFFAF7', stone: '#E8DDD8',
  ink: '#292323', mist: '#9A8880', white: '#FFFFFF',
};

const ROLES = ['instructor', 'studio_owner', 'admin', 'backoffice_admin', 'super_admin'];

// ─── STUDIOS PAGE ─────────────────────────────────────────────────────────────
const StudiosPage = () => {
  const [studios, setStudios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStudio, setNewStudio] = useState({ name: '', class_types: '', zones: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.from('studios').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, role, studio_id'),
    ]);
    setStudios(s || []);
    setUsers(u || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createStudio = async e => {
    e.preventDefault();
    setError(''); setCreating(true);
    const slug = newStudio.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const classTypes = newStudio.class_types ? newStudio.class_types.split(',').map(x => x.trim()).filter(Boolean) : ['Reformer', 'Matwork', 'Barre', 'Cycling'];
    const zones = newStudio.zones ? newStudio.zones.split(',').map(x => x.trim()).filter(Boolean) : ['Glutes', 'Hamstrings', 'Quads', 'Inner Thighs', 'Calves', 'Core', 'Back', 'Arms', 'Shoulders', 'Chest', 'Full Body', 'Cardio', 'Warm-Up', 'Mobility', 'Flexibility', 'Balance'];
    const { error: err } = await supabase.from('studios').insert({ name: newStudio.name.trim(), slug, settings: { class_types: classTypes, zones } });
    if (err) { setError(err.message); setCreating(false); return; }
    setNewStudio({ name: '', class_types: '', zones: '' });
    setCreating(false);
    load();
  };

  const assignOwner = async (studioId, userId) => {
    await supabase.from('profiles').update({ studio_id: studioId, role: 'studio_owner' }).eq('id', userId);
    load();
  };

  if (loading) return <div style={{ color: C.mist, padding: 24 }}>A carregar…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Create studio */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 14 }}>Criar studio</div>
        {error && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <form onSubmit={createStudio} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input required value={newStudio.name} onChange={e => setNewStudio(p => ({ ...p, name: e.target.value }))} placeholder="Nome do studio *" style={inputStyle} />
          <input value={newStudio.class_types} onChange={e => setNewStudio(p => ({ ...p, class_types: e.target.value }))} placeholder="Tipos de aula (separados por vírgula) — deixar em branco para usar defaults" style={inputStyle} />
          <input value={newStudio.zones} onChange={e => setNewStudio(p => ({ ...p, zones: e.target.value }))} placeholder="Zonas (separadas por vírgula) — deixar em branco para usar defaults" style={inputStyle} />
          <button type="submit" disabled={creating} style={btnStyle}>{creating ? 'A criar…' : 'Criar studio'}</button>
        </form>
      </div>

      {/* Studios list */}
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, overflow: 'hidden' }}>
        <div style={tableHeader}>Studios ({studios.length})</div>
        {studios.map(s => {
          const owner = users.find(u => u.studio_id === s.id && u.role === 'studio_owner');
          const members = users.filter(u => u.studio_id === s.id);
          const unassigned = users.filter(u => !u.studio_id);
          return (
            <div key={s.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.stone}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.mist, marginTop: 2 }}>
                    Código: <code style={{ background: C.stone, padding: '1px 6px', borderRadius: 4 }}>{s.slug}</code>
                    {' · '}{members.length} membro{members.length !== 1 ? 's' : ''}
                    {owner ? ` · Owner: ${owner.name || '(sem nome)'}` : ' · Sem owner'}
                  </div>
                  {s.settings?.class_types?.length > 0 && (
                    <div style={{ fontSize: 11, color: C.mist, marginTop: 2 }}>Aulas: {s.settings.class_types.join(', ')}</div>
                  )}
                </div>
                {!owner && unassigned.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 11, color: C.mist }}>Atribuir owner:</div>
                    <select onChange={e => e.target.value && assignOwner(s.id, e.target.value)} defaultValue="" style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif" }}>
                      <option value="">Escolher utilizador…</option>
                      {unassigned.map(u => <option key={u.id} value={u.id}>{u.name || u.id.slice(0, 8)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const [{ data: u }, { data: s }] = await Promise.all([
      supabase.from('profiles').select('id, name, role, studio_id, onboarded, created_at').order('created_at', { ascending: false }),
      supabase.from('studios').select('id, name'),
    ]);
    setUsers(u || []);
    setStudios(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (userId, role) => {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    setUsers(p => p.map(u => u.id === userId ? { ...u, role } : u));
  };

  const changeStudio = async (userId, studioId) => {
    await supabase.from('profiles').update({ studio_id: studioId || null }).eq('id', userId);
    setUsers(p => p.map(u => u.id === userId ? { ...u, studio_id: studioId || null } : u));
  };

  const filtered = users.filter(u =>
    !search || (u.name || '').toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
  );

  if (loading) return <div style={{ color: C.mist, padding: 24 }}>A carregar…</div>;

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome ou ID…"
        style={{ ...inputStyle, marginBottom: 16, maxWidth: 320 }} />
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, overflow: 'hidden' }}>
        <div style={tableHeader}>Utilizadores ({filtered.length})</div>
        {filtered.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${C.stone}`, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{u.name || '(sem nome)'}</div>
              <div style={{ fontSize: 11, color: C.mist }}>{u.id.slice(0, 12)}… · {u.onboarded ? '✓ onboarded' : '⏳ pendente'}</div>
            </div>
            <select value={u.role || 'instructor'} onChange={e => changeRole(u.id, e.target.value)}
              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={u.studio_id || ''} onChange={e => changeStudio(u.id, e.target.value)}
              style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif" }}>
              <option value="">Sem studio</option>
              {studios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── INVITATIONS PAGE ─────────────────────────────────────────────────────────
const InvitationsPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('invitations').select('*, studios(name)').order('created_at', { ascending: false }),
      supabase.from('studios').select('id, name'),
    ]).then(([{ data: inv }, { data: s }]) => {
      setInvitations(inv || []);
      setStudios(s || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: C.mist, padding: 24 }}>A carregar…</div>;

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, overflow: 'hidden' }}>
      <div style={tableHeader}>Convites ({invitations.length})</div>
      {invitations.length === 0 && <div style={{ padding: 24, color: C.mist, fontSize: 13 }}>Nenhum convite ainda.</div>}
      {invitations.map(inv => (
        <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${C.stone}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{inv.studios?.name || 'Studio desconhecido'}</div>
            <code style={{ fontSize: 11, color: C.mist }}>{inv.code}</code>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: inv.accepted_at ? '#d1fae5' : '#fef3c7', color: inv.accepted_at ? '#065f46' : '#92400e' }}>
            {inv.accepted_at ? 'Aceite' : 'Pendente'}
          </span>
          <span style={{ fontSize: 11, color: C.mist }}>{new Date(inv.created_at).toLocaleDateString('pt-PT')}</span>
        </div>
      ))}
    </div>
  );
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`,
  fontFamily: "'Satoshi',sans-serif", fontSize: 13, color: C.ink, outline: 'none', boxSizing: 'border-box',
};
const btnStyle = {
  padding: '9px 20px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream,
  fontFamily: "'Satoshi',sans-serif", fontWeight: 700, fontSize: 13, cursor: 'pointer', alignSelf: 'flex-start',
};
const tableHeader = {
  padding: '12px 20px', borderBottom: `1px solid ${C.stone}`,
  fontWeight: 700, fontSize: 12, color: C.mist, letterSpacing: '0.06em', textTransform: 'uppercase',
};

// ─── ADMIN APP ────────────────────────────────────────────────────────────────
export default function Admin() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState('studios');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const id = 'haven-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap';
      document.head.appendChild(l);
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
        setProfile(data);
      }
      setAuthLoading(false);
    });
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setLoginError(''); setLoggingIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoginError(error.message); setLoggingIn(false); return; }
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (!p || !['super_admin', 'backoffice_admin'].includes(p.role)) {
      await supabase.auth.signOut();
      setLoginError('Não tens acesso ao backoffice.');
      setLoggingIn(false); return;
    }
    setUser(data.user); setProfile(p); setLoggingIn(false);
  };

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: C.cream, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Satoshi',sans-serif", color: C.mist }}>A carregar…</div>
  );

  if (!user || !['super_admin', 'backoffice_admin'].includes(profile?.role)) return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.mist, marginBottom: 4 }}>The Haven</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 600, color: C.crimson }}>Backoffice</div>
        </div>
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.stone}`, padding: 24 }}>
          {loginError && <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '8px 12px', fontSize: 12, marginBottom: 14 }}>{loginError}</div>}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={loggingIn} style={{ ...btnStyle, width: '100%', padding: '10px 0', textAlign: 'center' }}>{loggingIn ? 'A entrar…' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    </div>
  );

  const pages = [['studios', 'Studios'], ['users', 'Utilizadores'], ['invitations', 'Convites']];

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi',sans-serif" }}>
      {/* Nav */}
      <div style={{ background: C.crimson, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: '1px solid #5a1010' }}>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 15, fontWeight: 600, color: C.cream }}>The Haven — Backoffice</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.15)', padding: 3, borderRadius: 8 }}>
          {pages.map(([id, lbl]) => (
            <button key={id} onClick={() => setPage(id)} style={{ fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 12, padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: page === id ? C.cream : 'transparent', color: page === id ? C.crimson : `${C.cream}80`, transition: 'all 0.15s' }}>{lbl}</button>
          ))}
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => { setUser(null); setProfile(null); })}
          style={{ fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.cream}40`, background: 'transparent', color: `${C.cream}80`, cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 20, fontWeight: 500, color: C.crimson, marginBottom: 20 }}>
          {pages.find(([id]) => id === page)?.[1]}
        </h2>
        {page === 'studios' && <StudiosPage />}
        {page === 'users' && <UsersPage />}
        {page === 'invitations' && <InvitationsPage />}
      </div>
    </div>
  );
}
