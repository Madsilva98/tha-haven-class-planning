import React, { useState, useEffect } from "react";
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';
import Onboarding from './Onboarding.jsx';

// Capture invite code from URL and store it for use after login
const urlParams = new URLSearchParams(window.location.search);
const pendingInvite = urlParams.get('invite');
if (pendingInvite) localStorage.setItem('pending_invite', pendingInvite);
const shareTokenParam = urlParams.get('share') || null;

const C = {
  // The Haven brand palette
  crimson: "#721919",  // nav, titles, primary actions
  reformer:"#B03245",  // reformer-related
  barre:   "#F8ADBA",  // barre-related
  sig:     "#FFB892",  // signature-related
  blue:    "#C8E0FC",  // intro/setup cues
  cream:   "#FFFAF7",  // page background
  stone:   "#E8DDD8",  // borders, dividers
  ink:     "#292323",  // body text
  mist:    "#9A8880",  // secondary text
  neutral: "#6B6460",  // neutral actions (test/approved/delete toggles)
  white:   "#FFFFFF",

  // Legacy aliases
  sand:  "#FFFAF7",
  slate: "#292323",
  teal:  "#B03245",
  coral: "#F8ADBA",
  gold:  "#721919",
  rose:  "#B03245",
  peach: "#FFB892",
  blush: "#F8ADBA",
};


// ─── AUTO-RESIZE TEXTAREA HOOK ───────────────────────────────────────────────
const useAutoResize = (value) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);
  return ref;
};

// AutoTextarea — textarea that grows with its content
const AutoTextarea = ({ value, onChange, placeholder, style={}, onClick, minRows=1 }) => {
  const ref = useAutoResize(value);
  const baseStyle = {
    display:'block', width:'100%', fontFamily:"'Satoshi', sans-serif",
    fontSize:12, color:C.ink, background:'transparent', border:'none',
    outline:'none', resize:'none', lineHeight:1.7, padding:0,
    boxSizing:'border-box', overflow:'hidden',
    minHeight: minRows * 1.7 * 12 + 'px',
    ...style,
  };
  return <textarea ref={ref} value={value||''} onChange={onChange}
    onClick={onClick} placeholder={placeholder} rows={minRows} style={baseStyle}/>;
};


// ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
const ToastContext = React.createContext(null);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const add = React.useCallback((msg, type='success', duration=2800) => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), duration);
  }, []);
  return (
    <ToastContext.Provider value={add}>
      {children}
      <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:8,pointerEvents:'none'}}>
        {toasts.map(t => (
          <div key={t.id} style={{
            fontFamily:"'Satoshi', sans-serif", fontSize:13, fontWeight:500,
            padding:'10px 16px', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)',
            background: t.type==='error' ? '#fff0f0' : t.type==='saving' ? C.cream : '#f0fff4',
            color:       t.type==='error' ? '#8a1a1a' : t.type==='saving' ? C.mist  : '#1a5c2a',
            border:`1px solid ${t.type==='error'?'#f0c0c0':t.type==='saving'?C.stone:'#a0d8b0'}`,
            display:'flex', alignItems:'center', gap:8,
            animation:'slideIn 0.2s ease',
          }}>
            <span>{t.type==='error'?'✕':t.type==='saving'?'…':'✓'}</span>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </ToastContext.Provider>
  );
};

const useToast = () => React.useContext(ToastContext);


// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
const ConfirmContext = React.createContext(null);

const ConfirmProvider = ({ children }) => {
  const [state, setState] = React.useState(null);
  // state = { message, onConfirm, onCancel, confirmLabel, danger }

  const confirm = React.useCallback((message, opts={}) => {
    return new Promise(resolve => {
      setState({
        message,
        danger: opts.danger !== false,
        confirmLabel: opts.confirmLabel || "Apagar",
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => { state.resolve(true);  setState(null); };
  const handleCancel  = () => { state.resolve(false); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state&&(
        <div style={{position:'fixed',inset:0,zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={handleCancel}>
          {/* Overlay */}
          <div style={{position:'absolute',inset:0,background:'rgba(41,35,35,0.35)',backdropFilter:'blur(2px)'}}/>
          {/* Dialog */}
          <div style={{position:'relative',background:C.white,borderRadius:16,padding:'28px 32px',
            boxShadow:'0 20px 60px rgba(0,0,0,0.18)',maxWidth:380,width:'90%',textAlign:'center'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{width:44,height:44,borderRadius:'50%',background:`${C.crimson}12`,
              display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <Icon name="x" size={20}/>
            </div>
            <p style={{fontFamily:"'Satoshi', sans-serif",fontSize:15,color:C.ink,margin:'0 0 24px',lineHeight:1.5}}>
              {state.message}
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center'}}>
              <Btn variant="ghost" onClick={handleCancel}>Cancelar</Btn>
              <Btn onClick={handleConfirm}
                style={{background:state.danger?C.crimson:C.neutral,color:C.cream}}>
                {state.confirmLabel}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

const useConfirm = () => React.useContext(ConfirmContext);

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const SIGNATURE_SERIES = [
  {
    id:"sig-1", name:"Like A Girl – Legs Opening", type:"signature",
    reformer:{ springs:"2 reds 1 blue", props:"", startPosition:"Toes on footbar", movements:[
      { timing:"0'' – 46''",      lyric:"",                         movement:"Toes",                          breath:"Exhale on effort",    transitionCue:"" },
      { timing:"47'' – 1'",       lyric:"Find me up in magic city", movement:"Pulses",                        breath:"Short exhale pulses", transitionCue:"stay with me — and we pulse" },
      { timing:"1' – 1'12''",     lyric:"I work my femininity",     movement:"Hold",                          breath:"Steady inhale",       transitionCue:"hold it right there" },
      { timing:"1'13'' – 1'40''", lyric:"Chaka Khan",               movement:"Toes heels together",           breath:"Exhale on effort",    transitionCue:"heels together — reformer: toes in / barre: plié arms up" },
      { timing:"1'41'' – 1'53''", lyric:"Find me up in magic city", movement:"Pulses",                        breath:"Short exhale pulses", transitionCue:"and we pulse" },
      { timing:"1'54'' – 2'6''",  lyric:"I work my femininity",     movement:"Hold",                          breath:"Steady inhale",       transitionCue:"hold" },
      { timing:"2'7'' – 2'33''",  lyric:"If you fight like a girl", movement:"2nd position",                  breath:"Exhale on effort",    transitionCue:"open wide — reformer: 2nd / barre: sumo press" },
      { timing:"2'34'' – 2'47''", lyric:"Find me up in magic city", movement:"Pulses",                        breath:"Short exhale pulses", transitionCue:"and we pulse" },
      { timing:"2'48''",          lyric:"I work my femininity",     movement:"Hold",                          breath:"Steady inhale",       transitionCue:"hold and breathe" },
    ]},
    barre:{ props:"Dumbbells", startPosition:"Standing", movements:[
      { timing:"0'' – 46''",      lyric:"",                         movement:"Squats with dumbbells on shoulders",     breath:"Exhale on way down" },
      { timing:"47'' – 1'",       lyric:"Find me up in magic city", movement:"Pulses",                                 breath:"Short exhale pulses" },
      { timing:"1' – 1'12''",     lyric:"I work my femininity",     movement:"Hold",                                   breath:"Steady" },
      { timing:"1'13'' – 1'40''", lyric:"Chaka Khan",               movement:"Plié with dumbbells to shoulder height", breath:"Exhale lifting" },
      { timing:"1'41'' – 1'53''", lyric:"Find me up in magic city", movement:"Pulses",                                 breath:"Short exhale pulses" },
      { timing:"1'54'' – 2'6''",  lyric:"I work my femininity",     movement:"Hold",                                   breath:"Steady" },
      { timing:"2'7'' – 2'33''",  lyric:"If you fight like a girl", movement:"Sumo w/ dumbbells shoulder press",       breath:"Exhale pressing up" },
      { timing:"2'34'' – 2'47''", lyric:"Find me up in magic city", movement:"Pulses",                                 breath:"Short exhale pulses" },
      { timing:"2'48''",          lyric:"I work my femininity",     movement:"Hold",                                   breath:"Steady" },
    ]},
    muscles:["Glutes","Inner thighs","Quads","Shoulders (barre)"],
    cues:"Keep the pelvis neutral throughout. Cue: 'imagina que tens uma parede atrás de ti'. For barre: remind clients to keep weight through heels on the squat, not the toes.",
    status:"approved", song:"Like A Girl – Doja Cat",
  },
  {
    id:"sig-2", name:"Sports Car – Glute Bridge", type:"signature",
    reformer:{ springs:"1 red + Band", props:"Band", startPosition:"Lying supine, heels on footbar", movements:[
      { timing:"0'' – 30''",      lyric:"Hey cute jeans",             movement:"Glute bridge on heels",          breath:"Exhale lifting hips", transitionCue:"" },
      { timing:"31'' – 46''",     lyric:"In the alley in the back",   movement:"Hold – open knees",              breath:"Steady breath",       transitionCue:"stay up — and open the knees" },
      { timing:"47'' – 1'3''",    lyric:"I think I know",             movement:"Hold – open and close carriage", breath:"Exhale closing",      transitionCue:"keep hips up — reformer: open the carriage / barre: one leg up" },
      { timing:"1'4'' – 1'23''",  lyric:"Pretty blue street lights",  movement:"Hold up – one leg to tabletop",  breath:"Exhale extending",    transitionCue:"right leg table top" },
      { timing:"1'24'' – 1'31''", lyric:"On the corner on the bench", movement:"Pulse",                          breath:"Short exhales",       transitionCue:"and we pulse" },
      { timing:"1'31'' – 1'51''", lyric:"I think you know",           movement:"Hold up – other leg to tabletop",breath:"Exhale extending",    transitionCue:"switch — left leg table top" },
      { timing:"1'52'' – 2'7''",  lyric:"I think you know 2nd",       movement:"Pulse",                          breath:"Short exhales",       transitionCue:"and we pulse" },
    ]},
    barre:{ props:"Ankle weights + band", startPosition:"Lying supine on mat", movements:[
      { timing:"0'' – 30''",      lyric:"Hey cute jeans",             movement:"Glute bridge on toes",               breath:"Exhale lifting hips" },
      { timing:"31'' – 46''",     lyric:"In the alley in the back",   movement:"Open knees",                         breath:"Steady" },
      { timing:"47'' – 1'3''",    lyric:"I think I know",             movement:"Hold bridge – one leg up at a time", breath:"Exhale lifting" },
      { timing:"1'4'' – 1'23''",  lyric:"Pretty blue street lights",  movement:"One leg to tabletop – up down",      breath:"Exhale on up" },
      { timing:"1'24'' – 1'31''", lyric:"On the corner on the bench", movement:"Pulse",                              breath:"Short exhales" },
      { timing:"1'31'' – 1'51''", lyric:"I think you know",           movement:"Other leg to tabletop – up down",    breath:"Exhale on up" },
      { timing:"1'52'' – 2'7''",  lyric:"I think you know 2nd",       movement:"Pulse",                              breath:"Short exhales" },
    ]},
    muscles:["Glutes","Hamstrings","Core stabilisers","Hip abductors (band)"],
    cues:"Knees aligned with second toe throughout. Cue: 'pressiona o calcanhar contra o footbar como se quisesses afastá-lo'. Single-leg extension challenges balance.",
    status:"approved", song:"Sports Car – GloRilla",
  },
  {
    id:"sig-3", name:"Best Friend – Ab Series", type:"signature",
    reformer:{ springs:"1 red 1 blue", props:"Hands in straps", startPosition:"Lying supine", movements:[
      { timing:"10'' – 30''",  lyric:"That's my best friend",                    movement:"Legs tabletop – Crunch",                             breath:"Exhale crunching",  transitionCue:"" },
      { timing:"31'' – 51''",  lyric:"Beep beep",                                movement:"Crunch hold – extend one leg at a time",             breath:"Exhale extending",  transitionCue:"hold and extend" },
      { timing:"52'' – 1'1''", lyric:"I hit her phone with the tea",             movement:"Pulse",                                              breath:"Short exhales",     transitionCue:"and we pulse" },
      { timing:"1'2'' – 1'21''",lyric:"That my best friend, she a real bad bitch",movement:"Pause",                                             breath:"Steady",            transitionCue:"pause, hold it" },
      { timing:"1'22'' – 1'51''",lyric:"That my best friend if you need a freak",movement:"Legs tabletop – one foot touches floor keeping 90°", breath:"Exhale lowering",   transitionCue:"lower one foot, keep 90°" },
      { timing:"1'52'' – 2'11''",lyric:"That my best friend, she a real bad bitch",movement:"Crunch + legs extend 45° – back to tabletop",     breath:"Exhale extending",  transitionCue:"extend and return" },
      { timing:"2'12''",        lyric:"You the baddest and you know it",          movement:"Hold with legs extended",                           breath:"Steady",            transitionCue:"hold, breathe" },
    ]},
    barre:{ props:"", startPosition:"Lying supine on mat", movements:[
      { timing:"10'' – 30''",  lyric:"That's my best friend",                    movement:"Legs tabletop – Crunch",                             breath:"Exhale crunching" },
      { timing:"31'' – 51''",  lyric:"Beep beep",                                movement:"Crunch hold – extend one leg at a time",             breath:"Exhale extending" },
      { timing:"52'' – 1'1''", lyric:"I hit her phone with the tea",             movement:"Pulse",                                              breath:"Short exhales" },
      { timing:"1'2'' – 1'21''",lyric:"That my best friend, she a real bad bitch",movement:"Pause",                                            breath:"Steady" },
      { timing:"1'22'' – 1'51''",lyric:"That my best friend if you need a freak",movement:"Legs tabletop – one foot touches floor keeping 90°",breath:"Exhale lowering" },
      { timing:"1'52'' – 2'11''",lyric:"That my best friend, she a real bad bitch",movement:"Crunch + legs extend 45° – back to tabletop",    breath:"Exhale extending" },
      { timing:"2'12''",        lyric:"You the baddest and you know it",          movement:"Hold with legs extended",                           breath:"Steady" },
    ]},
    muscles:["Rectus abdominis","Obliques","Hip flexors","Transversus abdominis"],
    cues:"Keep the lower back imprinted. Cue: 'sente o umbigo a afastar-se do chão'. Cabeça apoiada nas mãos se o pescoço cansar.",
    status:"approved", song:"Best Friend – Saweetie ft. Doja Cat",
  },
  {
    id:"sig-4", name:"Woman – Lunge & Skates", type:"signature",
    reformer:{ springs:"1 red", props:"Short box", startPosition:"Kneeling on carriage, foot on footbar", movements:[
      { timing:"20'' – 1'13''", lyric:"Woman let me be",    movement:"Lunge",   breath:"Exhale forward",    transitionCue:"" },
      { timing:"1'14'' – 1'30''",lyric:"Refrão",            movement:"Skates",  breath:"Exhale extending",  transitionCue:"skate it back" },
      { timing:"1'31'' – 2'15''",lyric:"I can be your lady",movement:"Lunge",   breath:"Exhale forward",    transitionCue:"back to lunge" },
      { timing:"2'16''",         lyric:"Refrão",            movement:"Skates",  breath:"Exhale extending",  transitionCue:"skate it out" },
    ]},
    barre:{ props:"Slider + elastic below front foot", startPosition:"Standing, front foot on slider", movements:[
      { timing:"20'' – 1'13''", lyric:"Woman let me be",    movement:"Lunge – arms lift with elastic when going down", breath:"Exhale lowering" },
      { timing:"1'14'' – 1'30''",lyric:"Refrão",            movement:"Skates – arms stay up",                          breath:"Exhale extending" },
      { timing:"1'31'' – 2'15''",lyric:"I can be your lady",movement:"Lunge – arms lift with elastic when going down", breath:"Exhale lowering" },
      { timing:"2'16''",         lyric:"Refrão",            movement:"Skates – arms stay up",                          breath:"Exhale extending" },
    ]},
    muscles:["Quads","Glutes","Hip flexors","Adductors (slider)"],
    cues:"Front knee tracks over second toe in lunge. Cue: 'o joelho aponta para o segundo dedo do pé'. Skates: keep hips square, don't rotate.",
    status:"approved", song:"Woman – Doja Cat",
  },
  {
    id:"sig-5", name:"Bad Girls – Plank Series", type:"signature",
    reformer:{ springs:"1 blue", props:"Short box", startPosition:"Plank, hands on footbar, feet on box", movements:[
      { timing:"7'' – 20''",   lyric:"Live fast die young",      movement:"Bear hold",                      breath:"Steady",           transitionCue:"" },
      { timing:"21'' – 40''",  lyric:"The chain hits my chest",  movement:"Bear to plank",                  breath:"Exhale to plank",  transitionCue:"open to plank" },
      { timing:"41'' – 55''",  lyric:"Suki Suki",                movement:"Bear to plank",                  breath:"Exhale to plank",  transitionCue:"and again" },
      { timing:"56'' – 1'7''", lyric:"Live fast die young",      movement:"Plank hold",                     breath:"Steady",           transitionCue:"hold the plank" },
      { timing:"1'8'' – 1'40''",lyric:"The chain hits my chest", movement:"Plank to pike",                  breath:"Exhale piking",    transitionCue:"pike it up" },
      { timing:"1'41'' – 1'52''",lyric:"The chain hits my chest",movement:"Rest",                           breath:"Recovery",         transitionCue:"rest a moment" },
      { timing:"1'53'' – 2'6''",lyric:"Get back, get down",      movement:"Plank hold, side to side",       breath:"Steady",           transitionCue:"side to side" },
      { timing:"2'7'' – 2'21''",lyric:"Going nought to bitch",   movement:"Plank hold, pulse to one side",  breath:"Short exhales",    transitionCue:"pulse one side" },
      { timing:"2'22'' – 2'33''",lyric:"Shift gear",             movement:"Plank hold, pulse to other side",breath:"Short exhales",    transitionCue:"other side" },
      { timing:"2'34''",        lyric:"Get back, get down",       movement:"End",                            breath:"",                 transitionCue:"" },
    ]},
    barre:{ props:"Slider", startPosition:"Plank on mat, one foot on slider", movements:[
      { timing:"7'' – 20''",   lyric:"Live fast die young",      movement:"Bear hold",                      breath:"Steady" },
      { timing:"21'' – 40''",  lyric:"The chain hits my chest",  movement:"Plank + one foot to chest (slider)",breath:"Exhale pulling" },
      { timing:"41'' – 55''",  lyric:"Suki Suki",                movement:"Plank + other foot to chest (slider)",breath:"Exhale pulling" },
      { timing:"56'' – 1'7''", lyric:"Live fast die young",      movement:"Plank hold",                     breath:"Steady" },
      { timing:"1'8'' – 1'40''",lyric:"The chain hits my chest", movement:"Plank to pike",                  breath:"Exhale piking" },
      { timing:"1'41'' – 1'52''",lyric:"The chain hits my chest",movement:"Rest",                           breath:"Recovery" },
      { timing:"1'53'' – 2'6''",lyric:"Get back, get down",      movement:"Plank hold, side to side",       breath:"Steady" },
      { timing:"2'7'' – 2'21''",lyric:"Going nought to bitch",   movement:"Plank hold, pulse to one side",  breath:"Short exhales" },
      { timing:"2'22'' – 2'33''",lyric:"Shift gear",             movement:"Plank hold, pulse to other side",breath:"Short exhales" },
      { timing:"2'34''",        lyric:"Get back, get down",       movement:"End",                            breath:"" },
    ]},
    muscles:["Core","Shoulders","Triceps","Hip flexors","Glutes"],
    cues:"Hips level throughout — no hiking or sagging. Cue: 'imagina uma tábua da cabeça aos calcanhares'. Bear hold: joelhos a 2cm do chão, costas planas.",
    status:"approved", song:"Bad Girls – M.I.A.",
  },
  {
    id:"sig-6", name:"Yo Perreo Sola – Upper Body", type:"signature",
    reformer:{ springs:"1 blue 1 white", props:"Hands in straps, short box facing back", startPosition:"Seated on short box facing back", movements:[
      { timing:"20'' – 41''",  lyric:"Yo perreo sola",           movement:"Bicep curl",          breath:"Exhale curling",  transitionCue:"" },
      { timing:"42'' – 1'2''", lyric:"Que ningun baboso",         movement:"Open arms",           breath:"Exhale opening",  transitionCue:"open the arms" },
      { timing:"1'3'' – 1'21''",lyric:"Ella está soltera",        movement:"Bicep curl with open arms", breath:"Exhale curling", transitionCue:"curl with open arms" },
      { timing:"1'21'' – 1'40''",lyric:"Ella perrea sola",        movement:"Shoulder press",      breath:"Exhale pressing", transitionCue:"press up" },
      { timing:"1'41'' – 2'1''",lyric:"Tiene una amiga problemática",movement:"Triceps",          breath:"Exhale pressing", transitionCue:"triceps back" },
      { timing:"2'2'' – 2'10''",lyric:"Y me dice papi (slow)",    movement:"Hold",                breath:"Steady",          transitionCue:"hold, slow down" },
      { timing:"2'11'' – 2'30''",lyric:"Ante' tú me pichaba",     movement:"Offering",            breath:"Exhale lifting",  transitionCue:"offering arms" },
      { timing:"2'31''",        lyric:"To perreo sola",            movement:"Hug moon over head",  breath:"Steady",          transitionCue:"hug the moon" },
    ]},
    barre:{ props:"Dumbbells, sumo squat hold", startPosition:"Sumo squat hold", movements:[
      { timing:"20'' – 41''",  lyric:"Yo perreo sola",           movement:"Bicep curl",          breath:"Exhale curling" },
      { timing:"42'' – 1'2''", lyric:"Que ningun baboso",         movement:"Open arms",           breath:"Exhale opening" },
      { timing:"1'3'' – 1'21''",lyric:"Ella está soltera",        movement:"Bicep curl with open arms", breath:"Exhale curling" },
      { timing:"1'21'' – 1'40''",lyric:"Ella perrea sola",        movement:"Shoulder press",      breath:"Exhale pressing" },
      { timing:"1'41'' – 2'1''",lyric:"Tiene una amiga problemática",movement:"Triceps",          breath:"Exhale pressing" },
      { timing:"2'2'' – 2'10''",lyric:"Y me dice papi (slow)",    movement:"Hold",                breath:"Steady" },
      { timing:"2'11'' – 2'30''",lyric:"Ante' tú me pichaba",     movement:"Offering",            breath:"Exhale lifting" },
      { timing:"2'31''",        lyric:"To perreo sola",            movement:"Hug moon over head",  breath:"Steady" },
    ]},
    muscles:["Biceps","Triceps","Deltoids","Rhomboids","Core (sumo hold)"],
    cues:"Manter o sumo squat durante toda a série no barre — costas direitas, joelhos abertos. Reformer: omoplatas para baixo e para trás durante o curl. Cue: 'as omoplatas deslizam para os bolsos das calças'.",
    status:"approved", song:"Yo Perreo Sola – Bad Bunny",
  },
  {
    id:"sig-7", name:"Bootylicious – Side-Lying Hip", type:"signature",
    reformer:{ springs:"1 blue 1 white", props:"Strap in knee crease", startPosition:"Side-lying, strap in knee crease, knees together", movements:[
      { timing:"0'' – 37''",      lyric:"",                           movement:"Open knees",              breath:"Exhale opening",   transitionCue:"" },
      { timing:"38'' – 55''",     lyric:"You gotta do much better",   movement:"Pulse",                   breath:"Short exhales",    transitionCue:"and we pulse" },
      { timing:"56'' – 1'15''",   lyric:"I don't think you're ready", movement:"Extend and flex knee",    breath:"Exhale extending", transitionCue:"extend and flex — slow" },
      { timing:"Switch side",     lyric:"Baby can you handle this",   movement:"Switch",                  breath:"",                 transitionCue:"other side — take your time" },
      { timing:"1'43'' – 2'10''", lyric:"I don't think you're ready", movement:"Open knees",              breath:"Exhale opening",   transitionCue:"open the knees" },
      { timing:"2'11'' – 2'27''", lyric:"I shake my jelly",           movement:"Pulse",                   breath:"Short exhales",    transitionCue:"and we pulse" },
      { timing:"2'28'' – 2'48''", lyric:"I don't think you're ready", movement:"Extend and flex knee",    breath:"Exhale extending", transitionCue:"extend and flex" },
      { timing:"2'49''",          lyric:"I don't think you're ready", movement:"Rest",                    breath:"Recovery",         transitionCue:"lower down, well done" },
    ]},
    barre:{ props:"", startPosition:"Standing, front leg with heel on block", movements:[
      { timing:"0'' – 37''",      lyric:"",                           movement:"Leg goes up and down",    breath:"Exhale lifting" },
      { timing:"38'' – 55''",     lyric:"You gotta do much better",   movement:"Pulses up",               breath:"Short exhales" },
      { timing:"56'' – 1'15''",   lyric:"I don't think you're ready", movement:"Extend and flex knee up", breath:"Exhale extending" },
      { timing:"Switch side",     lyric:"",                           movement:"Pulses knee bent",        breath:"" },
      { timing:"1'43'' – 2'10''", lyric:"I don't think you're ready", movement:"Leg goes up and down",    breath:"Exhale lifting" },
      { timing:"2'11'' – 2'27''", lyric:"I shake my jelly",           movement:"Pulses up",               breath:"Short exhales" },
      { timing:"2'28'' – 2'48''", lyric:"I don't think you're ready", movement:"Extend and flex knee up", breath:"Exhale extending" },
      { timing:"2'49''",          lyric:"I don't think you're ready", movement:"Pulses knee bent",        breath:"Short exhales" },
    ]},
    muscles:["Glutes medius","Glutes maximus","Hip abductors","TFL","Core stabilisers"],
    cues:"Pelvis must not rotate back when knee opens. Cue: 'as ancas ficam empilhadas uma sobre a outra'. Barre: supporting leg slightly soft, never locked.",
    status:"approved", song:"Bootylicious – Destiny's Child",
  },
];

const EMPTY_SERIES = { introCue:"",
  id:"", name:"", type:"reformer", status:"testing",
  reformer:{ springs:"", props:"", startPosition:"", movements:[{ timing:"", lyric:"", movement:"", breath:"", transitionCue:"", timeReps:"" }] },
  barre:{ props:"", startPosition:"", movements:[{ timing:"", lyric:"", movement:"", breath:"", transitionCue:"", timeReps:"" }] },
  muscles:[], cues:"", song:"", videoUrl:"", targetZone:"", primaryZone:"", seriesType:"", openCue:"", closeCue:"", createdAt:"", duration: null,
};

const DEFAULT_CLASSES = [
  { id:"sig-class-1", name:"Signature Class", type:"signature", date:"2025-03-07", seriesIds:SIGNATURE_SERIES.map(s=>s.id), notes:"" }
];

// ─── FIELD MAPPING (JS camelCase ↔ DB snake_case) ────────────────────────────
const seriesToDB = (s, userId) => ({
  id: s.id, name: s.name, type: s.type, status: s.status || 'testing',
  song: s.song || null, intro_cue: s.introCue || null, open_cue: s.openCue || null,
  close_cue: s.closeCue || null, modifications: s.modifications || null,
  muscles: s.muscles || [], cues: s.cues || null,
  target_zone: s.targetZone || null, primary_zone: s.primaryZone || null, series_type: s.seriesType || null,
  reformer: s.reformer || null, barre: s.barre || null,
  video_url: s.videoUrl || null, created_by: userId,
  visibility: s.visibility || 'personal', studio_id: s.studioId || null,
  updated_at: new Date().toISOString(),
  duration: s.duration ?? null,
  attribution: s.attribution || null,
});
const seriesFromDB = row => ({
  id: row.id, name: row.name, type: row.type, status: row.status || 'testing',
  song: row.song || '', introCue: row.intro_cue || '', openCue: row.open_cue || '',
  closeCue: row.close_cue || '', modifications: row.modifications || '',
  muscles: row.muscles || [], cues: row.cues || '',
  targetZone: row.target_zone || '', primaryZone: row.primary_zone || '', seriesType: row.series_type || '',
  reformer: row.reformer || { springs:'', props:'', startPosition:'', movements:[{ timing:'', lyric:'', movement:'', breath:'', transitionCue:'' }] },
  barre: row.barre || { props:'', startPosition:'', movements:[{ timing:'', lyric:'', movement:'', breath:'', transitionCue:'' }] },
  videoUrl: row.video_url || '', createdAt: row.created_at ? row.created_at.split('T')[0] : '',
  createdBy: row.created_by || null, visibility: row.visibility || 'personal', studioId: row.studio_id || null,
  duration: row.duration ?? null,
  attribution: row.attribution || null,
});
const classToDB = (c, userId) => ({
  id: c.id, name: c.name, type: c.type, date: c.date || null,
  series_order: c.seriesIds || [], notes: c.notes || null,
  created_by: userId, visibility: c.visibility || 'personal',
  studio_id: c.studioId || null,
  level: c.level || null,
  warmup_notes: c.warmupNotes || null, cooldown_notes: c.cooldownNotes || null,
  attribution: c.attribution || null,
});
const classFromDB = row => ({
  id: row.id, name: row.name, type: row.type, date: row.date || '',
  seriesIds: row.series_order || [], notes: row.notes || '',
  shareToken: row.share_token || null,
  level: row.level || '',
  visibility: row.visibility || 'personal',
  studioId: row.studio_id || null,
  warmupNotes: row.warmup_notes || '', cooldownNotes: row.cooldown_notes || '',
  attribution: row.attribution || null,
});

// ─── PERSIST (Supabase) ──────────────────────────────────────────────────────
const api = {
  async load(key, fallback) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fallback;
      if (key === 'series') {
        const { data, error } = await supabase.from('series').select('*').order('created_at', { ascending: true });
        return (!error && data) ? data.map(seriesFromDB) : fallback;
      }
      if (key === 'classes') {
        const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: true });
        return (!error && data) ? data.map(classFromDB) : fallback;
      }
      if (key === 'aistyle') {
        const { data } = await supabase.from('ai_styles').select('*').eq('user_id', user.id).maybeSingle();
        return data ? { value: data.value || '' } : fallback;
      }
      if (key === 'examples') {
        const { data } = await supabase.from('examples').select('*').eq('user_id', user.id).order('ts', { ascending: false });
        return data || fallback;
      }
    } catch { return fallback; }
    return fallback;
  },
  async save(key, value) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (key === 'aistyle') {
        await supabase.from('ai_styles').upsert({ user_id: user.id, value: value.value || '', updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      }
    } catch(e) { console.error('Save failed:', e); }
  },
  async upsertSeries(s, userId) {
    try { await supabase.from('series').upsert(seriesToDB(s, userId), { onConflict: 'id' }); }
    catch(e) { console.error('Series save failed:', e); }
  },
  async removeSeries(id) {
    try { await supabase.from('series').delete().eq('id', id); }
    catch(e) { console.error(e); }
  },
  async upsertClass(c, userId) {
    try { await supabase.from('classes').upsert(classToDB(c, userId), { onConflict: 'id' }); }
    catch(e) { console.error('Class save failed:', e); }
  },
  async removeClass(id) {
    try { await supabase.from('classes').delete().eq('id', id); }
    catch(e) { console.error(e); }
  },
  async loadProfile(userId) {
    const { data } = await supabase.from('profiles').select('*, studios(id, name, slug, settings)').eq('id', userId).maybeSingle();
    return data;
  },
  async upsertProfile(profile) {
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });
    return error;
  },
};


// ─── DURATION PARSER ─────────────────────────────────────────────────────────
const parseTimeStr = t => {
  if (!t || typeof t !== 'string') return null;
  const m = t.match(/(\d+)'(\d+)/);
  if (m) return parseInt(m[1]) * 60 + parseInt(m[2]);
  const mMin = t.match(/^(\d+)'$/);
  if (mMin) return parseInt(mMin[1]) * 60;
  return null;
};

const parseDuration = series => {
  const movs = [
    ...(series?.reformer?.movements || []),
    ...((series?.type === 'signature' || series?.type === 'barre') ? (series?.barre?.movements || []) : []),
  ];
  let lastSecs = null;
  for (const m of movs) {
    if (!m?.timing) continue;
    const parts = m.timing.split('–').map(s => s.trim());
    const end = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    const secs = parseTimeStr(end);
    if (secs !== null) lastSecs = secs;
  }
  return lastSecs;
};

const formatDuration = secs => {
  if (secs === null || secs === undefined) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `~${m}'${String(s).padStart(2,'0')}''` : `~${m}'`;
};

// ─── EXAMPLES STORE (few-shot learning) ─────────────────────────────────────
const examplesStore = {
  async load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('examples').select('*').eq('user_id', user.id).order('ts', { ascending: false });
    return data || [];
  },

  async record({ type, context, generated, final }) {
    const accepted = generated.trim() === final.trim();
    if (!final.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ts = Date.now();
    await supabase.from('examples').insert({ id: ts, user_id: user.id, type, context, generated, final, accepted, ts });
    // Trim to 60 examples
    const { data } = await supabase.from('examples').select('id').eq('user_id', user.id).order('ts', { ascending: true });
    if (data && data.length > 60) {
      const toDelete = data.slice(0, data.length - 60).map(e => e.id);
      await supabase.from('examples').delete().in('id', toDelete);
    }
  },

  async getRelevant(type, count = 4) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase.from('examples').select('*').eq('user_id', user.id).eq('type', type).order('ts', { ascending: false }).limit(count);
    return data || [];
  },

  formatExamples(examples) {
    if (!examples.length) return "";
    const lines = examples.map(e => {
      if (e.accepted) return `  ✓ "${e.final}" (aprovado)`;
      return `  ✗ gerado: "${e.generated}" → corrigido para: "${e.final}"`;
    });
    return `\nExemplos do teu estilo (aprende com estes):\n${lines.join("\n")}`;
  }
};

// ─── THE HAVEN LOGO ──────────────────────────────────────────────────────────
const HavenLogo = ({ size=32, color="#FFFAF7" }) => (
  <svg width={size} height={size} viewBox="0 0 1800 1800" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1432.63 801.882C1430.83 785.243 1428.62 768.787 1425.94 752.54C1402.58 610.678 1346.23 484.67 1267.92 388.712C1244.2 359.647 1218.47 333.38 1191.03 310.25C1106.93 239.355 1006.87 198 899.482 198C792.096 198 692.044 239.355 607.955 310.25C581.063 332.915 555.813 358.58 532.488 386.952C427.081 515.185 361 697.682 361 900C361 1102.32 426.743 1283.86 531.676 1412.04C555.229 1440.8 580.753 1466.81 607.955 1489.75C692.053 1560.65 792.105 1602 899.482 1602C1006.86 1602 1106.93 1560.65 1191.03 1489.75C1218.47 1466.62 1244.19 1440.34 1267.92 1411.29C1372.49 1283.15 1438 1101.41 1438 900C1438 866.695 1436.08 833.965 1432.63 801.882ZM1167.35 321.482V897.292L1267.92 824.237V427.578C1336.84 520.91 1385.56 640.19 1404.74 773.154C1285.22 889.087 1216.82 949.789 1130.25 975.8C1110.38 981.772 939.647 1030.47 795.097 946.461C760.469 926.339 738.165 904.887 731.661 898.469C644.07 811.947 634.401 696.816 633.069 653.318V320.297C710.826 258 802.039 222.097 899.491 222.097C996.943 222.097 1089.28 258.483 1167.35 321.5L1167.35 321.482ZM1267.92 1372.43V1010.97L1167.35 1067.45V1478.53C1089.27 1541.54 997.545 1577.93 899.482 1577.93C801.418 1577.93 710.863 1542.05 633.123 1479.78L633.06 1475.04L633.47 983.021L531.667 880.973V1373.26C441.074 1250.99 385.092 1083.99 385.092 900C385.092 716.007 441.403 547.979 532.488 425.609V637.473C531.147 674.835 535.206 728.498 561.25 784.933C591.681 850.85 637.402 888.686 670.378 915.964C682.11 925.674 722.229 957.93 778.394 983.75C795.215 991.491 941.763 1056.56 1106.32 1019.03C1233.29 990.077 1325.3 910.412 1410.61 824.31C1412.71 849.172 1413.89 874.399 1413.89 899.991C1413.89 1083.57 1358.14 1250.23 1267.91 1372.42L1267.92 1372.43Z" fill={color}/>
  </svg>
);

// ─── ICONS ───────────────────────────────────────────────────────────────────
const SVGS = {
  plus:    `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`,
  edit:    `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>`,
  music:   `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
  save:    `<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>`,
  eye:     `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  back:    `<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>`,
  x:       `<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>`,
  ai:      `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  pdf:     `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>`,
  chevron: `<polyline points="6 9 12 15 18 9"/>`,
  refresh: `<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>`,
  brain:   `<path d="M12 2a5 5 0 0 1 5 5c0 1-.3 2-.8 2.8A5 5 0 0 1 17 14a5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 .8-2.8A5 5 0 0 1 7 7a5 5 0 0 1 5-5z"/>`,
  check:   `<polyline points="20 6 9 17 4 12"/>`,
  note:    `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>`,
  play:    `<polygon points="5 3 19 12 5 21 5 3"/>`,
  send:    `<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>`,
  copy:    `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,
  link:    `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,
  print:   `<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>`,
  users:   `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
};
const Icon = ({ name, size=16 }) => (
  <span style={{display:"inline-flex",alignItems:"center"}}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      dangerouslySetInnerHTML={{__html: SVGS[name]||""}}/>
  </span>
);

// ─── ATOMS ───────────────────────────────────────────────────────────────────
const Badge = ({ label, color }) => {
  const styles = {
    teal:  { background:`${C.reformer}15`, color:C.reformer, border:`1px solid ${C.reformer}40` },  // Reformer
    coral: { background:`${C.barre}40`,    color:"#8a3060",  border:`1px solid ${C.barre}` },        // Barre
    gold:  { background:`${C.sig}40`,      color:"#7a4010",  border:`1px solid ${C.sig}` },          // Signature
    neutral:{ background:C.stone,          color:C.neutral,  border:`1px solid ${C.stone}` },
    blue:   { background:`${C.blue}40`,    color:"#2a5a8a",  border:`1px solid ${C.blue}` },
  };
  const s = styles[color] || styles.neutral;
  return <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase",
    padding:"2px 9px", borderRadius:20, ...s }}>{label}</span>;
};

const Btn = ({ children, onClick, variant="primary", small, disabled, style:sx={} }) => {
  const base = { display:"inline-flex", alignItems:"center", gap:6, fontFamily:"'Satoshi', sans-serif",
    fontWeight:600, fontSize:small?12:13, cursor:disabled?"not-allowed":"pointer", border:"none",
    borderRadius:8, padding:small?"6px 12px":"10px 18px", transition:"all 0.15s", opacity:disabled?0.5:1, ...sx };
  const vars = {
    primary: { background:C.crimson, color:C.cream },
    ghost:   { background:"transparent", color:C.ink, border:`1px solid ${C.stone}` },
    gold:    { background:"transparent", color:C.neutral, border:`1px solid ${C.stone}` },
    danger:  { background:"transparent", color:C.rose, border:`1px solid ${C.sig}60` },
  };
  return <button style={{...base,...(vars[variant]||vars.primary)}} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Toggle = ({ label, active, onClick, color=C.neutral }) => (
  <button onClick={onClick} style={{ display:"inline-flex", alignItems:"center", gap:6,
    fontFamily:"'Satoshi', sans-serif", fontSize:11, fontWeight:600, padding:"4px 12px",
    borderRadius:20, border:`1px solid ${active?color:C.stone}`,
    background:active?`${color}18`:"transparent", color:active?color:C.mist,
    cursor:"pointer", transition:"all 0.15s" }}>
    <span style={{ width:8, height:8, borderRadius:"50%", background:active?color:C.stone, flexShrink:0 }} />
    {label}
  </button>
);

const MuscleTag = ({ label }) => (
  <span style={{ fontSize:11, background:C.stone, color:C.neutral, border:`1px solid ${C.stone}`,
    borderRadius:20, padding:"2px 10px", fontWeight:500 }}>{label}</span>
);

const Field = ({ label, val, onChange, multiline, placeholder }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.mist, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>}
    {multiline
      ? <AutoTextarea value={val} onChange={v=>onChange(v.target.value)}
          placeholder={placeholder||""}
          style={{ fontSize:13, color:C.ink, padding:"8px 12px", borderRadius:8,
            border:`1px solid ${C.stone}`, background:C.cream }}
          minRows={typeof multiline==="number"?multiline:2}/>
      : <input value={val} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""}
          style={{ fontFamily:"'Satoshi', sans-serif", fontSize:13, padding:"8px 12px", borderRadius:8,
            border:`1px solid ${C.stone}`, outline:"none", color:C.ink, background:C.cream }} />}
  </div>
);

// ─── AI ──────────────────────────────────────────────────────────────────────
async function aiCall(prompt) {
  const res = await fetch("/api/ai", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ messages:[{ role:"user", content:prompt }] })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return (data.content?.[0]?.text||"").replace(/```json|```/g,"").trim();
}

// ─── INTRO CUE FIELD ─────────────────────────────────────────────────────────
const IntroCue = ({ series, onChange, aiStyle, stopProp, readOnly }) => {
  const [loading, setLoading] = React.useState(false);
  const toast_ = useToast();
  const lastGenerated = React.useRef(null);

  // Regista exemplo quando o componente desmonta
  React.useEffect(() => {
    return () => {
      if (lastGenerated.current !== null) {
        examplesStore.record({
          type: 'intro',
          context: series.name,
          generated: lastGenerated.current,
          final: series.introCue || lastGenerated.current,
        });
      }
    };
  }, [series.introCue]);

  const generate = async e => {
    if (stopProp) e.stopPropagation();
    setLoading(true);
    try {
      const examples = await examplesStore.getRelevant('intro');
      const examplesCtx = examplesStore.formatExamples(examples);
      const styleCtx = (aiStyle ? `\nInstructor style: ${aiStyle}` : "") + examplesCtx;
      const isSig = series.type === "signature";
      const setup = isSig
        ? `Reformer: ${series.reformer?.springs||""} springs, ${series.reformer?.props||""}, ${series.reformer?.startPosition||""}. Barre: ${series.barre?.props||""}, ${series.barre?.startPosition||""}.`
        : (()=>{ const d=series.type==="barre"?series.barre:series.reformer; return `${series.type}: ${series.reformer?.springs?series.reformer.springs+" springs, ":""}${d?.props||""}, ${d?.startPosition||""}.`; })();
      const firstMov = isSig
        ? `Reformer: ${series.reformer?.movements?.[0]?.movement||"-"}, Barre: ${series.barre?.movements?.[0]?.movement||"-"}`
        : (series.type==="barre"?series.barre:series.reformer)?.movements?.[0]?.movement||"-";
      const isChoreo = isSig
        ? (series.reformer?.movements||[]).some(m=>m.timing)
        : (series.type==="barre"?series.barre:series.reformer)?.movements?.some(m=>m.timing);
      const allMovements = isSig
        ? (series.reformer?.movements||[]).map((m,i)=>{
            const b = (series.barre?.movements||[])[i];
            return `${m.timing||i+1}: R: ${m.movement}${b?" / B: "+b.movement:""}`;
          }).join(", ")
        : (series.type==="barre"?series.barre:series.reformer)?.movements?.map((m,i)=>`${m.timing||i+1}: ${m.movement}`).join(", ")||"-";
      const muscleList = series.muscles?.join(", ")||"";
      const prompt = isChoreo
        ? `You are a STOTT Pilates instructor writing a spoken intro cue for a CHOREOGRAPHED series set to music.${styleCtx}

Series: "${series.name}"
Setup: ${setup}
Movements in order: ${allMovements}

STRICT RULES — follow exactly:
1. START with the setup: springs, props, and starting position. Say this first, before anything else.
2. THEN give a movement rundown so clients know what's coming. For signature series (reformer + barre), always label each side clearly: "Reformer: [movements]; Mat: [movements]" — never mix them up or leave it ambiguous.
3. Use natural spoken language, concise and energetic.
4. Do NOT mention muscles or benefits — this is a choreo rundown, not an anatomy lesson.

Return ONLY the spoken cue text. No titles, no formatting.`

        : `You are a STOTT Pilates instructor writing a spoken intro cue for a NON-CHOREOGRAPHED series.${styleCtx}

Series: "${series.name}"
Setup: ${setup}
Muscles targeted: ${muscleList||"—"}
Movements: ${allMovements}

STRICT RULES — follow exactly:
1. START with the setup: springs, props, and starting position. Say this first, before anything else.
2. THEN focus on the muscles being worked and the benefits of the exercise. This is NOT a movement rundown — do not list every movement.
3. Use natural spoken language, motivating and body-aware.
4. Keep it concise — this is said before the series begins.

Return ONLY the spoken cue text. No titles, no formatting.`;
      const text = (await aiCall(prompt)).trim().replace(/^["']|["']$/g,"");
      lastGenerated.current = text;
      onChange(text);
    } catch(e) { console.error(e); toast_?.('Erro ao gerar com IA — verifica a ligação', 'error'); }
    setLoading(false);
  };

  return (
    <div className="intro-cue-box" style={{background:`${C.blue}30`,border:`1px solid ${C.blue}`,borderRadius:8,padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"flex-start",gap:8}}>
      <span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0,marginTop:2}}>▶</span>
      {readOnly
        ? <p style={{flex:1,fontFamily:"'Satoshi', sans-serif",fontSize:13,color:C.slate,margin:0,lineHeight:1.6}}>{series.introCue}</p>
        : <AutoTextarea
            value={series.introCue||""}
            placeholder="Intro / setup cue… (o que vais dizer antes de começar)"
            onClick={stopProp ? e=>e.stopPropagation() : undefined}
            onChange={e=>{ if(stopProp) e.stopPropagation(); onChange(e.target.value); }}
            style={{flex:1,fontSize:13,color:C.ink,lineHeight:1.6}}
            minRows={2}
          />
      }
      {!readOnly&&<button onClick={generate} disabled={loading} title="Gerar intro com IA"
        style={{background:"none",border:`1px solid ${C.blue}`,borderRadius:5,cursor:loading?"wait":"pointer",color:"#3a6a9a",padding:"3px 8px",fontSize:10,display:"inline-flex",alignItems:"center",gap:3,opacity:loading?0.5:1,flexShrink:0,fontFamily:"'Satoshi', sans-serif",fontWeight:600,marginTop:1}}>
        <Icon name="ai" size={10}/>{loading?"…":"✦ IA"}
      </button>}
    </div>
  );
};


// ─── INSTRUCTOR NOTES AI BUTTON ─────────────────────────────────────────────
const CardInstrNotesAI = ({ series, aiStyle, onUpdate }) => {
  const [loading, setLoading] = React.useState(false);
  const toast_ = useToast();
  const generate = async e => {
    e.stopPropagation();
    setLoading(true);
    try {
      const examples = await examplesStore.getRelevant('instructor');
      const styleCtx = (aiStyle ? `\nInstructor style: ${aiStyle}` : "") + examplesStore.formatExamples(examples);
      const movList = (series.type==="barre"?series.barre:series.reformer)?.movements?.map(m=>m.movement).filter(Boolean).join(", ")||"-";
      const prompt = `STOTT Pilates instructor. Write concise instructor notes for this series.${styleCtx}\nSeries: "${series.name}"\nMuscles: ${series.muscles?.join(", ")||"-"}\nMovements: ${movList}\nFocus on key technique cues, common mistakes, and modifications. Return ONLY the notes text.`;
      const text = (await aiCall(prompt)).trim().replace(/^["']|["']$/g,"");
      onUpdate(text);
    } catch(e) { console.error(e); toast_?.('Erro ao gerar com IA', 'error'); }
    setLoading(false);
  };
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <span style={{fontSize:12,fontWeight:600,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.05em",flex:1}}>Instructor Notes</span>
      <button onClick={generate} disabled={loading} title="Gerar com IA"
        style={{background:"none",border:`1px solid ${C.stone}`,borderRadius:5,cursor:loading?"wait":"pointer",color:C.neutral,padding:"2px 8px",fontSize:10,display:"inline-flex",alignItems:"center",gap:3,opacity:loading?0.5:1,fontFamily:"'Satoshi', sans-serif",fontWeight:600}}>
        <Icon name="ai" size={10}/>{loading?"…":"✦ IA"}
      </button>
    </div>
  );
};

// ─── PER-CUE AI GENERATE BUTTON ─────────────────────────────────────────────
const CardCueGen = ({ series, rowIndex, rows, aiStyle, onUpdate, nonsig, getCurrentCue }) => {
  const [loading, setLoading] = React.useState(false);
  const toast_ = useToast();
  // Guarda a última cue gerada para comparar com o que o utilizador escrever
  const lastGenerated = React.useRef(null);

  // Quando o componente faz unmount, regista o exemplo
  React.useEffect(() => {
    return () => {
      if (lastGenerated.current !== null && getCurrentCue) {
        const finalCue = getCurrentCue();
        examplesStore.record({
          type: 'transition',
          context: lastGenerated.current.context,
          generated: lastGenerated.current.cue,
          final: finalCue || lastGenerated.current.cue,
        });
      }
    };
  }, []);

  const generate = async e => {
    e.stopPropagation();
    setLoading(true);
    try {
      const examples = await examplesStore.getRelevant('transition');
      const examplesCtx = examplesStore.formatExamples(examples);
      const styleCtx = (aiStyle ? `\nInstructor style: ${aiStyle}` : "") + examplesCtx;
      let prompt, newCue, context;
      if (nonsig) {
        const k = series.type === "barre" ? "barre" : "reformer";
        const movs = series[k]?.movements || [];
        const prev = movs[rowIndex - 1]?.movement || "-";
        const curr = movs[rowIndex]?.movement || "-";
        context = `${prev} → ${curr}`;
        prompt = `STOTT Pilates ${series.type} class. Write ONE short transition cue (max 10 words) to announce this movement.${styleCtx}\nPrevious: ${prev}\nComing: ${curr}\nReturn ONLY the cue text.`;
        newCue = (await aiCall(prompt)).trim().replace(/^["']|["']$/g, "");
        const newM = [...movs];
        newM[rowIndex] = { ...newM[rowIndex], transitionCue: newCue };
        onUpdate({ ...series, [k]: { ...series[k], movements: newM } });
      } else {
        const rMovs = series.reformer?.movements || [];
        const row = rows[rowIndex];
        const prevRow = rows[rowIndex - 1];
        context = `R:${prevRow?.r?.movement||"-"}/B:${prevRow?.b?.movement||"-"} → R:${row?.r?.movement||"-"}/B:${row?.b?.movement||"-"}`;
        prompt = `STOTT Pilates Signature class (reformer + barre simultaneously). Write ONE short transition cue (max 10 words).${styleCtx}\nPrevious: reformer:${prevRow?.r?.movement || "-"} / barre:${prevRow?.b?.movement || "-"}\nComing: reformer:${row?.r?.movement || "-"} / barre:${row?.b?.movement || "-"}\nReturn ONLY the cue text.`;
        newCue = (await aiCall(prompt)).trim().replace(/^["']|["']$/g, "");
        const newR = [...rMovs];
        const idx = newR.findIndex(m => m.timing === row.timing);
        if (idx >= 0) newR[idx] = { ...newR[idx], transitionCue: newCue };
        onUpdate({ ...series, reformer: { ...series.reformer, movements: newR } });
      }
      lastGenerated.current = { cue: newCue, context };
    } catch(e) { console.error(e); toast_?.('Erro ao gerar cue com IA', 'error'); }
    setLoading(false);
  };

  return (
    <button
      onClick={generate}
      disabled={loading}
      title="Gerar cue com IA"
      style={{background:"none",border:`1px solid ${C.crimson}25`,borderRadius:5,cursor:loading?"wait":"pointer",color:"#7a4010",padding:"2px 7px",fontSize:10,display:"inline-flex",alignItems:"center",gap:3,opacity:loading?0.5:1,flexShrink:0,fontFamily:"'Satoshi', sans-serif",fontWeight:600}}>
      <Icon name="ai" size={10}/>{loading?"…":"✦ IA"}
    </button>
  );
};

// ─── SERIES CARD (expandable) ─────────────────────────────────────────────────
const SeriesCard = ({ series, onEdit, onDelete, onUpdateSeries, aiStyle, modalityFilter=null, currentUserId=null, hasStudio=false, onCopy=null, onPublish=null, onUnpublish=null, onMakePublic=null, compact=false, onTogglePublic=null, onSend=null }) => {
  const isOwner = !currentUserId || series.createdBy === currentUserId;
  const isSig = series.type === "signature";
  const [expanded, setExpanded] = useState(false);
  const [showR, setShowR] = useState(modalityFilter !== "barre");
  const [showB, setShowB] = useState(modalityFilter !== "reformer");
  // localSeries: in-card live copy so edits are reflected immediately
  const [localSeries, setLocalSeries] = useState(series);
  // sync when parent saves (e.g. after full edit)
  React.useEffect(()=>setLocalSeries(series), [series]);

  const confirm_ = useConfirm();
  const [hovCell, setHovCell] = React.useState(null);
  const [openCueRows, setOpenCueRows] = React.useState(new Set());
  const toggleCueRow = key => setOpenCueRows(prev => { const s=new Set(prev); s.has(key)?s.delete(key):s.add(key); return s; });

  // proxy: update local state + persist to parent
  const setSeries_ = updated => { setLocalSeries(updated); if(onUpdateSeries) onUpdateSeries(updated); };

  const buildRows = () => {
    const rM=localSeries.reformer?.movements||[], bM=localSeries.barre?.movements||[];
    const seen=new Set(), timings=[];
    [...rM,...bM].forEach(m=>{ if(!seen.has(m.timing)){seen.add(m.timing);timings.push(m.timing);} });
    return timings.map(t=>({
      timing:t,
      lyric:(rM.find(m=>m.timing===t)||bM.find(m=>m.timing===t))?.lyric||"",
      r:rM.find(m=>m.timing===t)||null,
      b:bM.find(m=>m.timing===t)||null,
      transitionCue:rM.find(m=>m.timing===t)?.transitionCue||"",
    }));
  };

  const renderExpanded = () => {
    if (isSig) {
      const rows=buildRows(), choreo=rows.some(r=>r.timing);

      // Unified table: Timing | Lyric | Reformer | Barre  (columns toggled by showR/showB)
      return (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,tableLayout:"auto"}}>
            <thead>
              <tr className="print-thead" style={{background:"#ddd0ca"}}>
                {choreo&&<th style={{fontSize:12,fontWeight:600,color:C.ink,textAlign:"left",padding:"8px 12px",whiteSpace:"nowrap",letterSpacing:"0.04em",textTransform:"uppercase",width:"1%"}}>Timing</th>}
                {choreo&&<th style={{fontSize:12,fontWeight:600,color:C.ink,textAlign:"left",padding:"8px 12px",letterSpacing:"0.04em",textTransform:"uppercase",maxWidth:180}}>Lyric</th>}
                {showR&&<th style={{fontSize:12,fontWeight:600,color:C.reformer,textAlign:"left",padding:"8px 12px",letterSpacing:"0.04em",textTransform:"uppercase"}}>Reformer</th>}
                {showB&&<th style={{fontSize:12,fontWeight:600,color:"#c0507a",textAlign:"left",padding:"8px 12px",letterSpacing:"0.04em",textTransform:"uppercase"}}>Barre</th>}
              </tr>
            </thead>
            <tbody>
              {localSeries.openCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{localSeries.openCue}</span></div></td></tr>}
              {rows.map((row,i)=>{
                const cue=row.transitionCue?.trim();
                const rk=`${localSeries.id}-${i}`;
                return (
                  <React.Fragment key={i}>
                    {i>0&&(cue||openCueRows.has(rk))&&(
                      <tr className="print-cue-row" style={{background:"#F4EDE8"}}>
                        <td colSpan={99} style={{padding:"4px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:13,color:"#7a4010",fontWeight:700,flexShrink:0}}>✦</span>
                            <input
                              value={row.transitionCue||""}
                              placeholder="Transition cue…"
                              onClick={e=>e.stopPropagation()}
                              onChange={e=>{
                                e.stopPropagation();
                                const newR=[...(localSeries.reformer?.movements||[])];
                                const idx=newR.findIndex(m=>m.timing===row.timing);
                                if(idx>=0){ newR[idx]={...newR[idx],transitionCue:e.target.value}; }
                                setSeries_({...localSeries,reformer:{...localSeries.reformer,movements:newR}});
                              }}
                              style={{flex:1,fontSize:12,fontStyle:"italic",color:"#7a4010",background:"transparent",border:"none",borderBottom:`1px solid ${C.sig}60`,outline:"none",fontFamily:"'Satoshi', sans-serif",padding:"2px 4px"}}
                            />
                            <CardCueGen series={localSeries} rowIndex={i} rows={rows} aiStyle={aiStyle} onUpdate={setSeries_}/>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                      {choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{row.timing}</td>}
                      {choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic",maxWidth:180}}>{row.lyric}</td>}
                      {showR&&<td style={{fontSize:12,padding:"7px 10px",color:C.ink,fontWeight:500,position:"relative",cursor:"default"}}
                        onMouseEnter={()=>setHovCell(`r-${i}`)} onMouseLeave={()=>setHovCell(null)}>
                        {row.r?.movement||<span style={{color:C.stone}}>—</span>}
                        {row.r?.notes&&<div style={{fontSize:10,color:C.mist,fontStyle:"italic",marginTop:2,borderTop:`1px solid ${C.stone}40`,paddingTop:2}}>{row.r.notes}</div>}
                        {hovCell===`r-${i}`&&(row.r?.breath||row.r?.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                          {row.r?.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{row.r.breath}</span></div>}
                          {row.r?.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{row.r.notes}</span></div>}
                        </div>}
                      </td>}
                      {showB&&<td style={{fontSize:12,padding:"7px 10px",color:C.ink,fontWeight:500,position:"relative",cursor:"default"}}
                        onMouseEnter={()=>setHovCell(`b-${i}`)} onMouseLeave={()=>setHovCell(null)}>
                        {row.b?.movement||<span style={{color:C.stone}}>—</span>}
                        {row.b?.notes&&<div style={{fontSize:10,color:C.mist,fontStyle:"italic",marginTop:2,borderTop:`1px solid ${C.stone}40`,paddingTop:2}}>{row.b.notes}</div>}
                        {hovCell===`b-${i}`&&(row.b?.breath||row.b?.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                          {row.b?.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{row.b.breath}</span></div>}
                          {row.b?.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{row.b.notes}</span></div>}
                        </div>}
                      </td>}
                    </tr>
                  </React.Fragment>
                );
              })}
              {localSeries.closeCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{localSeries.closeCue}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      );
    }

    // Non-signature: single modality table
    const d=localSeries.type==="barre"?localSeries.barre:localSeries.reformer;
    const choreo=d?.movements?.some(m=>m.timing);
    return (
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
          <thead><tr className="print-thead" style={{background:"#ddd0ca"}}>
            {choreo&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Timing</th>}
            {choreo&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Lyric</th>}
            <th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 10px"}}>Movimento</th>
            {!choreo&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 10px"}}>Tempo/Reps</th>}
          </tr></thead>
          <tbody>
            {localSeries.openCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{localSeries.openCue}</span></div></td></tr>}
            {d?.movements?.map((m,i)=>{
              const nsCue = m.transitionCue?.trim();
              const nsKey = `${localSeries.id}-ns-${i}`;
              return (
                <React.Fragment key={i}>
                  {i>0&&(nsCue||openCueRows.has(nsKey))&&(
                    <tr className="print-cue-row" style={{background:"#F4EDE8"}}>
                      <td colSpan={99} style={{padding:"4px 10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span>
                          <input
                            value={m.transitionCue||""}
                            placeholder="Transition cue…"
                            onClick={e=>e.stopPropagation()}
                            onChange={e=>{
                              e.stopPropagation();
                              const k=localSeries.type==="barre"?"barre":"reformer";
                              const newM=[...(localSeries[k]?.movements||[])];
                              newM[i]={...newM[i],transitionCue:e.target.value};
                              setSeries_({...localSeries,[k]:{...localSeries[k],movements:newM}});
                            }}
                            style={{flex:1,fontSize:12,fontStyle:"italic",color:"#7a4010",background:"transparent",border:"none",borderBottom:`1px solid ${C.sig}60`,outline:"none",fontFamily:"'Satoshi', sans-serif",padding:"2px 4px"}}
                          />
                          <CardCueGen series={localSeries} rowIndex={i} rows={null} aiStyle={aiStyle} onUpdate={setSeries_} nonsig/>
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                    {choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{m.timing}</td>}
                    {choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic"}}>{m.lyric}</td>}
                    <td style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:500,position:"relative",cursor:"default"}}
                      onMouseEnter={()=>setHovCell(`ns-${i}`)} onMouseLeave={()=>setHovCell(null)}>
                      {m.movement||<span style={{color:C.stone}}>—</span>}
                      {hovCell===`ns-${i}`&&(m.breath||m.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                        {m.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{m.breath}</span></div>}
                        {m.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{m.notes}</span></div>}
                      </div>}
                    </td>
                    {!choreo&&<td style={{fontSize:11,padding:"8px 10px",color:C.mist,whiteSpace:"nowrap"}}>{m.timeReps||""}</td>}
                  </tr>
                </React.Fragment>
              );
            })}
            {localSeries.closeCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{localSeries.closeCue}</span></div></td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ background:C.white, borderRadius:14, border:`1px solid ${expanded?C.neutral:C.stone}`,
      overflow:"hidden", transition:"border-color 0.2s, box-shadow 0.2s",
      boxShadow:expanded?"0 4px 24px rgba(0,0,0,0.09)":"none" }}>

      {/* Collapsed header */}
      <div style={{ padding:compact?"8px 16px":"14px 20px", display:"flex", alignItems:"center", gap:compact?8:12, cursor:"pointer" }}
        onClick={()=>setExpanded(p=>!p)}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Clash Display', sans-serif", fontSize:compact?15:18, fontWeight:500, color:C.ink, marginBottom:compact?2:4 }}>{series.name}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {isSig  && <Badge label="Signature" color="gold"/>}
            {!isSig && <Badge label={series.type==="reformer"?"Reformer":"Barre"} color={series.type==="reformer"?"teal":"coral"}/>}
            {(()=>{ const dur = parseDuration(series) ?? series.duration ?? null; const label = formatDuration(dur); return label ? <span style={{fontSize:10,fontWeight:600,color:C.mist,background:C.stone,borderRadius:20,padding:'2px 8px'}}>{label}</span> : null; })()}
            <span title={series.status==="approved"?"Aprovada":"Em teste"} style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:20,height:20,borderRadius:"50%",flexShrink:0,
              background:series.status==="approved"?"#dbeeff":"#e8e4e0",
              border:`1.5px solid ${series.status==="approved"?"#3a6a9a":"#b8b0aa"}`,
              fontSize:11,color:series.status==="approved"?"#1a4a7a":"#8a7f78",fontWeight:700
            }}>{series.status==="approved"?"✓":"…"}</span>
            {series.visibility==='studio'&&<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",padding:"2px 8px",borderRadius:20,background:"#e8f0fe",color:"#1a56db",border:"1px solid #c3d3f8"}}>STUDIO</span>}
            {series.visibility==='pending_studio'&&<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",padding:"2px 8px",borderRadius:20,background:"#fef9ec",color:"#b45309",border:"1px solid #fcd34d"}}>⏳ EM REVISÃO</span>}
            {series.visibility==='public'&&<span style={{fontSize:10,fontWeight:700,letterSpacing:"0.05em",padding:"2px 8px",borderRadius:20,background:"#ecfdf5",color:"#059669",border:"1px solid #a7f3d0"}}>PÚBLICO</span>}
            {series.song&&<span style={{fontSize:12,color:C.mist,display:"inline-flex",alignItems:"center",gap:4}}><Icon name="music" size={11}/>{series.song}</span>}
            {(()=>{
              const zones = (series.targetZone||"").split(",").map(x=>x.trim()).filter(Boolean);
              if(!zones.length) return null;
              const primary = series.primaryZone || zones[0];
              // Primary first, then rest
              const sorted = [primary, ...zones.filter(z=>z!==primary)];
              return <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                {sorted.map((z,i)=>(
                  <span key={z} style={{
                    fontSize:11, fontWeight: i===0?700:500,
                    color: i===0?"#0a1a4a":"#3a5a8a",
                    background: i===0?"#1a3a6a22":`${C.blue}20`,
                    border:`1px solid ${i===0?"#1a3a6a55":C.blue+"40"}`,
                    borderRadius:20, padding: i===0?"2px 10px":"2px 8px",
                    display:"inline-flex",alignItems:"center",gap:3
                  }}>{i===0&&<span style={{fontSize:8,opacity:0.7}}>★</span>}{z}</span>
                ))}
              </div>;
            })()}
            {series.seriesType&&<span style={{fontSize:11,fontWeight:600,color:"#5a2a00",background:`${C.sig}50`,border:`1px solid ${C.sig}`,borderRadius:20,padding:"2px 9px",flexShrink:0}}>{series.seriesType}</span>}
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
          {expanded&&(<>
            {isOwner&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onEdit(series);}}><Icon name="edit" size={13}/> Editar</Btn>}
            {!isOwner&&onCopy&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onCopy(series);}}><Icon name="copy" size={13}/> Copiar</Btn>}
            {isOwner&&hasStudio&&series.visibility==='personal'&&onPublish&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onPublish(series);}} title="Submeter para revisão do studio (visível apenas aos membros)" style={{color:"#1a56db"}}>↑ Studio</Btn>}
            {isOwner&&series.visibility==='pending_studio'&&onUnpublish&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onUnpublish(series);}} style={{color:C.mist}}>Cancelar submissão</Btn>}
            {isOwner&&series.visibility==='studio'&&onUnpublish&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onUnpublish(series);}} style={{color:C.mist}}>Tornar privada</Btn>}
            {isOwner&&onTogglePublic&&<button onClick={e=>{e.stopPropagation();onTogglePublic(series);}} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,border:`1px solid ${series.visibility==='public'?C.crimson:C.stone}`,background:"transparent",color:series.visibility==='public'?C.crimson:C.mist,cursor:"pointer"}}>{series.visibility==='public'?'🌐 Pública':'🔒 Privada'}</button>}
            {onSend&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onSend({...series,_discoverType:'series'});}} style={{color:C.mist}}>Enviar →</Btn>}
          </>)}
        </div>
        <span style={{ color:C.mist, display:"inline-flex", transition:"transform 0.2s",
          transform:expanded?"rotate(180deg)":"rotate(0deg)", flexShrink:0 }}>
          <Icon name="chevron" size={16}/>
        </span>
      </div>

      {/* Expanded body */}
      {expanded&&(
        <div style={{ borderTop:`1px solid ${C.stone}`, padding:"16px 20px", display:"flex", flexDirection:"column", gap:14 }}>

          {isOwner&&hasStudio&&(series.visibility==='personal'||series.visibility==='studio')&&(
            <div style={{fontSize:10,color:C.mist,marginTop:-6}}>
              Studio — partilha com os teus colegas · Público — visível a todos os Instructors do The Haven
            </div>
          )}
          {series.attribution&&(
            <div style={{fontSize:11,color:C.mist,fontStyle:"italic"}}>
              {series.attribution.author_name ? `Partilhado por ${series.attribution.author_name}${series.attribution.studio_name?` · ${series.attribution.studio_name}`:''}` : 'Copiado de outro Instructor'}
            </div>
          )}

          {/* Reformer/Barre toggles — only for Signature */}
          {isSig&&(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Toggle label="Reformer" active={showR} onClick={()=>setShowR(p=>!p)} color={C.reformer}/>
              <Toggle label="Barre"    active={showB} onClick={()=>setShowB(p=>!p)} color={C.barre}/>
            </div>
          )}

          {/* Setup — Signature only */}
          {isSig&&(showR||showB)?(
            <div style={{display:"grid",gridTemplateColumns:showR&&showB?"1fr 1fr":"1fr",gap:10}}>
              {showR&&(()=>{ const d=series.reformer; return (
                <div className="setup-box" style={{background:`${C.reformer}10`,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.reformer}30`,fontSize:13,color:C.ink}}>
                  <div style={{fontWeight:700,color:C.reformer,textTransform:"uppercase",fontSize:11,letterSpacing:"0.06em",marginBottom:4}}>Reformer</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    {d?.springs&&<span><b>Springs:</b> {d.springs}</span>}
                    {d?.props&&<span><b>Props:</b> {d.props}</span>}
                    {d?.startPosition&&<span><b>Posição:</b> {d.startPosition}</span>}
                  </div>
                </div>
              );})()}
              {showB&&(()=>{ const d=series.barre; return (
                <div className="setup-box" style={{background:`${C.barre}25`,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.barre}60`,fontSize:13,color:C.ink}}>
                  <div style={{fontWeight:700,color:"#c0507a",textTransform:"uppercase",fontSize:11,letterSpacing:"0.06em",marginBottom:4}}>Barre</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    {d?.props&&<span><b>Props:</b> {d.props}</span>}
                    {d?.startPosition&&<span><b>Posição:</b> {d.startPosition}</span>}
                  </div>
                </div>
              );})()}
            </div>
          ):isSig?null:null}

          {/* Movements */}
          {renderExpanded()}

          {/* Instructor notes — always shown, editable inline */}
          <div style={{padding:"10px 14px",background:C.white,border:`1px solid ${C.stone}`,borderRadius:8}}>
            <CardInstrNotesAI series={localSeries} aiStyle={aiStyle} onUpdate={v=>setSeries_({...localSeries,cues:v})}/>
            <AutoTextarea
              value={localSeries.cues||""}
              placeholder="Notas de Instructor…"
              onClick={e=>e.stopPropagation()}
              onChange={e=>{
                e.stopPropagation();
                setSeries_({...localSeries, cues:e.target.value});
              }}
              style={{fontSize:13,color:C.ink}}
            />
          </div>

          {/* Modifications */}
          {localSeries.modifications&&(
            <div style={{padding:"8px 12px",background:`${C.blue}20`,border:`1px solid ${C.blue}`,borderRadius:8}}>
              <div style={{fontSize:10,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Modificações</div>
              <div style={{fontSize:12,color:C.ink,whiteSpace:"pre-wrap"}}>{localSeries.modifications}</div>
            </div>
          )}

          {/* Video (read-only) */}
          {localSeries.videoUrl&&(
            <SeriesVideo seriesId={localSeries.id} videoUrl={localSeries.videoUrl} onUpdate={()=>{}} readOnly/>
          )}

{/* Actions moved to header */}
        </div>
      )}
    </div>
  );
};

// ─── EDITOR MOVEMENT TABLES (defined OUTSIDE SeriesEditor to preserve input focus) ──
// If defined inside, React recreates them on every keystroke → focus lost after 1 char

const EditorInp = ({ ph, val, onChange, gold, minW, listId }) => (
  <>
  <input
    placeholder={ph} value={val||""} onChange={e=>onChange(e.target.value)}
    list={listId}
    style={{
      fontSize:12, padding:"5px 7px", borderRadius:6,
      border:`1px solid ${gold?C.sig+"80":C.stone}`,
      background:gold?`${C.sig}15`:C.cream,
      fontFamily:"'Satoshi', sans-serif",
      width:"100%", minWidth:minW||0, boxSizing:"border-box",
    }}
  />
  </>
);

// Movement library — shared datalist, populated from all series
// ─── MOVEMENT LIBRARY DATALIST (for autocomplete in editors) ────────────────
const MovDatalist = ({ series }) => {
  const allMovs = React.useMemo(()=>{
    const set = new Set();
    series.forEach(s=>{
      (s.reformer?.movements||[]).forEach(m=>{ if(m.movement) set.add(m.movement); });
      (s.barre?.movements||[]).forEach(m=>{ if(m.movement) set.add(m.movement); });
    });
    return [...set].sort();
  }, [series]);
  return (
    <datalist id="mov-library">
      {allMovs.map((m,i)=><option key={i} value={m}/>)}
    </datalist>
  );
};

// ─── MOVEMENT LIBRARY SCREEN ─────────────────────────────────────────────────
const MovementLibraryScreen = ({ series, aiStyle }) => {
  const [search, setSearch] = React.useState("");
  const [translating, setTranslating] = React.useState(null); // movement name being translated
  const [hoveredMov, setHoveredMov] = React.useState(null);

  // Build movement list: { movement, notes, type, seriesName, side }
  const allMovs = React.useMemo(()=>{
    const map = new Map(); // movement name → { entries: [], types: Set }
    series.forEach(s=>{
      const addMovs = (movs, side) => {
        (movs||[]).forEach(m=>{
          if(!m.movement) return;
          if(!map.has(m.movement)) map.set(m.movement, { movement:m.movement, namePT:"", nameEN:"", entries:[], types:new Set() });
          const entry = map.get(m.movement);
          entry.entries.push({ seriesName:s.name, side, notes:m.notes||"", breath:m.breath||"" });
          entry.types.add(s.type==="signature"?(side==="r"?"reformer":"barre"):s.type);
        });
      };
      addMovs(s.reformer?.movements, "r");
      addMovs(s.barre?.movements, "b");
    });
    return [...map.values()].sort((a,b)=>a.movement.localeCompare(b.movement,"pt"));
  }, [series]);

  const filtered = search
    ? allMovs.filter(m=>m.movement.toLowerCase().includes(search.toLowerCase()))
    : allMovs;

  const typeColor = t => t==="reformer"?C.reformer:t==="barre"?"#c0507a":C.neutral;

  const translate = async (mov) => {
    setTranslating(mov.movement);
    try {
      const prompt = `You are a Pilates instructor translator. Translate this Pilates movement name to both Portuguese (Portugal) and English (UK). Return ONLY JSON: {"pt":"<name in Portuguese>","en":"<name in English>"}. Movement: "${mov.movement}"`;
      const text = await aiCall(prompt);
      const parsed = JSON.parse(text);
      mov.namePT = parsed.pt || "";
      mov.nameEN = parsed.en || "";
    } catch(e){ console.error(e); }
    setTranslating(null);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:26,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Biblioteca de Movimentos</h2>
        <span style={{fontSize:13,color:C.mist}}>{allMovs.length} movimentos únicos</span>
      </div>
      {/* Search */}
      <div style={{marginBottom:16}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar movimento…"
          style={{width:"100%",fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"10px 14px",borderRadius:10,border:`1px solid ${C.stone}`,outline:"none",color:C.ink,background:C.white,boxSizing:"border-box"}}/>
      </div>
      {/* Table */}
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"#e8e0dc"}}>
              <th style={{textAlign:"left",padding:"10px 16px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Movimento</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipo</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Respiração</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Notas</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Séries</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mov,i)=>(
              <tr key={mov.movement} style={{borderTop:`1px solid ${C.stone}`,background:i%2===0?C.white:C.cream}}>
                <td style={{padding:"10px 16px",fontSize:13,fontWeight:600,color:C.ink,verticalAlign:"top",position:"relative",cursor:"default"}}
                  onMouseEnter={()=>setHoveredMov(mov.movement)}
                  onMouseLeave={()=>setHoveredMov(null)}>
                  {mov.movement}
                  {hoveredMov===mov.movement&&(mov.entries.some(e=>e.breath||e.notes))&&(
                    <div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:C.white,border:`1px solid ${C.stone}`,borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:220,maxWidth:340,pointerEvents:"none"}}>
                      {[...new Set(mov.entries.filter(e=>e.breath).map(e=>e.breath))].map((b,bi)=>(
                        <div key={bi} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:6}}>
                          <span style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0,paddingTop:2}}>Resp.</span>
                          <span style={{fontSize:12,color:C.ink,fontStyle:"italic",lineHeight:1.4}}>{b}</span>
                        </div>
                      ))}
                      {[...new Set(mov.entries.filter(e=>e.notes).map(e=>e.notes))].map((n,ni)=>(
                        <div key={ni} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}>
                          <span style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.05em",flexShrink:0,paddingTop:2}}>Notas</span>
                          <span style={{fontSize:12,color:C.ink,lineHeight:1.4}}>{n}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {[...mov.types].map(t=>(
                      <span key={t} style={{fontSize:10,fontWeight:700,color:typeColor(t),background:`${typeColor(t)}15`,border:`1px solid ${typeColor(t)}40`,borderRadius:20,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:12,color:C.mist,fontStyle:"italic"}}>
                  {[...new Set(mov.entries.filter(e=>e.breath).map(e=>e.breath))].join(" · ")}
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:12,color:C.mist,maxWidth:200}}>
                  {[...new Set(mov.entries.filter(e=>e.notes).map(e=>e.notes))].join(" · ")}
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:11,color:C.mist,maxWidth:240}}>
                  {[...new Set(mov.entries.map(e=>e.seriesName))].join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{textAlign:"center",padding:40,color:C.mist,fontSize:14}}>Sem resultados para "{search}"</div>}
      </div>
    </div>
  );
};

const EditorMovTable = ({ side, data, chore, upMov, addMov, delMov, reorderMov }) => {
  const dragIdx = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(null);
  const cols = chore
    ? "18px minmax(65px,80px) minmax(80px,1fr) 2fr minmax(65px,80px) 1.5fr 28px"
    : "18px 2fr minmax(80px,110px) minmax(65px,80px) 1.5fr 28px";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{display:"grid",gap:5,gridTemplateColumns:cols,marginBottom:3}}>
        <div/>
        {chore&&<div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Timing</div>}
        {chore&&<div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Lyric</div>}
        <div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Movement</div>
        {!chore&&<div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Tempo/Reps</div>}
        <div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Breath</div>
        {side==="r"&&<div style={{fontSize:11,fontWeight:700,color:C.crimson,textTransform:"uppercase"}}>Transition cue</div>}
        <div/>
      </div>
      {data.movements.map((m,i)=>(
        <React.Fragment key={i}>
          {i>0&&<div style={{height:2}}/>}
          <div
            draggable
            onDragStart={()=>{ dragIdx.current=i; }}
            onDragOver={e=>{ e.preventDefault(); setDragOver(i); }}
            onDrop={()=>{ if(dragIdx.current!=null&&dragIdx.current!==i){ reorderMov(side,dragIdx.current,i); } dragIdx.current=null; setDragOver(null); }}
            onDragEnd={()=>{ dragIdx.current=null; setDragOver(null); }}
            style={{display:"grid",gap:5,gridTemplateColumns:cols,alignItems:"center",
              background:dragOver===i?`${C.sig}25`:"transparent",
              borderRadius:4,padding:"2px 0",
              outline:dragOver===i?`2px dashed ${C.sig}`:"none"}}>
            <span style={{color:C.stone,fontSize:13,cursor:"grab",textAlign:"center",userSelect:"none",paddingTop:1}}>⠿</span>
            {chore&&<EditorInp ph="0''-30''" val={m.timing}  onChange={v=>upMov(side,i,"timing",v)}/>}
            {chore&&<EditorInp ph="Lyric"    val={m.lyric}   onChange={v=>upMov(side,i,"lyric",v)}/>}
            <EditorInp ph="Movement"         val={m.movement} onChange={v=>upMov(side,i,"movement",v)} listId="mov-library"/>
            {!chore&&<EditorInp ph="ex. 8 reps, 30s" val={m.timeReps||""} onChange={v=>upMov(side,i,"timeReps",v)}/>}
            <EditorInp ph="Breath"           val={m.breath}   onChange={v=>upMov(side,i,"breath",v)}/>
            {side==="r"&&<EditorInp ph="✦ Transition cue…" val={m.transitionCue||""} onChange={v=>upMov(side,i,"transitionCue",v)} gold/>}
            <button onClick={()=>delMov(side,i)} style={{background:"none",border:"none",cursor:"pointer",color:C.neutral,padding:3,width:28}}><Icon name="x" size={13}/></button>
          </div>
          {/* Notes / modifications row */}
          <div style={{paddingLeft:23,paddingRight:33}}>
            <input placeholder="✎ Notas, modificações, dicas…" value={m.notes||""} onChange={e=>upMov(side,i,"notes",e.target.value)}
              style={{fontSize:11,padding:"2px 7px",borderRadius:4,border:`1px solid ${C.stone}50`,background:`${C.blue}20`,fontFamily:"'Satoshi',sans-serif",width:"100%",boxSizing:"border-box",color:C.mist}}/>
          </div>
        </React.Fragment>
      ))}
      <div style={{marginTop:4}}><Btn small variant="ghost" onClick={()=>addMov(side)}><Icon name="plus" size={12}/> Add row</Btn></div>
    </div>
  );
};

const EditorSigTable = ({ chore, rMovs, bMovs, upMov, addMov, delMov, rLen, bLen, reorderMov }) => {
  const count = Math.max(rMovs.length, bMovs.length);
  const dragIdx = React.useRef(null);
  const [dragOver, setDragOver] = React.useState(null);
  const cols = chore
    ? "18px minmax(65px,75px) minmax(80px,110px) 1fr minmax(65px,80px) minmax(90px,120px) 1fr minmax(65px,80px) 28px"
    : "18px 1fr minmax(65px,80px) minmax(90px,120px) 1fr minmax(65px,80px) 28px";
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:600}}>
        <div style={{display:"grid",gridTemplateColumns:cols,gap:4,marginBottom:4}}>
          <div/>
          {chore&&<div style={{fontSize:11,fontWeight:700,color:`${C.white}90`,background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Timing</div>}
          {chore&&<div style={{fontSize:11,fontWeight:700,color:`${C.white}90`,background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Lyric</div>}
          <div style={{fontSize:11,fontWeight:700,color:C.reformer,background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Reformer</div>
          <div style={{fontSize:11,fontWeight:700,color:"#7ec8c8",background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Breath R</div>
          <div style={{fontSize:11,fontWeight:700,color:C.sig,background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>✦ Cue</div>
          <div style={{fontSize:11,fontWeight:700,color:C.barre,background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Barre</div>
          <div style={{fontSize:11,fontWeight:700,color:"#e8a898",background:C.ink,borderRadius:"4px 4px 0 0",padding:"5px 6px",textAlign:"center"}}>Breath B</div>
          <div/>
        </div>
        {Array.from({length:count}).map((_,i)=>{
          const rm = rMovs[i]||{timing:"",lyric:"",movement:"",breath:"",transitionCue:""};
          const bm = bMovs[i]||{timing:"",lyric:"",movement:"",breath:""};
          return (
            <React.Fragment key={i}>
              {i>0&&<div style={{height:3}}/>}
              <div
                draggable
                onDragStart={()=>{ dragIdx.current=i; }}
                onDragOver={e=>{ e.preventDefault(); setDragOver(i); }}
                onDrop={()=>{ if(dragIdx.current!=null&&dragIdx.current!==i){ reorderMov("sig",dragIdx.current,i); } dragIdx.current=null; setDragOver(null); }}
                onDragEnd={()=>{ dragIdx.current=null; setDragOver(null); }}
                style={{display:"grid",gridTemplateColumns:cols,gap:4,alignItems:"center",
                  background:dragOver===i?`${C.sig}25`:"transparent",
                  borderRadius:4,padding:"3px 0",marginBottom:1,
                  outline:dragOver===i?`2px dashed ${C.sig}`:"none"}}>
                <span style={{color:C.stone,fontSize:13,cursor:"grab",textAlign:"center",userSelect:"none"}}>⠿</span>
                {chore&&<EditorInp ph="0''-30''" val={rm.timing} onChange={v=>upMov("r",i,"timing",v)}/>}
                {chore&&<EditorInp ph="Lyric"    val={rm.lyric}  onChange={v=>{upMov("r",i,"lyric",v);upMov("b",i,"lyric",v);}}/>}
                <div>
                  <EditorInp ph="Reformer movement" val={rm.movement} onChange={v=>upMov("r",i,"movement",v)} listId="mov-library"/>
                  <input placeholder="✎ Notas…" value={rm.notes||""} onChange={e=>upMov("r",i,"notes",e.target.value)}
                    style={{marginTop:3,fontSize:10,padding:"2px 5px",borderRadius:4,border:`1px solid ${C.stone}50`,background:`${C.blue}20`,fontFamily:"'Satoshi',sans-serif",width:"100%",boxSizing:"border-box",color:C.mist}}/>
                </div>
                <EditorInp ph="Breath"            val={rm.breath}         onChange={v=>upMov("r",i,"breath",v)}/>
                <EditorInp ph="✦ Transition cue…" val={rm.transitionCue||""} onChange={v=>upMov("r",i,"transitionCue",v)} gold/>
                <EditorInp ph="Barre movement"    val={bm.movement}       onChange={v=>upMov("b",i,"movement",v)} listId="mov-library"/>
                <EditorInp ph="Breath"            val={bm.breath}         onChange={v=>upMov("b",i,"breath",v)}/>
                <button onClick={()=>{delMov("r",i);delMov("b",i);}} style={{background:"none",border:"none",cursor:"pointer",color:C.neutral,padding:3,width:28}}><Icon name="x" size={13}/></button>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{marginTop:6}}><Btn small variant="ghost" onClick={()=>{
          for(let x=rLen;x<bLen;x++) addMov("r");
          for(let x=bLen;x<rLen;x++) addMov("b");
          addMov("r"); addMov("b");
        }}><Icon name="plus" size={12}/> Add row</Btn></div>
      </div>
    </div>
  );
};

// ─── VIDEO UPLOAD COMPONENT ─────────────────────────────────────────────────
const SeriesVideo = ({ seriesId, videoUrl, onUpdate, readOnly }) => {
  const [uploading, setUploading] = React.useState(false);
  const [localUrl, setLocalUrl] = React.useState(videoUrl || "");
  const fileRef = React.useRef();
  const toast_ = useToast();

  React.useEffect(() => { setLocalUrl(videoUrl || ""); }, [videoUrl]);

  const handleFile = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMB = 120;
    if (file.size > maxMB * 1024 * 1024) {
      toast_?.(`Ficheiro demasiado grande (máx ${maxMB}MB)`, 'error');
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const ext = file.name.split('.').pop().toLowerCase() || 'mp4';
      const path = `${user.id}/${seriesId}.${ext}`;
      const { error } = await supabase.storage.from('videos').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path);
      setLocalUrl(publicUrl);
      onUpdate(publicUrl);
      toast_?.('Vídeo guardado', 'success');
    } catch(err) {
      console.error(err);
      toast_?.('Erro ao fazer upload do vídeo', 'error');
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemove = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const exts = ['mp4', 'webm', 'mov'];
        await supabase.storage.from('videos').remove(exts.map(ext => `${user.id}/${seriesId}.${ext}`));
      }
    } catch {}
    setLocalUrl("");
    onUpdate("");
  };

  if (readOnly && !localUrl) return null;

  return (
    <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.stone}`,background:C.white}}>
      {localUrl ? (
        <div style={{position:"relative"}}>
          <video
            src={localUrl}
            controls
            style={{width:"100%",maxHeight:260,display:"block",background:"#000"}}
          />
          {!readOnly && (
            <div style={{position:"absolute",top:8,right:8,display:"flex",gap:6}}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{background:`${C.ink}cc`,color:C.white,border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Satoshi',sans-serif",fontWeight:600}}>
                Substituir
              </button>
              <button
                onClick={handleRemove}
                style={{background:`${C.crimson}cc`,color:C.white,border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontFamily:"'Satoshi',sans-serif",fontWeight:600}}>
                Remover
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => fileRef.current?.click()}
          style={{padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:"pointer",background:C.cream,transition:"background 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.background=C.stone}
          onMouseLeave={e=>e.currentTarget.style.background=C.cream}
        >
          <div style={{width:40,height:40,borderRadius:"50%",background:`${C.neutral}20`,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="play" size={18} color={C.neutral}/>
          </div>
          <div style={{fontSize:13,fontWeight:600,color:C.neutral}}>
            {uploading ? "A carregar…" : "Adicionar vídeo de referência"}
          </div>
          <div style={{fontSize:11,color:C.mist}}>MP4, MOV ou WebM · máx 120MB</div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" onChange={handleFile} style={{display:"none"}}/>
    </div>
  );
};

// ─── AI MOVEMENT ANALYSIS CHAT ────────────────────────────────────────────────
const MovementAnalysisChat = ({ series, aiStyle, onUpdate }) => {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const chatScrollRef = React.useRef();
  const [lastQuickAction, setLastQuickAction] = React.useState(null);
  const toast_ = useToast();

  React.useEffect(() => {
    if (open && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const buildContext = () => {
    const isSig = series.type === "signature";
    const rMovs = series.reformer?.movements || [];
    const bMovs = series.barre?.movements || [];
    if (isSig) {
      return `Series: "${series.name}" (Signature — Reformer + Barre simultaneously)
Song: ${series.song || "none"}
Reformer setup: springs ${series.reformer?.springs||"-"}, props ${series.reformer?.props||"-"}, start: ${series.reformer?.startPosition||"-"}
Barre setup: props ${series.barre?.props||"-"}, start: ${series.barre?.startPosition||"-"}
Movements (Reformer | Barre):
${rMovs.map((m,i) => `  ${m.timing||i+1}: R: ${m.movement} | B: ${(bMovs[i]||{}).movement||"-"}`).join("\n")}
Muscles: ${series.muscles?.join(", ")||"-"}`;
    }
    const d = series.type === "barre" ? series.barre : series.reformer;
    return `Series: "${series.name}" (${series.type})
Song: ${series.song || "none"}
Setup: springs ${series.reformer?.springs||"-"}, props ${d?.props||"-"}, start: ${d?.startPosition||"-"}
Movements:
${(d?.movements||[]).map((m,i)=>`  ${m.timing||i+1}: ${m.movement}`).join("\n")}
Muscles: ${series.muscles?.join(", ")||"-"}`;
  };

  const analyse = async (userMsg, actionType) => {
    setLastQuickAction(actionType || null);
    const userText = userMsg || "Analisa a minha série e sugere melhorias aos movimentos.";
    const newMessages = [...messages, { role: "user", text: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const styleCtx = aiStyle ? `\n\nInstructor teaching style: ${aiStyle}` : "";
      const systemPrompt = `You are a STOTT Pilates expert coach reviewing an instructor's class series. Your role is to suggest improvements to movements only — sequencing, biomechanical flow, STOTT principles, spring/prop choices, or alignment cues. Be specific and concise. Always explain WHY a change would help. You are NOT rewriting their series — you are offering suggestions that the instructor can choose to apply or ignore. Respond in Portuguese (Portugal).${styleCtx}`;

      const contextBlock = buildContext();
      // Build message history for the API
      const apiMessages = [];
      // First message always includes the series context
      const firstUserMsg = newMessages[0].role === "user" ? newMessages[0].text : userText;
      apiMessages.push({ role: "user", content: `${contextBlock}\n\n---\n${firstUserMsg}` });

      for (let i = 1; i < newMessages.length; i++) {
        const m = newMessages[i];
        if (m.role === "user") apiMessages.push({ role: "user", content: m.text });
        else apiMessages.push({ role: "assistant", content: m.text });
      }

      const resp = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: apiMessages,
          max_tokens: 800,
        }),
      });
      const data = await resp.json();
      const reply = data?.content?.[0]?.text || "Sem resposta.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch(e) {
      console.error(e);
      toast_?.("Erro na análise IA", "error");
      setMessages(prev => [...prev, { role: "assistant", text: "Erro ao contactar a IA. Verifica a ligação." }]);
    }
    setLoading(false);
  };

  const reset = () => { setMessages([]); setInput(""); setOpen(false); };

  const quickAction = (prompt, actionType) => {
    setOpen(true);
    analyse(prompt, actionType);
  };
  const QUICK_ACTIONS = [
    { label: "✦ Músculos", actionType: "muscles", prompt: "Analisa a série e lista os 5 músculos principais trabalhados. Responde APENAS com JSON no formato: {\"muscles\":[\"músculo1\",\"músculo2\",...]}" },
    { label: "✦ Notas de Instructor", actionType: "notes", prompt: "Escreve notas de instructor para esta série: técnica, erros comuns, e cues verbais em português (2-3 frases). Responde APENAS com o texto das notas, sem formatação extra." },
    { label: "✦ Modificações", actionType: "mods", prompt: "Sugere modificações, progressões e regressões para esta série para diferentes níveis e limitações físicas comuns. Responde em português." },
  ];

  return (
    <div style={{borderRadius:12,border:`1px solid ${C.stone}`,overflow:"hidden",background:C.white}}>
      {/* Header / trigger */}
      <div
        style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",background:open?`${C.ink}08`:C.white,transition:"background 0.15s"}}
        onClick={() => setOpen(p => !p)}
      >
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:`${C.neutral}15`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Icon name="ai" size={13} color={C.neutral}/>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.ink}}>Análise IA de movimentos</div>
            {messages.length > 0
              ? <div style={{fontSize:11,color:C.mist}}>{messages.length} mensagen{messages.length!==1?"s":""} · clica para {open?"fechar":"abrir"}</div>
              : <div style={{fontSize:11,color:C.mist}}>Sugestões sobre sequência, flow e princípios STOTT</div>
            }
          </div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {QUICK_ACTIONS.map(qa => (
            <Btn key={qa.actionType} small variant="gold"
              onClick={e => { e.stopPropagation(); quickAction(qa.prompt, qa.actionType); }}
              disabled={loading}>
              {qa.label}
            </Btn>
          ))}
          {messages.length > 0 && (
            <button onClick={e=>{e.stopPropagation();reset();setLastQuickAction(null);}}
              style={{fontSize:11,color:C.mist,background:"none",border:"none",cursor:"pointer",padding:"3px 6px",borderRadius:4}}>
              Limpar
            </button>
          )}
          <span style={{color:C.mist,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s",display:"inline-flex"}}>
            <Icon name="chevron" size={14}/>
          </span>
        </div>
      </div>

      {/* Chat body */}
      {open && (
        <div style={{borderTop:`1px solid ${C.stone}`}}>
          {/* Messages */}
          <div ref={chatScrollRef} style={{maxHeight:340,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {messages.length === 0 && !loading && (
              <div style={{textAlign:"center",color:C.mist,fontSize:13,padding:"20px 0"}}>
                Clica em "Analisa a minha série" para começar, ou faz uma pergunta específica.
              </div>
            )}
            {messages.map((m, i) => {
              const isLastAssistant = m.role==="assistant" && i===messages.length-1 && !loading;
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",gap:2,alignItems:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{
                    maxWidth:"85%",
                    padding:"9px 13px",
                    borderRadius:m.role==="user"?"12px 12px 3px 12px":"12px 12px 12px 3px",
                    background:m.role==="user"?C.crimson:`${C.neutral}12`,
                    color:m.role==="user"?C.white:C.ink,
                    fontSize:13,
                    lineHeight:1.55,
                    whiteSpace:"pre-wrap",
                    fontFamily:"'Satoshi', sans-serif",
                  }}>
                    {m.text}
                  </div>
                  {isLastAssistant && lastQuickAction && onUpdate && (
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      {lastQuickAction==="muscles" && (
                        <button onClick={()=>{
                          try {
                            const parsed = JSON.parse(m.text.replace(/```json|```/g,"").trim());
                            if (parsed.muscles) { onUpdate(prev=>({...prev, muscles: parsed.muscles})); }
                          } catch(e) {
                            const lines = m.text.split(/[\n,]+/).map(x=>x.replace(/^[-*\d.•\s"]+/,"").replace(/[",]/g,"").trim()).filter(Boolean);
                            onUpdate(prev=>({...prev, muscles: lines.slice(0,8)}));
                          }
                          setLastQuickAction(null);
                        }} style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.neutral}`,background:`${C.neutral}15`,color:C.neutral,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>
                          ✓ Aceitar músculos
                        </button>
                      )}
                      {lastQuickAction==="notes" && (
                        <button onClick={()=>{
                          onUpdate(prev=>({...prev, cues: m.text.trim()}));
                          setLastQuickAction(null);
                        }} style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:6,border:`1px solid ${C.neutral}`,background:`${C.neutral}15`,color:C.neutral,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>
                          ✓ Aceitar notas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {loading && (
              <div style={{display:"flex",alignItems:"center",gap:8,color:C.mist,fontSize:12}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite"}}/>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite 0.2s"}}/>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite 0.4s"}}/>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{padding:"10px 16px",borderTop:`1px solid ${C.stone}`,display:"flex",gap:8,alignItems:"flex-end"}}>
            <AutoTextarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Faz uma pergunta ou pede uma sugestão específica…"
              onKeyDown={e => { if(e.key==="Enter" && !e.shiftKey && input.trim()){ e.preventDefault(); analyse(input.trim()); } }}
              style={{flex:1,fontSize:13,minHeight:36,resize:"none"}}
            />
            <Btn small onClick={() => input.trim() && analyse(input.trim())} disabled={loading || !input.trim()}>
              <Icon name="send" size={13}/>
            </Btn>
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  );
};

// ─── SERIES EDITOR ────────────────────────────────────────────────────────────
const SeriesEditor = ({ series, onSave, onSaveAsNew, onCancel, onDelete, aiStyle, studioSettings={}, availableZones, availableSeriesTypes }) => {
  const initS = series ? JSON.parse(JSON.stringify(series)) : {...JSON.parse(JSON.stringify(EMPTY_SERIES)), id:`s-${Date.now()}`, createdAt: new Date().toISOString()};
  const [s, setS] = useState(initS);
  const [originalSnap] = useState(()=>JSON.stringify({name:initS.name,song:initS.song,type:initS.type,status:initS.status,muscles:initS.muscles,cues:initS.cues,reformer:initS.reformer,barre:initS.barre}));
  const [generatingCues, setGeneratingCues] = useState(false);
  const [generatingTrans, setGeneratingTrans] = useState(false);
  const toast_ = useToast();
  const [choreR, setChoreR] = useState(()=> (initS.reformer?.movements||[]).some(m=>m.timing));
  const [choreB, setChoreB] = useState(()=> (initS.barre?.movements||[]).some(m=>m.timing));

  const [showCancelWarn, setShowCancelWarn] = useState(false);

  React.useEffect(()=>{ window.scrollTo({top:0,behavior:"smooth"}); }, []);

  const handleCancel = () => {
    const snap = JSON.stringify({name:s.name,song:s.song,type:s.type,status:s.status,muscles:s.muscles,cues:s.cues,reformer:s.reformer,barre:s.barre});
    if(snap !== originalSnap){ setShowCancelWarn(true); return; }
    onCancel();
  };

  const up   = (f,v) => setS(p=>({...p,[f]:v}));
  const upR  = (f,v) => setS(p=>({...p,reformer:{...p.reformer,[f]:v}}));
  const upB  = (f,v) => setS(p=>({...p,barre:{...p.barre,[f]:v}}));
  const addMov = side => { const k=side==="r"?"reformer":"barre"; setS(p=>({...p,[k]:{...p[k],movements:[...p[k].movements,{timing:"",lyric:"",movement:"",breath:"",transitionCue:""}]}})); };
  const upMov  = (side,i,f,v) => { const k=side==="r"?"reformer":"barre"; setS(p=>{ const arr=p[k].movements||[]; const m=[...arr]; while(m.length<=i) m.push({timing:"",lyric:"",movement:"",breath:"",transitionCue:""}); m[i]={...m[i],[f]:v}; return {...p,[k]:{...p[k],movements:m}}; }); };
  const delMov = (side,i) => { const k=side==="r"?"reformer":"barre"; setS(p=>({...p,[k]:{...p[k],movements:p[k].movements.filter((_,j)=>j!==i)}})); };
  const reorderMov = (side, from, to) => {
    if(side==="sig") {
      // reorder both R and B arrays together
      setS(p=>{
        const reorder = arr => { const a=[...arr]; const [item]=a.splice(from,1); a.splice(to,0,item); return a; };
        return {...p, reformer:{...p.reformer,movements:reorder(p.reformer?.movements||[])}, barre:{...p.barre,movements:reorder(p.barre?.movements||[])}};
      });
    } else {
      const k=side==="r"?"reformer":"barre";
      setS(p=>{ const a=[...(p[k].movements||[])]; const [item]=a.splice(from,1); a.splice(to,0,item); return {...p,[k]:{...p[k],movements:a}}; });
    }
  };

  const generateCues = async () => {
    setGeneratingCues(true);
    try {
      const movs = s.type!=="barre"?s.reformer.movements:s.barre.movements;
      const instrExamples = await examplesStore.getRelevant('instructor');
      const examplesCtx = examplesStore.formatExamples(instrExamples);
      const styleCtx = (aiStyle?`\n\nInstructor teaching style:\n${aiStyle}`:"") + examplesCtx;
      const prompt = `STOTT Pilates instructor. Series: "${s.name}", type: ${s.type}, movements: ${movs.map(m=>m.movement).filter(Boolean).join(", ")}, start: ${s.type!=="barre"?s.reformer.startPosition:s.barre.startPosition}.${styleCtx}\n\nGenerate muscles (max 5) and instructor notes (2-3 sentences, common errors + verbal cues in Portuguese). JSON only: {"muscles":["m1"],"cues":"notes"}`;
      const text = await aiCall(prompt);
      const parsed = JSON.parse(text);
      if(parsed.muscles) setS(p=>({...p,muscles:parsed.muscles,cues:parsed.cues||p.cues}));
    } catch(e){ console.error(e); toast_?.('Erro ao gerar com IA', 'error'); }
    setGeneratingCues(false);
  };

  const generateTransitions = async () => {
    setGeneratingTrans(true);
    try {
      const rM=s.reformer?.movements||[], bM=s.barre?.movements||[];
      const seen=new Set(), timings=[];
      [...rM,...bM].forEach(m=>{ if(!seen.has(m.timing)){seen.add(m.timing);timings.push(m.timing);} });
      const rows=timings.map(t=>({timing:t,r:rM.find(m=>m.timing===t),b:bM.find(m=>m.timing===t)}));
      const transExamples = await examplesStore.getRelevant('transition');
      const examplesCtx = examplesStore.formatExamples(transExamples);
      const styleCtx = (aiStyle?`\n\nInstructor style: ${aiStyle}`:"") + examplesCtx;
      const prompt = `STOTT Pilates Signature class instructor (8 reformers + 8 barre simultaneously).${styleCtx}\n\nWrite short verbal transition cues (max 10 words each) to announce what's coming for BOTH groups. Skip row 0.\n\nRows:\n${rows.map((r,i)=>`${i}. ${r.timing}|r:${r.r?.movement||"-"}|b:${r.b?.movement||"-"}`).join("\n")}\n\nJSON array only, one per row (empty string for row 0): ["","cue1","cue2",...]`;
      const text = await aiCall(prompt);
      const cues = JSON.parse(text);
      if(Array.isArray(cues)){
        setS(p=>{
          const newR=[...(p.reformer?.movements||[])];
          timings.forEach((t,i)=>{ const idx=newR.findIndex(m=>m.timing===t); if(idx>=0) newR[idx]={...newR[idx],transitionCue:cues[i]||""}; });
          return {...p,reformer:{...p.reformer,movements:newR}};
        });
      }
    } catch(e){ console.error(e); toast_?.('Erro ao gerar com IA', 'error'); }
    setGeneratingTrans(false);
  };

  // MovTable and SigTable are defined OUTSIDE SeriesEditor (see below) to avoid re-mount on keystroke

  return (
    <>
    <style>{`@media print {
      .no-print { display:none!important; }
      @page { size: A5 portrait; margin: 8mm 7mm; }
      body { background: white !important; font-family: 'Satoshi', sans-serif; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          box-shadow: none !important; background: white !important; background-color: white !important;
          border-radius: 0 !important; }
      /* Strip all section borders/boxes */
      [style*="borderRadius:12"], [style*="borderRadius:16"] {
        border: none !important; padding: 0 !important; margin-bottom: 4px !important;
      }
      /* Tables — clean rules */
      table { width: 100% !important; border-collapse: collapse !important; }
      td, th { padding: 1.5px 4px !important; border-bottom: 0.5px solid #ddd !important; font-size: 8.5px !important; line-height: 1.3 !important; }
      tr.print-thead th { border-bottom: 1px solid #444 !important; font-weight: 700 !important; background: white !important; font-size: 7.5px !important; text-transform: uppercase !important; }
      tr.print-cue-row td { font-style: italic !important; color: #555 !important; border-bottom: none !important; }
      /* Inputs/textareas as plain text */
      input, textarea { border: none !important; background: transparent !important; resize: none !important;
                        overflow: hidden !important; padding: 0 !important; font-size: 8.5px !important; width: 100% !important; }
      /* Hide buttons and editor chrome */
      button { display: none !important; }
      /* Headings */
      h3 { font-size: 11px !important; margin: 0 0 3px !important; }
    }`}</style>
    <div className="series-editor-card" style={{background:C.white,borderRadius:16,border:`1px solid ${C.stone}`,padding:28,display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{fontFamily:"'Clash Display', sans-serif",fontSize:22,fontWeight:500,color:C.crimson,margin:0}}>{series?.id?"Editar série":"Nova série"}</h3>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn small onClick={()=>onSave(s)}><Icon name="save" size={13}/> Guardar série</Btn>
          {series?.id&&onSaveAsNew&&<Btn variant="ghost" small onClick={()=>{
            const newName = window.prompt("Nome da nova série:", s.name+" (cópia)");
            if(newName) onSaveAsNew({...JSON.parse(JSON.stringify(s)), id:`s-${Date.now()}`, name:newName});
          }}><Icon name="copy" size={13}/> Duplicar</Btn>}

          <Btn variant="ghost" small onClick={handleCancel}><Icon name="x" size={14}/></Btn>
        </div>
      </div>

      {showCancelWarn&&(
        <div style={{background:C.cream,border:`1px solid ${C.stone}`,borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:C.slate,flex:1}}>Tens alterações não guardadas. Tens a certeza que queres sair?</span>
          <div style={{display:"flex",gap:8}}>
            <Btn small variant="ghost" onClick={()=>setShowCancelWarn(false)}>Continuar a editar</Btn>
            <Btn small variant="danger" onClick={()=>{setShowCancelWarn(false);onCancel();}}>Sair sem guardar</Btn>
          </div>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Nome da série" val={s.name} onChange={v=>up("name",v)}/>
        <Field label="Música (opcional)" val={s.song} onChange={v=>up("song",v)}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Field label="Cue de abertura (início da série)" val={s.openCue||""} onChange={v=>up("openCue",v)} placeholder="ex. Vamos para o reformer — 2 vermelhas, pés na barra…"/>
        <Field label="Cue de fecho (saída / transição)" val={s.closeCue||""} onChange={v=>up("closeCue",v)} placeholder="ex. Muito bem, vamos guardar as correias e…"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:4}}>
        <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Data de criação</label>
        <div style={{fontSize:13,color:C.mist,padding:"4px 0"}}>{s.createdAt?new Date(s.createdAt).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"}):"—"}</div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Tipo:</label>
        {[["reformer","Reformer","C.reformer"],["barre","Barre","C.barre"],["signature","Signature (ambos)","C.sig"]].map(([val,lbl,col])=>{
          const clr = val==="reformer"?C.reformer:val==="barre"?C.barre:C.sig;
          const activeText = val==="barre"?"#5a1a30":"#6a3000";
          return <button key={val} onClick={()=>up("type",val)} style={{fontFamily:"'Satoshi', sans-serif",fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,border:`1px solid ${s.type===val?clr:C.stone}`,background:s.type===val?clr:"transparent",color:s.type===val?(val==="reformer"?C.white:activeText):C.mist,cursor:"pointer"}}>{lbl}</button>;
        })}
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["testing","approved"].map(v=>{
            const isActive = s.status===v;
            const clr = v==="approved"?"#3a6a9a":C.neutral;
            return <button key={v} onClick={()=>up("status",v)} style={{fontFamily:"'Satoshi', sans-serif",fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,border:`1px solid ${isActive?clr:C.stone}`,background:isActive?clr:"transparent",color:isActive?C.white:C.mist,cursor:"pointer"}}>{v==="testing"?"Em teste":"Aprovada"}</button>;
          })}
        </div>
      </div>

      {/* Reformer-only editor */}
      {s.type==="reformer"&&(
        <div className="series-editor-section" style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.stone}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.reformer,textTransform:"uppercase",letterSpacing:"0.08em"}}>Reformer</div>
            <Toggle label={choreR?"♫ Coreografado":"Simples"} active={choreR} onClick={()=>setChoreR(p=>!p)} color={C.neutral}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <Field label="Springs" val={s.reformer.springs} onChange={v=>upR("springs",v)}/>
            <Field label="Props" val={s.reformer.props} onChange={v=>upR("props",v)}/>
            <Field label="Posição inicial" val={s.reformer.startPosition} onChange={v=>upR("startPosition",v)}/>
          </div>
          <EditorMovTable side="r" data={s.reformer} chore={choreR} upMov={upMov} addMov={addMov} delMov={delMov} reorderMov={reorderMov}/>
        </div>
      )}

      {/* Barre-only editor */}
      {s.type==="barre"&&(
        <div className="series-editor-section" style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.stone}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.barre,textTransform:"uppercase",letterSpacing:"0.08em"}}>Barre / Mat</div>
            <Toggle label={choreB?"♫ Coreografado":"Simples"} active={choreB} onClick={()=>setChoreB(p=>!p)} color={C.neutral}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <Field label="Props" val={s.barre.props} onChange={v=>upB("props",v)}/>
            <Field label="Posição inicial" val={s.barre.startPosition} onChange={v=>upB("startPosition",v)}/>
          </div>
          <EditorMovTable side="b" data={s.barre} chore={choreB} upMov={upMov} addMov={addMov} delMov={delMov} reorderMov={reorderMov}/>
        </div>
      )}

      {/* Signature unified editor — Reformer + Barre side by side */}
      {s.type==="signature"&&(
        <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.stone}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
            <div style={{fontSize:12,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em"}}>Reformer + Barre</div>
            <Toggle label={choreR?"♫ Coreografado":"Simples"} active={choreR} onClick={()=>{setChoreR(p=>!p);setChoreB(p=>!p);}} color={C.neutral}/>
            <Btn small variant="gold" onClick={generateTransitions} style={{marginLeft:"auto"}} disabled={generatingTrans}>
              <Icon name="ai" size={12}/>{generatingTrans?"A gerar…":"✦ Gerar transition cues (IA)"}
            </Btn>
          </div>
          {/* Setup: 2 col */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{background:C.cream,borderRadius:8,padding:12,border:`1px solid ${C.stone}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.reformer,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Reformer</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Field label="Springs" val={s.reformer.springs} onChange={v=>upR("springs",v)}/>
                <Field label="Props" val={s.reformer.props} onChange={v=>upR("props",v)}/>
                <Field label="Posição inicial" val={s.reformer.startPosition} onChange={v=>upR("startPosition",v)}/>
              </div>
            </div>
            <div style={{background:C.cream,borderRadius:8,padding:12,border:`1px solid ${C.stone}`}}>
              <div style={{fontSize:10,fontWeight:700,color:C.barre,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Barre</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Field label="Props" val={s.barre.props} onChange={v=>upB("props",v)}/>
                <Field label="Posição inicial" val={s.barre.startPosition} onChange={v=>upB("startPosition",v)}/>
              </div>
            </div>
          </div>
          <EditorSigTable chore={choreR} rMovs={s.reformer?.movements||[]} bMovs={s.barre?.movements||[]} upMov={upMov} addMov={addMov} delMov={delMov} rLen={s.reformer?.movements?.length||0} bLen={s.barre?.movements?.length||0} reorderMov={reorderMov}/>
        </div>
      )}

      <div className="series-editor-section" style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.stone}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em"}}>Músculos e cues gerais</div>
          <Btn small variant="gold" onClick={generateCues} disabled={generatingCues}><Icon name="ai" size={12}/>{generatingCues?"A gerar…":"✦ Gerar com IA"}</Btn>
        </div>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Músculos (separados por vírgula)</label>
          <input value={s.muscles.join(", ")} onChange={e=>setS(p=>({...p,muscles:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)}))} style={{width:"100%",fontFamily:"'Satoshi', sans-serif",fontSize:13,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",color:C.ink,background:C.cream,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Zonas target</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {(availableZones?.length ? availableZones : ["Glutes","Hamstrings","Quads","Inner Thighs","Calves","Core","Back","Arms","Shoulders","Chest","Full Body","Cardio","Warm-Up","Mobility","Flexibility","Balance"]).map(tag=>{
                const active = (s.targetZone||"").split(",").map(x=>x.trim()).includes(tag);
                const isPrimary = s.primaryZone===tag;
                return <button key={tag} onClick={()=>{
                  const tags = (s.targetZone||"").split(",").map(x=>x.trim()).filter(Boolean);
                  const next = active ? tags.filter(t=>t!==tag) : [...tags,tag];
                  const updates = {targetZone: next.join(", ")};
                  if(active && isPrimary) updates.primaryZone = "";
                  if(!active && next.length===1) updates.primaryZone = tag;
                  setS(p=>({...p,...updates}));
                }} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  border:`1px solid ${isPrimary?"#1a3a6a":active?"#2a5a8a":C.stone}`,
                  background:isPrimary?`${C.blue}90`:active?`${C.blue}60`:"transparent",
                  color:isPrimary?"#0a1a4a":active?"#1a3a6a":C.mist,cursor:"pointer"}}>{tag}</button>;
              })}
            </div>
            {(()=>{
              const activeTags = (s.targetZone||"").split(",").map(x=>x.trim()).filter(Boolean);
              if(activeTags.length < 2) return null;
              return (
                <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:4}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Zona principal <span style={{fontWeight:400,textTransform:"none",letterSpacing:0}}>(para ordenação)</span></label>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {activeTags.map(tag=>{
                      const isPrimary = s.primaryZone===tag;
                      return <button key={tag} onClick={()=>setS(p=>({...p,primaryZone:tag}))}
                        style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:isPrimary?700:500,
                          padding:"3px 12px",borderRadius:20,cursor:"pointer",
                          border:`1px solid ${isPrimary?"#1a3a6a":"#aac"}`,
                          background:isPrimary?"#1a3a6a":"transparent",
                          color:isPrimary?"#fff":"#3a5a8a",
                          display:"flex",alignItems:"center",gap:5}}>
                        {isPrimary&&<span style={{fontSize:9}}>★</span>}{tag}
                      </button>;
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Tipo de série</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {(availableSeriesTypes||studioSettings?.series_types||DEFAULT_SERIES_TYPES).map(tag=>{
                const active = s.seriesType===tag;
                return <button key={tag} onClick={()=>setS(p=>({...p,seriesType:active?"":tag}))}
                  style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                    border:`1px solid ${active?"#8a4010":C.stone}`,
                    background:active?`${C.sig}60`:"transparent",
                    color:active?"#5a2a00":C.mist,cursor:"pointer"}}>{tag}</button>;
              })}
            </div>
          </div>
        </div>
        <Field label="Notas de Instructor" val={s.cues} onChange={v=>up("cues",v)} multiline/>
      </div>

      {/* Modifications */}
      <div style={{background:C.white,borderRadius:12,padding:16,border:`1px solid ${C.stone}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Modificações da série</div>
        <Field label="Modificações gerais (ex. variações, progressões, regressões)" val={s.modifications||""} onChange={v=>up("modifications",v)} multiline/>
      </div>

      {/* Video upload */}
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Vídeo de referência</div>
        <SeriesVideo seriesId={s.id} videoUrl={s.videoUrl||""} onUpdate={v=>up("videoUrl",v)}/>
      </div>

      {/* Delete series — only shown when editing existing series */}
      {series?.id && onDelete && (
        <div style={{borderTop:`1px solid ${C.stone}`,paddingTop:16,display:"flex",justifyContent:"flex-start"}}>
          <Btn variant="danger" small onClick={()=>onDelete(series.id)}>
            <Icon name="x" size={13}/> Apagar série
          </Btn>
        </div>
      )}

{/* save moved to header */}
    </div>
    </>
  );
};

// ─── AULA SERIES CARD ────────────────────────────────────────────────────────
// Card used inside AulaView — same white card look as SeriesCard in the library,
// but with collapse toggle and aula-specific props
const AulaSeriesCard = ({
  ser, idx, isSig,
  modR, modB, setModR, setModB,
  showSetup, showIntro, showCues, showInstrNotes,
  showTiming, showLyric,
  aiStyle, onEdit, onUpdateSeries, setSeriesList, MovTable,
  teachingMode=false
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const isExpanded = !collapsed || teachingMode;
  const [localCues, setLocalCues] = React.useState(ser.cues||"");
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => { setLocalCues(ser.cues||""); }, [ser.cues]);

  const updateSer = updated => {
    setSeriesList(p => p.map(s => s.id===ser.id ? updated : s));
    onUpdateSeries(updated);
  };

  const generateNotes = async e => {
    e.stopPropagation();
    setGenerating(true);
    try {
      const examples = await examplesStore.getRelevant('instructor');
      const styleCtx = (aiStyle ? `\nInstructor style: ${aiStyle}` : "") + examplesStore.formatExamples(examples);
      const movList = (ser.type==="barre"?ser.barre:ser.reformer)?.movements?.map(m=>m.movement).filter(Boolean).join(", ")||"-";
      const prompt = `STOTT Pilates instructor. Write concise instructor notes for this series.${styleCtx}\nSeries: "${ser.name}"\nMuscles: ${ser.muscles?.join(", ")||"-"}\nMovements: ${movList}\nFocus on key technique cues, common mistakes, and modifications. Return ONLY the notes text.`;
      const text = (await aiCall(prompt)).trim().replace(/^["']|["']$/g,"");
      setLocalCues(text);
      updateSer({...ser, cues:text});
    } catch(e) { console.error(e); toast_?.('Erro ao gerar com IA', 'error'); }
    setGenerating(false);
  };

  return (
    <div style={{background:C.white,borderRadius:14,border:`1px solid ${C.stone}`,overflow:"hidden",transition:"box-shadow 0.2s",boxShadow:collapsed?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>

      {/* Card header */}
      <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:isExpanded?`1px solid ${C.stone}`:"none"}}
        onClick={()=>{ if(!teachingMode) setCollapsed(p=>!p); }}>
        <span style={{fontFamily:"'Clash Display', sans-serif",fontSize:9,fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",color:C.mist,flexShrink:0}}>0{idx+1}</span>
        <span style={{fontFamily:"'Clash Display', sans-serif",fontSize:teachingMode?22:18,fontWeight:500,color:C.ink,flex:1}}>{ser.name}</span>
        {ser.song&&<span style={{display:"inline-flex",alignItems:"center",gap:4,color:C.mist,fontSize:12,flexShrink:0}}><Icon name="music" size={11}/>{ser.song}</span>}
        {!teachingMode&&<div className="no-print" style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {isSig&&<>
            <Toggle label="Reformer" active={modR[ser.id]!==false} onClick={()=>setModR(p=>({...p,[ser.id]:!p[ser.id]}))} color={C.reformer}/>
            <Toggle label="Barre"    active={modB[ser.id]!==false} onClick={()=>setModB(p=>({...p,[ser.id]:!p[ser.id]}))} color={C.barre}/>
          </>}
          <Btn small variant="ghost" onClick={onEdit}><Icon name="edit" size={13}/> Editar série</Btn>
        </div>}
        {!teachingMode&&<span style={{color:C.mist,display:"inline-flex",transition:"transform 0.2s",transform:collapsed?"rotate(0deg)":"rotate(180deg)",flexShrink:0}}>
          <Icon name="chevron" size={15}/>
        </span>}
      </div>

      {/* Card body */}
      {isExpanded&&(
        <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:12}}>

          {showSetup&&isSig&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["reformer",C.reformer,ser.reformer],["barre",C.barre,ser.barre]].map(([side,col,d])=>(
                <div key={side} style={{background:C.cream,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.stone}`,display:"flex",gap:10,flexWrap:"wrap",fontSize:13}}>
                  <b style={{color:col,textTransform:"uppercase",fontSize:11,letterSpacing:"0.06em",fontWeight:700}}>{side==="reformer"?"Reformer":"Barre"}</b>
                  {side==="reformer"&&d?.springs&&<span><b>Springs:</b> {d.springs}</span>}
                  {d?.props&&<span><b>Props:</b> {d.props}</span>}
                  {d?.startPosition&&<span><b>Posição:</b> {d.startPosition}</span>}
                </div>
              ))}
            </div>
          )}
          {showSetup&&!isSig&&(()=>{
            const d=ser.type==="barre"?ser.barre:ser.reformer, col=ser.type==="barre"?C.barre:C.reformer;
            return <div style={{background:C.cream,borderRadius:8,padding:"8px 12px",border:`1px solid ${C.stone}`,display:"flex",gap:12,flexWrap:"wrap",fontSize:13}}>
              <b style={{color:col,textTransform:"uppercase",fontSize:11,letterSpacing:"0.06em",fontWeight:700}}>{ser.type==="barre"?"Barre":"Reformer"}</b>
              {ser.reformer?.springs&&<span><b>Springs:</b> {ser.reformer.springs}</span>}
              {d?.props&&<span><b>Props:</b> {d.props}</span>}
              {d?.startPosition&&<span><b>Posição:</b> {d.startPosition}</span>}
            </div>;
          })()}

          {showIntro&&<IntroCue series={ser} aiStyle={aiStyle} readOnly={false}
            onChange={v=>updateSer({...ser,introCue:v})}/>}

          <MovTable ser={ser}/>

          {showInstrNotes&&(
            <div style={{padding:"10px 14px",background:C.white,border:`1px solid ${C.stone}`,borderRadius:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:600,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.05em",flex:1}}>Instructor Notes</span>
                <button onClick={generateNotes} disabled={generating} title="Gerar com IA"
                  style={{background:"none",border:`1px solid ${C.stone}`,borderRadius:5,cursor:generating?"wait":"pointer",color:C.neutral,padding:"2px 8px",fontSize:10,display:"inline-flex",alignItems:"center",gap:3,opacity:generating?0.5:1,fontFamily:"'Satoshi', sans-serif",fontWeight:600}}>
                  <Icon name="ai" size={10}/>{generating?"…":"✦ IA"}
                </button>
              </div>
              <AutoTextarea value={localCues} placeholder="Notas de Instructor…"
                onChange={e=>{setLocalCues(e.target.value);updateSer({...ser,cues:e.target.value});}}
                style={{fontSize:12,color:C.ink}}/>
            </div>
          )}
          {/* Modifications (read-only display) */}
          {ser.modifications&&(
            <div style={{padding:"8px 12px",background:`${C.blue}20`,border:`1px solid ${C.blue}`,borderRadius:8}}>
              <div style={{fontSize:10,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Modificações</div>
              <div style={{fontSize:12,color:C.ink,whiteSpace:"pre-wrap"}}>{ser.modifications}</div>
            </div>
          )}
          {/* Video reference (read-only in aula view) */}
          {ser.videoUrl&&(
            <SeriesVideo seriesId={ser.id} videoUrl={ser.videoUrl} onUpdate={()=>{}} readOnly/>
          )}
        </div>
      )}
    </div>
  );
};

// ─── BREATH CELL ──────────────────────────────────────────────────────────────

// ─── FORK MODAL ───────────────────────────────────────────────────────────────
const ForkModal = ({ seriesName, classCount, onApplyAll, onFork, onCancel }) => (
  <div style={{position:'fixed',inset:0,zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={onCancel}>
    <div style={{position:'absolute',inset:0,background:'rgba(41,35,35,0.35)',backdropFilter:'blur(2px)'}}/>
    <div style={{position:'relative',background:C.white,borderRadius:16,padding:'28px 32px',boxShadow:'0 20px 60px rgba(0,0,0,0.18)',maxWidth:420,width:'90%'}} onClick={e=>e.stopPropagation()}>
      <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:17,fontWeight:500,color:C.crimson,marginBottom:10}}>Guardar alterações</div>
      <p style={{fontFamily:"'Satoshi',sans-serif",fontSize:14,color:C.ink,margin:'0 0 20px',lineHeight:1.55}}>
        <strong>{seriesName}</strong> aparece em <strong>{classCount} aulas</strong>. Como queres guardar?
      </p>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <button onClick={onApplyAll} style={{padding:'10px 18px',borderRadius:8,border:'none',background:C.crimson,color:C.cream,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Satoshi',sans-serif",textAlign:'left'}}>
          Guardar em todas as aulas
          <div style={{fontSize:11,fontWeight:400,opacity:0.8,marginTop:2}}>A série actualiza-se em todas as {classCount} aulas</div>
        </button>
        <button onClick={onFork} style={{padding:'10px 18px',borderRadius:8,border:`1px solid ${C.stone}`,background:'transparent',color:C.ink,fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:"'Satoshi',sans-serif",textAlign:'left'}}>
          Criar versão nova só para esta aula
          <div style={{fontSize:11,fontWeight:400,color:C.mist,marginTop:2}}>As outras aulas mantêm a versão anterior</div>
        </button>
        <button onClick={onCancel} style={{padding:'8px',background:'none',border:'none',color:C.mist,fontSize:12,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>Cancelar</button>
      </div>
    </div>
  </div>
);

// ─── AULA VIEW (merged Ver + Modo Aula) ───────────────────────────────────────
const AulaView = ({ cls, allSeries, onBack, onDeleteClass, onUpdateSeries, onUpdateClass, aiStyle, allClasses=[], onSaveFork, teachingMode, onTeachingModeChange, onSeriesEditChange, studioSettings }) => {
  const [seriesList, setSeriesList] = useState(()=>cls.seriesIds.map(id=>allSeries.find(s=>s.id===id)).filter(Boolean));
  const [editingId, setEditingId] = useState(null);
  const [notes, setNotes] = useState(cls.notes||"");
  const [shareToken, setShareToken] = useState(cls.shareToken||null);
  const [forkModal, setForkModal] = useState(null);
  const [editName, setEditName] = useState(cls.name||"");
  const [editDate, setEditDate] = useState(cls.date||"");
  const [editLevel, setEditLevel] = useState(cls.level||"");
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [flowZoneFilter, setFlowZoneFilter] = useState("all");
  const flowDragRef = React.useRef(null);
  const [usedDates, setUsedDates] = useState(()=>cls.usedDates||[]);
  const [showDateLog, setShowDateLog] = useState(false);
  const classLevels = studioSettings?.class_levels || DEFAULT_CLASS_LEVELS;
  const currentCls = React.useMemo(()=>({...cls, name:editName, date:editDate, level:editLevel, notes, usedDates}), [cls, editName, editDate, editLevel, notes, usedDates]);

  const addUsedDate = (d) => {
    if (!d || usedDates.includes(d)) return;
    const newDates = [...usedDates, d].sort().reverse();
    setUsedDates(newDates);
    onUpdateClass({...currentCls, usedDates: newDates});
  };
  const removeUsedDate = (d) => {
    const newDates = usedDates.filter(x=>x!==d);
    setUsedDates(newDates);
    onUpdateClass({...currentCls, usedDates: newDates});
  };
  const toast_ = useToast();

  const handleShare = async () => {
    let token = shareToken;
    if (!token) {
      token = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2,10) + Math.random().toString(36).slice(2,10));
      const { error } = await supabase.from('classes').update({ share_token: token }).eq('id', cls.id);
      if (error) { toast_?.('Erro ao gerar link'); return; }
      setShareToken(token);
      onUpdateClass({ ...currentCls, shareToken: token });
    }
    navigator.clipboard.writeText(`${window.location.origin}?share=${token}`);
    toast_?.('Link de partilha copiado!');
  };
  const [showLyric,      setShowLyric]      = useState(false);
  const [showTiming,     setShowTiming]     = useState(false);
  const [showSetup,      setShowSetup]      = useState(true);
  const [showIntro,      setShowIntro]      = useState(false);
  const [showCues,       setShowCues]       = useState(false);
  const [showInstrNotes, setShowInstrNotes] = useState(false);
  const [showAulaNotes,  setShowAulaNotes]  = useState(false);
  const [warmupNotes, setWarmupNotes] = useState(cls.warmupNotes||"");
  const [cooldownNotes, setCooldownNotes] = useState(cls.cooldownNotes||"");
  const [showWarmupPanel, setShowWarmupPanel] = useState(false);
  const [generatingWC, setGeneratingWC] = useState(false);
  const [modR, setModR] = useState({});
  const [modB, setModB] = useState({});
  const [openCueRows, setOpenCueRows] = React.useState(new Set());
  const toggleCueRow = key => setOpenCueRows(prev => { const s=new Set(prev); s.has(key)?s.delete(key):s.add(key); return s; });
  const [movHovCell, setMovHovCell] = React.useState(null);

  const isSig   = cls.type==="signature";

  const saveEdit = updated => {
    const usedIn = (allClasses||[]).filter(c => c.seriesIds.includes(updated.id));
    if (usedIn.length > 1) {
      setForkModal({ updated, classCount: usedIn.length });
    } else {
      onUpdateSeries(updated);
      setSeriesList(p=>p.map(s=>s.id===updated.id?updated:s));
      setEditingId(null); onSeriesEditChange?.(null);
    }
  };

  const generateWarmupCooldown = async () => {
    setGeneratingWC(true);
    try {
      const warmupSeries = seriesList.filter(s=>(s.primaryZone||s.targetZone||"").toLowerCase().includes("warm"));
      const cooldownSeries = seriesList.filter(s=>(s.primaryZone||s.targetZone||"").toLowerCase().includes("cool")||(s.primaryZone||s.targetZone||"").toLowerCase().includes("mobil")||(s.primaryZone||s.targetZone||"").toLowerCase().includes("flex"));
      const mainSeries = seriesList.filter(s=>!warmupSeries.includes(s)&&!cooldownSeries.includes(s));
      const seriesData = mainSeries.map(s => ({
        name: s.name,
        zone: s.primaryZone||s.targetZone?.split(',').slice(0,2).join(',')||"-",
        muscles: s.muscles?.slice(0,4).join(", ")||"-",
      }));
      const alreadyWarmup = warmupSeries.map(s=>s.name).join(", ");
      const alreadyCooldown = cooldownSeries.map(s=>s.name).join(", ");
      const classInfo = `Aula: "${currentCls.name}" (${currentCls.type||"geral"})\nSéries principais:\n${seriesData.map((s,i)=>`${i+1}. ${s.name} — zona: ${s.zone}, músculos: ${s.muscles}`).join("\n")}${alreadyWarmup?`\nJá tem warm-up: ${alreadyWarmup}`:""}${alreadyCooldown?`\nJá tem cool-down/mobilidade: ${alreadyCooldown}`:""}`;
      const prompt = `És um expert STOTT Pilates. Com base nesta aula:\n\n${classInfo}\n\nSugere exercícios ESPECÍFICOS de warm-up e cool-down para esta aula. Foca nas zonas e músculos que a aula trabalha. Sê concreto: nomeia exercícios reais (ex: "cat-cow, hip flexor stretch, thoracic rotation"). Não escrevas texto longo — dá listas curtas e diretas.\n\nResponde APENAS com JSON: {"warmup":["exercício 1","exercício 2","exercício 3"],"cooldown":["exercício 1","exercício 2","exercício 3"]}`;
      const text = await aiCall(prompt);
      let parsed;
      try {
        parsed = JSON.parse(text);
        if (Array.isArray(parsed.warmup)) parsed.warmup = parsed.warmup.join("\n");
        if (Array.isArray(parsed.cooldown)) parsed.cooldown = parsed.cooldown.join("\n");
      } catch(e) { parsed = { warmup: text, cooldown: "" }; }
      if (parsed.warmup) { setWarmupNotes(parsed.warmup); onUpdateClass({...currentCls, warmupNotes: parsed.warmup, cooldownNotes: parsed.cooldown||cooldownNotes}); }
      if (parsed.cooldown) { setCooldownNotes(parsed.cooldown); }
    } catch(e) { console.error(e); }
    setGeneratingWC(false);
  };

  // Flow editor helpers
  const availableForFlow = React.useMemo(() =>
    allSeries.filter(s => !seriesList.find(x=>x.id===s.id) &&
      (cls.type==="signature" ? s.type==="signature" : s.type===cls.type||s.type==="signature"))
  , [allSeries, seriesList, cls.type]);

  const flowZones = React.useMemo(() => {
    const zset = new Set();
    availableForFlow.forEach(s=>(s.targetZone||"").split(",").map(z=>z.trim()).filter(Boolean).forEach(z=>zset.add(z)));
    return [...zset].sort((a,b)=>a.localeCompare(b,"pt"));
  }, [availableForFlow]);

  const availableFlowFiltered = flowZoneFilter==="all" ? availableForFlow : availableForFlow.filter(s=>(s.targetZone||"").split(",").map(z=>z.trim()).includes(flowZoneFilter));

  const addToFlow = (id) => {
    const ser = allSeries.find(s=>s.id===id);
    if (!ser) return;
    const newList = [...seriesList, ser];
    setSeriesList(newList);
    onUpdateClass({...currentCls, seriesIds: newList.map(s=>s.id)});
  };
  const removeFromFlow = (id) => {
    const newList = seriesList.filter(s=>s.id!==id);
    setSeriesList(newList);
    onUpdateClass({...currentCls, seriesIds: newList.map(s=>s.id)});
  };

  const buildRows = ser => {
    const rM=ser.reformer?.movements||[], bM=ser.barre?.movements||[];
    const seen=new Set(), timings=[];
    [...rM,...bM].forEach(m=>{ if(!seen.has(m.timing)){seen.add(m.timing);timings.push(m.timing);} });
    return timings.map(t=>({
      timing:t,
      lyric:(rM.find(m=>m.timing===t)||bM.find(m=>m.timing===t))?.lyric||"",
      r:rM.find(m=>m.timing===t)||null,
      b:bM.find(m=>m.timing===t)||null,
      transitionCue:rM.find(m=>m.timing===t)?.transitionCue||"",
    }));
  };


  const tBtn = (lbl, active, fn) => (
    <button onClick={fn} style={{fontFamily:"'Satoshi', sans-serif",fontSize:11,fontWeight:600,padding:"4px 11px",borderRadius:20,border:`1px solid ${active?C.neutral:C.stone}`,background:active?C.neutral:"transparent",color:active?C.white:C.mist,cursor:"pointer",transition:"all 0.15s"}}>{lbl}</button>
  );

  const MovTable = ({ ser }) => {
    if (isSig) {
      const rows=buildRows(ser), choreo=rows.some(r=>r.timing);
      const showR = modR[ser.id]!==false;
      const showB = modB[ser.id]!==false;
      if (choreo) return (
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
            <thead><tr className="print-thead" style={{background:"#ddd0ca"}}>
              {showTiming&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Timing</th>}
              {showLyric &&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Lyric</th>}
              {showR&&<th style={{fontSize:12,fontWeight:600,color:C.reformer,textAlign:"left",padding:"8px 12px"}}>Reformer</th>}
              {showB&&<th style={{fontSize:12,fontWeight:600,color:"#c0507a",textAlign:"left",padding:"8px 12px"}}>Barre</th>}
            </tr></thead>
            <tbody>
              {ser.openCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{ser.openCue}</span></div></td></tr>}
              {rows.map((row,i)=>{
                const cue=row.transitionCue?.trim(), rk=`${ser.id}-${i}`;
                return (
                  <React.Fragment key={i}>
                    {i>0&&showCues&&(!cue&&!openCueRows.has(rk)?(
                      <tr style={{background:"transparent"}}>
                        <td colSpan={99} style={{padding:"2px 10px"}}>
                          <button onClick={()=>toggleCueRow(rk)} style={{background:"none",border:"none",cursor:"pointer",color:C.mist,fontSize:11,fontFamily:"'Satoshi',sans-serif",fontWeight:600,padding:"2px 4px",opacity:0.6}}>+ cue</button>
                        </td>
                      </tr>
                    ):(
                      <tr className="print-cue-row" style={{background:"#F4EDE8"}}>
                        <td colSpan={99} style={{padding:"4px 10px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span>
                            <input
                                  value={row.transitionCue||""}
                                  placeholder="Transition cue…"
                                  onChange={e=>{
                                    const newR=[...(ser.reformer?.movements||[])];
                                    const idx=newR.findIndex(m=>m.timing===row.timing);
                                    if(idx>=0){ newR[idx]={...newR[idx],transitionCue:e.target.value}; }
                                    const updated={...ser,reformer:{...ser.reformer,movements:newR}};
                                    setSeriesList(p=>p.map(s=>s.id===ser.id?updated:s));
                                    onUpdateSeries(updated);
                                  }}
                                  style={{flex:1,fontSize:12,fontStyle:"italic",color:"#7a4010",background:"transparent",border:"none",borderBottom:`1px solid ${C.sig}60`,outline:"none",fontFamily:"'Satoshi', sans-serif",padding:"2px 4px"}}
                                />
                            {showCues&&<CardCueGen
                              series={ser} rowIndex={i} rows={buildRows(ser)} aiStyle={aiStyle}
                              onUpdate={updated=>{setSeriesList(p=>p.map(s=>s.id===updated.id?updated:s));onUpdateSeries(updated);}}
                            />}
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                      {showTiming&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{row.timing}</td>}
                      {showLyric &&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic"}}>{row.lyric}</td>}
                      {showR&&<td style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,position:"relative",cursor:"default"}}
                        onMouseEnter={()=>setMovHovCell(`r-${ser.id}-${i}`)} onMouseLeave={()=>setMovHovCell(null)}>
                        {row.r?.movement||<span style={{color:C.stone}}>—</span>}
                        {movHovCell===`r-${ser.id}-${i}`&&(row.r?.breath||row.r?.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                          {row.r?.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{row.r.breath}</span></div>}
                          {row.r?.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{row.r.notes}</span></div>}
                        </div>}
                      </td>}
                      {showB&&<td style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,position:"relative",cursor:"default"}}
                        onMouseEnter={()=>setMovHovCell(`b-${ser.id}-${i}`)} onMouseLeave={()=>setMovHovCell(null)}>
                        {row.b?.movement||<span style={{color:C.stone}}>—</span>}
                        {movHovCell===`b-${ser.id}-${i}`&&(row.b?.breath||row.b?.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                          {row.b?.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{row.b.breath}</span></div>}
                          {row.b?.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{row.b.notes}</span></div>}
                        </div>}
                      </td>}
                    </tr>
                  </React.Fragment>
                );
              })}
              {ser.closeCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{ser.closeCue}</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      );
      return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {showR&&<div style={{background:`${C.reformer}08`,borderRadius:10,padding:12,border:`1px solid ${C.reformer}30`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.reformer,textTransform:"uppercase",marginBottom:8}}>Reformer</div>
            {ser.reformer?.movements?.map((m,i)=><div key={i} style={{borderBottom:`1px solid ${C.stone}`,padding:"6px 0"}}><div style={{display:"flex",gap:8,alignItems:"baseline"}}><span style={{flex:1,fontSize:13,fontWeight:500,color:C.ink}}>{m.movement}</span>{m.breath&&<span style={{fontSize:11,color:C.mist,fontStyle:"italic",flexShrink:0}}>{m.breath}</span>}</div>{m.notes&&<div style={{fontSize:11,color:C.mist,marginTop:2}}>{m.notes}</div>}</div>)}
          </div>}
          {showB&&<div style={{background:`${C.barre}20`,borderRadius:10,padding:12,border:`1px solid ${C.barre}60`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.barre,textTransform:"uppercase",marginBottom:8}}>Barre</div>
            {ser.barre?.movements?.map((m,i)=><div key={i} style={{borderBottom:`1px solid ${C.stone}`,padding:"6px 0"}}><div style={{display:"flex",gap:8,alignItems:"baseline"}}><span style={{flex:1,fontSize:13,fontWeight:500,color:C.ink}}>{m.movement}</span>{m.breath&&<span style={{fontSize:11,color:C.mist,fontStyle:"italic",flexShrink:0}}>{m.breath}</span>}</div>{m.notes&&<div style={{fontSize:11,color:C.mist,marginTop:2}}>{m.notes}</div>}</div>)}
          </div>}
        </div>
      );
    }
    const d=ser.type==="barre"?ser.barre:ser.reformer, choreo=d?.movements?.some(m=>m.timing);
    return (
      <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
        <thead><tr className="print-thead" style={{background:"#ddd0ca"}}>
          {showTiming&&choreo&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Timing</th>}
          {showLyric&&choreo&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Lyric</th>}
          <th style={{fontSize:10,fontWeight:700,color:C.white,textAlign:"left",padding:"6px 10px"}}>Movement</th>
          {!choreo&&<th style={{fontSize:10,fontWeight:700,color:C.white,textAlign:"left",padding:"6px 10px"}}>Tempo/Reps</th>}
        </tr></thead>
        <tbody>
          {ser.openCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{ser.openCue}</span></div></td></tr>}
          {d?.movements?.map((m,i)=>{
            const cue=m.transitionCue?.trim();
            const nsRk=`${ser.id}-ns-${i}`;
            return (
              <React.Fragment key={i}>
                {i>0&&showCues&&(!cue&&!openCueRows.has(nsRk)?(
                  <tr style={{background:"transparent"}}>
                    <td colSpan={99} style={{padding:"2px 10px"}}>
                      <button onClick={()=>toggleCueRow(nsRk)} style={{background:"none",border:"none",cursor:"pointer",color:C.mist,fontSize:11,fontFamily:"'Satoshi',sans-serif",fontWeight:600,padding:"2px 4px",opacity:0.6}}>+ cue</button>
                    </td>
                  </tr>
                ):(
                  <tr className="print-cue-row" style={{background:"#F4EDE8"}}>
                    <td colSpan={99} style={{padding:"4px 10px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span>
                        <input
                              value={m.transitionCue||""}
                              placeholder="Transition cue…"
                              onChange={e=>{
                                const k=ser.type==="barre"?"barre":"reformer";
                                const newM=[...(ser[k]?.movements||[])];
                                newM[i]={...newM[i],transitionCue:e.target.value};
                                const updated={...ser,[k]:{...ser[k],movements:newM}};
                                setSeriesList(p=>p.map(s=>s.id===ser.id?updated:s));
                                onUpdateSeries(updated);
                              }}
                              style={{flex:1,fontSize:12,fontStyle:"italic",color:"#7a4010",background:"transparent",border:"none",borderBottom:`1px solid ${C.sig}60`,outline:"none",fontFamily:"'Satoshi', sans-serif",padding:"2px 4px"}}
                            />
                        {showCues&&<CardCueGen
                          series={ser} rowIndex={i} rows={null} aiStyle={aiStyle} nonsig
                          onUpdate={updated=>{setSeriesList(p=>p.map(s=>s.id===updated.id?updated:s));onUpdateSeries(updated);}}
                        />}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                  {showTiming&&choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{m.timing}</td>}
                  {showLyric&&choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic"}}>{m.lyric}</td>}
                  <td style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,position:"relative",cursor:"default"}}
                    onMouseEnter={()=>setMovHovCell(`ns-${ser.id}-${i}`)} onMouseLeave={()=>setMovHovCell(null)}>
                    {m.movement||<span style={{color:C.stone}}>—</span>}
                    {movHovCell===`ns-${ser.id}-${i}`&&(m.breath||m.notes)&&<div style={{position:"absolute",left:0,top:"100%",zIndex:200,background:"#FFFAF7",border:"1px solid #e0d8d2",borderRadius:8,padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,0.12)",minWidth:200,maxWidth:300,pointerEvents:"none"}}>
                      {m.breath&&<div style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Resp.</span><span style={{fontSize:12,fontStyle:"italic",lineHeight:1.4}}>{m.breath}</span></div>}
                      {m.notes&&<div style={{display:"flex",gap:8,alignItems:"flex-start"}}><span style={{fontSize:10,fontWeight:700,color:"#8a7e78",textTransform:"uppercase",flexShrink:0,paddingTop:2}}>Notas</span><span style={{fontSize:12,lineHeight:1.4}}>{m.notes}</span></div>}
                    </div>}
                  </td>
                  {!choreo&&<td style={{fontSize:11,padding:"8px 10px",color:C.mist,whiteSpace:"nowrap"}}>{m.timeReps||""}</td>}
                </tr>
              </React.Fragment>
            );
          })}
          {ser.closeCue&&<tr className="print-cue-row" style={{background:"#F4EDE8"}}><td colSpan={99} style={{padding:"4px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,color:C.reformer,fontWeight:700,flexShrink:0}}>✦</span><span style={{fontSize:12,fontStyle:"italic",color:"#7a4010",fontFamily:"'Satoshi',sans-serif"}}>{ser.closeCue}</span></div></td></tr>}
        </tbody>
      </table>
    );
  };

  return (
    <div>
      <style>{`
        @media screen { .print-only { display: none !important; } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          @page { size: var(--pdf-page-size, A4) var(--pdf-orientation, landscape); margin: 12mm 10mm; }
          body { background: white !important; font-family: 'Satoshi', sans-serif; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important; }

          /* Grid layout */
          .print-series-grid {
            display: grid !important;
            grid-template-columns: var(--pdf-grid-cols, 1fr 1fr) !important;
            gap: 6mm !important;
            align-items: start !important;
            padding: 0 !important;
          }

          /* Card: no background, no border, just a top rule separator */
          .print-series-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            background: white !important;
            border: none !important;
            border-top: 1.5px solid #333 !important;
            border-radius: 0 !important;
            padding: 3mm 0 4mm !important;
            margin-bottom: 0 !important;
            font-size: 8.5px !important;
            overflow: visible !important;
          }
          .print-series-card * {
            background: white !important;
            background-color: white !important;
            border-color: #ddd !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-size: 8.5px !important;
            line-height: 1.35 !important;
          }
          /* Titles */
          .print-series-card [style*="Clash Display"],
          .print-series-card [style*="fontFamily.*Clash"] {
            font-size: 11px !important;
            font-weight: 600 !important;
            line-height: 1.2 !important;
          }

          /* Tables: clean rules only */
          .print-series-card table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
          }
          .print-series-card td, .print-series-card th {
            padding: 1.5px 4px !important;
            border: none !important;
            border-bottom: 0.5px solid #ddd !important;
            vertical-align: top !important;
          }
          .print-series-card tr.print-thead th {
            background: white !important;
            border-bottom: 1px solid #555 !important;
            font-weight: 700 !important;
            font-size: 7.5px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.04em !important;
          }
          .print-series-card tr.print-cue-row td {
            font-style: italic !important;
            border-bottom: none !important;
            color: #555 !important;
          }

          /* Setup boxes: collapse to single inline line, no box */
          .print-series-card .setup-box {
            display: inline-block !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 8px 2px 0 !important;
          }
          .print-series-card .setup-box > div { display: inline !important; }
          .print-series-card .setup-box span { display: inline !important; margin-right: 6px !important; }

          /* Intro cue: no box, plain text */
          .print-series-card .intro-cue-box {
            border: none !important;
            padding: 1px 0 !important;
            margin-bottom: 2px !important;
          }
          .print-series-card .intro-cue-box svg { display: none !important; }

          /* Textareas: plain text rendering */
          .print-series-card textarea {
            border: none !important;
            resize: none !important;
            background: transparent !important;
            overflow: hidden !important;
            padding: 0 !important;
            width: 100% !important;
          }

          /* Hide all interactive elements */
          .print-series-card button,
          .print-series-card [draggable] > span:first-child { display: none !important; }

          * { font-size: 10.5px !important; }
          .breath-print { display: block !important; }
          .print-hide { display: none !important; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{padding:"20px 24px 0"}}>
        {teachingMode ? (
          /* Teaching mode — minimal bar */
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:20,fontWeight:500,color:C.ink,flex:1}}>{editName||cls.name}</span>
            <Btn onClick={()=>onTeachingModeChange(false)} style={{background:C.crimson,color:C.cream}}>✕ Sair do Modo Aula</Btn>
          </div>
        ) : (<>
        {/* Row 1: navigation + actions */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap"}}>
          <Btn variant="ghost" onClick={onBack}><Icon name="back" size={14}/> Voltar</Btn>
          <input value={editName} onChange={e=>{ setEditName(e.target.value); onUpdateClass({...currentCls, name:e.target.value}); }}
            style={{fontFamily:"'Clash Display',sans-serif",fontSize:22,fontWeight:500,color:C.ink,border:"none",borderBottom:`1px solid transparent`,background:"transparent",outline:"none",flex:1,minWidth:120,padding:"2px 4px",borderRadius:4,transition:"border-color 0.15s"}}
            onFocus={e=>e.target.style.borderBottomColor=C.stone}
            onBlur={e=>e.target.style.borderBottomColor="transparent"}
            placeholder="Nome da aula"/>
          <input type="date" value={editDate} onChange={e=>{ setEditDate(e.target.value); onUpdateClass({...currentCls, date:e.target.value}); }}
            style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,padding:"4px 8px",borderRadius:6,border:`1px solid ${C.stone}`,color:C.ink,flexShrink:0,background:C.white}}/>
          <Btn small variant="ghost" onClick={()=>setShowFlowEditor(p=>!p)} style={{color:showFlowEditor?C.crimson:C.mist,borderColor:showFlowEditor?C.crimson:C.stone}}>
            <Icon name="edit" size={13}/> {showFlowEditor?"Fechar fluxo":"Editar fluxo"}
          </Btn>
          <Btn small variant="ghost" onClick={handleShare}><Icon name="link" size={13}/> Partilhar</Btn>
          <Btn small variant="ghost" onClick={()=>window.print()}><Icon name="print" size={13}/> PDF</Btn>
          <Btn small onClick={()=>onTeachingModeChange(true)} style={{background:C.crimson,color:C.cream}}>▶ Modo Aula</Btn>
          <Btn small variant="ghost" onClick={()=>setShowWarmupPanel(p=>!p)} style={{color:showWarmupPanel?C.crimson:C.mist}}>✦ Warm-up / Cool-down</Btn>
          {onDeleteClass&&<Btn small variant="danger" onClick={()=>onDeleteClass(cls.id)}><Icon name="x" size={13}/> Apagar aula</Btn>}
        </div>
        {/* Row 2: level + meta */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:4}}>
          <Badge label={cls.type==="signature"?"✦ Signature":cls.type==="reformer"?"Reformer":"Barre"} color={cls.type==="signature"?"gold":cls.type==="reformer"?"teal":"coral"}/>
          {classLevels.map(lvl=>(
            <button key={lvl} onClick={()=>{ const n=editLevel===lvl?"":lvl; setEditLevel(n); onUpdateClass({...currentCls, level:n}); }}
              style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${editLevel===lvl?C.neutral:C.stone}`,background:editLevel===lvl?C.neutral:"transparent",color:editLevel===lvl?C.white:C.mist,cursor:"pointer"}}>
              {lvl}
            </button>
          ))}
          <span style={{fontSize:11,color:C.mist,marginLeft:4}}>{seriesList.length} série{seriesList.length!==1?"s":""}</span>
          <button onClick={()=>setShowDateLog(p=>!p)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${showDateLog?C.neutral:C.stone}`,background:showDateLog?C.neutral:"transparent",color:showDateLog?C.white:C.mist,cursor:"pointer",marginLeft:4}}>
            📅 {usedDates.length>0?`${usedDates.length}×`:"Registar uso"}
          </button>
        </div>
        {/* Date log */}
        {showDateLog&&(
          <div className="no-print" style={{marginTop:8,background:C.white,borderRadius:10,border:`1px solid ${C.stone}`,padding:"10px 14px",display:"flex",flexWrap:"wrap",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.06em"}}>Dias usada:</span>
            {usedDates.map(d=>(
              <span key={d} style={{display:"inline-flex",alignItems:"center",gap:4,background:C.cream,border:`1px solid ${C.stone}`,borderRadius:20,padding:"2px 10px",fontSize:12,color:C.ink}}>
                {d}
                <button onClick={()=>removeUsedDate(d)} style={{background:"none",border:"none",cursor:"pointer",color:C.mist,padding:0,lineHeight:1,fontSize:11}}>×</button>
              </span>
            ))}
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]}
              style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,padding:"3px 8px",borderRadius:6,border:`1px solid ${C.stone}`,color:C.ink}}
              onChange={e=>{ if(e.target.value) addUsedDate(e.target.value); e.target.value=""; }}/>
            <Btn small onClick={()=>addUsedDate(new Date().toISOString().split('T')[0])}>+ Hoje</Btn>
            {usedDates.length>0&&<button onClick={()=>{ setUsedDates([]); onUpdateClass({...currentCls,usedDates:[]}); }} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,color:C.mist,background:"none",border:`1px solid ${C.stone}`,borderRadius:20,padding:"3px 10px",cursor:"pointer",marginLeft:"auto"}}>× Limpar tudo</button>}
          </div>
        )}
        </>)}
      </div>
      <div style={{padding:"0 24px 32px", background:C.cream, minHeight:"100vh"}}>
        {/* Print header */}
        <div className="no-print" style={{paddingTop:8,paddingBottom:12,borderBottom:`1px solid ${C.stone}`,marginBottom:16}}>
          <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:22,fontWeight:500,color:C.ink}}>{editName||cls.name}</div>
          {(editDate||cls.date)&&<div style={{fontSize:12,color:C.mist,marginTop:2,marginBottom:10}}>{editDate||cls.date}</div>}
          {/* Toggles row — visible on screen between title and content */}
          {!teachingMode&&<div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10}}>
            {tBtn("Timing",showTiming,()=>setShowTiming(p=>!p))}
            {tBtn("Lyric",showLyric,()=>setShowLyric(p=>!p))}
            {tBtn("Setup",showSetup,()=>setShowSetup(p=>!p))}
            {tBtn("Intro",showIntro,()=>setShowIntro(p=>!p))}
            {tBtn("Cues",showCues,()=>setShowCues(p=>!p))}
            {tBtn("Instr Notes",showInstrNotes,()=>setShowInstrNotes(p=>!p))}
            {tBtn("Notas da Aula",showAulaNotes,()=>setShowAulaNotes(p=>!p))}
          </div>}
        </div>
        {/* PDF-only header */}
        <div className="print-only" style={{display:"none",textAlign:"left",marginBottom:8}}>
          <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:9,letterSpacing:"0.3em",textTransform:"uppercase",color:C.crimson,marginBottom:2}}>The Haven</div>
          <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:18,fontWeight:600,color:C.ink}}>{cls.name}</div>
          {cls.date&&<div style={{fontSize:9,color:"#666",marginTop:1}}>{cls.date}</div>}
          {isSig&&<div style={{fontSize:9,color:"#666",marginTop:2}}>● Reformer ×8 &nbsp; ● Barre ×8</div>}
        </div>

        {/* Notas da Aula */}
        {showAulaNotes&&(
          <div className="no-print" style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:16,marginBottom:20}}>
            <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Notas da aula</label>
            <AutoTextarea value={notes} onChange={e=>{setNotes(e.target.value);onUpdateClass({...cls,notes:e.target.value});}}
              placeholder="Notas gerais, reminders, modificações…"
              style={{fontSize:13,color:C.ink,padding:"8px 0"}}
              minRows={2}/>
          </div>
        )}

        {/* Warm-up / Cool-down Panel */}
        {showWarmupPanel&&(
          <div className="no-print" style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:16,marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:15,fontWeight:500,color:C.crimson}}>✦ Warm-up / Cool-down</div>
              <Btn small variant="gold" onClick={generateWarmupCooldown} disabled={generatingWC}>
                <Icon name="ai" size={12}/>{generatingWC?"A gerar…":"Gerar com IA"}
              </Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Warm-up</label>
                <AutoTextarea value={warmupNotes} onChange={e=>{setWarmupNotes(e.target.value);onUpdateClass({...currentCls,warmupNotes:e.target.value,cooldownNotes});}}
                  placeholder="Descreve o warm-up para esta aula…"
                  style={{width:"100%",fontSize:13,minHeight:80,resize:"vertical",borderRadius:8,border:`1px solid ${C.stone}`,padding:"8px 10px",fontFamily:"'Satoshi',sans-serif",color:C.ink,background:C.cream,outline:"none",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Cool-down</label>
                <AutoTextarea value={cooldownNotes} onChange={e=>{setCooldownNotes(e.target.value);onUpdateClass({...currentCls,warmupNotes,cooldownNotes:e.target.value});}}
                  placeholder="Descreve o cool-down para esta aula…"
                  style={{width:"100%",fontSize:13,minHeight:80,resize:"vertical",borderRadius:8,border:`1px solid ${C.stone}`,padding:"8px 10px",fontFamily:"'Satoshi',sans-serif",color:C.ink,background:C.cream,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>
          </div>
        )}

        {/* Flow Editor */}
        {showFlowEditor&&(
          <div className="no-print" style={{background:C.white,borderRadius:12,border:`2px solid ${C.crimson}30`,padding:16,marginBottom:20}}>
            <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:15,fontWeight:500,color:C.crimson,marginBottom:12}}>Editar fluxo da aula</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {/* Current flow */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.ink,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Fluxo atual ({seriesList.length})</div>
                {seriesList.length===0&&<div style={{color:C.mist,fontSize:13,padding:"12px 0"}}>Adiciona séries da biblioteca →</div>}
                {seriesList.map((ser,i)=>(
                  <div key={ser.id} draggable
                    onDragStart={()=>{ flowDragRef.current=i; }}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={()=>{
                      if(flowDragRef.current!=null&&flowDragRef.current!==i){
                        const newList=[...seriesList]; const [item]=newList.splice(flowDragRef.current,1); newList.splice(i,0,item);
                        setSeriesList(newList); onUpdateClass({...currentCls,seriesIds:newList.map(s=>s.id)});
                      } flowDragRef.current=null;
                    }}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.cream,borderRadius:8,border:`1px solid ${C.stone}`,marginBottom:5,cursor:"grab"}}>
                    <span style={{color:C.stone,fontSize:12,userSelect:"none"}}>⠿</span>
                    <span style={{fontSize:11,fontWeight:700,color:C.mist,minWidth:18}}>{i+1}</span>
                    <span style={{flex:1,fontSize:13,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ser.name}</span>
                    <Badge label={ser.type==="signature"?"✦":ser.type==="reformer"?"R":"B"} color={ser.type==="signature"?"gold":ser.type==="reformer"?"teal":"coral"}/>
                    <button onClick={()=>removeFromFlow(ser.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.coral,padding:"2px 4px",flexShrink:0}}><Icon name="x" size={13}/></button>
                  </div>
                ))}
                {(()=>{ const total=seriesList.reduce((acc,s)=>{ const d=parseDuration(s)??s.duration??null; return d!==null?acc+d:acc; },0); if(!total)return null; const m=Math.floor(total/60),s=total%60; return <div style={{fontSize:11,color:C.mist,marginTop:6,fontWeight:600}}>Duração estimada: {s>0?`${m}'${String(s).padStart(2,'0')}''`:`${m}'`}</div>; })()}
              </div>
              {/* Available series */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.ink,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Biblioteca disponível</div>
                {flowZones.length>0&&(
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>
                    <button onClick={()=>setFlowZoneFilter("all")} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,border:`1px solid ${flowZoneFilter==="all"?C.neutral:C.stone}`,background:flowZoneFilter==="all"?C.neutral:"transparent",color:flowZoneFilter==="all"?C.white:C.mist,cursor:"pointer"}}>Todas</button>
                    {flowZones.map(z=>(
                      <button key={z} onClick={()=>setFlowZoneFilter(p=>p===z?"all":z)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,border:`1px solid ${flowZoneFilter===z?C.neutral:C.stone}`,background:flowZoneFilter===z?C.neutral:"transparent",color:flowZoneFilter===z?C.white:C.mist,cursor:"pointer"}}>{z}</button>
                    ))}
                  </div>
                )}
                {availableFlowFiltered.map(ser=>(
                  <div key={ser.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:C.cream,borderRadius:8,border:`1px solid ${C.stone}`,marginBottom:5}}>
                    <span style={{flex:1,fontSize:13,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ser.name}</span>
                    <Badge label={ser.type==="signature"?"✦":ser.type==="reformer"?"R":"B"} color={ser.type==="signature"?"gold":ser.type==="reformer"?"teal":"coral"}/>
                    <Btn small variant="ghost" onClick={()=>addToFlow(ser.id)}><Icon name="plus" size={12}/></Btn>
                  </div>
                ))}
                {availableFlowFiltered.length===0&&<div style={{color:C.mist,fontSize:13}}>{flowZoneFilter!=="all"?"Nenhuma série com esta zona.":"Todas as séries disponíveis foram adicionadas."}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Series */}
        <div className="print-series-grid">
        {seriesList.map((ser,idx)=>(
          <div key={ser.id} className="print-series-card" style={{marginBottom:16,pageBreakInside:"avoid"}}>
            {editingId===ser.id ? (
              <SeriesEditor series={ser} onSave={saveEdit} onCancel={()=>{ setEditingId(null); onSeriesEditChange?.(null); }} aiStyle={aiStyle} studioSettings={studioSettings} availableZones={studioSettings?.zones?.length?studioSettings.zones:undefined}/>
            ) : (
              <AulaSeriesCard ser={ser} idx={idx} isSig={isSig}
                modR={modR} modB={modB} setModR={setModR} setModB={setModB}
                showSetup={showSetup} showIntro={showIntro} showCues={showCues} showInstrNotes={showInstrNotes}
                showTiming={showTiming} showLyric={showLyric}
                aiStyle={aiStyle}
                onEdit={()=>{ setEditingId(ser.id); onSeriesEditChange?.(ser); }}
                onUpdateSeries={onUpdateSeries}
                setSeriesList={setSeriesList}
                MovTable={MovTable}
                teachingMode={teachingMode}
              />

            )}
          </div>
        ))}
        </div>
      </div>
      {forkModal&&<ForkModal seriesName={forkModal.updated.name} classCount={forkModal.classCount}
        onApplyAll={()=>{ onUpdateSeries(forkModal.updated); setSeriesList(p=>p.map(s=>s.id===forkModal.updated.id?forkModal.updated:s)); setEditingId(null); setForkModal(null); }}
        onFork={()=>{ const forked={...forkModal.updated,id:`s-${Date.now()}`,name:forkModal.updated.name+' (versão)'}; onSaveFork?.(forked,cls.id,forkModal.updated.id); setSeriesList(p=>p.map(s=>s.id===forkModal.updated.id?forked:s)); setEditingId(null); setForkModal(null); }}
        onCancel={()=>setForkModal(null)}/>}
    </div>
  );
};

// ─── AI CLASS BUILDER ─────────────────────────────────────────────────────────
const DEFAULT_STUDIO_CLASS_TYPES = ['Reformer', 'Matwork', 'Barre', 'Cycling'];
const DEFAULT_CLASS_LEVELS = ['foundations', 'intermediate', 'advanced', 'flow', 'dynamic'];
const DEFAULT_SERIES_TYPES = ['Warm-up', 'Força', 'Cardio', 'Flow', 'Mobilidade', 'Cool-down'];
const DEFAULT_STUDIO_ZONES = ['Glutes', 'Hamstrings', 'Quads', 'Inner Thighs', 'Calves', 'Core', 'Back', 'Arms', 'Shoulders', 'Chest', 'Full Body', 'Cardio', 'Warm-Up', 'Mobility', 'Flexibility', 'Balance'];

const AIClassBuilder = ({ available, allSeries, cls, aiStyle, onApply }) => {
  const [open, setOpen] = React.useState(false);
  const [goal, setGoal] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState(null);
  const toast_ = useToast();

  const generate = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setSuggestions(null);
    try {
      const libraryCtx = available.map(s =>
        `id:${s.id} | ${s.name} | ${s.type} | zona:${s.targetZone||'–'} | springs:${s.reformer?.springs||'–'}`
      ).join('\n');
      const systemPrompt = [
        'You are an expert Pilates instructor assistant for The Haven studio.',
        aiStyle ? `Instructor style: ${aiStyle}` : '',
      ].filter(Boolean).join('\n');
      const userPrompt = `Build a ${cls.type} class for this goal: "${goal.trim()}"

Available series (id | name | type | zone | springs):
${libraryCtx}

Return a JSON array (max 10 items) ordered for the class flow:
[{"id":"<series-id>","reason":"<1 line reason>"}]
Only use IDs from the available list. Return only the JSON array, no explanation.`;

      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages: [{ role: 'user', content: userPrompt }], max_tokens: 1500 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const text = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);
      const availIds = new Set(available.map(s => s.id));
      setSuggestions(parsed.filter(x => x.id && availIds.has(x.id)));
    } catch (e) {
      toast_?.('Erro ao gerar sugestão: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return (
    <div onClick={() => setOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: `${C.blue}20`, border: `1px solid ${C.blue}50`, borderRadius: 10, marginBottom: 12, cursor: 'pointer' }}>
      <span style={{ fontSize: 14, color: '#1a4a7a' }}>✦</span>
      <span style={{ fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 13, color: '#1a4a7a', flex: 1 }}>Sugerir séries com IA</span>
      <span style={{ fontSize: 12, color: '#1a4a7a' }}>↓</span>
    </div>
  );

  return (
    <div style={{ background: `${C.blue}20`, border: `1px solid ${C.blue}50`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: '#1a4a7a' }}>✦</span>
        <span style={{ fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 13, color: '#1a4a7a', flex: 1 }}>Sugerir séries com IA</span>
        <button onClick={() => { setOpen(false); setSuggestions(null); setGoal(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#1a4a7a', fontWeight: 600, fontFamily: "'Satoshi',sans-serif" }}>Fechar ↑</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: suggestions ? 12 : 0 }}>
        <input
          value={goal} onChange={e => setGoal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && goal.trim() && generate()}
          placeholder="Descreve o objetivo da aula (ex: cardio de glúteos, força para iniciantes…)"
          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${C.blue}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none', background: C.white }}
        />
        <button onClick={generate} disabled={loading || !goal.trim()} style={{
          padding: '9px 18px', borderRadius: 8, border: 'none',
          background: loading || !goal.trim() ? C.stone : '#1a4a7a',
          color: C.white, fontWeight: 700, fontSize: 13,
          cursor: loading || !goal.trim() ? 'not-allowed' : 'pointer',
          fontFamily: "'Satoshi',sans-serif", whiteSpace: 'nowrap',
        }}>
          {loading ? 'A gerar…' : '✦ Gerar'}
        </button>
      </div>
      {suggestions && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a4a7a', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
              Sugestão — {suggestions.length} série{suggestions.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => onApply(suggestions.map(x => x.id))} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', background: '#1a4a7a',
              color: C.white, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif",
            }}>Adicionar todas</button>
          </div>
          {suggestions.map((sug, i) => {
            const ser = allSeries.find(s => s.id === sug.id);
            if (!ser) return null;
            return (
              <div key={sug.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: C.white, borderRadius: 8, border: `1px solid ${C.blue}40`, marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.mist, minWidth: 20 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{ser.name}</div>
                  {sug.reason && <div style={{ fontSize: 11, color: C.mist, marginTop: 1 }}>{sug.reason}</div>}
                </div>
                <Badge label={ser.type} color={ser.type === 'reformer' ? 'teal' : ser.type === 'barre' ? 'coral' : 'gold'} />
                <button onClick={() => onApply([sug.id])} style={{
                  background: 'none', border: `1px solid ${C.blue}`, borderRadius: 6,
                  padding: '4px 10px', cursor: 'pointer', color: '#1a4a7a',
                  fontSize: 11, fontWeight: 600, fontFamily: "'Satoshi',sans-serif",
                }}>+ Adicionar</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── CLASS BUILDER ────────────────────────────────────────────────────────────
const ClassBuilder = ({ allSeries, classes, onSave, onDeleteClass, onViewAula, studioSettings, onPublishClass, hasStudio, onToggleClassPublic, onSendClass }) => {
  const [creating, setCreating] = useState(false);
  const [newCls, setNewCls] = useState(null);
  const [classSearch, setClassSearch] = useState("");
  const [classLevelFilter, setClassLevelFilter] = useState("");
  const classLevels = studioSettings?.class_levels || DEFAULT_CLASS_LEVELS;

  const startCreate = type => {
    setNewCls({ id:`c-${Date.now()}`, name:"", type, date:new Date().toISOString().split("T")[0], seriesIds:[], notes:"", level:"" });
    setCreating(true);
  };
  const handleCreate = () => { onSave(newCls); onViewAula(newCls); setCreating(false); setNewCls(null); };

  if (creating && newCls) return (
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:540}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <Btn variant="ghost" small onClick={()=>setCreating(false)}><Icon name="back" size={13}/></Btn>
        <h3 style={{fontFamily:"'Clash Display', sans-serif",fontSize:22,fontWeight:500,color:C.crimson,margin:0,flex:1}}>
          Nova aula {newCls.type==="signature"?"Signature":newCls.type==="reformer"?"Reformer":"Barre"}
        </h3>
      </div>
      <Field label="Nome da aula" val={newCls.name} onChange={v=>setNewCls(p=>({...p,name:v}))} placeholder="ex. Cardio Flow Quarta"/>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4}}>Data</label>
        <input type="date" value={newCls.date} onChange={e=>setNewCls(p=>({...p,date:e.target.value}))} style={{width:"100%",fontFamily:"'Satoshi', sans-serif",fontSize:13,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",boxSizing:"border-box"}}/>
      </div>
      <div>
        <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:6}}>Nível</label>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {classLevels.map(lvl=>(
            <button key={lvl} onClick={()=>setNewCls(p=>({...p,level:p.level===lvl?"":lvl}))}
              style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,
                border:`1px solid ${newCls.level===lvl?C.neutral:C.stone}`,
                background:newCls.level===lvl?C.neutral:"transparent",
                color:newCls.level===lvl?C.white:C.mist,cursor:"pointer"}}>
              {lvl}
            </button>
          ))}
        </div>
      </div>
      <Btn onClick={handleCreate} style={{alignSelf:"flex-start"}}><Icon name="plus" size={14}/> Criar e começar a aula</Btn>
    </div>
  );

  const filteredClasses = classes.filter(c=>{
    if(classSearch && !c.name.toLowerCase().includes(classSearch.toLowerCase())) return false;
    if(classLevelFilter && c.level!==classLevelFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <Btn onClick={()=>startCreate("reformer")}><Icon name="plus" size={14}/> Nova aula Reformer</Btn>
        <Btn variant="ghost" onClick={()=>startCreate("barre")}><Icon name="plus" size={14}/> Nova aula Barre</Btn>
        <Btn variant="ghost" onClick={()=>startCreate("signature")} style={{borderColor:C.sig,color:"#7a4010"}}><Icon name="plus" size={14}/> Nova Signature</Btn>
        <div style={{flex:1}}/>
        <input value={classSearch} onChange={e=>setClassSearch(e.target.value)} placeholder="Pesquisar aulas…"
          style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"6px 14px",borderRadius:20,border:`1px solid ${C.stone}`,outline:"none",width:180}}/>
      </div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
        <button onClick={()=>setClassLevelFilter("")} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 12px",borderRadius:20,border:`1px solid ${!classLevelFilter?C.neutral:C.stone}`,background:!classLevelFilter?C.neutral:"transparent",color:!classLevelFilter?C.white:C.mist,cursor:"pointer"}}>Todos</button>
        {classLevels.map(lvl=>(
          <button key={lvl} onClick={()=>setClassLevelFilter(p=>p===lvl?"":lvl)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 12px",borderRadius:20,border:`1px solid ${classLevelFilter===lvl?C.neutral:C.stone}`,background:classLevelFilter===lvl?C.neutral:"transparent",color:classLevelFilter===lvl?C.white:C.mist,cursor:"pointer"}}>{lvl}</button>
        ))}
      </div>
      {filteredClasses.length===0&&<div style={{textAlign:"center",color:C.mist,padding:40,fontSize:14}}>{classes.length===0?"Ainda não há aulas criadas.":"Nenhuma aula encontrada."}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filteredClasses.map(c=>(
          <div key={c.id} onClick={()=>onViewAula(c)} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer",transition:"border-color 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.neutral}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.stone}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:18,fontWeight:500,color:C.ink}}>{c.name||"Sem nome"}</div>
              <div style={{fontSize:12,color:C.mist,marginTop:2}}>{c.date} · {c.seriesIds.length} série{c.seriesIds.length!==1?"s":""}{c.level?` · ${c.level}`:""}</div>
            </div>
            <Badge label={c.type==="signature"?"✦ Signature":c.type} color={c.type==="signature"?"gold":c.type==="reformer"?"teal":"coral"}/>
            {c.visibility==='pending_studio'&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#fef9ec",color:"#b45309",border:"1px solid #fcd34d"}}>⏳ Em revisão</span>}
            {hasStudio&&c.visibility==='personal'&&onPublishClass&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onPublishClass(c);}} title="Submeter para revisão do studio" style={{color:"#1a56db"}}>↑ Studio</Btn>}
            {onToggleClassPublic&&<button onClick={e=>{e.stopPropagation();onToggleClassPublic(c);}} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,border:`1px solid ${c.visibility==='public'?C.crimson:C.stone}`,background:"transparent",color:c.visibility==='public'?C.crimson:C.mist,cursor:"pointer"}}>{c.visibility==='public'?'🌐 Pública':'🔒 Privada'}</button>}
            {onSendClass&&<Btn small variant="ghost" onClick={e=>{e.stopPropagation();onSendClass({...c,_discoverType:'class'});}} style={{color:C.mist}}>Enviar →</Btn>}
            <Btn small onClick={e=>{e.stopPropagation();onViewAula(c);}}><Icon name="eye" size={13}/> Ver Aula</Btn>
            <button onClick={e=>{e.stopPropagation();onDeleteClass(c.id);}} title="Apagar aula" style={{background:"none",border:`1px solid ${C.stone}`,borderRadius:8,cursor:"pointer",color:C.coral,padding:"6px 8px",display:"inline-flex",alignItems:"center"}}><Icon name="x" size={13}/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── AI STYLE PANEL ───────────────────────────────────────────────────────────
const AiStylePanel = ({ value, onChange }) => {
  const [open,  setOpen]  = React.useState(false);
  const [draft, setDraft] = React.useState(value||"");
  const ref = React.useRef(null);
  const hasStyle = value && value.trim().length > 0;

  React.useEffect(()=>{ if(!open) setDraft(value||""); }, [value, open]);

  // Close on outside click
  React.useEffect(()=>{
    if(!open) return;
    const handler = e => { if(ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{position:'relative'}}>
      {/* Nav button */}
      <button onClick={()=>setOpen(p=>!p)} style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'6px 13px', borderRadius:6, border:'none', cursor:'pointer',
        background: open ? `rgba(255,255,255,0.2)` : hasStyle ? `rgba(255,255,255,0.12)` : 'transparent',
        color: hasStyle ? C.cream : `${C.cream}70`,
        fontFamily:"'Satoshi', sans-serif", fontSize:12, fontWeight:600,
        transition:'all 0.15s',
      }}>
        <Icon name="brain" size={13}/>
        <span>Estilo IA</span>
        {hasStyle && <span style={{width:6,height:6,borderRadius:'50%',background:C.blue,flexShrink:0}}/>}
      </button>

      {/* Popover */}
      {open&&(
        <div style={{
          position:'absolute', top:'calc(100% + 10px)', right:0, zIndex:500,
          background:C.white, borderRadius:14, border:`1px solid ${C.stone}`,
          boxShadow:'0 8px 32px rgba(41,35,35,0.15)', width:360, padding:20,
        }}>
          {/* Arrow */}
          <div style={{position:'absolute',top:-6,right:18,width:12,height:12,
            background:C.white,border:`1px solid ${C.stone}`,borderBottom:'none',borderRight:'none',
            transform:'rotate(45deg)'}}/>
          <p style={{fontFamily:"'Clash Display', sans-serif",fontSize:13,fontWeight:500,color:C.crimson,margin:'0 0 6px'}}>
            Estilo de ensino
          </p>
          <p style={{fontSize:12,color:C.mist,margin:"0 0 10px",lineHeight:1.55}}>
            Descreve a tua língua, energia, estilo de cues. A IA usa isto sempre que gera texto.
          </p>
          <AutoTextarea value={draft} onChange={e=>setDraft(e.target.value)} minRows={4}
            placeholder="ex. Ensino em português, energia alta, cues curtos e motivadores, metáforas visuais…"
            style={{fontSize:13,color:C.ink,padding:"8px 12px",borderRadius:8,
              border:`1px solid ${C.stone}`,background:C.cream}}/>
          <div style={{display:"flex",gap:8,marginTop:12,justifyContent:"flex-end"}}>
            <Btn small variant="ghost" onClick={()=>setOpen(false)}>Cancelar</Btn>
            <Btn small onClick={()=>{onChange(draft);setOpen(false);}}><Icon name="check" size={13}/> Guardar</Btn>
          </div>
        </div>
      )}
    </div>
  );
};


// ─── MOVEMENT LIBRARY PAGE ────────────────────────────────────────────────────
const MovementLibraryPage = ({ series, onUpdateSeries, aiStyle }) => {
  const [search, setSearch] = React.useState("");
  const [expandedMovs, setExpandedMovs] = React.useState(new Set());
  const [editingFields, setEditingFields] = React.useState({});
  const toast_ = useToast();

  // Deduplicated movements with notes aggregated and seriesRefs collected
  const movements = React.useMemo(()=>{
    const map = new Map();
    series.forEach(s=>{
      const add = (movs, sideKey, type) => (movs||[]).forEach((m,idx)=>{
        if(!m.movement) return;
        const key = m.movement.toLowerCase().trim();
        if(!map.has(key)) map.set(key, { movement:m.movement, notes:new Set(), breath:new Set(), series:new Set(), types:new Set(), refs:[] });
        const e = map.get(key);
        if(m.notes) m.notes.split(/[.;·]/).map(n=>n.trim()).filter(Boolean).forEach(n=>e.notes.add(n));
        if(m.breath?.trim()) e.breath.add(m.breath.trim());
        e.series.add(s.name);
        e.types.add(type);
        e.refs.push({ seriesId: s.id, sideKey, movIndex: idx });
      });
      add(s.reformer?.movements, "reformer", s.type==="barre"?"barre":"reformer");
      if(s.type==="signature"||s.type==="barre") add(s.barre?.movements, "barre", "barre");
    });
    return [...map.values()].sort((a,b)=>a.movement.localeCompare(b.movement,"pt"));
  }, [series]);

  const filtered = search
    ? movements.filter(m=>m.movement.toLowerCase().includes(search.toLowerCase()))
    : movements;

  const typeColor = t => t==="reformer"?C.reformer:t==="barre"?"#c0507a":C.sig;

  const toggleExpand = key => setExpandedMovs(prev => { const s=new Set(prev); s.has(key)?s.delete(key):s.add(key); return s; });

  const saveEdit = async (movKey, refs) => {
    const fields = editingFields[movKey] ?? {};
    const newName = (fields.name ?? '').trim();
    const newBreath = (fields.breath ?? '').trim();
    const newNotes = (fields.notes ?? '').trim();
    if (!newName) { toast_?.('O nome não pode estar vazio', 'error'); return; }
    try {
      const bySeries = {};
      refs.forEach(r => { if(!bySeries[r.seriesId]) bySeries[r.seriesId]=[]; bySeries[r.seriesId].push(r); });
      for (const [seriesId, seriesRefs] of Object.entries(bySeries)) {
        const s = series.find(x => x.id === seriesId);
        if (!s) continue;
        let updated = { ...s };
        seriesRefs.forEach(r => {
          const side = updated[r.sideKey];
          if (!side?.movements) return;
          const movs = [...side.movements];
          movs[r.movIndex] = { ...movs[r.movIndex], movement: newName, breath: newBreath, notes: newNotes };
          updated = { ...updated, [r.sideKey]: { ...side, movements: movs } };
        });
        await onUpdateSeries(updated);
      }
      toast_?.('Guardado');
      toggleExpand(movKey);
    } catch(e) {
      console.error('saveEdit failed:', e);
      toast_?.('Erro ao guardar', 'error');
    }
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:26,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Biblioteca de Movimentos</h2>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar…"
          style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"8px 14px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",background:C.white,width:220}}/>
      </div>
      <div style={{fontSize:12,color:C.mist,marginBottom:16}}>{filtered.length} movimento{filtered.length!==1?"s":""}</div>
      <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{background:"#f0e8e4"}}>
              <th style={{textAlign:"left",padding:"10px 16px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Movimento</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipo</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Respiração</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Notas</th>
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Séries</th>
              <th style={{width:40}}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m,i)=>{
              const movKey = m.movement.toLowerCase().trim();
              const isExpanded = expandedMovs.has(movKey);
              const aggregatedNotes = [...m.notes].join(' · ');
              return (
                <React.Fragment key={m.movement}>
                  <tr style={{borderTop:`1px solid ${C.stone}`,background:i%2===0?C.white:`${C.cream}80`}}>
                    <td style={{padding:"10px 16px",fontWeight:600,color:C.ink,verticalAlign:"top"}}>
                      {m.movement}
                    </td>
                    <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {[...m.types].map(t=>(
                          <span key={t} style={{fontSize:10,fontWeight:700,color:typeColor(t),background:`${typeColor(t)}15`,border:`1px solid ${typeColor(t)}40`,borderRadius:20,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:12,color:C.mist,fontStyle:"italic"}}>
                      {[...m.breath].join(" · ")}
                    </td>
                    <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:12,color:C.mist,maxWidth:200}}>
                      {aggregatedNotes}
                    </td>
                    <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:11,color:C.mist}}>
                      {[...m.series].join(", ")}
                    </td>
                    <td style={{padding:"6px 12px",verticalAlign:"top",textAlign:"right"}}>
                      <button onClick={()=>{ if(!isExpanded) setEditingFields(p=>({...p,[movKey]:{ name:m.movement, breath:[...m.breath].join(' · '), notes:aggregatedNotes }})); toggleExpand(movKey); }}
                        title={isExpanded?"Fechar":"Editar notas"}
                        style={{background:"none",border:"none",cursor:"pointer",color:C.mist,fontSize:13,padding:"2px 6px",borderRadius:6,fontFamily:"'Satoshi',sans-serif",lineHeight:1}}>
                        {isExpanded?'✕':'✎'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded&&(
                    <tr style={{background:i%2===0?`${C.cream}60`:`${C.stone}30`,borderBottom:`1px solid ${C.stone}`}}>
                      <td colSpan={6} style={{padding:"10px 16px 16px"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr",gap:10,marginBottom:10}}>
                          <div>
                            <label style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>Nome</label>
                            <input value={editingFields[movKey]?.name??""} onChange={e=>setEditingFields(p=>({...p,[movKey]:{...p[movKey],name:e.target.value}}))} style={{width:"100%",fontFamily:"'Satoshi',sans-serif",fontSize:13,color:C.ink,border:`1px solid ${C.stone}`,borderRadius:6,padding:"6px 10px",outline:"none",boxSizing:"border-box"}}/>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>Respiração</label>
                            <input value={editingFields[movKey]?.breath??""} onChange={e=>setEditingFields(p=>({...p,[movKey]:{...p[movKey],breath:e.target.value}}))} style={{width:"100%",fontFamily:"'Satoshi',sans-serif",fontSize:13,color:C.ink,border:`1px solid ${C.stone}`,borderRadius:6,padding:"6px 10px",outline:"none",boxSizing:"border-box"}}/>
                          </div>
                          <div>
                            <label style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>Notas</label>
                            <textarea value={editingFields[movKey]?.notes??""} onChange={e=>setEditingFields(p=>({...p,[movKey]:{...p[movKey],notes:e.target.value}}))} rows={2} style={{width:"100%",fontFamily:"'Satoshi',sans-serif",fontSize:12,color:C.ink,border:`1px solid ${C.stone}`,borderRadius:8,padding:"8px 12px",outline:"none",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>saveEdit(movKey,m.refs)} style={{padding:"6px 16px",borderRadius:8,border:"none",background:"#721919",color:"#FFFAF7",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>Guardar</button>
                          <button onClick={()=>toggleExpand(movKey)} style={{padding:"6px 16px",borderRadius:8,border:`1px solid ${C.stone}`,background:"transparent",color:C.ink,fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>Cancelar</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{padding:40,textAlign:"center",color:C.mist}}>Nenhum movimento encontrado.</div>}
      </div>
    </div>
  );
};


// ─── STUDIO PAGE ─────────────────────────────────────────────────────────────
const ProfilePage = ({ profile, user, onProfileUpdate, studioSettings, aiStyle, onAiStyleChange, series=[], onSaveSeries }) => {
  const [editName, setEditName] = useState(profile?.name || '');
  const [editPrefZones, setEditPrefZones] = useState(profile?.settings?.preferred_zones || []);
  const [editPrefClassTypes, setEditPrefClassTypes] = useState(profile?.settings?.class_types || []);
  const [editPrefLevels, setEditPrefLevels] = useState(profile?.settings?.preferred_levels || []);
  const [editSeriesTypes, setEditSeriesTypes] = useState(profile?.settings?.series_types || []);
  const [newPrefZone, setNewPrefZone] = useState('');
  const [newPrefClassType, setNewPrefClassType] = useState('');
  const [newPrefLevel, setNewPrefLevel] = useState('');
  const [newSeriesType, setNewSeriesType] = useState('');
  const [isPublic, setIsPublic] = useState(profile?.is_public || false);
  const [saving, setSaving] = useState(false);
  const [aiLang, setAiLang] = useState('');
  const [aiTone, setAiTone] = useState('');
  const [aiCueStyle, setAiCueStyle] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const toast_ = useToast();
  const confirm_ = useConfirm();

  const removeZone = async (z) => {
    const affected = series.filter(s => (s.targetZone||"").split(",").map(x=>x.trim()).includes(z));
    if (affected.length > 0) {
      const also = await confirm_(`${affected.length} série${affected.length!==1?"s":""} ${affected.length===1?"tem":"têm"} a zona "${z}". Remover também das séries?`, { confirmLabel: "Remover das séries", cancelLabel: "Só da lista" });
      if (also) {
        affected.forEach(s => {
          const zones = (s.targetZone||"").split(",").map(x=>x.trim()).filter(x=>x!==z);
          const primaryZone = s.primaryZone===z ? (zones[0]||"") : s.primaryZone;
          onSaveSeries?.({...s, targetZone: zones.join(", "), primaryZone});
        });
      }
    }
    setEditPrefZones(p => p.filter(x => x !== z));
  };

  const removeSeriesType = async (t) => {
    const affected = series.filter(s => s.seriesType===t);
    if (affected.length > 0) {
      const also = await confirm_(`${affected.length} série${affected.length!==1?"s":""} ${affected.length===1?"tem":"têm"} o tipo "${t}". Remover também das séries?`, { confirmLabel: "Remover das séries", cancelLabel: "Só da lista" });
      if (also) {
        affected.forEach(s => onSaveSeries?.({...s, seriesType: ""}));
      }
    }
    setEditSeriesTypes(p => p.filter(x => x !== t));
  };

  useEffect(() => { if (aiStyle) setAiNotes(aiStyle); }, []);

  useEffect(() => {
    setEditName(profile?.name || '');
    setEditPrefZones(profile?.settings?.preferred_zones || []);
    setEditPrefClassTypes(profile?.settings?.class_types || []);
    setEditPrefLevels(profile?.settings?.preferred_levels || []);
    setEditSeriesTypes(profile?.settings?.series_types || []);
  }, [profile]);

  const save = async () => {
    setSaving(true);
    const assembled = [aiLang&&`Ensina em ${aiLang}`, aiTone&&`tom ${aiTone.toLowerCase()}`, aiCueStyle&&`cues ${aiCueStyle.toLowerCase()}`, aiNotes.trim()].filter(Boolean).join('. ');
    onAiStyleChange?.(assembled);
    const { error } = await supabase.from('profiles').update({
      name: editName,
      is_public: isPublic,
      settings: { ...(profile?.settings || {}), preferred_zones: editPrefZones, class_types: editPrefClassTypes, preferred_levels: editPrefLevels, series_types: editSeriesTypes },
    }).eq('id', profile.id);
    setSaving(false);
    if (!error) {
      toast_?.('Perfil guardado');
      const updated = await api.loadProfile(user.id);
      onProfileUpdate(updated);
    } else {
      toast_?.('Erro ao guardar perfil');
    }
  };

  const classLevelOptions = studioSettings?.class_levels || DEFAULT_CLASS_LEVELS;

  const PillRow = ({ items, onRemove, newVal, onNewVal, onAdd, placeholder }) => (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {items.map(z => (
          <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: C.cream, border: `1px solid ${C.stone}`, fontSize: 13, fontWeight: 500, color: C.ink, fontFamily: "'Satoshi',sans-serif" }}>
            {z}
            <button onClick={() => onRemove(z)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mist, fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newVal} onChange={e => onNewVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onAdd(); }}
          placeholder={placeholder} style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
        <button onClick={onAdd} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontFamily:"'Clash Display',sans-serif", fontSize: 22, fontWeight: 500, color: C.crimson, marginBottom: 20 }}>O meu perfil</h2>
      <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Nome */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Nome</div>
          <input value={editName} onChange={e => setEditName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Email */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Email</div>
          <div style={{ fontSize: 14, color: C.mist, padding: '8px 0' }}>{user?.email}</div>
        </div>

        {/* Zones */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Zonas target (corpo)</div>
          <PillRow items={editPrefZones} onRemove={removeZone}
            newVal={newPrefZone} onNewVal={setNewPrefZone} placeholder="Adicionar zona…"
            onAdd={() => { const v = newPrefZone.trim(); if (v && !editPrefZones.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditPrefZones(p => [...p, v]); setNewPrefZone(''); } }} />
        </div>

        {/* Series Types */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Tipos de série</div>
          <PillRow items={editSeriesTypes} onRemove={removeSeriesType}
            newVal={newSeriesType} onNewVal={setNewSeriesType} placeholder="ex. Warm-up, Força, Flow…"
            onAdd={() => { const v = newSeriesType.trim(); if (v && !editSeriesTypes.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditSeriesTypes(p => [...p, v]); setNewSeriesType(''); } }} />
          {editSeriesTypes.length===0&&<div style={{fontSize:11,color:C.mist,marginTop:4}}>Sem tipos personalizados — usa os padrões: {DEFAULT_SERIES_TYPES.join(', ')}</div>}
        </div>

        {/* Class Types */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Tipos de aula</div>
          <PillRow items={editPrefClassTypes} onRemove={t => setEditPrefClassTypes(p => p.filter(x => x !== t))}
            newVal={newPrefClassType} onNewVal={setNewPrefClassType} placeholder="Adicionar tipo…"
            onAdd={() => { const v = newPrefClassType.trim(); if (v && !editPrefClassTypes.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditPrefClassTypes(p => [...p, v]); setNewPrefClassType(''); } }} />
        </div>

        {/* Levels */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Níveis</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {classLevelOptions.map(lvl => {
              const active = editPrefLevels.includes(lvl);
              return (
                <button key={lvl} onClick={() => setEditPrefLevels(p => active ? p.filter(x => x !== lvl) : [...p, lvl])}
                  style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? C.crimson : C.stone}`, background: active ? `${C.crimson}15` : 'transparent', color: active ? C.crimson : C.mist, fontWeight: active ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>
                  {lvl}
                </button>
              );
            })}
          </div>
          <PillRow items={editPrefLevels.filter(l => !classLevelOptions.includes(l))}
            onRemove={l => setEditPrefLevels(p => p.filter(x => x !== l))}
            newVal={newPrefLevel} onNewVal={setNewPrefLevel} placeholder="Adicionar nível personalizado…"
            onAdd={() => { const v = newPrefLevel.trim(); if (v && !editPrefLevels.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditPrefLevels(p => [...p, v]); setNewPrefLevel(''); } }} />
        </div>

        {/* Visibilidade */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Visibilidade do perfil</div>
          <p style={{fontSize:13,color:C.mist,marginBottom:10,margin:'0 0 10px'}}>Torna o teu perfil público para que outros Instrutores te possam enviar conteúdo diretamente e encontrar-te no Descobrir.</p>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}>
            <input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} style={{width:16,height:16,cursor:"pointer",accentColor:C.crimson}}/>
            <span style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,fontWeight:600,color:C.ink}}>Perfil público</span>
          </label>
        </div>

        {/* AI Style */}
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Estilo de ensino para IA</div>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:12}}>
            <div>
              <div style={{fontSize:12,color:C.mist,marginBottom:6,fontWeight:600}}>Língua de ensino</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['Português','Inglês','Bilingue'].map(l=>(
                  <button key={l} onClick={()=>setAiLang(p=>p===l?'':l)} style={{padding:'5px 14px',borderRadius:20,border:`1px solid ${aiLang===l?C.crimson:C.stone}`,background:aiLang===l?`${C.crimson}15`:'transparent',color:aiLang===l?C.crimson:C.mist,fontWeight:aiLang===l?700:500,fontSize:13,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.mist,marginBottom:6,fontWeight:600}}>Tom</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['Energético','Calmo','Técnico','Motivacional'].map(t=>(
                  <button key={t} onClick={()=>setAiTone(p=>p===t?'':t)} style={{padding:'5px 14px',borderRadius:20,border:`1px solid ${aiTone===t?C.crimson:C.stone}`,background:aiTone===t?`${C.crimson}15`:'transparent',color:aiTone===t?C.crimson:C.mist,fontWeight:aiTone===t?700:500,fontSize:13,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.mist,marginBottom:6,fontWeight:600}}>Estilo de cues</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['Curtos e directos','Detalhados','Metáforas visuais'].map(s=>(
                  <button key={s} onClick={()=>setAiCueStyle(p=>p===s?'':s)} style={{padding:'5px 14px',borderRadius:20,border:`1px solid ${aiCueStyle===s?C.crimson:C.stone}`,background:aiCueStyle===s?`${C.crimson}15`:'transparent',color:aiCueStyle===s?C.crimson:C.mist,fontWeight:aiCueStyle===s?700:500,fontSize:13,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>{s}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:12,color:C.mist,marginBottom:6,fontWeight:600}}>Notas livres</div>
              <textarea value={aiNotes} onChange={e=>setAiNotes(e.target.value)} placeholder="ex. nunca cues de perda de peso, usa sempre nomes em português…" rows={3} style={{width:'100%',fontFamily:"'Satoshi',sans-serif",fontSize:13,color:C.ink,border:`1px solid ${C.stone}`,borderRadius:8,padding:'8px 12px',outline:'none',resize:'vertical',boxSizing:'border-box',lineHeight:1.5}}/>
            </div>
            {(aiLang||aiTone||aiCueStyle||aiNotes.trim())&&(
              <div style={{background:C.cream,border:`1px solid ${C.stone}`,borderRadius:8,padding:'10px 14px',fontSize:12,color:C.mist}}>
                <span style={{fontWeight:700,color:C.ink}}>Preview: </span>
                {[aiLang&&`Ensina em ${aiLang}`,aiTone&&`tom ${aiTone.toLowerCase()}`,aiCueStyle&&`cues ${aiCueStyle.toLowerCase()}`,aiNotes.trim()].filter(Boolean).join('. ')}
              </div>
            )}
          </div>
        </div>

        <button onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', padding: '9px 24px', borderRadius: 8, border: 'none', background: saving ? C.stone : C.crimson, color: C.cream, fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Satoshi',sans-serif" }}>
          {saving ? 'A guardar…' : 'Guardar perfil'}
        </button>
      </div>
    </div>
  );
};

const StudioPage = ({ profile, user, onProfileUpdate, onCopyToLibrary }) => {
  const [activeTab, setActiveTab] = useState('series');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studioSeries, setStudioSeries] = useState([]);
  const [studioClasses, setStudioClasses] = useState([]);
  const [pendingSeries, setPendingSeries] = useState([]);
  const [pendingClasses, setPendingClasses] = useState([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [joinSlug, setJoinSlug] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editClassTypes, setEditClassTypes] = useState([]);
  const [editZones, setEditZones] = useState([]);
  const [editClassLevels, setEditClassLevels] = useState([]);
  const [newClassType, setNewClassType] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newClassLevel, setNewClassLevel] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [editGuidelines, setEditGuidelines] = useState('');
  const toast_ = useToast();
  const confirm_ = useConfirm();

  const studio = profile?.studios;
  const isAdmin = ['admin', 'studio_owner', 'super_admin', 'backoffice_admin'].includes(profile?.role);

  useEffect(() => {
    if (studio?.settings) {
      setEditClassTypes(studio.settings.class_types || DEFAULT_STUDIO_CLASS_TYPES);
      setEditZones(studio.settings.zones || DEFAULT_STUDIO_ZONES);
      setEditClassLevels(studio.settings.class_levels || DEFAULT_CLASS_LEVELS);
      setEditGuidelines(studio.settings.guidelines || '');
    } else {
      setEditClassTypes(DEFAULT_STUDIO_CLASS_TYPES);
      setEditZones(DEFAULT_STUDIO_ZONES);
      setEditClassLevels(DEFAULT_CLASS_LEVELS);
      setEditGuidelines('');
    }
  }, [studio]);

  const saveSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase.from('studios').update({
      settings: { ...(studio?.settings || {}), class_types: editClassTypes, zones: editZones, class_levels: editClassLevels, guidelines: editGuidelines },
    }).eq('id', profile.studio_id);
    setSavingSettings(false);
    if (!error) {
      toast_?.('Definições guardadas');
      const updated = await api.loadProfile(user.id);
      onProfileUpdate(updated);
    } else {
      toast_?.('Erro ao guardar definições');
    }
  };

  useEffect(() => {
    if (!profile?.studio_id) { setLoading(false); return; }
    supabase.from('profiles').select('id, name, role, created_at').eq('studio_id', profile.studio_id)
      .then(({ data }) => { setMembers(data || []); setLoading(false); });
  }, [profile?.studio_id]);

  useEffect(() => {
    if (!profile?.studio_id) return;
    setLoadingContent(true);
    Promise.all([
      supabase.from('series').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'studio'),
      supabase.from('classes').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'studio'),
      ...(isAdmin ? [
        supabase.from('series').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'pending_studio'),
        supabase.from('classes').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'pending_studio'),
      ] : []),
    ]).then(([serRes, clsRes, ...rest]) => {
      setStudioSeries(serRes.data || []);
      setStudioClasses(clsRes.data || []);
      if (isAdmin && rest.length >= 2) {
        setPendingSeries(rest[0].data || []);
        setPendingClasses(rest[1].data || []);
      }
      setLoadingContent(false);
    });
  }, [profile?.studio_id, isAdmin]);

  const refreshContent = () => {
    if (!profile?.studio_id) return;
    Promise.all([
      supabase.from('series').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'studio'),
      supabase.from('classes').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'studio'),
      ...(isAdmin ? [
        supabase.from('series').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'pending_studio'),
        supabase.from('classes').select('*, profiles(name)').eq('studio_id', profile.studio_id).eq('visibility', 'pending_studio'),
      ] : []),
    ]).then(([serRes, clsRes, ...rest]) => {
      setStudioSeries(serRes.data || []);
      setStudioClasses(clsRes.data || []);
      if (isAdmin && rest.length >= 2) {
        setPendingSeries(rest[0].data || []);
        setPendingClasses(rest[1].data || []);
      }
    });
  };

  const approveSeries = async s => {
    await supabase.from('series').update({ visibility: 'studio' }).eq('id', s.id);
    toast_?.('Série aprovada');
    refreshContent();
  };

  const rejectSeries = async s => {
    await supabase.from('series').update({ visibility: 'personal', studio_id: null }).eq('id', s.id);
    toast_?.('Série rejeitada — devolvida ao Instructor');
    refreshContent();
  };

  const approveClass = async c => {
    await supabase.from('classes').update({ visibility: 'studio' }).eq('id', c.id);
    toast_?.('Aula aprovada');
    refreshContent();
  };

  const rejectClass = async c => {
    await supabase.from('classes').update({ visibility: 'personal', studio_id: null }).eq('id', c.id);
    toast_?.('Aula rejeitada — devolvida ao Instructor');
    refreshContent();
  };

  const changeRole = async (memberId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', memberId);
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    toast_?.('Papel actualizado');
  };

  const removeMember = async memberId => {
    if (!await confirm_?.('Remover este membro do studio?', { confirmLabel: 'Remover' })) return;
    await supabase.from('profiles').update({ studio_id: null, role: 'instructor' }).eq('id', memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleJoin = async e => {
    e.preventDefault();
    setJoinError(''); setJoining(true);
    const { data: found } = await supabase.from('studios').select('id, name').eq('slug', joinSlug.trim()).maybeSingle();
    if (!found) { setJoinError('Studio não encontrado. Verifica o código.'); setJoining(false); return; }
    const err = await api.upsertProfile({ id: user.id, studio_id: found.id, role: 'instructor' });
    if (err) { setJoinError(err.message); setJoining(false); return; }
    const updated = await api.loadProfile(user.id);
    onProfileUpdate(updated);
    setJoining(false);
    toast_?.(`Juntaste-te ao studio "${found.name}"`);
  };

  const handleCreate = async e => {
    e.preventDefault();
    const name = joinSlug.trim();
    if (!name) return;
    setJoining(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + user.id.slice(0, 6);
    const { data: studio_, error } = await supabase.from('studios').insert({ name, slug }).select().single();
    if (error) { setJoinError(error.message); setJoining(false); return; }
    await api.upsertProfile({ id: user.id, studio_id: studio_.id, role: 'admin' });
    const updated = await api.loadProfile(user.id);
    onProfileUpdate(updated);
    setJoining(false);
    toast_?.(`Studio "${name}" criado`);
  };

  const copySlug = () => { navigator.clipboard.writeText(studio?.slug || ''); toast_?.('Código copiado'); };

  const generateInvite = async () => {
    const code = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { error } = await supabase.from('invitations').insert({ studio_id: profile.studio_id, code, invited_by: user.id });
    if (error) { toast_?.('Erro ao gerar convite'); return; }
    const link = `${window.location.origin}?invite=${code}`;
    navigator.clipboard.writeText(link);
    toast_?.('Link de convite copiado para a área de transferência');
  };

  if (!profile?.studio_id) return (
    <div style={{ maxWidth: 500, margin: '40px auto' }}>
      <h2 style={{ fontFamily:"'Clash Display',sans-serif", fontSize: 22, fontWeight: 500, color: C.crimson, marginBottom: 4 }}>Studio</h2>
      <p style={{ color: C.mist, fontSize: 13, marginBottom: 24 }}>Ainda não fazes parte de um studio. Cria um novo ou junta-te a um existente.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>Criar novo studio</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8 }}>
            <input value={joinSlug} onChange={e => setJoinSlug(e.target.value)} placeholder="Nome do studio" required style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }}/>
            <button type="submit" disabled={joining} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>Criar</button>
          </form>
        </div>
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 10 }}>Juntar-me a um studio existente</div>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
            <input value={joinSlug} onChange={e => setJoinSlug(e.target.value)} placeholder="Código do studio" required style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }}/>
            <button type="submit" disabled={joining} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>Juntar</button>
          </form>
          {joinError && <div style={{ color: '#b91c1c', fontSize: 12, marginTop: 8 }}>{joinError}</div>}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { key: 'series', label: 'Séries do Studio' },
    { key: 'classes', label: 'Aulas do Studio' },
    { key: 'members', label: 'Membros' },
    ...(isAdmin ? [{ key: 'reviews', label: `Revisões${pendingSeries.length+pendingClasses.length>0?' ('+String(pendingSeries.length+pendingClasses.length)+')':''}` }] : []),
    ...(isAdmin ? [{ key: 'settings', label: 'Definições' }] : []),
  ];

  const TabBtn = ({ tabKey, label }) => (
    <button onClick={() => setActiveTab(tabKey)} style={{
      fontFamily:"'Satoshi',sans-serif", fontSize: 13, fontWeight: activeTab===tabKey ? 700 : 500,
      color: activeTab===tabKey ? C.crimson : C.mist, background: 'none', border: 'none',
      borderBottom: `2px solid ${activeTab===tabKey ? C.crimson : 'transparent'}`,
      padding: '8px 2px', cursor: 'pointer', whiteSpace: 'nowrap',
    }}>{label}</button>
  );

  const typeColor = t => t==='reformer'?C.reformer:t==='barre'?'#c0507a':C.sig;

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily:"'Clash Display',sans-serif", fontSize: 22, fontWeight: 500, color: C.crimson, margin: 0 }}>{studio?.name || 'Studio'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 12, color: C.mist }}>Código:</span>
            <code style={{ fontSize: 12, background: C.stone, padding: '2px 8px', borderRadius: 6, color: C.ink }}>{studio?.slug}</code>
            <button onClick={copySlug} style={{ background: 'none', border: 'none', color: C.crimson, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Copiar</button>
          </div>
        </div>
        {(isAdmin || profile?.role === 'studio_owner') && (
          <button onClick={generateInvite} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: C.crimson, color: C.cream, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif", whiteSpace: 'nowrap' }}>
            + Convidar
          </button>
        )}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 20, borderBottom: `1px solid ${C.stone}`, marginBottom: 24 }}>
        {tabs.map(t => <TabBtn key={t.key} tabKey={t.key} label={t.label}/>)}
      </div>

      {/* ── Séries do Studio ── */}
      {activeTab==='series'&&(
        <div>
          {loadingContent ? <div style={{color:C.mist,fontSize:13}}>A carregar…</div>
          : studioSeries.length===0 ? <div style={{color:C.mist,fontSize:13,padding:'24px 0'}}>Ainda não há séries aprovadas no studio.</div>
          : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
            {studioSeries.map(s=>(
              <div key={s.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:16}}>
                <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:4}}>{s.name}</div>
                <div style={{fontSize:11,color:C.mist,marginBottom:8}}>{s.profiles?.name||'Instructor'}</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                  {s.type&&<span style={{fontSize:10,fontWeight:700,color:typeColor(s.type),background:`${typeColor(s.type)}15`,border:`1px solid ${typeColor(s.type)}40`,borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>{s.type}</span>}
                  {s.primary_zone&&<span style={{fontSize:10,color:C.mist,background:C.stone,borderRadius:20,padding:'2px 8px'}}>{s.primary_zone}</span>}
                </div>
                {onCopyToLibrary&&<button onClick={()=>onCopyToLibrary(s)} style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:`1px solid ${C.stone}`,background:'transparent',color:C.ink,cursor:'pointer',fontFamily:"'Satoshi',sans-serif",fontWeight:600}}>Copiar para a minha biblioteca</button>}
              </div>
            ))}
          </div>}
        </div>
      )}

      {/* ── Aulas do Studio ── */}
      {activeTab==='classes'&&(
        <div>
          {loadingContent ? <div style={{color:C.mist,fontSize:13}}>A carregar…</div>
          : studioClasses.length===0 ? <div style={{color:C.mist,fontSize:13,padding:'24px 0'}}>Ainda não há aulas aprovadas no studio.</div>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {studioClasses.map(c=>(
              <div key={c.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{c.name||'(sem título)'}</div>
                  <div style={{fontSize:11,color:C.mist,marginTop:2}}>{c.profiles?.name||'Instructor'}{c.date&&' · '+c.date}</div>
                </div>
                {c.type&&<span style={{fontSize:10,fontWeight:700,color:typeColor(c.type),background:`${typeColor(c.type)}15`,border:`1px solid ${typeColor(c.type)}40`,borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>{c.type}</span>}
                {c.level&&<span style={{fontSize:10,color:C.mist,background:C.stone,borderRadius:20,padding:'2px 8px'}}>{c.level}</span>}
              </div>
            ))}
          </div>}
        </div>
      )}

      {/* ── Membros ── */}
      {activeTab==='members'&&(
        <div>
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.stone}`, fontWeight: 700, fontSize: 13, color: C.mist, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Membros ({members.length})
            </div>
            {loading ? (
              <div style={{ padding: 24, color: C.mist, fontSize: 13 }}>A carregar…</div>
            ) : members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${C.stone}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.ink }}>{m.name || '(sem nome)'}</div>
                  <div style={{ fontSize: 12, color: C.mist }}>{m.id === user.id ? 'Tu' : ''}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: m.role === 'admin' ? `${C.crimson}18` : C.stone, color: m.role === 'admin' ? C.crimson : C.mist }}>{m.role === 'admin' ? 'Admin' : 'Instructor'}</span>
                {isAdmin && m.id !== user.id && (<>
                  <button onClick={() => changeRole(m.id, m.role === 'admin' ? 'instructor' : 'admin')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>
                    {m.role === 'admin' ? '→ Instructor' : '→ Admin'}
                  </button>
                  <button onClick={() => removeMember(m.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: `1px solid ${C.stone}`, background: 'transparent', color: '#b91c1c', cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>Remover</button>
                </>)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Revisões (admin only) ── */}
      {activeTab==='reviews'&&isAdmin&&(
        <div>
          {loadingContent ? <div style={{color:C.mist,fontSize:13}}>A carregar…</div> : (<>
            {pendingSeries.length===0&&pendingClasses.length===0&&(
              <div style={{color:C.mist,fontSize:13,padding:'24px 0'}}>Nenhuma submissão pendente.</div>
            )}
            {pendingSeries.length>0&&(
              <div style={{marginBottom:24}}>
                <div style={{fontSize:12,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Séries pendentes</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pendingSeries.map(s=>(
                    <div key={s.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{s.name}</div>
                        <div style={{fontSize:11,color:C.mist,marginTop:2}}>{s.profiles?.name||'Instructor'}</div>
                      </div>
                      {s.type&&<span style={{fontSize:10,fontWeight:700,color:typeColor(s.type),background:`${typeColor(s.type)}15`,border:`1px solid ${typeColor(s.type)}40`,borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>{s.type}</span>}
                      <button onClick={()=>approveSeries(s)} style={{fontSize:12,padding:'5px 12px',borderRadius:8,border:'none',background:'#ecfdf5',color:'#059669',fontWeight:700,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>✓ Aprovar</button>
                      <button onClick={()=>rejectSeries(s)} style={{fontSize:12,padding:'5px 12px',borderRadius:8,border:`1px solid ${C.stone}`,background:'transparent',color:'#b91c1c',fontWeight:700,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>✗ Rejeitar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pendingClasses.length>0&&(
              <div>
                <div style={{fontSize:12,fontWeight:700,color:C.mist,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>Aulas pendentes</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {pendingClasses.map(c=>(
                    <div key={c.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:'12px 16px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:14,color:C.ink}}>{c.name||'(sem título)'}</div>
                        <div style={{fontSize:11,color:C.mist,marginTop:2}}>{c.profiles?.name||'Instructor'}{c.date&&' · '+c.date}</div>
                      </div>
                      {c.type&&<span style={{fontSize:10,fontWeight:700,color:typeColor(c.type),background:`${typeColor(c.type)}15`,border:`1px solid ${typeColor(c.type)}40`,borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>{c.type}</span>}
                      {c.level&&<span style={{fontSize:10,color:C.mist,background:C.stone,borderRadius:20,padding:'2px 8px'}}>{c.level}</span>}
                      <button onClick={()=>approveClass(c)} style={{fontSize:12,padding:'5px 12px',borderRadius:8,border:'none',background:'#ecfdf5',color:'#059669',fontWeight:700,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>✓ Aprovar</button>
                      <button onClick={()=>rejectClass(c)} style={{fontSize:12,padding:'5px 12px',borderRadius:8,border:`1px solid ${C.stone}`,background:'transparent',color:'#b91c1c',fontWeight:700,cursor:'pointer',fontFamily:"'Satoshi',sans-serif"}}>✗ Rejeitar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>)}
        </div>
      )}

      {/* ── Definições (admin only) ── */}
      {activeTab==='settings'&&isAdmin&&(
        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: '20px 20px 24px' }}>
          {/* Class Types */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Tipos de Aula</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {editClassTypes.map(t => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: C.cream, border: `1px solid ${C.stone}`, fontSize: 13, fontWeight: 500, color: C.ink, fontFamily: "'Satoshi',sans-serif" }}>
                  {t}
                  <button onClick={() => setEditClassTypes(p => p.filter(x => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mist, fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newClassType} onChange={e => setNewClassType(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { const v = newClassType.trim(); if (v && !editClassTypes.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditClassTypes(p => [...p, v]); setNewClassType(''); } } }}
                placeholder="Adicionar tipo…" style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
              <button onClick={() => { const v = newClassType.trim(); if (v && !editClassTypes.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditClassTypes(p => [...p, v]); setNewClassType(''); } }}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
            </div>
          </div>
          {/* Zones */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Zonas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {editZones.map(z => (
                <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: C.cream, border: `1px solid ${C.stone}`, fontSize: 13, fontWeight: 500, color: C.ink, fontFamily: "'Satoshi',sans-serif" }}>
                  {z}
                  <button onClick={() => setEditZones(p => p.filter(x => x !== z))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mist, fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newZone} onChange={e => setNewZone(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { const v = newZone.trim(); if (v && !editZones.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditZones(p => [...p, v]); setNewZone(''); } } }}
                placeholder="Adicionar zona…" style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
              <button onClick={() => { const v = newZone.trim(); if (v && !editZones.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditZones(p => [...p, v]); setNewZone(''); } }}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
            </div>
          </div>
          {/* Class Levels */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Níveis de Aula</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {editClassLevels.map(lvl => (
                <span key={lvl} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: C.cream, border: `1px solid ${C.stone}`, fontSize: 13, fontWeight: 500, color: C.ink, fontFamily: "'Satoshi',sans-serif" }}>
                  {lvl}
                  <button onClick={() => setEditClassLevels(p => p.filter(x => x !== lvl))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.mist, fontSize: 13, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={newClassLevel} onChange={e => setNewClassLevel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { const v = newClassLevel.trim(); if (v && !editClassLevels.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditClassLevels(p => [...p, v]); setNewClassLevel(''); } } }}
                placeholder="Adicionar nível…" style={{ flex: 1, padding: '7px 12px', borderRadius: 8, border: `1px solid ${C.stone}`, fontFamily: "'Satoshi',sans-serif", fontSize: 13, outline: 'none' }} />
              <button onClick={() => { const v = newClassLevel.trim(); if (v && !editClassLevels.map(x => x.toLowerCase()).includes(v.toLowerCase())) { setEditClassLevels(p => [...p, v]); setNewClassLevel(''); } }}
                style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.stone}`, background: 'transparent', color: C.ink, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: "'Satoshi',sans-serif" }}>+ Adicionar</button>
            </div>
          </div>
          {/* Studio AI Guidelines */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.mist, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Diretrizes para IA</div>
            <div style={{ fontSize: 12, color: C.mist, marginBottom: 8 }}>Descreve o método, equipamento, terminologia e regras do studio. Estas diretrizes são injetadas em todos os prompts de IA dos Instructors do studio.</div>
            <AutoTextarea
              value={editGuidelines}
              onChange={e => setEditGuidelines(e.target.value)}
              placeholder="ex. Usamos método STOTT Pilates. Sempre cue en português europeu. Nunca mencionar perda de peso. O studio tem reformers Balanced Body..."
              style={{ width: '100%', fontSize: 13, minHeight: 100, resize: 'vertical', borderRadius: 8, border: `1px solid ${C.stone}`, padding: '8px 12px', fontFamily: "'Satoshi',sans-serif", color: C.ink, background: C.cream, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={saveSettings} disabled={savingSettings} style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: savingSettings ? C.stone : C.crimson, color: C.cream, fontWeight: 700, fontSize: 13, cursor: savingSettings ? 'not-allowed' : 'pointer', fontFamily: "'Satoshi',sans-serif" }}>
            {savingSettings ? 'A guardar…' : 'Guardar definições'}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── SHARE VIEW (public read-only, no auth required) ─────────────────────────
const ShareView = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.rpc('get_shared_class', { p_token: token }).then(({ data: result, error: err }) => {
      if (err || !result) { setError('Aula não encontrada ou link inválido.'); setLoading(false); return; }
      setData(result);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    const id = 'haven-fonts';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  const wrap = children => (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi',sans-serif" }}>
      <div style={{ background: C.crimson, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <HavenLogo size={26} color={C.cream}/>
        <div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: `${C.cream}70` }}>The Haven</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>Instructor Studio</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: `${C.cream}60` }}>Vista partilhada · só leitura</div>
      </div>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>{children}</div>
    </div>
  );

  if (loading) return wrap(<div style={{ color: C.mist, fontSize: 14, textAlign: 'center', paddingTop: 60 }}>A carregar…</div>);
  if (error)   return wrap(<div style={{ color: C.mist, fontSize: 14, textAlign: 'center', paddingTop: 60 }}>{error}</div>);

  const cls = data;
  const series = (data.series || []).map(seriesFromDB);
  const typeColor = { reformer: C.reformer, barre: '#8a3060', signature: '#7a4010' };

  return wrap(
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 28, fontWeight: 500, color: C.ink }}>{cls.name}</div>
        <div style={{ fontSize: 13, color: C.mist, marginTop: 4 }}>
          {cls.date && <span>{cls.date} · </span>}
          <span style={{ textTransform: 'capitalize' }}>{cls.type}</span>
          <span style={{ marginLeft: 8, fontSize: 11, background: C.stone, padding: '2px 10px', borderRadius: 20, color: C.neutral }}>só leitura</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {series.map((ser, idx) => {
          const d = ser.type === 'barre' ? ser.barre : ser.reformer;
          const isSig = ser.type === 'signature';
          return (
            <div key={ser.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.mist }}>0{idx + 1}</span>
                <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 500, color: C.ink, flex: 1 }}>{ser.name}</span>
                <Badge label={ser.type} color={ser.type === 'reformer' ? 'teal' : ser.type === 'barre' ? 'coral' : 'gold'}/>
              </div>
              {/* Setup */}
              {(ser.reformer?.springs || ser.reformer?.startPosition || ser.barre?.startPosition) && (
                <div style={{ fontSize: 11, color: C.mist, marginBottom: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ser.reformer?.springs && <span>Springs: <b>{ser.reformer.springs}</b></span>}
                  {isSig
                    ? <><span>R: {ser.reformer?.startPosition||'–'}</span><span>B: {ser.barre?.startPosition||'–'}</span></>
                    : <span>{d?.startPosition}</span>}
                </div>
              )}
              {/* Intro cue */}
              {ser.introCue && (
                <div style={{ fontSize: 12, color: '#1a4a7a', background: `${C.blue}30`, borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontStyle: 'italic' }}>{ser.introCue}</div>
              )}
              {/* Movements */}
              {isSig ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['Reformer', ser.reformer?.movements, C.reformer], ['Barre', ser.barre?.movements, '#c0507a']].map(([label, movs, col]) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                      {(movs || []).map((m, i) => <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${C.stone}`, color: C.ink }}>{m.movement}</div>)}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {(d?.movements || []).map((m, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${C.stone}`, color: C.ink, display: 'flex', gap: 8 }}>
                      {m.timing && <span style={{ color: C.mist, minWidth: 30 }}>{m.timing}</span>}
                      <span>{m.movement}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── CLIENT PORTAL ────────────────────────────────────────────────────────────
const ClientPortal = ({ user, profile }) => {
  const [classes, setClasses] = useState([]);
  const [allSeries, setAllSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCls, setSelectedCls] = useState(null);

  useEffect(() => {
    if (!profile?.studio_id) { setLoading(false); return; }
    (async () => {
      // Load studio-mates' profiles to find classes created by them
      const { data: studioMembers } = await supabase.from('profiles').select('id').eq('studio_id', profile.studio_id);
      const memberIds = (studioMembers || []).map(m => m.id);
      if (!memberIds.length) { setLoading(false); return; }
      const [clsRes, serRes] = await Promise.all([
        supabase.from('classes').select('*').in('created_by', memberIds).order('date', { ascending: false }),
        supabase.from('series').select('*').in('created_by', memberIds),
      ]);
      setClasses((clsRes.data || []).map(classFromDB));
      setAllSeries((serRes.data || []).map(seriesFromDB));
      setLoading(false);
    })();
  }, [profile?.studio_id]);

  const studio = profile?.studios;

  if (selectedCls) {
    const seriesList = selectedCls.seriesIds.map(id => allSeries.find(s => s.id === id)).filter(Boolean);
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Btn variant="ghost" small onClick={() => setSelectedCls(null)}><Icon name="back" size={13}/> Voltar</Btn>
          <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 22, fontWeight: 500, color: C.ink, margin: 0, flex: 1 }}>{selectedCls.name}</h2>
          {selectedCls.date && <span style={{ fontSize: 12, color: C.mist }}>{selectedCls.date}</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {seriesList.map((ser, idx) => {
            const d = ser.type === 'barre' ? ser.barre : ser.reformer;
            const isSig = ser.type === 'signature';
            return (
              <div key={ser.id} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.mist }}>0{idx + 1}</span>
                  <span style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 15, fontWeight: 500, color: C.ink, flex: 1 }}>{ser.name}</span>
                  <Badge label={ser.type} color={ser.type === 'reformer' ? 'teal' : ser.type === 'barre' ? 'coral' : 'gold'}/>
                </div>
                {ser.reformer?.springs && <div style={{ fontSize: 11, color: C.mist, marginBottom: 6 }}>Springs: <b>{ser.reformer.springs}</b>{ser.reformer?.startPosition ? ` · ${ser.reformer.startPosition}` : ''}</div>}
                {ser.introCue && <div style={{ fontSize: 12, color: '#1a4a7a', background: `${C.blue}30`, borderRadius: 6, padding: '5px 8px', marginBottom: 8, fontStyle: 'italic' }}>{ser.introCue}</div>}
                {isSig ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[['Reformer', ser.reformer?.movements, C.reformer], ['Barre', ser.barre?.movements, '#c0507a']].map(([lbl, movs, col]) => (
                      <div key={lbl}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: col, textTransform: 'uppercase', marginBottom: 3 }}>{lbl}</div>
                        {(movs || []).map((m, i) => <div key={i} style={{ fontSize: 12, padding: '2px 0', borderBottom: `1px solid ${C.stone}` }}>{m.movement}</div>)}
                      </div>
                    ))}
                  </div>
                ) : (
                  (d?.movements || []).map((m, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '3px 0', borderBottom: `1px solid ${C.stone}`, color: C.ink, display: 'flex', gap: 8 }}>
                      {m.timing && <span style={{ color: C.mist, minWidth: 30 }}>{m.timing}</span>}
                      <span>{m.movement}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: "'Satoshi',sans-serif" }}>
      <div style={{ background: C.crimson, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <HavenLogo size={26} color={C.cream}/>
        <div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 9, fontWeight: 500, letterSpacing: '0.3em', textTransform: 'uppercase', color: `${C.cream}70` }}>The Haven</div>
          <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>{studio?.name || 'Studio'}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: `${C.cream}70` }}>{profile?.name || ''}</span>
          <button onClick={() => supabase.auth.signOut()} style={{ fontFamily: "'Satoshi',sans-serif", fontWeight: 600, fontSize: 12, padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.cream}40`, background: 'transparent', color: `${C.cream}80`, cursor: 'pointer' }}>Sair</button>
        </div>
      </div>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 24, fontWeight: 500, color: C.crimson, marginBottom: 6 }}>Aulas</h2>
        {loading ? (
          <div style={{ color: C.mist, fontSize: 14, paddingTop: 40, textAlign: 'center' }}>A carregar…</div>
        ) : classes.length === 0 ? (
          <div style={{ color: C.mist, fontSize: 14, paddingTop: 40, textAlign: 'center' }}>Ainda não há aulas partilhadas no studio.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {classes.map(c => (
              <div key={c.id} onClick={() => setSelectedCls(c)} style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.stone}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Clash Display',sans-serif", fontSize: 16, fontWeight: 500, color: C.ink }}>{c.name || 'Sem nome'}</div>
                  <div style={{ fontSize: 12, color: C.mist, marginTop: 2 }}>{c.date} · {c.seriesIds.length} série{c.seriesIds.length !== 1 ? 's' : ''}</div>
                </div>
                <Badge label={c.type === 'signature' ? '✦ Signature' : c.type} color={c.type === 'signature' ? 'gold' : c.type === 'reformer' ? 'teal' : 'coral'}/>
                <span style={{ fontSize: 12, color: C.mist }}>→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── CONTEXT AI PANEL ─────────────────────────────────────────────────────────
const CHATS_KEY = 'haven_ai_chats';
const loadChats = () => { try { return JSON.parse(localStorage.getItem(CHATS_KEY)||'[]'); } catch(e) { return []; } };
const deleteChat = id => { try { localStorage.setItem(CHATS_KEY, JSON.stringify(loadChats().filter(c=>c.id!==id))); } catch(e) {} };
const newChatId = () => 'chat_'+(crypto.randomUUID?.()??Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));

const ContextAIPanel = ({ open, onToggle, screen, editingSeries, series, classes, aiStyle, onUpdateSeries, onNavigate, profile }) => {
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [lastQuickAction, setLastQuickAction] = React.useState(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [chatId, setChatId] = React.useState(newChatId);
  const [historyRefresh, setHistoryRefresh] = React.useState(0);
  const scrollContainerRef = React.useRef();
  const toast_ = useToast();

  const saveChat = React.useCallback((id, msgs, label, cKey) => {
    if (msgs.length < 2) return;
    const chats = loadChats();
    const title = msgs.find(m=>m.role==='user')?.text?.slice(0,50)||'Chat';
    const idx = chats.findIndex(c=>c.id===id);
    const item = { id, label, title, contextKey: cKey, messages: msgs, savedAt: new Date().toISOString() };
    if (idx>=0) chats[idx]=item; else chats.unshift(item);
    try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats.slice(0,30))); } catch(e) {}
  }, []);

  // Reset chat when context changes meaningfully
  const contextKey = `${screen.mode}-${screen.cls?.id||""}-${editingSeries?.id||""}`;
  const prevContextKey = React.useRef(contextKey);
  React.useEffect(() => {
    if (prevContextKey.current !== contextKey) {
      setMessages([]);
      setInput("");
      setLastQuickAction(null);
      setChatId(newChatId());
      setShowHistory(false);
      prevContextKey.current = contextKey;
    }
  }, [contextKey]);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getContext = () => {
    if (editingSeries) {
      const s = editingSeries;
      const isSig = s.type==="signature";
      const d = s.type==="barre"?s.barre:s.reformer;
      if (isSig) {
        const rM=s.reformer?.movements||[], bM=s.barre?.movements||[];
        return `Série: "${s.name}" (Signature)\nReformer setup: ${s.reformer?.springs||"-"} springs, ${s.reformer?.props||"-"}\nBarre setup: ${s.barre?.props||"-"}\nMovimentos:\n${rM.map((m,i)=>`  ${m.timing||i+1}: R: ${m.movement} | B: ${(bM[i]||{}).movement||"-"}`).join("\n")}\nMúsculos: ${s.muscles?.join(", ")||"-"}`;
      }
      return `Série: "${s.name}" (${s.type})\nSetup: ${d?.springs||"-"} springs, ${d?.props||"-"}, posição: ${d?.startPosition||"-"}\nMovimentos:\n${(d?.movements||[]).map((m,i)=>`  ${m.timing||i+1}: ${m.movement}`).join("\n")}\nMúsculos: ${s.muscles?.join(", ")||"-"}`;
    }
    if ((screen.mode==="aula" || screen.mode==="builder") && screen.cls) {
      const cls = classes.find(c=>c.id===screen.cls.id) || screen.cls;
      const seriesInClass = (cls.seriesIds||[]).map(id=>series.find(s=>s.id===id)).filter(Boolean);
      return `Aula: "${cls.name}" (${cls.type||"geral"})\nData: ${cls.date||"-"}\nNível: ${cls.level||"-"}\nSéries (${seriesInClass.length}):\n${seriesInClass.map((s,i)=>`  ${i+1}. ${s.name} (${s.type}) — zona: ${s.primaryZone||s.targetZone||"-"}, músculos: ${s.muscles?.slice(0,3).join(", ")||"-"}`).join("\n")}`;
    }
    return null;
  };

  const getSystemPrompt = () => {
    const styleCtx = aiStyle ? `\n\nEstilo de ensino do instructor: ${aiStyle}` : "";
    if (editingSeries) {
      return `És um expert STOTT Pilates a ajudar um instructor a melhorar as suas séries. Dá sugestões específicas sobre sequência, flow biomecânico, princípios STOTT, escolha de springs/props, e cues. Explica sempre o porquê. Não reescreves a série — ofereces sugestões que o instructor pode escolher aplicar ou ignorar. Responde em português (Portugal).${styleCtx}`;
    }
    if (screen.mode==="builder" || screen.mode==="aula") {
      return `És um expert STOTT Pilates a ajudar um instructor a estruturar e melhorar as suas aulas. Podes ajudar com: estrutura da aula, fluxo da aula, progressão de séries, equilíbrio de trabalho muscular, e sugestões de warm-up/cool-down. Responde em português (Portugal).${styleCtx}`;
    }
    return `És um expert STOTT Pilates a ajudar um instructor. Podes responder a perguntas sobre técnica, metodologia STOTT, programação de aulas, e equipamento. Responde em português (Portugal).${styleCtx}`;
  };

  const getLabel = () => {
    if (editingSeries) return `Análise — ${editingSeries.name}`;
    if (screen.mode==="library") return "Assistente de séries";
    if (screen.mode==="builder") return "Assistente de aulas";
    if (screen.mode==="aula") return "Assistente da aula";
    if (screen.mode==="movements") return "Assistente de movimentos";
    return "Assistente IA";
  };

  const send = async (userMsg, actionType) => {
    const text = userMsg || input.trim();
    if (!text) return;
    setLastQuickAction(actionType||null);
    const newMessages = [...messages, { role:"user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const ctx = getContext();
      const apiMessages = [];
      const firstText = newMessages[0].text;
      apiMessages.push({ role:"user", content: ctx ? `${ctx}\n\n---\n${firstText}` : firstText });
      for (let i=1; i<newMessages.length; i++) {
        const m = newMessages[i];
        apiMessages.push({ role: m.role==="user"?"user":"assistant", content: m.text });
      }
      const resp = await fetch("/api/ai", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ system: getSystemPrompt(), messages: apiMessages, max_tokens: 800 }),
      });
      const data = await resp.json();
      const reply = data?.content?.[0]?.text || "Sem resposta.";
      setMessages(prev=>{
        const next=[...prev, { role:"assistant", text: reply }];
        saveChat(chatId, next, getLabel(), contextKey);
        return next;
      });
    } catch(e) {
      console.error(e);
      setMessages(prev=>[...prev, { role:"assistant", text:"Erro ao contactar a IA." }]);
    }
    setLoading(false);
  };

  const QUICK_ACTIONS = editingSeries ? [
    { label:"✦ Músculos", actionType:"muscles", prompt:"Analisa a série e lista os 5 músculos principais trabalhados. Responde APENAS com JSON: {\"muscles\":[\"m1\",\"m2\",...]}" },
    { label:"✦ Notas", actionType:"notes", prompt:"Escreve notas de instructor para esta série: técnica, erros comuns, e cues verbais em português (2-3 frases). Responde APENAS com o texto das notas." },
    { label:"✦ Modificações", actionType:"mods", prompt:"Sugere modificações, progressões e regressões para diferentes níveis e limitações físicas. Responde em português." },
  ] : [];

  return (
    <div style={{
      width: open ? 340 : 44,
      flexShrink: 0,
      borderLeft: `1px solid ${C.stone}`,
      background: C.white,
      display: "flex",
      flexDirection: "column",
      minHeight: "calc(100vh - 54px)",
      position: "sticky",
      top: 54,
      transition: "width 0.2s",
      overflow: "hidden",
    }}>
      {/* Toggle button */}
      <button onClick={onToggle} style={{
        position:"absolute", top:12, left: open ? 12 : 8,
        background:"none", border:`1px solid ${C.stone}`, borderRadius:6,
        cursor:"pointer", color:C.mist, padding:"4px 7px", fontSize:12,
        fontFamily:"'Satoshi',sans-serif", zIndex:10,
        transition:"left 0.2s",
      }} title={open?"Fechar painel":"Abrir painel IA"}>
        {open ? "›" : "‹"}
      </button>

      {open && (
        <>
          {/* Header */}
          <div style={{padding:"12px 16px 10px 44px",borderBottom:`1px solid ${C.stone}`,flexShrink:0,display:"flex",alignItems:"center",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.08em",flex:1}}>{getLabel()}</div>
            {!showHistory&&messages.length>0&&<button onClick={()=>{setMessages([]);setChatId(newChatId());}} style={{fontFamily:"'Satoshi',sans-serif",fontSize:10,color:C.mist,background:"none",border:`1px solid ${C.stone}`,borderRadius:5,cursor:"pointer",padding:"2px 7px",flexShrink:0}}>Nova</button>}
            <button onClick={()=>setShowHistory(p=>!p)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:10,color:showHistory?C.crimson:C.mist,background:"none",border:`1px solid ${showHistory?C.crimson:C.stone}`,borderRadius:5,cursor:"pointer",padding:"2px 7px",flexShrink:0}}>{showHistory?"← Voltar":"Histórico"}</button>
          </div>

          {/* History view */}
          {showHistory&&(
            <div style={{flex:1,overflowY:"auto",padding:10,display:"flex",flexDirection:"column",gap:6}}>
              {(()=>{
                const chats = loadChats();
                if(!chats.length) return <div style={{textAlign:"center",color:C.mist,fontSize:12,padding:"24px 8px",lineHeight:1.5}}>Sem conversas guardadas ainda.</div>;
                return chats.map(chat=>(
                  <div key={chat.id} onClick={()=>{setMessages(chat.messages);setChatId(chat.id);setShowHistory(false);}}
                    style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${C.stone}`,cursor:"pointer",background:C.cream,display:"flex",gap:6,alignItems:"flex-start",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background=C.stone}
                    onMouseLeave={e=>e.currentTarget.style.background=C.cream}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{chat.title}</div>
                      <div style={{fontSize:10,color:C.mist,marginTop:2}}>{chat.label} · {chat.savedAt?.split('T')[0]||""}</div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();deleteChat(chat.id);setHistoryRefresh(p=>p+1);}}
                      style={{background:"none",border:"none",color:C.mist,cursor:"pointer",padding:"1px 4px",fontSize:14,lineHeight:1,flexShrink:0}}>×</button>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Quick actions */}
          {!showHistory && QUICK_ACTIONS.length > 0 && (
            <div style={{padding:"8px 12px",borderBottom:`1px solid ${C.stone}`,display:"flex",gap:5,flexWrap:"wrap",flexShrink:0}}>
              {QUICK_ACTIONS.map(qa=>(
                <button key={qa.actionType} onClick={()=>send(qa.prompt, qa.actionType)} disabled={loading}
                  style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:12,border:`1px solid ${C.sig}`,background:`${C.sig}30`,color:"#7a4010",cursor:loading?"not-allowed":"pointer"}}>
                  {qa.label}
                </button>
              ))}
              {messages.length>0&&<button onClick={()=>{setMessages([]);setLastQuickAction(null);}} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,color:C.mist,background:"none",border:"none",cursor:"pointer",padding:"3px 6px"}}>Limpar</button>}
            </div>
          )}

          {/* Messages */}
          {!showHistory&&<div ref={scrollContainerRef} style={{flex:1,overflowY:"auto",padding:"12px",display:"flex",flexDirection:"column",gap:8}}>
            {messages.length===0&&!loading&&(
              <div style={{textAlign:"center",color:C.mist,fontSize:12,padding:"20px 8px",lineHeight:1.5}}>
                {editingSeries ? `A analisar "${editingSeries.name}". Usa os atalhos acima ou faz uma pergunta.` : "Como posso ajudar?"}
              </div>
            )}
            {messages.map((m,i)=>{
              const isLastAssistant = m.role==="assistant" && i===messages.length-1 && !loading;
              return (
                <div key={i} style={{display:"flex",flexDirection:"column",gap:3,alignItems:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{
                    maxWidth:"92%",padding:"8px 11px",
                    borderRadius:m.role==="user"?"10px 10px 3px 10px":"10px 10px 10px 3px",
                    background:m.role==="user"?C.crimson:`${C.neutral}12`,
                    color:m.role==="user"?C.white:C.ink,
                    fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap",
                    fontFamily:"'Satoshi',sans-serif",
                  }}>{m.text}</div>
                  {isLastAssistant && lastQuickAction && onUpdateSeries && editingSeries && (
                    <div style={{display:"flex",gap:5,marginTop:2}}>
                      {lastQuickAction==="muscles"&&(
                        <button onClick={()=>{
                          try {
                            const parsed=JSON.parse(m.text.replace(/```json|```/g,"").trim());
                            if(parsed.muscles) onUpdateSeries({...editingSeries,muscles:parsed.muscles});
                          } catch(e) {
                            const lines=m.text.split(/[\n,]+/).map(x=>x.replace(/^[-*\d.•\s"]+/,"").replace(/[",]/g,"").trim()).filter(Boolean);
                            onUpdateSeries({...editingSeries,muscles:lines.slice(0,8)});
                          }
                          setLastQuickAction(null);
                        }} style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,border:`1px solid ${C.neutral}`,background:`${C.neutral}15`,color:C.neutral,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>
                          ✓ Aceitar músculos
                        </button>
                      )}
                      {lastQuickAction==="notes"&&(
                        <button onClick={()=>{
                          onUpdateSeries({...editingSeries,cues:m.text.trim()});
                          setLastQuickAction(null);
                        }} style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,border:`1px solid ${C.neutral}`,background:`${C.neutral}15`,color:C.neutral,cursor:"pointer",fontFamily:"'Satoshi',sans-serif"}}>
                          ✓ Aceitar notas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {loading&&(
              <div style={{display:"flex",gap:4,padding:"4px 0",alignItems:"center"}}>
                {[0,0.2,0.4].map((d,i)=><div key={i} style={{width:5,height:5,borderRadius:"50%",background:C.neutral,animation:`pulse 1s infinite ${d}s`}}/>)}
              </div>
            )}
          </div>}

          {/* Input */}
          {!showHistory&&<div style={{padding:"8px 12px",borderTop:`1px solid ${C.stone}`,display:"flex",gap:6,alignItems:"flex-end",flexShrink:0}}>
            <AutoTextarea
              value={input}
              onChange={e=>setInput(e.target.value)}
              placeholder="Pergunta ou pedido…"
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey&&input.trim()){e.preventDefault();send();} }}
              style={{flex:1,fontSize:12,minHeight:32,resize:"none",borderRadius:8,border:`1px solid ${C.stone}`,padding:"6px 10px",fontFamily:"'Satoshi',sans-serif",outline:"none"}}
            />
            <button onClick={()=>send()} disabled={loading||!input.trim()} style={{padding:"6px 10px",borderRadius:8,border:"none",background:input.trim()&&!loading?C.crimson:C.stone,color:C.cream,cursor:input.trim()&&!loading?"pointer":"default",flexShrink:0}}>
              <Icon name="send" size={12}/>
            </button>
          </div>}
        </>
      )}
    </div>
  );
};

// ─── HOME PAGE ─────────────────────────────────────────────────────────────────
const HomePage = ({ series, classes, profile, onNewSeries, onNewClass, onViewSeries, onViewClass, onGoStudio, shares=[], onAcceptShare, onDismissShare }) => {
  const recentSeries = [...series].sort((a,b)=>(b.updatedAt||b.createdAt||"").localeCompare(a.updatedAt||a.createdAt||"")).slice(0,5);
  const recentClasses = [...classes].sort((a,b)=>(b.date||"").localeCompare(a.date||"")||0).slice(0,5);
  const pendingCount = series.filter(s=>s.visibility==='pending_studio').length + classes.filter(c=>c.visibility==='pending_studio').length;
  const hasStudio = !!profile?.studio_id;

  const StatCard = ({ label, value, sub, onClick }) => (
    <div onClick={onClick} style={{background:C.white,borderRadius:14,border:`1px solid ${C.stone}`,padding:"18px 20px",cursor:onClick?"pointer":"default",flex:1,minWidth:0}}>
      <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:28,fontWeight:600,color:C.crimson,lineHeight:1}}>{value}</div>
      <div style={{fontSize:12,fontWeight:700,color:C.ink,marginTop:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:C.mist,marginTop:2}}>{sub}</div>}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {/* Welcome */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:30,fontWeight:500,color:C.crimson,marginBottom:2}}>
            Olá{profile?.name?`, ${profile.name.split(' ')[0]}`:''}
          </div>
          <div style={{fontSize:13,color:C.mist}}>O que queres fazer hoje?</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onNewSeries} style={{fontFamily:"'Satoshi',sans-serif",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:10,border:"none",background:C.crimson,color:C.cream,cursor:"pointer"}}>+ Nova Série</button>
          <button onClick={onNewClass} style={{fontFamily:"'Satoshi',sans-serif",fontWeight:700,fontSize:13,padding:"10px 20px",borderRadius:10,border:`2px solid ${C.crimson}`,background:"transparent",color:C.crimson,cursor:"pointer"}}>+ Nova Aula</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <StatCard label="Séries" value={series.length} sub={`${series.filter(s=>s.status==='approved').length} aprovadas`}/>
        <StatCard label="Aulas" value={classes.length}/>
        {hasStudio&&<StatCard label="Em revisão" value={pendingCount} sub="no studio" onClick={onGoStudio}/>}
      </div>

      {/* Studio notifications */}
      {hasStudio && pendingCount > 0 && (
        <div onClick={onGoStudio} style={{background:"#fef9ec",border:"1px solid #fcd34d",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>⏳</span>
          <div style={{fontSize:13,fontWeight:600,color:"#92400e"}}>Studio: {pendingCount} {pendingCount===1?"item":"itens"} em revisão — <span style={{fontWeight:400}}>clica para ver</span></div>
        </div>
      )}

      {/* Two-column recent content */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        {/* Recent series */}
        <div>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:14,fontWeight:600,color:C.ink,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Séries recentes</div>
          {recentSeries.length===0&&<div style={{fontSize:13,color:C.mist}}>Ainda sem séries.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {recentSeries.map(s=>(
              <div key={s.id} onClick={()=>onViewSeries(s)} style={{background:C.white,borderRadius:10,border:`1px solid ${C.stone}`,padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"border-color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.neutral}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.stone}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:"'Clash Display',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  <div style={{fontSize:11,color:C.mist,marginTop:1}}>{s.type==="signature"?"Signature":s.type==="barre"?"Barre":"Reformer"}{s.primaryZone||s.targetZone?` · ${(s.primaryZone||s.targetZone.split(',')[0]).trim()}`:""}
                  </div>
                </div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,background:s.status==="approved"?"#e8f5e9":"#fef9ec",color:s.status==="approved"?"#2e7d32":"#b45309",flexShrink:0}}>{s.status==="approved"?"✓":""}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent classes */}
        <div>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:14,fontWeight:600,color:C.ink,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Aulas recentes</div>
          {recentClasses.length===0&&<div style={{fontSize:13,color:C.mist}}>Ainda sem aulas.</div>}
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {recentClasses.map(c=>(
              <div key={c.id} onClick={()=>onViewClass(c)} style={{background:C.white,borderRadius:10,border:`1px solid ${C.stone}`,padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"border-color 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=C.neutral}
                onMouseLeave={e=>e.currentTarget.style.borderColor=C.stone}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.ink,fontFamily:"'Clash Display',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name||"Sem nome"}</div>
                  <div style={{fontSize:11,color:C.mist,marginTop:1}}>{c.date||"Sem data"}{c.type?` · ${c.type}`:""}{c.level?` · ${c.level}`:""}</div>
                </div>
                <Badge label={c.type==="signature"?"✦":c.type==="reformer"?"R":"B"} color={c.type==="signature"?"gold":c.type==="reformer"?"teal":"coral"}/>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Shares inbox */}
      {shares.length > 0 && (
        <div>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:14,fontWeight:600,color:C.ink,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.06em"}}>Partilhas recebidas</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {shares.map(share=>(
              <div key={share.id} style={{background:C.white,border:`2px solid ${C.crimson}30`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.ink,fontFamily:"'Clash Display',sans-serif"}}>{share.item_snapshot?.name||'Item'}</div>
                  <div style={{fontSize:11,color:C.mist,marginTop:2,display:"flex",gap:8}}>
                    <span>{share.item_type==='series'?'Série':'Aula'}</span>
                    {share.message&&<span>· {share.message}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>onAcceptShare?.(share)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:8,border:"none",background:C.crimson,color:C.cream,cursor:"pointer"}}>Adicionar à biblioteca</button>
                  <button onClick={()=>onDismissShare?.(share.id)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:8,border:`1px solid ${C.stone}`,background:"transparent",color:C.mist,cursor:"pointer"}}>Ignorar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── DISCOVER PAGE ────────────────────────────────────────────────────────────
const DiscoverPage = ({ items, loading, onRefresh, onCopy, onSend, profile }) => {
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all'); // 'all','series','class'
  const [zoneFilter, setZoneFilter] = React.useState('');

  const zones = React.useMemo(() => {
    const zs = new Set();
    items.filter(i=>i._discoverType==='series').forEach(i=>{ if(i.primaryZone) zs.add(i.primaryZone); });
    return [...zs].sort();
  }, [items]);

  const filtered = items.filter(item => {
    if(typeFilter!=='all' && item._discoverType!==typeFilter) return false;
    if(search && !(item.name||'').toLowerCase().includes(search.toLowerCase())) return false;
    if(zoneFilter && item._discoverType==='series' && item.primaryZone!==zoneFilter) return false;
    return true;
  });

  const seriesItems = filtered.filter(i=>i._discoverType==='series');
  const classItems  = filtered.filter(i=>i._discoverType==='class');

  const authorLabel = (item) => {
    const name = item._author?.name;
    const studio = item._author?.studios?.name;
    if (!name) return null;
    return studio ? `${name} · ${studio}` : name;
  };

  const typeColors = { reformer: C.reformer, barre: C.barre, signature: '#7a4010' };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap"}}>
        <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:26,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Descobrir</h2>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar…" style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"7px 14px",borderRadius:20,border:`1px solid ${C.stone}`,outline:"none",background:C.white,color:C.ink,width:180}}/>
        <div style={{display:"flex",gap:4}}>
          {[['all','Tudo'],['series','Séries'],['class','Aulas']].map(([v,l])=>(
            <button key={v} onClick={()=>setTypeFilter(v)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:20,border:`1px solid ${typeFilter===v?C.crimson:C.stone}`,background:typeFilter===v?C.crimson:"transparent",color:typeFilter===v?C.cream:C.ink,cursor:"pointer"}}>{l}</button>
          ))}
        </div>
        {zones.length>0&&(
          <select value={zoneFilter} onChange={e=>setZoneFilter(e.target.value)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,padding:"7px 10px",borderRadius:8,border:`1px solid ${C.stone}`,color:C.ink,background:C.white,outline:"none"}}>
            <option value="">Todas as zonas</option>
            {zones.map(z=><option key={z} value={z}>{z}</option>)}
          </select>
        )}
        <button onClick={onRefresh} disabled={loading} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:8,border:`1px solid ${C.stone}`,background:C.white,color:C.ink,cursor:"pointer",opacity:loading?0.5:1}}>{loading?"A carregar…":"↻ Atualizar"}</button>
      </div>

      {loading && <div style={{color:C.mist,fontSize:14,padding:"40px 0",textAlign:"center"}}>A carregar conteúdo público…</div>}

      {!loading && filtered.length===0 && (
        <div style={{textAlign:"center",padding:"60px 0",color:C.mist}}>
          <div style={{fontSize:32,marginBottom:12}}>✦</div>
          <div style={{fontFamily:"'Clash Display',sans-serif",fontSize:18,color:C.ink,marginBottom:8}}>Nenhum conteúdo público encontrado</div>
          <div style={{fontSize:13}}>Partilha as tuas séries para aparecer aqui!</div>
        </div>
      )}

      {/* Series section */}
      {(typeFilter==='all'||typeFilter==='series') && seriesItems.length>0 && (
        <div style={{marginBottom:28}}>
          {typeFilter==='all'&&<div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Séries</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {seriesItems.map(item=>(
              <div key={item.id} style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:16,fontWeight:600,color:C.ink}}>{item.name}</span>
                    {item.type&&<span style={{fontSize:11,fontWeight:700,color:C.white,background:typeColors[item.type]||C.mist,borderRadius:20,padding:"2px 8px"}}>{item.type}</span>}
                    {item.primaryZone&&<span style={{fontSize:11,color:C.mist,background:C.stone,borderRadius:20,padding:"2px 8px"}}>{item.primaryZone}</span>}
                    {item.seriesType&&<span style={{fontSize:11,fontWeight:600,color:"#5a2a00",background:`${C.sig}50`,border:`1px solid ${C.sig}`,borderRadius:20,padding:"2px 8px"}}>{item.seriesType}</span>}
                  </div>
                  {authorLabel(item)&&<div style={{fontSize:12,color:C.mist}}>{authorLabel(item)}</div>}
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>onCopy(item)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:`1px solid ${C.crimson}`,background:"transparent",color:C.crimson,cursor:"pointer"}}>Copiar</button>
                  <button onClick={()=>onSend(item)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:`1px solid ${C.stone}`,background:C.white,color:C.ink,cursor:"pointer"}}>Enviar →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classes section */}
      {(typeFilter==='all'||typeFilter==='class') && classItems.length>0 && (
        <div>
          {typeFilter==='all'&&<div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Aulas</div>}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {classItems.map(item=>(
              <div key={item.id} style={{background:C.white,border:`1px solid ${C.stone}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontFamily:"'Clash Display',sans-serif",fontSize:16,fontWeight:600,color:C.ink}}>{item.name}</span>
                    {item.type&&<span style={{fontSize:11,fontWeight:700,color:C.white,background:typeColors[item.type]||C.mist,borderRadius:20,padding:"2px 8px"}}>{item.type}</span>}
                    {item.level&&<span style={{fontSize:11,color:C.mist,background:C.stone,borderRadius:20,padding:"2px 8px"}}>{item.level}</span>}
                    {item.date&&<span style={{fontSize:11,color:C.mist}}>{item.date}</span>}
                  </div>
                  {authorLabel(item)&&<div style={{fontSize:12,color:C.mist}}>{authorLabel(item)}</div>}
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>onCopy(item)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:`1px solid ${C.crimson}`,background:"transparent",color:C.crimson,cursor:"pointer"}}>Copiar</button>
                  <button onClick={()=>onSend(item)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:8,border:`1px solid ${C.stone}`,background:C.white,color:C.ink,cursor:"pointer"}}>Enviar →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SEND MODAL ───────────────────────────────────────────────────────────────
const SendModal = ({ item, currentUserId, onSend, onClose }) => {
  const [profiles, setProfiles] = React.useState([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState(null);
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('id, name, studios(name)').eq('is_public', true);
      setProfiles((data || []).filter(p => p.id !== currentUserId));
      setLoading(false);
    })();
  }, []);

  const filtered = profiles.filter(p => (p.name||'').toLowerCase().includes(search.toLowerCase()));

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    await onSend(item, selected, message);
    setSending(false);
    onClose();
  };

  const itemLabel = item._discoverType === 'class' ? 'Aula' : 'Série';

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:C.cream,borderRadius:16,padding:28,width:420,maxWidth:"95vw",maxHeight:"80vh",display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h3 style={{fontFamily:"'Clash Display',sans-serif",fontSize:18,fontWeight:600,color:C.crimson,margin:0}}>Enviar {itemLabel}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.mist}}>✕</button>
        </div>
        <div style={{fontSize:13,color:C.ink}}>A enviar: <strong>{item.name}</strong></div>

        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar instrutor…" style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"8px 14px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",width:"100%",boxSizing:"border-box"}}/>

        <div style={{flex:1,overflowY:"auto",maxHeight:220,display:"flex",flexDirection:"column",gap:6}}>
          {loading&&<div style={{color:C.mist,fontSize:13,padding:8}}>A carregar instrutores…</div>}
          {!loading&&filtered.length===0&&<div style={{color:C.mist,fontSize:13,padding:8}}>Nenhum instrutor público encontrado.</div>}
          {filtered.map(p=>(
            <button key={p.id} onClick={()=>setSelected(p)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"8px 12px",borderRadius:8,border:`2px solid ${selected?.id===p.id?C.crimson:C.stone}`,background:selected?.id===p.id?`${C.crimson}10`:C.white,color:C.ink,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8}}>
              <span style={{flex:1,fontWeight:600}}>{p.name}</span>
              {p.studios?.name&&<span style={{fontSize:11,color:C.mist}}>{p.studios.name}</span>}
            </button>
          ))}
        </div>

        <textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Mensagem (opcional)…" rows={2} style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",resize:"vertical",width:"100%",boxSizing:"border-box"}}/>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:8,border:`1px solid ${C.stone}`,background:"transparent",color:C.ink,cursor:"pointer"}}>Cancelar</button>
          <button onClick={handleSend} disabled={!selected||sending} style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,fontWeight:600,padding:"8px 18px",borderRadius:8,border:"none",background:selected&&!sending?C.crimson:`${C.crimson}60`,color:C.cream,cursor:selected&&!sending?"pointer":"not-allowed"}}>
            {sending?"A enviar…":"Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function HavenApp() {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [series,  setSeries]  = useState(SIGNATURE_SERIES);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [aiStyle, setAiStyle] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);

  const effectiveAiStyle = React.useMemo(() => {
    const guidelines = profile?.studios?.settings?.guidelines;
    const parts = [
      guidelines ? `Diretrizes do studio:\n${guidelines}` : '',
      aiStyle || ''
    ].filter(Boolean);
    return parts.join('\n\n');
  }, [profile?.studios?.settings?.guidelines, aiStyle]);
  const [filterType,    setFilterType]    = useState("all");
  const [showChoreo,    setShowChoreo]    = useState(() => { try { return localStorage.getItem('showChoreo') !== 'false'; } catch(e) { return true; } });
  const [sortBy,        setSortBy]        = useState("targetZone");
  const [sortOrder,     setSortOrder]     = useState("asc");
  const [editingSeries, setEditingSeries] = useState(null);
  const [addingSeries,  setAddingSeries]  = useState(false);
  const [screen, setScreen] = useState({ mode:"home", cls:null, fromLibrary:false });
  const [screenStack, setScreenStack] = useState([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(() => {
    try { return localStorage.getItem('aiPanelOpen') !== 'false'; } catch(e) { return true; }
  });
  const toggleAiPanel = () => setAiPanelOpen(p => { const next=!p; try{localStorage.setItem('aiPanelOpen',String(next));}catch(e){} return next; });
  const [seriesSearch, setSeriesSearch] = useState("");
  const [compactSeries, setCompactSeries] = useState(() => { try { return localStorage.getItem('compactSeries') === 'true'; } catch(e) { return false; } });
  const [aulaTeachingMode, setAulaTeachingMode] = useState(false);
  const [aulaEditingSeries, setAulaEditingSeries] = useState(null);
  const [discoverItems, setDiscoverItems] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [shares, setShares] = useState([]);
  const [sendModalItem, setSendModalItem] = useState(null);

  const navigate = (newScreen) => {
    const newStack = [...screenStack, screen];
    setScreenStack(newStack);
    setScreen(newScreen);
    window.scrollTo(0, 0);
    window.history.pushState({ screen: newScreen, screenStack: newStack }, '');
    if (newScreen.mode !== 'aula') { setAulaTeachingMode(false); setAulaEditingSeries(null); }
  };
  const goBack = () => {
    if (screenStack.length > 0) {
      const prev = screenStack[screenStack.length - 1];
      const newStack = screenStack.slice(0, -1);
      setScreen(prev);
      setScreenStack(newStack);
      window.scrollTo(0, 0);
      window.history.replaceState({ screen: prev, screenStack: newStack }, '');
      if (prev.mode !== 'aula') { setAulaTeachingMode(false); setAulaEditingSeries(null); }
    } else {
      setScreen({mode:'builder',cls:null,fromLibrary:false});
    }
  };

  // Auth listener
  useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) { setDataLoaded(false); setSeries(SIGNATURE_SERIES); setClasses(DEFAULT_CLASSES); setAiStyle(""); setProfile(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load from Supabase on login
  useEffect(()=>{
    if (!user) return;
    (async()=>{
      const s  = await api.load('series',  null);
      const cl = await api.load('classes', null);
      const st = await api.load('aistyle', null);
      if (s  && Array.isArray(s)  && s.length)  setSeries(s);
      if (cl && Array.isArray(cl))               setClasses(cl);
      if (st && typeof st.value === 'string')    setAiStyle(st.value);
      let p = await api.loadProfile(user.id);

      // Handle pending invite code
      const inviteCode = localStorage.getItem('pending_invite');
      if (inviteCode && p && !p.studio_id) {
        const { data: inv } = await supabase.from('invitations').select('*, studios(id,name)').eq('code', inviteCode).gt('expires_at', new Date().toISOString()).is('accepted_by', null).maybeSingle();
        if (inv) {
          await supabase.from('profiles').update({ studio_id: inv.studio_id }).eq('id', user.id);
          await supabase.from('invitations').update({ accepted_by: user.id, accepted_at: new Date().toISOString() }).eq('id', inv.id);
          p = await api.loadProfile(user.id);
        }
        localStorage.removeItem('pending_invite');
      }

      setProfile(p);
      setDataLoaded(true);
      // Load shares inbox
      const { data: sharesData } = await supabase.from('shares').select('*').eq('to_user_id', user.id).order('created_at', { ascending: false });
      setShares(sharesData || []);
    })();
  }, [user]);

  // Auto-save aiStyle to Supabase
  useEffect(()=>{ if(dataLoaded && user) api.save('aistyle', {value: aiStyle}); }, [aiStyle, dataLoaded, user]);

  const toast   = useToast();
  const confirm = useConfirm();
  const saveSeries = async s => {
    setSeries(p=>p.find(x=>x.id===s.id)?p.map(x=>x.id===s.id?s:x):[...p,s]);
    setEditingSeries(null); setAddingSeries(false); toast("Série guardada");
    if (user) api.upsertSeries(s, user.id);
  };
  const deleteSeries = async id => {
    if(await confirm("Tens a certeza que queres apagar esta série? Esta acção não pode ser desfeita.", {confirmLabel:"Apagar série"})) {
      setSeries(p=>p.filter(s=>s.id!==id));
      if (user) api.removeSeries(id);
    }
  };
  const saveClass = async c => {
    setClasses(p=>p.find(x=>x.id===c.id)?p.map(x=>x.id===c.id?c:x):[...p,c]);
    if (user) api.upsertClass(c, user.id);
  };
  const deleteClass = async id => {
    if(await confirm("Tens a certeza que queres apagar esta aula?", {confirmLabel:"Apagar aula"})) {
      setClasses(p=>p.filter(c=>c.id!==id));
      if (user) api.removeClass(id);
    }
  };
  const updateClass = async c => { setClasses(p=>p.map(x=>x.id===c.id?c:x)); toast("Aula guardada"); if (user) api.upsertClass(c, user.id); };

  const saveFork = async (forkedSeries, classId, oldSeriesId) => {
    const newS = { ...forkedSeries, createdBy: user?.id, createdAt: new Date().toISOString().split('T')[0], visibility: 'personal', studioId: null };
    setSeries(p => [...p, newS]);
    if (user) await api.upsertSeries(newS, user.id);
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      const updated = { ...cls, seriesIds: cls.seriesIds.map(id => id === oldSeriesId ? forkedSeries.id : id) };
      await saveClass(updated);
    }
  };

  const publishToStudio = async s => {
    if (!profile?.studio_id) return;
    const updated = { ...s, visibility: 'pending_studio', studioId: profile.studio_id };
    setSeries(p=>p.map(x=>x.id===s.id?updated:x));
    await supabase.from('series').update({ visibility:'pending_studio', studio_id: profile.studio_id }).eq('id', s.id);
    toast("Série submetida para revisão do studio");
  };
  const unpublishFromStudio = async s => {
    const updated = { ...s, visibility: 'personal', studioId: null };
    setSeries(p=>p.map(x=>x.id===s.id?updated:x));
    await supabase.from('series').update({ visibility:'personal', studio_id: null }).eq('id', s.id);
    toast("Série tornada privada");
  };
  const publishClassToStudio = async c => {
    if (!profile?.studio_id) return;
    const updated = { ...c, visibility: 'pending_studio', studioId: profile.studio_id };
    setClasses(p=>p.map(x=>x.id===c.id?updated:x));
    await supabase.from('classes').update({ visibility:'pending_studio', studio_id: profile.studio_id }).eq('id', c.id);
    toast("Aula submetida para revisão do studio");
  };
  const makeSeriesPublic = async s => {
    const updated = { ...s, visibility: 'public' };
    setSeries(p=>p.map(x=>x.id===s.id?updated:x));
    await supabase.from('series').update({ visibility:'public' }).eq('id', s.id);
    toast("Série publicada para toda a plataforma");
  };
  const copyToLibrary = async s => {
    const newId = `copy-${Date.now()}`;
    const copy = { ...s, id: newId, visibility: 'personal', studioId: null, createdBy: user.id, createdAt: new Date().toISOString().split('T')[0] };
    setSeries(p=>[...p, copy]);
    if (user) api.upsertSeries(copy, user.id);
    toast("Série copiada para a tua biblioteca");
  };

  const loadDiscover = async () => {
    setDiscoverLoading(true);
    try {
      const [{ data: pubSeries }, { data: pubClasses }] = await Promise.all([
        supabase.from('series').select('*, profiles!created_by(id, name, studios(name))').eq('visibility','public').order('updated_at', { ascending: false }).limit(100),
        supabase.from('classes').select('*, profiles!created_by(id, name, studios(name))').eq('visibility','public').order('updated_at', { ascending: false }).limit(100),
      ]);
      const items = [
        ...(pubSeries||[]).map(r => ({ ...seriesFromDB(r), _discoverType:'series', _author: r.profiles })),
        ...(pubClasses||[]).map(r => ({ ...classFromDB(r), _discoverType:'class', _author: r.profiles })),
      ];
      setDiscoverItems(items);
    } catch(e) { console.error('loadDiscover error:', e); }
    setDiscoverLoading(false);
  };

  const copyDiscoverItem = async (item) => {
    const attribution = {
      author_name: item._author?.name || null,
      studio_name: item._author?.studios?.name || null,
      original_id: item.id,
      copied_at: new Date().toISOString(),
    };
    const newId = crypto.randomUUID ? crypto.randomUUID() : `copy-${Date.now()}`;
    if (item._discoverType === 'series') {
      const copy = { ...item, id: newId, attribution, visibility: 'personal', studioId: null, createdBy: user.id, createdAt: new Date().toISOString().split('T')[0] };
      setSeries(p=>[...p, copy]);
      if (user) api.upsertSeries(copy, user.id);
    } else {
      const copy = { ...item, id: newId, attribution, visibility: 'personal', studioId: null, created_by: user.id };
      setClasses(p=>[...p, copy]);
      if (user) api.upsertClass(copy, user.id);
    }
    toast('Copiado para a tua biblioteca!');
  };

  const sendToInstructor = async (item, toProfile, message) => {
    try {
      const itemType = item._discoverType || 'series';
      const snapshot = itemType === 'series' ? seriesToDB(item, user.id) : classToDB(item, user.id);
      await supabase.from('shares').insert({
        from_user_id: user.id,
        to_user_id: toProfile.id,
        item_type: itemType,
        item_id: item.id,
        item_snapshot: snapshot,
        message: message || null,
      });
      toast(`Enviado para ${toProfile.name}!`);
    } catch(e) { console.error('sendToInstructor error:', e); toast('Erro ao enviar', 'error'); }
  };

  const acceptShare = async (share) => {
    const newId = crypto.randomUUID ? crypto.randomUUID() : `share-${Date.now()}`;
    const attribution = { shared_by_id: share.from_user_id, original_id: share.item_id, copied_at: new Date().toISOString() };
    try {
      if (share.item_type === 'series') {
        const s = seriesFromDB({ ...share.item_snapshot, id: newId, created_by: user.id, attribution, visibility: 'personal' });
        setSeries(p=>[...p, s]);
        if (user) api.upsertSeries(s, user.id);
      } else {
        const c = classFromDB({ ...share.item_snapshot, id: newId, created_by: user.id, attribution, visibility: 'personal' });
        setClasses(p=>[...p, c]);
        if (user) api.upsertClass(c, user.id);
      }
      await supabase.from('shares').delete().eq('id', share.id);
      setShares(p => p.filter(x => x.id !== share.id));
      toast('Adicionado à tua biblioteca!');
    } catch(e) { console.error('acceptShare error:', e); toast('Erro ao aceitar', 'error'); }
  };

  const dismissShare = async (shareId) => {
    await supabase.from('shares').delete().eq('id', shareId);
    setShares(p => p.filter(x => x.id !== shareId));
  };

  const toggleSeriesPublic = async (s) => {
    const isPublic = s.visibility === 'public';
    const updated = { ...s, visibility: isPublic ? 'personal' : 'public' };
    setSeries(p=>p.map(x=>x.id===s.id?updated:x));
    await supabase.from('series').update({ visibility: updated.visibility }).eq('id', s.id);
    toast(isPublic ? 'Série tornada privada' : 'Série publicada na plataforma');
  };

  const toggleClassPublic = async (c) => {
    const isPublic = c.visibility === 'public';
    const updated = { ...c, visibility: isPublic ? 'personal' : 'public' };
    setClasses(p=>p.map(x=>x.id===c.id?updated:x));
    await supabase.from('classes').update({ visibility: updated.visibility }).eq('id', c.id);
    toast(isPublic ? 'Aula tornada privada' : 'Aula publicada na plataforma');
  };

  const unseenSharesCount = shares.length;

  const isChoreoSeries = s => {
    const movs=[...(s.reformer?.movements||[]),...(s.barre?.movements||[])];
    return movs.some(m=>m.timing);
  };
  const filteredSeries = series.filter(s=>{
    if(!showChoreo && isChoreoSeries(s)) return false;
    if(seriesSearch && !s.name.toLowerCase().includes(seriesSearch.toLowerCase())) return false;
    if(filterType==="all")      return true;
    if(filterType==="approved") return s.status==="approved";
    if(filterType==="reformer") return s.type==="reformer"||s.type==="signature";
    if(filterType==="barre")    return s.type==="barre"||s.type==="signature";
    return s.type===filterType;
  }).sort((a,b)=>{
    let va="", vb="";
    if(sortBy==="name")       { va=a.name||""; vb=b.name||""; }
    if(sortBy==="createdAt")  { va=a.createdAt||""; vb=b.createdAt||""; }
    if(sortBy==="targetZone") { va=a.primaryZone||a.targetZone||""; vb=b.primaryZone||b.targetZone||""; }
    const cmp = va.localeCompare(vb,"pt");
    return sortOrder==="asc" ? cmp : -cmp;
  });

  const goTab = id => {
    const newScreen = {mode:id,cls:null,fromLibrary:false};
    setScreen(newScreen); setEditingSeries(null); setAddingSeries(false); setScreenStack([]); setAulaTeachingMode(false); setAulaEditingSeries(null);
    window.scrollTo(0, 0);
    window.history.replaceState({ screen: newScreen, screenStack: [] }, '');
  };
  const isAulaMode = screen.mode==="aula" && aulaTeachingMode;

  useEffect(()=>{
    const id = "haven-fonts";
    if(!document.getElementById(id)){
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  // Scroll to top after every screen change (useLayoutEffect fires after DOM update, before paint)
  React.useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.mode, screen.cls?.id]);

  useEffect(() => {
    window.history.replaceState({ screen: { mode:"home", cls:null, fromLibrary:false }, screenStack: [] }, '');
    const handlePop = (e) => {
      if (e.state?.screen) {
        setScreen(e.state.screen);
        setScreenStack(e.state.screenStack || []);
        if (e.state.screen.mode !== 'aula') { setAulaTeachingMode(false); setAulaEditingSeries(null); }
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  if (authLoading) return <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Satoshi',sans-serif",color:C.mist}}>A carregar…</div>;
  if (shareTokenParam) return <ShareView token={shareTokenParam} />;
  if (!user) return <Auth />;
  if (dataLoaded && profile?.role === 'client') return <ClientPortal user={user} profile={profile} />;
  if (dataLoaded && profile && !profile.onboarded) return (
    <Onboarding user={user} profile={profile} onComplete={async (newAiStyle) => {
      const p = await api.loadProfile(user.id);
      setProfile(p);
      if (newAiStyle) setAiStyle(newAiStyle);
    }}/>
  );

  return (
    <div style={{minHeight:"100vh",background:C.cream,fontFamily:"'Satoshi', sans-serif"}}>

      {!isAulaMode&&(
        <div style={{background:C.crimson,padding:"12px 28px",display:"flex",alignItems:"center",gap:16,borderBottom:`1px solid #5a1010`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <HavenLogo size={30} color={C.cream}/>
            <div>
              <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:9,fontWeight:500,letterSpacing:"0.3em",textTransform:"uppercase",color:`${C.cream}70`,marginBottom:1}}>The Haven</div>
              <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:16,fontWeight:600,color:C.cream,letterSpacing:"0.02em"}}>Instructor Studio</div>
            </div>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:2,background:`rgba(0,0,0,0.15)`,padding:3,borderRadius:8}}>
              {[["home","Início"],["discover","Descobrir"],["library","Séries"],["builder","Aulas"],["studio","Studio"],["perfil","Perfil"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>{ goTab(id); if(id==="discover") loadDiscover(); }} style={{fontFamily:"'Satoshi', sans-serif",fontWeight:600,fontSize:12,padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",background:screen.mode===id?C.cream:"transparent",color:screen.mode===id?C.crimson:`${C.cream}80`,transition:"all 0.15s",position:"relative"}}>
                  {id==="discover"&&unseenSharesCount>0&&<span style={{position:"absolute",top:2,right:4,background:"#e74c3c",color:"#fff",borderRadius:"50%",fontSize:9,padding:"0 4px",fontWeight:700,lineHeight:"14px",minWidth:14,textAlign:"center"}}>{unseenSharesCount}</span>}
                  {lbl}
                </button>
              ))}
            </div>
            <button onClick={()=>supabase.auth.signOut()} style={{fontFamily:"'Satoshi',sans-serif",fontWeight:600,fontSize:12,padding:"6px 14px",borderRadius:6,border:`1px solid ${C.cream}40`,background:"transparent",color:`${C.cream}80`,cursor:"pointer"}} title="Sair">Sair</button>
          </div>
        </div>
      )}

      <div style={{display:"flex",maxWidth:1600,margin:"0 auto",width:"100%",padding:isAulaMode?"0":"0",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0,padding:isAulaMode?"0":"28px 24px",overflowX:"hidden"}}>

        <MovDatalist series={series}/>

        {/* ── HOME ── */}
        {screen.mode==="home"&&(
          <HomePage
            series={series}
            classes={classes}
            profile={profile}
            onNewSeries={()=>{setAddingSeries(true);setEditingSeries(null);goTab("library");}}
            onNewClass={()=>goTab("builder")}
            onViewSeries={s=>{setEditingSeries(s);goTab("library");}}
            onViewClass={c=>navigate({mode:"aula",cls:c,fromLibrary:false})}
            onGoStudio={()=>goTab("studio")}
            shares={shares}
            onAcceptShare={acceptShare}
            onDismissShare={dismissShare}
          />
        )}

        {/* ── DESCOBRIR ── */}
        {screen.mode==="discover"&&(
          <DiscoverPage
            items={discoverItems}
            loading={discoverLoading}
            onRefresh={loadDiscover}
            onCopy={copyDiscoverItem}
            onSend={item=>setSendModalItem(item)}
            profile={profile}
          />
        )}

        {/* ── LIBRARY ── */}
        {screen.mode==="library"&&(
          editingSeries||addingSeries
            ? <SeriesEditor series={editingSeries} onSave={saveSeries} onSaveAsNew={s=>{saveSeries(s);}} onCancel={()=>{setEditingSeries(null);setAddingSeries(false);}} onDelete={id=>{deleteSeries(id);setEditingSeries(null);setAddingSeries(false);}} aiStyle={effectiveAiStyle} studioSettings={profile?.studios?.settings} availableZones={profile?.settings?.preferred_zones?.length?profile.settings.preferred_zones:undefined} availableSeriesTypes={profile?.settings?.series_types?.length?profile.settings.series_types:undefined}/>
            : <>
                {/* Top bar: title + search + new */}
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:26,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Biblioteca de Séries</h2>
                  <input value={seriesSearch} onChange={e=>setSeriesSearch(e.target.value)} placeholder="Pesquisar séries…" style={{fontFamily:"'Satoshi',sans-serif",fontSize:13,padding:"7px 14px",borderRadius:20,border:`1px solid ${C.stone}`,outline:"none",background:C.white,color:C.ink,width:200,flexShrink:0}}/>
                  <Btn onClick={()=>setAddingSeries(true)}><Icon name="plus" size={14}/> Nova série</Btn>
                </div>
                {/* Two-column layout: left filters + right series */}
                <div style={{display:"flex",gap:20,alignItems:"flex-start"}}>
                  {/* Left filter panel */}
                  <div style={{width:170,flexShrink:0,display:"flex",flexDirection:"column",gap:16}}>
                    {/* Type filter */}
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Tipo</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {[["all","Todas"],["reformer","Reformer"],["barre","Barre"],["signature","Signature"],["approved","✓ Aprovadas"]].map(([val,lbl])=>(
                          <button key={val} onClick={()=>setFilterType(val)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:8,border:`1px solid ${filterType===val?C.neutral:C.stone}`,background:filterType===val?C.neutral:"transparent",color:filterType===val?C.white:C.ink,cursor:"pointer",textAlign:"left"}}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                    {/* Sort */}
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Ordenar</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {[["name","Nome"],["createdAt","Data"],["targetZone","Zona"]].map(([val,lbl])=>(
                          <button key={val} onClick={()=>{ if(sortBy===val) setSortOrder(p=>p==="asc"?"desc":"asc"); else { setSortBy(val); setSortOrder("asc"); }}} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:8,border:`1px solid ${sortBy===val?C.neutral:C.stone}`,background:sortBy===val?C.neutral:"transparent",color:sortBy===val?C.white:C.ink,cursor:"pointer",textAlign:"left"}}>
                            {lbl}{sortBy===val?(sortOrder==="asc"?" ↑":" ↓"):""}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* View options */}
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Vista</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        <button onClick={()=>{ const n=!compactSeries; setCompactSeries(n); try{localStorage.setItem('compactSeries',String(n));}catch(e){} }} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:8,border:`1px solid ${compactSeries?C.neutral:C.stone}`,background:compactSeries?C.neutral:"transparent",color:compactSeries?C.white:C.ink,cursor:"pointer",textAlign:"left"}}>{compactSeries?"☰ Normal":"⊞ Compacto"}</button>
                        <button onClick={()=>{ const n=!showChoreo; setShowChoreo(n); try{localStorage.setItem('showChoreo',String(n));}catch(e){} }} style={{fontFamily:"'Satoshi',sans-serif",fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:8,border:`1px solid ${!showChoreo?C.neutral:C.stone}`,background:!showChoreo?C.neutral:"transparent",color:!showChoreo?C.white:C.ink,cursor:"pointer",textAlign:"left"}}>{showChoreo?"Ocultar coreog.":"Mostrar coreog."}</button>
                      </div>
                    </div>
                    {/* Movements link */}
                    <button onClick={()=>navigate({mode:"movements",cls:null,fromLibrary:true})} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,color:C.mist,background:"none",border:"none",cursor:"pointer",padding:"4px 0",textAlign:"left",textDecoration:"underline",marginTop:4}}>Biblioteca de movimentos →</button>
                  </div>
                  {/* Right: series list */}
                  <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:8}}>
                    {(()=>{
                      let lastZone = undefined;
                      return filteredSeries.map(s=>{
                        const zone = sortBy==="targetZone" ? (s.primaryZone||s.targetZone?.split(",")[0]?.trim()||"") : null;
                        const showDivider = zone!==null && zone!==lastZone;
                        lastZone = zone;
                        return (
                          <React.Fragment key={s.id}>
                            {showDivider&&(
                              <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0 2px"}}>
                                <div style={{flex:1,height:1,background:C.stone}}/>
                                <span style={{fontSize:10,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.1em"}}>{zone||"—"}</span>
                                <div style={{flex:1,height:1,background:C.stone}}/>
                              </div>
                            )}
                            <SeriesCard series={s}
                              modalityFilter={filterType==="reformer"?"reformer":filterType==="barre"?"barre":null}
                              onEdit={s=>setEditingSeries(s)}
                              onDelete={deleteSeries}
                              onUpdateSeries={saveSeries}
                              aiStyle={effectiveAiStyle}
                              currentUserId={user?.id}
                              hasStudio={!!profile?.studio_id}
                              onCopy={copyToLibrary}
                              onPublish={publishToStudio}
                              onUnpublish={unpublishFromStudio}
                              onMakePublic={makeSeriesPublic}
                              onTogglePublic={toggleSeriesPublic}
                              onSend={item=>setSendModalItem(item)}
                              compact={compactSeries}
                            />
                          </React.Fragment>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
        )}

        {/* ── STUDIO ── */}
        {screen.mode==="studio"&&(
          <StudioPage profile={profile} user={user} onProfileUpdate={p=>setProfile(p)} onCopyToLibrary={copyToLibrary}/>
        )}

        {/* ── PERFIL ── */}
        {screen.mode==="perfil"&&(
          <ProfilePage profile={profile} user={user} onProfileUpdate={p=>setProfile(p)}
            studioSettings={profile?.studios?.settings}
            aiStyle={aiStyle} onAiStyleChange={v=>{setAiStyle(v); api.save('aistyle',{value:v});}}
            series={series} onSaveSeries={saveSeries}/>
        )}

        {/* ── MOVEMENTS ── */}
        {screen.mode==="movements"&&(
          <MovementLibraryPage series={series} onUpdateSeries={saveSeries} aiStyle={effectiveAiStyle}/>
        )}

        {/* ── BUILDER ── */}
        {screen.mode==="builder"&&(
          <ClassBuilder
            allSeries={series} classes={classes}
            onSave={c=>saveClass(c)}
            onDeleteClass={deleteClass}
            onViewAula={c=>navigate({mode:"aula",cls:c,fromLibrary:false})}
            studioSettings={profile?.studios?.settings}
            onPublishClass={publishClassToStudio}
            hasStudio={!!profile?.studio_id}
            onToggleClassPublic={toggleClassPublic}
            onSendClass={item=>setSendModalItem(item)}
          />
        )}

        {/* ── AULA (merged) ── */}
        {screen.mode==="aula"&&screen.cls&&(
          <AulaView
            cls={screen.cls} allSeries={series}
            onBack={goBack}
            onDeleteClass={async id=>{ await deleteClass(id); goBack(); }}
            onUpdateSeries={saveSeries}
            onUpdateClass={updateClass}
            aiStyle={effectiveAiStyle}
            allClasses={classes}
            onSaveFork={saveFork}
            teachingMode={aulaTeachingMode}
            onTeachingModeChange={setAulaTeachingMode}
            onSeriesEditChange={setAulaEditingSeries}
            studioSettings={profile?.studios?.settings}
          />
        )}

      </div>{/* end main content */}
      {!isAulaMode&&<ContextAIPanel
        open={aiPanelOpen}
        onToggle={toggleAiPanel}
        screen={screen}
        editingSeries={screen.mode==="aula" ? aulaEditingSeries : (editingSeries||null)}
        series={series}
        classes={classes}
        aiStyle={effectiveAiStyle}
        onUpdateSeries={saveSeries}
        onNavigate={navigate}
        profile={profile}
      />}
    </div>{/* end flex row */}
    {sendModalItem&&<SendModal item={sendModalItem} currentUserId={user?.id} onSend={sendToInstructor} onClose={()=>setSendModalItem(null)}/>}
    </div>
  );
}

export default function HavenInstructor() {
  return (
    <ToastProvider>
    <ConfirmProvider>
    <HavenApp />
    </ConfirmProvider>
    </ToastProvider>
  );
}
