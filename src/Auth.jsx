import React, { useState } from 'react';
import { supabase } from './supabase.js';

const C = {
  crimson: '#721919',
  cream:   '#FFFAF7',
  stone:   '#E8DDD8',
  ink:     '#292323',
  mist:    '#9A8880',
  white:   '#FFFFFF',
  peach:   '#FFB892',
};

const HavenLogo = ({ size = 32, color = '#FFFAF7' }) => (
  <svg width={size} height={size} viewBox="0 0 1800 1800" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1432.63 801.882C1430.83 785.243 1428.62 768.787 1425.94 752.54C1402.58 610.678 1346.23 484.67 1267.92 388.712C1244.2 359.647 1218.47 333.38 1191.03 310.25C1106.93 239.355 1006.87 198 899.482 198C792.096 198 692.044 239.355 607.955 310.25C581.063 332.915 555.813 358.58 532.488 386.952C427.081 515.185 361 697.682 361 900C361 1102.32 426.743 1283.86 531.676 1412.04C555.229 1440.8 580.753 1466.81 607.955 1489.75C692.053 1560.65 792.105 1602 899.482 1602C1006.86 1602 1106.93 1560.65 1191.03 1489.75C1218.47 1466.62 1244.19 1440.34 1267.92 1411.29C1372.49 1283.15 1438 1101.41 1438 900C1438 866.695 1436.08 833.965 1432.63 801.882ZM1167.35 321.482V897.292L1267.92 824.237V427.578C1336.84 520.91 1385.56 640.19 1404.74 773.154C1285.22 889.087 1216.82 949.789 1130.25 975.8C1110.38 981.772 939.647 1030.47 795.097 946.461C760.469 926.339 738.165 904.887 731.661 898.469C644.07 811.947 634.401 696.816 633.069 653.318V320.297C710.826 258 802.039 222.097 899.491 222.097C996.943 222.097 1089.28 258.483 1167.35 321.5L1167.35 321.482ZM1267.92 1372.43V1010.97L1167.35 1067.45V1478.53C1089.27 1541.54 997.545 1577.93 899.482 1577.93C801.418 1577.93 710.863 1542.05 633.123 1479.78L633.06 1475.04L633.47 983.021L531.667 880.973V1373.26C441.074 1250.99 385.092 1083.99 385.092 900C385.092 716.007 441.403 547.979 532.488 425.609V637.473C531.147 674.835 535.206 728.498 561.25 784.933C591.681 850.85 637.402 888.686 670.378 915.964C682.11 925.674 722.229 957.93 778.394 983.75C795.215 991.491 941.763 1056.56 1106.32 1019.03C1233.29 990.077 1325.3 910.412 1410.61 824.31C1412.71 849.172 1413.89 874.399 1413.89 899.991C1413.89 1083.57 1358.14 1250.23 1267.91 1372.42L1267.92 1372.43Z" fill={color}/>
  </svg>
);

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid ${C.stone}`,
  fontFamily: "'Satoshi', sans-serif",
  fontSize: 14,
  color: C.ink,
  background: C.white,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle = {
  width: '100%',
  padding: '11px 0',
  borderRadius: 8,
  border: 'none',
  background: C.crimson,
  color: C.cream,
  fontFamily: "'Satoshi', sans-serif",
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  letterSpacing: '0.02em',
};

export default function Auth() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studioName, setStudioName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = async e => {
    e.preventDefault();
    setError(''); setInfo('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSignup = async e => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!name.trim()) { setError('Por favor insere o teu nome.'); return; }
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    const userId = data.user?.id;
    if (userId) {
      // Create studio if name provided
      let studioId = null;
      if (studioName.trim()) {
        const slug = studioName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { data: studio } = await supabase
          .from('studios')
          .insert({ name: studioName.trim(), slug: `${slug}-${userId.slice(0,6)}` })
          .select()
          .single();
        studioId = studio?.id || null;
      }

      // Create profile
      await supabase.from('profiles').insert({
        id: userId,
        name: name.trim(),
        studio_id: studioId,
        role: studioId ? 'admin' : 'instructor',
      });
    }

    setInfo('Conta criada! Verifica o teu email para confirmar.');
    setLoading(false);
  };

  React.useEffect(() => {
    const id = 'haven-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 60, height: 60, borderRadius: '50%', background: C.crimson, marginBottom: 14 }}>
            <HavenLogo size={34} color={C.cream} />
          </div>
          <div style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.mist, marginBottom: 4 }}>The Haven</div>
          <div style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 22, fontWeight: 600, color: C.crimson }}>Instructor Studio</div>
        </div>

        {/* Card */}
        <div style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.stone}`, padding: '28px 28px 24px' }}>
          <h2 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 20px', textAlign: 'center' }}>
            {mode === 'login' ? 'Entrar' : 'Criar conta'}
          </h2>

          {error && (
            <div style={{ background: '#FEE2E2', color: '#991B1B', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          {info && (
            <div style={{ background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>{info}</div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.mist, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Nome</label>
                  <input style={inputStyle} type="text" placeholder="O teu nome" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.mist, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email</label>
                <input style={inputStyle} type="email" placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.mist, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Password</label>
                <input style={inputStyle} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>

              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.mist, marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Studio <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
                  <input style={inputStyle} type="text" placeholder="Nome do teu studio" value={studioName} onChange={e => setStudioName(e.target.value)} />
                </div>
              )}

              <button type="submit" style={{ ...btnStyle, marginTop: 4, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'A processar…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </div>
          </form>
        </div>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: C.mist }}>
          {mode === 'login' ? (
            <>Ainda não tens conta?{' '}
              <button onClick={() => { setMode('signup'); setError(''); setInfo(''); }} style={{ background: 'none', border: 'none', color: C.crimson, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Criar conta</button>
            </>
          ) : (
            <>Já tens conta?{' '}
              <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={{ background: 'none', border: 'none', color: C.crimson, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>Entrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
