import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';

const C = {
  crimson: '#721919', cream: '#FFFAF7', stone: '#E8DDD8',
  ink: '#292323', mist: '#9A8880', white: '#FFFFFF', peach: '#FFB892',
};

const DEFAULT_CLASS_TYPES = ['Reformer', 'Matwork', 'Barre', 'Cycling'];
const DEFAULT_ZONES = ['Glutes', 'Hamstrings', 'Quads', 'Inner Thighs', 'Calves', 'Core', 'Back', 'Arms', 'Shoulders', 'Chest', 'Full Body', 'Cardio', 'Warm-Up', 'Mobility', 'Flexibility', 'Balance'];

const CheckPill = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} style={{
    padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${active ? C.crimson : C.stone}`,
    background: active ? `${C.crimson}12` : C.white, color: active ? C.crimson : C.mist,
    fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 13, cursor: 'pointer',
    transition: 'all 0.15s',
  }}>{active ? '✓ ' : ''}{label}</button>
);

export default function Onboarding({ user, profile, onComplete }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(profile?.name || '');
  const [availableTypes, setAvailableTypes] = useState(DEFAULT_CLASS_TYPES);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [customType, setCustomType] = useState('');
  const [availableZones, setAvailableZones] = useState(DEFAULT_ZONES);
  const [selectedZones, setSelectedZones] = useState([]);
  const [customZone, setCustomZone] = useState('');
  const [aiStyle, setAiStyle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = profile?.studios?.settings;
    if (s?.class_types?.length) setAvailableTypes(s.class_types);
    if (s?.zones?.length) setAvailableZones(s.zones);
  }, [profile]);

  const toggleType = t => setSelectedTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleZone = z => setSelectedZones(p => p.includes(z) ? p.filter(x => x !== z) : [...p, z]);

  const addCustomType = () => {
    const t = customType.trim();
    if (!t || availableTypes.map(x => x.toLowerCase()).includes(t.toLowerCase())) return;
    setAvailableTypes(p => [...p, t]);
    setSelectedTypes(p => [...p, t]);
    setCustomType('');
  };

  const addCustomZone = () => {
    const z = customZone.trim();
    if (!z || availableZones.map(x => x.toLowerCase()).includes(z.toLowerCase())) return;
    setAvailableZones(p => [...p, z]);
    setSelectedZones(p => [...p, z]);
    setCustomZone('');
  };

  const handleComplete = async () => {
    setSaving(true);
    await supabase.from('profiles').update({
      name: name.trim() || profile?.name,
      onboarded: true,
      settings: { class_types: selectedTypes, preferred_zones: selectedZones },
    }).eq('id', user.id);
    if (aiStyle.trim()) {
      await supabase.from('ai_styles').upsert(
        { user_id: user.id, value: aiStyle.trim(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    }
    onComplete(aiStyle.trim());
    setSaving(false);
  };

  useEffect(() => {
    const id = 'haven-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  const stepLabel = ['Perfil', 'Aulas', 'Zonas', 'Estilo AI'];

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi',sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.mist, marginBottom: 6 }}>The Haven</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 24, fontWeight: 600, color: C.crimson }}>Bem-vinda 👋</div>
          <div style={{ fontSize: 14, color: C.mist, marginTop: 6 }}>Vamos configurar o teu perfil em 4 passos rápidos.</div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {stepLabel.map((l, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, background: i + 1 < step ? C.crimson : i + 1 === step ? C.crimson : C.stone, color: i + 1 <= step ? C.cream : C.mist, transition: 'all 0.2s' }}>{i + 1 < step ? '✓' : i + 1}</div>
              <div style={{ fontSize: 10, color: i + 1 === step ? C.crimson : C.mist, fontWeight: i + 1 === step ? 700 : 400 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.stone}`, padding: '28px 28px 24px' }}>

          {/* Step 1: Name */}
          {step === 1 && (
            <div>
              <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>Como te chamas?</h3>
              <p style={{ fontSize: 13, color: C.mist, marginBottom: 20 }}>O teu nome será visível para os colegas do studio.</p>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="O teu nome"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 14, color: C.ink, outline: 'none', boxSizing: 'border-box' }}
                onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
                autoFocus
              />
            </div>
          )}

          {/* Step 2: Class types */}
          {step === 2 && (
            <div>
              <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>Que tipo de aulas leccionas?</h3>
              <p style={{ fontSize: 13, color: C.mist, marginBottom: 16 }}>Selecciona todos os que se aplicam. Podes adicionar tipos personalizados.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {availableTypes.map(t => <CheckPill key={t} label={t} active={selectedTypes.includes(t)} onClick={() => toggleType(t)} />)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Adicionar tipo…" onKeyDown={e => e.key === 'Enter' && addCustomType()}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
                <button type="button" onClick={addCustomType} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
              </div>
            </div>
          )}

          {/* Step 3: Zones */}
          {step === 3 && (
            <div>
              <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>Zonas que trabalhas mais?</h3>
              <p style={{ fontSize: 13, color: C.mist, marginBottom: 16 }}>Selecciona as zonas corporais que utilizas com mais frequência.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {availableZones.map(z => <CheckPill key={z} label={z} active={selectedZones.includes(z)} onClick={() => toggleZone(z)} />)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={customZone} onChange={e => setCustomZone(e.target.value)} placeholder="Adicionar zona…" onKeyDown={e => e.key === 'Enter' && addCustomZone()}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
                <button type="button" onClick={addCustomZone} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
              </div>
            </div>
          )}

          {/* Step 4: AI style */}
          {step === 4 && (
            <div>
              <h3 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 18, fontWeight: 600, color: C.ink, margin: '0 0 6px' }}>O teu estilo de instrução</h3>
              <p style={{ fontSize: 13, color: C.mist, marginBottom: 16 }}>Descreve o teu estilo de instrução — tom, preferências, o que evitas. A IA vai aprender com isto.</p>
              <textarea
                value={aiStyle} onChange={e => setAiStyle(e.target.value)}
                placeholder="Ex: Uso linguagem clara e motivadora, prefiro cues de imagem corporal em vez de anatómicos, evito linguagem de impacto estético…"
                rows={5}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: C.mist, marginTop: 8 }}>Podes saltar este passo e configurar mais tarde nas definições.</p>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <button onClick={() => setStep(p => Math.max(1, p - 1))} style={{ background: 'none', border: 'none', color: C.mist, fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 13, cursor: step === 1 ? 'default' : 'pointer', opacity: step === 1 ? 0 : 1 }}>← Anterior</button>
            {step < 4 ? (
              <button onClick={() => setStep(p => p + 1)} disabled={step === 1 && !name.trim()}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream, fontFamily: "'Satoshi',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: step === 1 && !name.trim() ? 0.5 : 1 }}>
                Continuar →
              </button>
            ) : (
              <button onClick={handleComplete} disabled={saving}
                style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream, fontFamily: "'Satoshi',sans-serif", fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'A guardar…' : 'Começar ✓'}
              </button>
            )}
          </div>
        </div>

        {step < 4 && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button onClick={() => setStep(p => p + 1)} style={{ background: 'none', border: 'none', color: C.mist, fontFamily: "'Satoshi',sans-serif", fontSize: 12, cursor: 'pointer' }}>Saltar este passo</button>
          </div>
        )}
      </div>
    </div>
  );
}
