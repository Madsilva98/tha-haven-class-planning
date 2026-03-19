import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from './supabase.js';
import { APPROACHES, TONES, CUE_STYLES, AVOID_OPTIONS, LANG_OPTIONS, AUDIENCES, BLANK_AI, aiToString, AiForm } from './AiFormShared.jsx';

const C = {
  crimson: '#721919', cream: '#FFFAF7', stone: '#E8DDD8',
  ink: '#292323', mist: '#9A8880', white: '#FFFFFF',
};

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const DEFAULT_TYPES  = ['Reformer', 'Matwork', 'Barre', 'Cycling'];
const DEFAULT_LEVELS = ['Iniciante', 'Intermédio', 'Avançado', 'Misto', 'Pré-natal'];

// ─── Primitives (defined outside to prevent re-mount on each render) ───────────

const Pill = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} style={{
    padding: '6px 14px', borderRadius: 20,
    border: `1.5px solid ${active ? C.crimson : C.stone}`,
    background: active ? `${C.crimson}18` : C.white,
    color: active ? C.crimson : C.mist,
    fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13,
    cursor: 'pointer', transition: 'all 0.15s',
  }}>
    {active ? '✓ ' : ''}{label}
  </button>
);

const CheckRow = ({ label, checked, onChange, description }) => (
  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', userSelect: 'none' }}>
    <div onClick={() => onChange(!checked)} style={{
      marginTop: 2, width: 20, height: 20, borderRadius: 5,
      border: `2px solid ${checked ? C.crimson : C.stone}`,
      background: checked ? C.crimson : C.white,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, cursor: 'pointer', transition: 'all 0.15s',
    }}>
      {checked && <span style={{ color: C.white, fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
    <div>
      <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 15, color: C.ink, fontWeight: 600 }}>{label}</div>
      {description && <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 12, color: C.mist, marginTop: 2 }}>{description}</div>}
    </div>
  </label>
);

const FieldLabel = ({ children, optional }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8, fontFamily: "'Satoshi', sans-serif" }}>
    {children}
    {optional && <span style={{ fontWeight: 400, color: C.mist }}> (opcional)</span>}
  </div>
);

const Shell = ({ children }) => (
  <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
    <div style={{ width: '100%', maxWidth: 520 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.mist, marginBottom: 6 }}>The Haven</div>
        <div style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 22, fontWeight: 600, color: C.crimson }}>Bem-vinda 👋</div>
      </div>
      {children}
    </div>
  </div>
);

const Card = ({ header, sub, children }) => (
  <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.stone}`, padding: '28px 28px 24px' }}>
    {header && <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>{header}</h3>}
    {sub && <p style={{ fontSize: 13, color: C.mist, marginBottom: 20, lineHeight: 1.55 }}>{sub}</p>}
    {children}
  </div>
);

const ProgressBar = ({ label, current, total }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: C.mist, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Satoshi', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 11, color: C.mist, fontFamily: "'Satoshi', sans-serif" }}>{current} / {total}</span>
    </div>
    <div style={{ height: 3, background: C.stone, borderRadius: 2 }}>
      <div style={{ height: '100%', background: C.crimson, borderRadius: 2, width: `${(current / total) * 100}%`, transition: 'width 0.3s ease' }} />
    </div>
  </div>
);

const NavRow = ({ onNext, onBack, nextLabel = 'Continuar →', nextDisabled = false, saving = false, onSkip, skipLabel = 'Saltar este passo' }) => (
  <div style={{ marginTop: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {onBack
        ? <button onClick={onBack} style={{ background: 'none', border: 'none', color: C.mist, fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>← Anterior</button>
        : <div />}
      <button onClick={onNext} disabled={nextDisabled || saving} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream, fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 14, cursor: (nextDisabled || saving) ? 'default' : 'pointer', opacity: (nextDisabled || saving) ? 0.5 : 1 }}>
        {saving ? 'A guardar…' : nextLabel}
      </button>
    </div>
    {onSkip && (
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <button onClick={onSkip} style={{ background: 'none', border: 'none', color: C.mist, fontFamily: "'Satoshi', sans-serif", fontSize: 12, cursor: 'pointer' }}>{skipLabel}</button>
      </div>
    )}
  </div>
);

const PillGroup = ({ available, selected, onToggle, custom, onCustomChange, onCustomAdd, placeholder }) => (
  <>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {available.map(t => <Pill key={t} label={t} active={selected.includes(t)} onClick={() => onToggle(t)} />)}
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <input value={custom} onChange={e => onCustomChange(e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && onCustomAdd()}
        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 13, outline: 'none' }} />
      <button type="button" onClick={onCustomAdd} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi', sans-serif", whiteSpace: 'nowrap' }}>
        + Adicionar
      </button>
    </div>
  </>
);

const AiSkipModal = ({ onConfirm, onCancel }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
    <div style={{ background: C.white, borderRadius: 16, padding: 28, maxWidth: 360, margin: '0 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
      <h3 style={{ fontFamily: "'Clash Display', sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 10px' }}>Saltar configuração da IA?</h3>
      <p style={{ fontSize: 13, color: C.mist, lineHeight: 1.6, marginBottom: 20 }}>
        Sem estas configurações a IA vai gerar cues e sugestões genéricas em vez de adaptadas ao teu estilo. Podes configurar mais tarde no teu Perfil.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: 10, borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', color: C.ink }}>
          Voltar
        </button>
        <button onClick={onConfirm} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: C.mist, color: C.white, fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Saltar mesmo assim
        </button>
      </div>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

export default function Onboarding({ user, profile, onComplete }) {

  // Roles
  const [isInstructor, setIsInstructor] = useState(true);
  const [isStudio, setIsStudio] = useState(false);

  // Navigation
  const [step, setStep] = useState('role');

  // Instructor form
  const [name, setName] = useState(profile?.name || '');
  const [availableTypes, setAvailableTypes] = useState(DEFAULT_TYPES);
  const [types, setTypes] = useState([]);
  const [customType, setCustomType] = useState('');
  const [bio, setBio] = useState('');
  const [iAi, setIAi] = useState(BLANK_AI);
  const [aiSkipWarn, setAiSkipWarn] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinStatus, setJoinStatus] = useState(null); // null | 'searching' | {id,name} | 'not_found'

  // Studio form
  const [studioName, setStudioName] = useState('');
  const [studioCode, setStudioCode] = useState(() => genCode());
  const [studioAvailableTypes, setStudioAvailableTypes] = useState(DEFAULT_TYPES);
  const [studioTypes, setStudioTypes] = useState([]);
  const [studioCustomType, setStudioCustomType] = useState('');
  const [studioLevels, setStudioLevels] = useState([]);
  const [studioContact, setStudioContact] = useState('');
  const [studioDesc, setStudioDesc] = useState('');
  const [sAi, setSAi] = useState({ approach: [], cueStyle: '', tone: [], languages: ['PT'], audience: [], notes: '' });
  const [sAiSkipWarn, setSAiSkipWarn] = useState(false);
  const [studioAction, setStudioAction] = useState(null); // 'create' | 'join'
  const [sJoinCode, setSJoinCode] = useState('');
  const [sJoinStatus, setSJoinStatus] = useState(null); // null | 'searching' | {id,name} | 'not_found'

  // Save
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savedAiRef = useRef('');

  // Step sequence
  const stepSeq = useMemo(() => {
    const s = ['role'];
    if (isInstructor) {
      s.push('i_name', 'i_types', 'i_bio', 'i_ai');
      if (!isStudio) s.push('i_join'); // join-as-member only if not also a studio manager
    } else if (isStudio) {
      s.push('i_name'); // studio-only still needs a name
    }
    if (isStudio) {
      s.push('s_choice'); // create new vs join existing
      if (studioAction === 'create') s.push('s_name', 's_types', 's_details', 's_ai');
      else if (studioAction === 'join') s.push('s_join');
    }
    return s;
  }, [isInstructor, isStudio, studioAction]);

  const stepIdx = stepSeq.indexOf(step);
  const goNext = () => { const n = stepSeq[stepIdx + 1]; if (n) setStep(n); };
  const goPrev = () => { const p = stepSeq[stepIdx - 1]; if (p) setStep(p); };

  // Load profile studio settings if available
  useEffect(() => {
    const s = profile?.studios?.settings;
    if (s?.class_types?.length) {
      setAvailableTypes([...new Set([...DEFAULT_TYPES, ...s.class_types])]);
    }
  }, [profile]);

  // Load fonts
  useEffect(() => {
    const id = 'haven-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  const addType = (avail, setAvail, sel, setSel, custom, setCustom) => {
    const t = custom.trim();
    if (!t || avail.map(x => x.toLowerCase()).includes(t.toLowerCase())) return;
    setAvail(p => [...p, t]);
    setSel(p => [...p, t]);
    setCustom('');
  };

  const lookupStudioCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoinStatus('searching');
    const { data } = await supabase.from('studios').select('id, name').eq('studio_code', code).maybeSingle();
    setJoinStatus(data ? { id: data.id, name: data.name } : 'not_found');
  };

  const lookupSJoinCode = async () => {
    const code = sJoinCode.trim().toUpperCase();
    if (!code) return;
    setSJoinStatus('searching');
    const { data } = await supabase.from('studios').select('id, name').eq('studio_code', code).maybeSingle();
    setSJoinStatus(data ? { id: data.id, name: data.name } : 'not_found');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      // 1. Profile upsert (handles both new accounts and existing rows)
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: user.id,
        name: name.trim() || profile?.name || null,
        onboarded: true,
        bio: bio.trim() || null,
        settings: {
          class_types: types.length ? types : DEFAULT_TYPES,
          preferred_zones: ['Glutes', 'Hamstrings', 'Quads', 'Inner Thighs', 'Calves', 'Core', 'Back', 'Arms', 'Shoulders', 'Chest', 'Full Body'],
          series_types: ['Warm-Up', 'Cardio', 'Mobility', 'Flexibility', 'Balance', 'Flow', 'Força', 'Cool-down'],
          ai_profile: iAi,
        },
      }, { onConflict: 'id' });
      if (profileErr) throw profileErr;

      // 2. Instructor AI style (best-effort — table may not exist on all envs)
      const aiStr = aiToString(iAi);
      savedAiRef.current = aiStr;
      if (aiStr) {
        await supabase.from('ai_styles').upsert(
          { user_id: user.id, value: aiStr, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        ).then(() => {}).catch(() => {});
      }

      // 3. Create studio
      if (isStudio && studioAction === 'create' && studioName.trim()) {
        const code = studioCode.trim().toUpperCase() || genCode();
        const slug = studioName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + code.toLowerCase();
        const { data: newStudio, error: studioErr } = await supabase
          .from('studios')
          .insert({
            name: studioName.trim(),
            slug,
            studio_code: code,
            settings: {
              class_types: studioTypes.length ? studioTypes : DEFAULT_TYPES,
              levels: studioLevels.length ? studioLevels : DEFAULT_LEVELS,
              contact: studioContact.trim() || null,
              description: studioDesc.trim() || null,
              ai_profile: aiToString(sAi) || null,
            },
          })
          .select('id')
          .single();
        if (studioErr) throw studioErr;

        await supabase.from('studio_memberships').upsert(
          { user_id: user.id, studio_id: newStudio.id, role: 'owner', status: 'active' },
          { onConflict: 'user_id,studio_id' }
        );
        await supabase.from('profiles').update({ studio_id: newStudio.id }).eq('id', user.id);
      }

      // 4a. Instructor joining existing studio via code
      if (!isStudio && typeof joinStatus === 'object' && joinStatus?.id) {
        await supabase.from('studio_memberships').upsert(
          { user_id: user.id, studio_id: joinStatus.id, role: 'instructor', status: 'pending' },
          { onConflict: 'user_id,studio_id' }
        );
        await supabase.from('profiles').update({ studio_id: joinStatus.id }).eq('id', user.id);
        const { data: owners4a } = await supabase.from('studio_memberships').select('user_id').eq('studio_id', joinStatus.id).eq('status', 'active').in('role', ['owner', 'admin']);
        for (const o of owners4a || []) {
          if (o.user_id !== user.id) {
            await supabase.from('notifications').insert({
              user_id: o.user_id, type: 'join_request', read: false,
              title: 'Novo pedido de entrada',
              body: `${name.trim() || 'Alguém'} pediu para entrar no studio.`,
              item_type: 'studio', item_id: joinStatus.id,
              created_at: new Date().toISOString(),
            }).then(() => {}).catch(() => {});
          }
        }
      }

      // 4b. Studio manager joining existing studio via code
      if (isStudio && studioAction === 'join' && typeof sJoinStatus === 'object' && sJoinStatus?.id) {
        await supabase.from('studio_memberships').upsert(
          { user_id: user.id, studio_id: sJoinStatus.id, role: 'instructor', status: 'pending' },
          { onConflict: 'user_id,studio_id' }
        );
        await supabase.from('profiles').update({ studio_id: sJoinStatus.id }).eq('id', user.id);
        const { data: owners4b } = await supabase.from('studio_memberships').select('user_id').eq('studio_id', sJoinStatus.id).eq('status', 'active').in('role', ['owner', 'admin']);
        for (const o of owners4b || []) {
          if (o.user_id !== user.id) {
            await supabase.from('notifications').insert({
              user_id: o.user_id, type: 'join_request', read: false,
              title: 'Novo pedido de entrada',
              body: `${name.trim() || 'Alguém'} pediu para entrar no studio.`,
              item_type: 'studio', item_id: sJoinStatus.id,
              created_at: new Date().toISOString(),
            }).then(() => {}).catch(() => {});
          }
        }
      }

      onComplete(savedAiRef.current || null, { isInstructor, isStudio });
    } catch (e) {
      console.error('Onboarding save error:', e);
      setSaveError(e.message || 'Erro ao guardar. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  };


  // ─── ROLE ────────────────────────────────────────────────────────────────────
  if (step === 'role') return (
    <Shell>
      <Card header="Como vais usar o The Haven?" sub="Selecciona todos os que se aplicam.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CheckRow label="Sou instrutora/or" description="Crio séries e aulas, uso a IA para gerar cues." checked={isInstructor} onChange={setIsInstructor} />
          <CheckRow label="Giro um estúdio" description="Administro um studio, revejo e aprovo conteúdo da equipa." checked={isStudio} onChange={setIsStudio} />
        </div>
        <NavRow onNext={goNext} nextLabel="Começar →" nextDisabled={!isInstructor && !isStudio} />
      </Card>
    </Shell>
  );

  // ─── NAME ────────────────────────────────────────────────────────────────────
  if (step === 'i_name') return (
    <Shell>
      <ProgressBar label={isInstructor ? 'Instrutor' : 'Configuração'} current={1} total={isInstructor ? 5 : 1} />
      <Card header="Como te chamas?" sub="O teu nome será visível para os colegas do studio.">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="O teu nome" autoFocus
          onKeyDown={e => e.key === 'Enter' && name.trim() && goNext()}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
        <NavRow onBack={goPrev} onNext={goNext} nextDisabled={!name.trim()} />
      </Card>
    </Shell>
  );

  // ─── INSTRUCTOR: CLASS TYPES ──────────────────────────────────────────────────
  if (step === 'i_types') return (
    <Shell>
      <ProgressBar label="Instrutor" current={2} total={5} />
      <Card header="Que tipo de aulas leccionas?" sub="Selecciona todos os que se aplicam.">
        <PillGroup
          available={availableTypes} selected={types}
          onToggle={t => setTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
          custom={customType} onCustomChange={setCustomType}
          onCustomAdd={() => addType(availableTypes, setAvailableTypes, types, setTypes, customType, setCustomType)}
          placeholder="Adicionar tipo…"
        />
        <NavRow onBack={goPrev} onNext={goNext} onSkip={goNext} />
      </Card>
    </Shell>
  );

  // ─── INSTRUCTOR: BIO ─────────────────────────────────────────────────────────
  if (step === 'i_bio') return (
    <Shell>
      <ProgressBar label="Instrutor" current={3} total={5} />
      <Card header="Sobre ti" sub="Uma breve bio para o teu perfil público. Podes editar mais tarde.">
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
          placeholder="Ex: Instrutora de Pilates com 8 anos de experiência, especializada em reabilitação e pré-natal…"
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
        <NavRow onBack={goPrev} onNext={goNext} onSkip={goNext} />
      </Card>
    </Shell>
  );

  // ─── INSTRUCTOR: AI QUESTIONS ─────────────────────────────────────────────────
  if (step === 'i_ai') return (
    <Shell>
      {aiSkipWarn && <AiSkipModal onConfirm={() => { setAiSkipWarn(false); goNext(); }} onCancel={() => setAiSkipWarn(false)} />}
      <ProgressBar label="Instrutor" current={4} total={5} />
      <Card header="O teu estilo de instrução" sub="A IA vai usar estas preferências para gerar cues adaptadas a ti.">
        <AiForm ai={iAi} setAi={setIAi} />
        <NavRow onBack={goPrev} onNext={goNext} onSkip={() => setAiSkipWarn(true)} skipLabel="Configurar mais tarde →" />
      </Card>
    </Shell>
  );

  // ─── INSTRUCTOR: JOIN STUDIO ──────────────────────────────────────────────────
  if (step === 'i_join') return (
    <Shell>
      <ProgressBar label="Instrutor" current={5} total={5} />
      <Card
        header="Pertences a um studio?"
        sub={isStudio ? 'Podes também entrar num studio existente com um código de convite.' : 'Se tens um código de convite, introduz-o aqui. Caso contrário, podes saltar.'}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinStatus(null); }}
            placeholder="Código do studio (ex: HVN4KR)"
            onKeyDown={e => e.key === 'Enter' && lookupStudioCode()}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, letterSpacing: '0.1em', fontWeight: 600, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
          <button type="button" onClick={lookupStudioCode} disabled={!joinCode.trim() || joinStatus === 'searching'}
            style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', color: C.ink }}>
            {joinStatus === 'searching' ? '…' : 'Verificar'}
          </button>
        </div>
        {joinStatus && joinStatus !== 'searching' && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontFamily: "'Satoshi', sans-serif", background: typeof joinStatus === 'object' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${typeof joinStatus === 'object' ? '#bbf7d0' : '#fecaca'}`, color: typeof joinStatus === 'object' ? '#166534' : '#991b1b' }}>
            {typeof joinStatus === 'object'
              ? `✓ Studio encontrado: ${joinStatus.name}. O teu pedido ficará pendente até o admin aprovar.`
              : '✗ Código não encontrado. Confirma com o studio.'}
          </div>
        )}
        <NavRow
          onBack={goPrev}
          onNext={isStudio ? goNext : handleSave}
          nextLabel={isStudio ? 'Continuar →' : 'Concluir ✓'}
          saving={saving && !isStudio}
          onSkip={isStudio ? goNext : handleSave}
          skipLabel={isStudio ? 'Saltar este passo' : 'Saltar e começar →'}
        />
        {saveError && <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', textAlign: 'center', fontFamily: "'Satoshi', sans-serif" }}>{saveError}</div>}
      </Card>
    </Shell>
  );

  // ─── STUDIO: CREATE vs JOIN ───────────────────────────────────────────────────
  if (step === 's_choice') return (
    <Shell>
      <ProgressBar label="Studio" current={1} total={studioAction === 'create' ? 4 : 1} />
      <Card header="O teu studio" sub="Queres criar um studio novo ou entrar num que já existe?">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { value: 'create', label: 'Criar um studio novo', desc: 'Vais configurar o studio e convidar a tua equipa.' },
            { value: 'join',   label: 'Entrar num studio existente', desc: 'Tens um código de convite de um studio já criado.' },
          ].map(opt => (
            <div key={opt.value} onClick={() => setStudioAction(opt.value)} style={{
              padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
              border: `2px solid ${studioAction === opt.value ? C.crimson : C.stone}`,
              background: studioAction === opt.value ? `${C.crimson}08` : C.white,
              transition: 'all 0.15s',
            }}>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 14, color: studioAction === opt.value ? C.crimson : C.ink, marginBottom: 3 }}>
                {studioAction === opt.value ? '● ' : '○ '}{opt.label}
              </div>
              <div style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 12, color: C.mist }}>{opt.desc}</div>
            </div>
          ))}
        </div>
        <NavRow onBack={goPrev} onNext={goNext} nextDisabled={!studioAction}
          onSkip={handleSave} skipLabel="Saltar e começar sem studio →" saving={saving} />
        {saveError && <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', textAlign: 'center', fontFamily: "'Satoshi', sans-serif" }}>{saveError}</div>}
      </Card>
    </Shell>
  );

  // ─── STUDIO: JOIN EXISTING (via code) ─────────────────────────────────────────
  if (step === 's_join') return (
    <Shell>
      <ProgressBar label="Studio" current={1} total={1} />
      <Card header="Entrar num studio" sub="Introduz o código de convite do studio.">
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={sJoinCode} onChange={e => { setSJoinCode(e.target.value.toUpperCase()); setSJoinStatus(null); }}
            placeholder="Código do studio (ex: HVN4KR)"
            onKeyDown={e => e.key === 'Enter' && lookupSJoinCode()}
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, letterSpacing: '0.1em', fontWeight: 600, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
          <button type="button" onClick={lookupSJoinCode} disabled={!sJoinCode.trim() || sJoinStatus === 'searching'}
            style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', color: C.ink }}>
            {sJoinStatus === 'searching' ? '…' : 'Verificar'}
          </button>
        </div>
        {sJoinStatus && sJoinStatus !== 'searching' && (
          <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontFamily: "'Satoshi', sans-serif", background: typeof sJoinStatus === 'object' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${typeof sJoinStatus === 'object' ? '#bbf7d0' : '#fecaca'}`, color: typeof sJoinStatus === 'object' ? '#166534' : '#991b1b' }}>
            {typeof sJoinStatus === 'object'
              ? `✓ Studio encontrado: ${sJoinStatus.name}. O teu pedido ficará pendente até o admin aprovar.`
              : '✗ Código não encontrado. Confirma com o studio.'}
          </div>
        )}
        <NavRow onBack={goPrev} onNext={handleSave} nextLabel="Concluir ✓" saving={saving}
          onSkip={handleSave} skipLabel="Saltar e começar →" />
        {saveError && <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', textAlign: 'center', fontFamily: "'Satoshi', sans-serif" }}>{saveError}</div>}
      </Card>
    </Shell>
  );

  // ─── STUDIO: NAME + CODE ──────────────────────────────────────────────────────
  if (step === 's_name') return (
    <Shell>
      <ProgressBar label="Studio" current={1} total={4} />
      <Card header="O teu studio" sub="Dá um nome ao studio e verifica o código de convite.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel>Nome do studio</FieldLabel>
            <input value={studioName} onChange={e => setStudioName(e.target.value)} placeholder="Ex: The Haven Lisboa" autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel>Código de convite</FieldLabel>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={studioCode}
                onChange={e => setStudioCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                style={{ width: 140, padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.2em', textAlign: 'center', color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
              <button type="button" onClick={() => setStudioCode(genCode())}
                style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 12, cursor: 'pointer', color: C.mist, whiteSpace: 'nowrap' }}>
                Gerar novo
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.mist, marginTop: 6, fontFamily: "'Satoshi', sans-serif" }}>
              Os instrutores usam este código para pedir para entrar no studio.
            </div>
          </div>
        </div>
        <NavRow onBack={goPrev} onNext={goNext} nextDisabled={!studioName.trim() || studioCode.length < 4}
          onSkip={handleSave} skipLabel="Saltar e começar sem studio →" saving={saving} />
      </Card>
    </Shell>
  );

  // ─── STUDIO: TYPES + LEVELS ───────────────────────────────────────────────────
  if (step === 's_types') return (
    <Shell>
      <ProgressBar label="Studio" current={2} total={4} />
      <Card header="Tipos de aula e níveis" sub="Define os tipos de aula e os níveis que o studio oferece.">
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Tipos de aula</FieldLabel>
          <PillGroup
            available={studioAvailableTypes} selected={studioTypes}
            onToggle={t => setStudioTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
            custom={studioCustomType} onCustomChange={setStudioCustomType}
            onCustomAdd={() => addType(studioAvailableTypes, setStudioAvailableTypes, studioTypes, setStudioTypes, studioCustomType, setStudioCustomType)}
            placeholder="Adicionar tipo…"
          />
        </div>
        <div>
          <FieldLabel>Níveis</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {DEFAULT_LEVELS.map(l => <Pill key={l} label={l} active={studioLevels.includes(l)} onClick={() => setStudioLevels(p => p.includes(l) ? p.filter(x => x !== l) : [...p, l])} />)}
          </div>
        </div>
        <NavRow onBack={goPrev} onNext={goNext} onSkip={goNext} />
      </Card>
    </Shell>
  );

  // ─── STUDIO: DETAILS ──────────────────────────────────────────────────────────
  if (step === 's_details') return (
    <Shell>
      <ProgressBar label="Studio" current={3} total={4} />
      <Card header="Detalhes do studio" sub="Informação opcional para o perfil público.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <FieldLabel optional>Contacto / website</FieldLabel>
            <input value={studioContact} onChange={e => setStudioContact(e.target.value)} placeholder="Ex: geral@thehaven.pt"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <FieldLabel optional>Descrição</FieldLabel>
            <textarea value={studioDesc} onChange={e => setStudioDesc(e.target.value)} rows={3}
              placeholder="Uma breve descrição do studio para o perfil público…"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>
        <NavRow onBack={goPrev} onNext={goNext} onSkip={goNext} />
      </Card>
    </Shell>
  );

  // ─── STUDIO: AI QUESTIONS ─────────────────────────────────────────────────────
  if (step === 's_ai') return (
    <Shell>
      {sAiSkipWarn && <AiSkipModal onConfirm={() => { setSAiSkipWarn(false); handleSave(); }} onCancel={() => setSAiSkipWarn(false)} />}
      <ProgressBar label="Studio" current={4} total={4} />
      <Card header="Perfil de instrução do studio" sub="Define as preferências gerais que guiam a IA de todos os instrutores.">
        <AiForm ai={sAi} setAi={setSAi} forStudio />
        <NavRow onBack={goPrev} onNext={handleSave} nextLabel="Concluir ✓" saving={saving} onSkip={() => setSAiSkipWarn(true)} skipLabel="Configurar mais tarde →" />
        {saveError && <div style={{ marginTop: 10, fontSize: 12, color: '#991b1b', textAlign: 'center', fontFamily: "'Satoshi', sans-serif" }}>{saveError}</div>}
      </Card>
    </Shell>
  );

  return null;
}
