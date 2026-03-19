import React from 'react';

const C = {
  crimson: '#721919', cream: '#FFFAF7', stone: '#E8DDD8',
  ink: '#292323', mist: '#9A8880', white: '#FFFFFF',
};

export const APPROACHES    = ['STOTT', 'Classical', 'Athletic', 'Reabilitação', 'Pré-natal', 'Funcional'];
export const TONES         = ['Motivacional', 'Técnico', 'Calmo', 'Conversacional'];
export const CUE_STYLES    = ['Anatómico', 'Imagem mental', 'Sensação corporal'];
export const AVOID_OPTIONS = ['Linguagem estética', 'Referências à dor', 'Assumpções de género', 'Termos clínicos'];
export const LANG_OPTIONS  = ['PT', 'EN', 'ES', 'FR'];
export const AUDIENCES     = ['Iniciantes', 'Misto', 'Intermédio', 'Avançado', 'Pré-natal', 'Reabilitação'];

export const BLANK_AI = { approach: [], cueStyle: '', tone: [], avoid: [], avoidCustom: '', languages: ['PT'], audience: [], notes: '' };

export const aiToString = (ai) => {
  if (!ai) return '';
  const parts = [];
  if (ai.approach?.length)  parts.push(`Abordagem: ${ai.approach.join(', ')}`);
  if (ai.cueStyle)           parts.push(`Estilo de cue: ${ai.cueStyle}`);
  if (ai.tone?.length)       parts.push(`Tom: ${ai.tone.join(', ')}`);
  const avoidAll = [...(ai.avoid || []), ...(ai.avoidCustom?.trim() ? [ai.avoidCustom.trim()] : [])];
  if (avoidAll.length)       parts.push(`Evitar: ${avoidAll.join(', ')}`);
  const langs = [...(ai.languages || []), ...(ai.langOther && ai.langOtherText?.trim() ? [ai.langOtherText.trim()] : [])];
  if (langs.length)          parts.push(`Língua: ${langs.join(', ')}`);
  if (ai.audience?.length)   parts.push(`Público: ${ai.audience.join(', ')}`);
  if (ai.notes?.trim())      parts.push(ai.notes.trim());
  return parts.join('\n');
};

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

const RadioPill = ({ label, active, onClick }) => (
  <button type="button" onClick={onClick} style={{
    padding: '7px 16px', borderRadius: 20,
    border: `1.5px solid ${active ? C.crimson : C.stone}`,
    background: active ? C.crimson : C.white,
    color: active ? C.white : C.mist,
    fontFamily: "'Satoshi', sans-serif", fontWeight: 600, fontSize: 13,
    cursor: 'pointer', transition: 'all 0.15s',
  }}>
    {label}
  </button>
);

const CheckRow = ({ label, checked, onChange }) => (
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
    <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 14, color: C.ink, fontWeight: 500 }}>{label}</span>
  </label>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 8, fontFamily: "'Satoshi', sans-serif" }}>
    {children}
  </div>
);

export const AiForm = ({ ai = BLANK_AI, setAi, forStudio = false }) => {
  const up = (k, v) => setAi(p => ({ ...p, [k]: v }));
  const toggle = (k, v) => setAi(p => ({
    ...p,
    [k]: (p[k] || []).includes(v) ? (p[k] || []).filter(x => x !== v) : [...(p[k] || []), v],
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <FieldLabel>Abordagem</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {APPROACHES.map(a => <Pill key={a} label={a} active={(ai.approach || []).includes(a)} onClick={() => toggle('approach', a)} />)}
        </div>
      </div>

      <div>
        <FieldLabel>Estilo de cue preferido</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CUE_STYLES.map(s => <RadioPill key={s} label={s} active={ai.cueStyle === s} onClick={() => up('cueStyle', s)} />)}
        </div>
      </div>

      <div>
        <FieldLabel>Tom</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {TONES.map(t => <Pill key={t} label={t} active={(ai.tone || []).includes(t)} onClick={() => toggle('tone', t)} />)}
        </div>
      </div>

      {!forStudio && (
        <div>
          <FieldLabel>O que evitar</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {AVOID_OPTIONS.map(o => (
              <CheckRow key={o} label={o}
                checked={(ai.avoid || []).includes(o)}
                onChange={v => setAi(p => ({ ...p, avoid: v ? [...(p.avoid || []), o] : (p.avoid || []).filter(x => x !== o) }))} />
            ))}
          </div>
          <input value={ai.avoidCustom || ''} onChange={e => up('avoidCustom', e.target.value)}
            placeholder="Outros…"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      <div>
        <FieldLabel>Língua de instrução</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LANG_OPTIONS.map(l => <Pill key={l} label={l} active={(ai.languages || []).includes(l)} onClick={() => toggle('languages', l)} />)}
          <Pill label="Outro" active={!!ai.langOther} onClick={() => up('langOther', !ai.langOther)} />
        </div>
        {ai.langOther && (
          <input value={ai.langOtherText || ''} onChange={e => up('langOtherText', e.target.value)}
            placeholder="Qual?" autoFocus
            style={{ marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        )}
      </div>

      {!forStudio && (
        <div>
          <FieldLabel>Público-alvo</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {AUDIENCES.map(a => <Pill key={a} label={a} active={(ai.audience || []).includes(a)} onClick={() => toggle('audience', a)} />)}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Notas adicionais (opcional)</FieldLabel>
        <textarea value={ai.notes || ''} onChange={e => up('notes', e.target.value)}
          placeholder="Ex: Prefiro cues de imagem corporal. Evito comparações com outras modalidades."
          rows={3}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi', sans-serif", fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
      </div>
    </div>
  );
};
