import React, { useState, useEffect } from "react";
import { supabase } from './supabase.js';
import Auth from './Auth.jsx';

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
  reformer:{ springs:"", props:"", startPosition:"", movements:[{ timing:"", lyric:"", movement:"", breath:"", transitionCue:"" }] },
  barre:{ props:"", startPosition:"", movements:[{ timing:"", lyric:"", movement:"", breath:"", transitionCue:"" }] },
  muscles:[], cues:"", song:"", videoUrl:"", targetZone:"", primaryZone:"", openCue:"", closeCue:"", createdAt:"",
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
  target_zone: s.targetZone || null, primary_zone: s.primaryZone || null,
  reformer: s.reformer || null, barre: s.barre || null,
  video_url: s.videoUrl || null, created_by: userId, visibility: 'personal',
  updated_at: new Date().toISOString(),
});
const seriesFromDB = row => ({
  id: row.id, name: row.name, type: row.type, status: row.status || 'testing',
  song: row.song || '', introCue: row.intro_cue || '', openCue: row.open_cue || '',
  closeCue: row.close_cue || '', modifications: row.modifications || '',
  muscles: row.muscles || [], cues: row.cues || '',
  targetZone: row.target_zone || '', primaryZone: row.primary_zone || '',
  reformer: row.reformer || { springs:'', props:'', startPosition:'', movements:[{ timing:'', lyric:'', movement:'', breath:'', transitionCue:'' }] },
  barre: row.barre || { props:'', startPosition:'', movements:[{ timing:'', lyric:'', movement:'', breath:'', transitionCue:'' }] },
  videoUrl: row.video_url || '', createdAt: row.created_at ? row.created_at.split('T')[0] : '',
});
const classToDB = (c, userId) => ({
  id: c.id, name: c.name, type: c.type, date: c.date || null,
  series_order: c.seriesIds || [], notes: c.notes || null,
  created_by: userId, visibility: 'personal',
});
const classFromDB = row => ({
  id: row.id, name: row.name, type: row.type, date: row.date || '',
  seriesIds: row.series_order || [], notes: row.notes || '',
});

// ─── PERSIST (Supabase) ──────────────────────────────────────────────────────
const api = {
  async load(key, fallback) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return fallback;
      if (key === 'series') {
        const { data, error } = await supabase.from('series').select('*').eq('created_by', user.id).order('created_at', { ascending: true });
        return (!error && data) ? data.map(seriesFromDB) : fallback;
      }
      if (key === 'classes') {
        const { data, error } = await supabase.from('classes').select('*').eq('created_by', user.id).order('created_at', { ascending: true });
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
const SeriesCard = ({ series, onEdit, onDelete, onUpdateSeries, aiStyle, modalityFilter=null }) => {
  const isSig = series.type === "signature";
  const [expanded, setExpanded] = useState(false);
  const [showR, setShowR] = useState(modalityFilter !== "barre");
  const [showB, setShowB] = useState(modalityFilter !== "reformer");
  // localSeries: in-card live copy so edits are reflected immediately
  const [localSeries, setLocalSeries] = useState(series);
  // sync when parent saves (e.g. after full edit)
  React.useEffect(()=>setLocalSeries(series), [series]);

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
              {rows.map((row,i)=>{
                const cue=row.transitionCue?.trim();
                const rk=`${localSeries.id}-${i}`;
                return (
                  <React.Fragment key={i}>
                    {i>0&&(
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
                      {showR&&<td style={{fontSize:12,padding:"7px 10px",color:C.ink,fontWeight:500}}>
                        {row.r?.movement||<span style={{color:C.stone}}>—</span>}
                        {row.r?.notes&&<div title={row.r.notes} style={{fontSize:10,color:C.mist,fontStyle:"italic",marginTop:2,borderTop:`1px solid ${C.stone}40`,paddingTop:2}}>{row.r.notes}</div>}
                      </td>}
                      {showB&&<td style={{fontSize:12,padding:"7px 10px",color:C.ink,fontWeight:500}}>
                        {row.b?.movement||<span style={{color:C.stone}}>—</span>}
                        {row.b?.notes&&<div title={row.b.notes} style={{fontSize:10,color:C.mist,fontStyle:"italic",marginTop:2,borderTop:`1px solid ${C.stone}40`,paddingTop:2}}>{row.b.notes}</div>}
                      </td>}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Non-signature: single modality list
    const d=localSeries.type==="barre"?localSeries.barre:localSeries.reformer;
    const choreo=d?.movements?.some(m=>m.timing);
    return (
      <div>
        {d?.movements?.map((m,i)=>{
          const cue=m.transitionCue?.trim();
          return (
            <React.Fragment key={i}>
              {i>0&&(
                <div style={{background:C.cream,padding:"4px 10px",borderRadius:4,margin:"2px 0",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:13,color:"#7a4010",fontWeight:700,flexShrink:0}}>✦</span>
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
                    style={{flex:1,fontSize:13,fontStyle:"italic",color:"#7a4010",background:"transparent",border:"none",borderBottom:`1px solid ${C.sig}60`,outline:"none",fontFamily:"'Satoshi', sans-serif",padding:"2px 4px"}}
                  />
                  <CardCueGen series={localSeries} rowIndex={i} rows={null} aiStyle={aiStyle} onUpdate={setSeries_} nonsig/>
                </div>
              )}
              <div style={{display:"flex",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                {choreo&&<span style={{fontSize:13,color:C.mist,minWidth:90,flexShrink:0}}>{m.timing}</span>}
                {choreo&&<span style={{fontSize:13,color:C.mist,minWidth:100,fontStyle:"italic",flexShrink:0}}>{m.lyric}</span>}
                <span style={{fontSize:13,fontWeight:500,color:C.ink,flex:1}} title={m.notes||undefined}>
                  {m.movement}{m.notes&&<span style={{marginLeft:4,fontSize:9,color:C.mist}}>●</span>}
                </span>
                <span style={{fontSize:11,color:C.mist}}>{m.breath}</span>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{paddingTop:6}} onClick={e=>e.stopPropagation()}>
          <Btn small variant="ghost" onClick={e=>{ e.stopPropagation();
            const k=localSeries.type==="barre"?"barre":"reformer";
            const newM=[...(localSeries[k]?.movements||[]),{movement:"",breath:"",timing:"",lyric:"",transitionCue:"",notes:""}];
            setSeries_({...localSeries,[k]:{...localSeries[k],movements:newM}});
          }}><Icon name="plus" size={12}/> Adicionar movimento</Btn>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:C.white, borderRadius:14, border:`1px solid ${expanded?C.neutral:C.stone}`,
      overflow:"hidden", transition:"border-color 0.2s, box-shadow 0.2s",
      boxShadow:expanded?"0 4px 24px rgba(0,0,0,0.09)":"none" }}>

      {/* Collapsed header */}
      <div style={{ padding:"14px 20px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}
        onClick={()=>setExpanded(p=>!p)}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Clash Display', sans-serif", fontSize:18, fontWeight:500, color:C.ink, marginBottom:4 }}>{series.name}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            {isSig  && <Badge label="Signature" color="gold"/>}
            {!isSig && <Badge label={series.type==="reformer"?"Reformer":"Barre"} color={series.type==="reformer"?"teal":"coral"}/>}
            <span title={series.status==="approved"?"Aprovada":"Em teste"} style={{
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              width:20,height:20,borderRadius:"50%",flexShrink:0,
              background:series.status==="approved"?"#dbeeff":"#e8e4e0",
              border:`1.5px solid ${series.status==="approved"?"#3a6a9a":"#b8b0aa"}`,
              fontSize:11,color:series.status==="approved"?"#1a4a7a":"#8a7f78",fontWeight:700
            }}>{series.status==="approved"?"✓":"…"}</span>
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
          </div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
          {expanded&&(<>
            <Btn small variant="ghost" onClick={e=>{e.stopPropagation();onEdit(series);}}><Icon name="edit" size={13}/> Editar</Btn>
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

          {/* Reformer/Barre toggles — only for Signature */}
          {isSig&&(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <Toggle label="Reformer" active={showR} onClick={()=>setShowR(p=>!p)} color={C.reformer}/>
              <Toggle label="Barre"    active={showB} onClick={()=>setShowB(p=>!p)} color={C.barre}/>
            </div>
          )}

          {/* Setup — filtered by toggle */}
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
          ):isSig?null:(()=>{
            const d=series.type==="barre"?series.barre:series.reformer;
            const col=series.type==="barre"?C.barre:C.reformer;
            return <div className="setup-box" style={{background:`${col}07`,borderRadius:8,padding:"8px 12px",border:`1px solid ${col}20`,fontSize:13,color:C.ink,display:"flex",gap:14,flexWrap:"wrap"}}>
              {series.reformer?.springs&&<span><b>Springs:</b> {series.reformer.springs}</span>}
              {d?.props&&<span><b>Props:</b> {d.props}</span>}
              {d?.startPosition&&<span><b>Posição:</b> {d.startPosition}</span>}
            </div>;
          })()}

          {/* Open / close cues */}
          {(localSeries.openCue||localSeries.closeCue)&&(
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {localSeries.openCue&&<div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"#2a5a4a",background:"#e8f4ee",borderRadius:6,padding:"6px 10px"}}>
                <span style={{fontWeight:700,flexShrink:0,fontSize:10,paddingTop:1,letterSpacing:"0.06em"}}>▶ INÍCIO</span>
                <span style={{fontStyle:"italic",lineHeight:1.5}}>{localSeries.openCue}</span>
              </div>}
              {localSeries.closeCue&&<div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"#5a3a2a",background:"#f4ede8",borderRadius:6,padding:"6px 10px"}}>
                <span style={{fontWeight:700,flexShrink:0,fontSize:10,paddingTop:1,letterSpacing:"0.06em"}}>■ FIM</span>
                <span style={{fontStyle:"italic",lineHeight:1.5}}>{localSeries.closeCue}</span>
              </div>}
            </div>
          )}

          {/* Intro cue */}
          <IntroCue
            series={localSeries}
            aiStyle={aiStyle}
            stopProp
            onChange={v=>setSeries_({...localSeries, introCue:v})}
          />

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

  // Build movement list: { movement, notes, type, seriesName, side }
  const allMovs = React.useMemo(()=>{
    const map = new Map(); // movement name → { entries: [], types: Set }
    series.forEach(s=>{
      const addMovs = (movs, side) => {
        (movs||[]).forEach(m=>{
          if(!m.movement) return;
          if(!map.has(m.movement)) map.set(m.movement, { movement:m.movement, namePT:"", nameEN:"", entries:[], types:new Set() });
          const entry = map.get(m.movement);
          entry.entries.push({ seriesName:s.name, side, notes:m.notes||"" });
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
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Séries</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((mov,i)=>(
              <tr key={mov.movement} style={{borderTop:`1px solid ${C.stone}`,background:i%2===0?C.white:C.cream}}>
                <td style={{padding:"10px 16px",fontSize:13,fontWeight:600,color:C.ink,verticalAlign:"top"}}>
                  {mov.movement}
                  {mov.entries.some(e=>e.notes)&&(
                    <div style={{fontSize:11,color:C.mist,fontStyle:"italic",marginTop:3,lineHeight:1.4}}>
                      {[...new Set(mov.entries.filter(e=>e.notes).map(e=>e.notes))].join(" · ")}
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
    : "18px 2fr minmax(65px,80px) 1.5fr 28px";
  return (
    <div style={{display:"flex",flexDirection:"column",gap:3}}>
      <div style={{display:"grid",gap:5,gridTemplateColumns:cols,marginBottom:3}}>
        <div/>
        {chore&&<div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Timing</div>}
        {chore&&<div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Lyric</div>}
        <div style={{fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase"}}>Movement</div>
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
const MovementAnalysisChat = ({ series, aiStyle }) => {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const bottomRef = React.useRef();
  const toast_ = useToast();

  React.useEffect(() => {
    if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
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

  const analyse = async (userMsg) => {
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
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {messages.length === 0 && (
            <Btn small variant="gold"
              onClick={e => { e.stopPropagation(); setOpen(true); analyse(); }}
              disabled={loading}>
              <Icon name="ai" size={12}/> Analisa a minha série
            </Btn>
          )}
          {messages.length > 0 && (
            <button onClick={e=>{e.stopPropagation();reset();}}
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
          <div style={{maxHeight:340,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
            {messages.length === 0 && !loading && (
              <div style={{textAlign:"center",color:C.mist,fontSize:13,padding:"20px 0"}}>
                Clica em "Analisa a minha série" para começar, ou faz uma pergunta específica.
              </div>
            )}
            {messages.map((m, i) => (
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
              </div>
            ))}
            {loading && (
              <div style={{display:"flex",alignItems:"center",gap:8,color:C.mist,fontSize:12}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite"}}/>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite 0.2s"}}/>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.neutral,animation:"pulse 1s infinite 0.4s"}}/>
              </div>
            )}
            <div ref={bottomRef}/>
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
const SeriesEditor = ({ series, onSave, onSaveAsNew, onCancel, onDelete, aiStyle }) => {
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Zonas target</label>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {["Glutes","Hamstrings","Quads","Inner Thighs","Calves","Core","Back","Arms","Shoulders","Chest","Full Body","Cardio","Warm-Up","Mobility","Flexibility","Balance"].map(tag=>{
                const active = (s.targetZone||"").split(",").map(x=>x.trim()).includes(tag);
                const isPrimary = s.primaryZone===tag;
                return <button key={tag} onClick={()=>{
                  const tags = (s.targetZone||"").split(",").map(x=>x.trim()).filter(Boolean);
                  const next = active ? tags.filter(t=>t!==tag) : [...tags,tag];
                  const updates = {targetZone: next.join(", ")};
                  // If removing the primary zone, clear it
                  if(active && isPrimary) updates.primaryZone = "";
                  // If only one tag left, auto-set as primary
                  if(!active && next.length===1) updates.primaryZone = tag;
                  setS(p=>({...p,...updates}));
                }} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,
                  border:`1px solid ${isPrimary?"#1a3a6a":active?"#2a5a8a":C.stone}`,
                  background:isPrimary?`${C.blue}90`:active?`${C.blue}60`:"transparent",
                  color:isPrimary?"#0a1a4a":active?"#1a3a6a":C.mist,cursor:"pointer"}}>{tag}</button>;
              })}
            </div>
          </div>
          {(()=>{
            const activeTags = (s.targetZone||"").split(",").map(x=>x.trim()).filter(Boolean);
            if(activeTags.length < 2) return null;
            return (
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
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
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em"}}>Data de criação</label>
          <div style={{fontSize:13,color:C.mist,padding:"8px 0"}}>{s.createdAt?new Date(s.createdAt).toLocaleDateString("pt-PT",{day:"2-digit",month:"short",year:"numeric"}):"—"}</div>
        </div>
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

      {/* AI movement analysis */}
      <MovementAnalysisChat series={s} aiStyle={aiStyle}/>

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
  showTiming, showLyric, showBreath,
  aiStyle, onEdit, onUpdateSeries, setSeriesList, MovTable
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
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
      <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,cursor:"pointer",borderBottom:collapsed?"none":`1px solid ${C.stone}`}}
        onClick={()=>setCollapsed(p=>!p)}>
        <span style={{fontFamily:"'Clash Display', sans-serif",fontSize:9,fontWeight:600,letterSpacing:"0.18em",textTransform:"uppercase",color:C.mist,flexShrink:0}}>0{idx+1}</span>
        <span style={{fontFamily:"'Clash Display', sans-serif",fontSize:18,fontWeight:500,color:C.ink,flex:1}}>{ser.name}</span>
        {ser.song&&<span style={{display:"inline-flex",alignItems:"center",gap:4,color:C.mist,fontSize:12,flexShrink:0}}><Icon name="music" size={11}/>{ser.song}</span>}
        <div className="no-print" style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}} onClick={e=>e.stopPropagation()}>
          {isSig&&<>
            <Toggle label="Reformer" active={modR[ser.id]!==false} onClick={()=>setModR(p=>({...p,[ser.id]:!p[ser.id]}))} color={C.reformer}/>
            <Toggle label="Barre"    active={modB[ser.id]!==false} onClick={()=>setModB(p=>({...p,[ser.id]:!p[ser.id]}))} color={C.barre}/>
          </>}
          <Btn small variant="ghost" onClick={onEdit}><Icon name="edit" size={13}/> Editar série</Btn>
        </div>
        <span style={{color:C.mist,display:"inline-flex",transition:"transform 0.2s",transform:collapsed?"rotate(0deg)":"rotate(180deg)",flexShrink:0}}>
          <Icon name="chevron" size={15}/>
        </span>
      </div>

      {/* Card body */}
      {!collapsed&&(
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

          {(ser.openCue||ser.closeCue)&&(
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {ser.openCue&&<div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"#2a5a4a"}}>
                <span style={{fontWeight:700,flexShrink:0,fontSize:10,paddingTop:1}}>▶ INÍCIO</span>
                <span style={{fontStyle:"italic",lineHeight:1.5}}>{ser.openCue}</span>
              </div>}
              {ser.closeCue&&<div style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:12,color:"#5a3a2a"}}>
                <span style={{fontWeight:700,flexShrink:0,fontSize:10,paddingTop:1}}>■ FIM</span>
                <span style={{fontStyle:"italic",lineHeight:1.5}}>{ser.closeCue}</span>
              </div>}
            </div>
          )}
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

// ─── AULA VIEW (merged Ver + Modo Aula) ───────────────────────────────────────
const AulaView = ({ cls, allSeries, onBack, onEditClass, onDeleteClass, onUpdateSeries, onUpdateClass, aiStyle }) => {
  const [seriesList, setSeriesList] = useState(()=>cls.seriesIds.map(id=>allSeries.find(s=>s.id===id)).filter(Boolean));
  const [editingId, setEditingId] = useState(null);
  const [notes, setNotes] = useState(cls.notes||"");
  const currentCls = React.useMemo(()=>({...cls, notes}), [cls, notes]);
  const [showBreath,     setShowBreath]     = useState(false);
  const [showLyric,      setShowLyric]      = useState(false);
  const [showTiming,     setShowTiming]     = useState(false);
  const [showSetup,      setShowSetup]      = useState(true);
  const [showIntro,      setShowIntro]      = useState(false);
  const [showCues,       setShowCues]       = useState(false);
  const [showInstrNotes, setShowInstrNotes] = useState(false);
  const [showAulaNotes,  setShowAulaNotes]  = useState(false);
  const [modR, setModR] = useState({});
  const [modB, setModB] = useState({});

  const isSig   = cls.type==="signature";

  const saveEdit = updated => { onUpdateSeries(updated); setSeriesList(p=>p.map(s=>s.id===updated.id?updated:s)); setEditingId(null); };

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
              {showR&&showBreath&&<th style={{fontSize:12,fontWeight:600,color:`${C.reformer}90`,textAlign:"left",padding:"8px 12px"}}>Breath R</th>}
              {showB&&<th style={{fontSize:12,fontWeight:600,color:"#c0507a",textAlign:"left",padding:"8px 12px"}}>Barre</th>}
              {showB&&showBreath&&<th style={{fontSize:12,fontWeight:600,color:"#c0507a",textAlign:"left",padding:"8px 12px"}}>Breath B</th>}
            </tr></thead>
            <tbody>
              {rows.map((row,i)=>{
                const cue=row.transitionCue?.trim(), rk=`${ser.id}-${i}`;
                return (
                  <React.Fragment key={i}>
                    {i>0&&showCues&&(
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
                    )}
                    <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                      {showTiming&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{row.timing}</td>}
                      {showLyric &&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic"}}>{row.lyric}</td>}
                      {showR&&<td title={row.r?.notes||undefined} style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,cursor:row.r?.notes?"help":"default"}}>{row.r?.movement||<span style={{color:C.stone}}>—</span>}{row.r?.notes&&<span style={{marginLeft:3,fontSize:9,color:C.mist}}>●</span>}</td>}
                      {showR&&showBreath&&<td style={{fontSize:11,padding:"8px 10px",color:C.mist}}>{row.r?.breath||""}</td>}
                      {showB&&<td title={row.b?.notes||undefined} style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,cursor:row.b?.notes?"help":"help"}}>{row.b?.movement||<span style={{color:C.stone}}>—</span>}{row.b?.notes&&<span style={{marginLeft:3,fontSize:9,color:C.mist}}>●</span>}</td>}
                      {showB&&showBreath&&<td style={{fontSize:11,padding:"8px 10px",color:C.mist}}>{row.b?.breath||""}</td>}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {showR&&<div style={{background:`${C.reformer}08`,borderRadius:10,padding:12,border:`1px solid ${C.reformer}30`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.reformer,textTransform:"uppercase",marginBottom:8}}>Reformer</div>
            {ser.reformer?.movements?.map((m,i)=><div key={i} style={{borderBottom:`1px solid ${C.stone}`,padding:"6px 0",display:"flex",gap:8}}><span style={{flex:1,fontSize:13,fontWeight:500,color:C.ink}}>{m.movement}</span>{showBreath&&<span style={{fontSize:11,color:C.mist}}>{m.breath}</span>}</div>)}
          </div>}
          {showB&&<div style={{background:`${C.barre}20`,borderRadius:10,padding:12,border:`1px solid ${C.barre}60`}}>
            <div style={{fontSize:10,fontWeight:700,color:C.barre,textTransform:"uppercase",marginBottom:8}}>Barre</div>
            {ser.barre?.movements?.map((m,i)=><div key={i} style={{borderBottom:`1px solid ${C.stone}`,padding:"6px 0",display:"flex",gap:8}}><span style={{flex:1,fontSize:13,fontWeight:500,color:C.ink}}>{m.movement}</span>{showBreath&&<span style={{fontSize:11,color:C.mist}}>{m.breath}</span>}</div>)}
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
          {showBreath&&<th style={{fontSize:12,fontWeight:600,color:C.mist,textAlign:"left",padding:"8px 12px"}}>Breath</th>}
        </tr></thead>
        <tbody>
          {d?.movements?.map((m,i)=>{
            const cue=m.transitionCue?.trim();
            return (
              <React.Fragment key={i}>
                {i>0&&showCues&&(
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
                )}
                <tr style={{borderBottom:`1px solid ${C.stone}`,background:C.white}}>
                  {showTiming&&choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,whiteSpace:"nowrap"}}>{m.timing}</td>}
                  {showLyric&&choreo&&<td style={{fontSize:13,padding:"8px 12px",color:C.mist,fontStyle:"italic"}}>{m.lyric}</td>}
                  <td title={m.notes||undefined} style={{fontSize:13,padding:"8px 10px",color:C.ink,fontWeight:600,cursor:m.notes?"help":"default"}}>
                    {m.movement}{m.notes&&<span style={{marginLeft:4,fontSize:9,color:C.mist}}>●</span>}
                  </td>
                  {showBreath&&<td style={{fontSize:11,padding:"8px 10px",color:C.mist}}>{m.breath}</td>}
                </tr>
              </React.Fragment>
            );
          })}
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
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print" style={{padding:"20px 24px 0"}}>
        {/* Row 1: navigation + title + actions + PDF */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}}>
          <Btn variant="ghost" onClick={onBack}><Icon name="back" size={14}/> Voltar</Btn>
          <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:24,fontWeight:500,color:C.ink,margin:0,flex:1}}>{cls.name}</h2>
          {onEditClass&&<Btn small variant="ghost" onClick={()=>onEditClass(currentCls)}><Icon name="edit" size={13}/> Editar aula</Btn>}
          {onDeleteClass&&<Btn small variant="danger" onClick={()=>onDeleteClass(cls.id)}><Icon name="x" size={13}/> Apagar aula</Btn>}

        </div>
      </div>
      <div style={{padding:"0 24px 32px", background:C.cream, minHeight:"100vh"}}>
        {/* Print header */}
        <div className="no-print" style={{paddingTop:8,paddingBottom:12,borderBottom:`1px solid ${C.stone}`,marginBottom:16}}>
          <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:22,fontWeight:500,color:C.ink}}>{cls.name}</div>
          {cls.date&&<div style={{fontSize:12,color:C.mist,marginTop:2,marginBottom:10}}>{cls.date}</div>}
          {/* Toggles row — visible on screen between title and content */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:10}}>
            {tBtn("Timing",showTiming,()=>setShowTiming(p=>!p))}
            {tBtn("Lyric",showLyric,()=>setShowLyric(p=>!p))}
            {tBtn("Breath",showBreath,()=>setShowBreath(p=>!p))}
            {tBtn("Setup",showSetup,()=>setShowSetup(p=>!p))}
            {tBtn("Intro",showIntro,()=>setShowIntro(p=>!p))}
            {tBtn("Cues",showCues,()=>setShowCues(p=>!p))}
            {tBtn("Instr Notes",showInstrNotes,()=>setShowInstrNotes(p=>!p))}
            {tBtn("Notas da Aula",showAulaNotes,()=>setShowAulaNotes(p=>!p))}
          </div>
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

        {/* Series */}
        <div className="print-series-grid">
        {seriesList.map((ser,idx)=>(
          <div key={ser.id} className="print-series-card" style={{marginBottom:16,pageBreakInside:"avoid"}}>
            {editingId===ser.id ? (
              <SeriesEditor series={ser} onSave={saveEdit} onCancel={()=>setEditingId(null)} aiStyle={aiStyle}/>
            ) : (
              <AulaSeriesCard ser={ser} idx={idx} isSig={isSig}
                modR={modR} modB={modB} setModR={setModR} setModB={setModB}
                showSetup={showSetup} showIntro={showIntro} showCues={showCues} showInstrNotes={showInstrNotes}
                showTiming={showTiming} showLyric={showLyric} showBreath={showBreath}
                aiStyle={aiStyle}
                onEdit={()=>setEditingId(ser.id)}
                onUpdateSeries={onUpdateSeries}
                setSeriesList={setSeriesList}
                MovTable={MovTable}
              />

            )}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
};

// ─── CLASS BUILDER ────────────────────────────────────────────────────────────
const ClassBuilder = ({ allSeries, classes, onSave, onDeleteClass, onViewAula, initialEditCls }) => {
  const [cls, setCls]     = useState(initialEditCls||null);
  const [editing, setEditing] = useState(!!initialEditCls);

  const dragRef   = React.useRef(null);
  const [zoneFilter, setZoneFilter] = React.useState("all");
  const newClass  = type => { setCls({id:`c-${Date.now()}`,name:"",type,date:new Date().toISOString().split("T")[0],seriesIds:[],notes:""}); setEditing(true); };
  const editClass = c    => { setCls({...c}); setEditing(true); };
  const addSer    = id   => setCls(p=>({...p,seriesIds:[...p.seriesIds,id]}));
  const remSer    = id   => setCls(p=>({...p,seriesIds:p.seriesIds.filter(s=>s!==id)}));
  const moveSer   = (i,d)=> setCls(p=>{ const ids=[...p.seriesIds]; const sw=i+d; if(sw<0||sw>=ids.length)return p; [ids[i],ids[sw]]=[ids[sw],ids[i]]; return {...p,seriesIds:ids}; });
  const available = React.useMemo(()=>
    allSeries.filter(s=>!cls?.seriesIds.includes(s.id)&&(cls?.type==="signature"?s.type==="signature":s.type===cls?.type||s.type==="signature"))
  , [allSeries, cls?.seriesIds, cls?.type]);

  // All zones across available series (all targetZone values, not just primary)
  const availableZones = React.useMemo(()=>{
    const zset = new Set();
    available.forEach(s=>(s.targetZone||"").split(",").map(z=>z.trim()).filter(Boolean).forEach(z=>zset.add(z)));
    return [...zset].sort((a,b)=>a.localeCompare(b,"pt"));
  }, [available]);

  const availableFiltered = zoneFilter==="all"
    ? available
    : available.filter(s=>(s.targetZone||"").split(",").map(z=>z.trim()).includes(zoneFilter));

  if (!editing) return (
    <div>
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        <Btn onClick={()=>newClass("reformer")}><Icon name="plus" size={14}/> Nova aula Reformer</Btn>
        <Btn variant="ghost" onClick={()=>newClass("barre")}><Icon name="plus" size={14}/> Nova aula Barre</Btn>
        <Btn variant="ghost" onClick={()=>newClass("signature")} style={{borderColor:C.sig,color:"#7a4010"}}><Icon name="plus" size={14}/> Nova Signature</Btn>
      </div>
      {classes.length===0&&<div style={{textAlign:"center",color:C.mist,padding:40,fontSize:14}}>Ainda não há aulas criadas.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {classes.map(c=>(
          <div key={c.id} style={{background:C.white,borderRadius:12,border:`1px solid ${C.stone}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Clash Display', sans-serif",fontSize:18,fontWeight:500,color:C.ink}}>{c.name||"Sem nome"}</div>
              <div style={{fontSize:12,color:C.mist,marginTop:2}}>{c.date} · {c.seriesIds.length} série{c.seriesIds.length!==1?"s":""}</div>
            </div>
            <Badge label={c.type==="signature"?"✦ Signature":c.type} color={c.type==="signature"?"gold":c.type==="reformer"?"teal":"coral"}/>
            <Btn small variant="ghost" onClick={()=>editClass(c)}><Icon name="edit" size={13}/> Editar</Btn>
            <Btn small onClick={()=>onViewAula(c)}><Icon name="eye" size={13}/> Ver Aula</Btn>
            <button onClick={()=>onDeleteClass(c.id)} title="Apagar aula" style={{background:"none",border:`1px solid ${C.stone}`,borderRadius:8,cursor:"pointer",color:C.coral,padding:"6px 8px",display:"inline-flex",alignItems:"center"}}><Icon name="x" size={13}/></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",gap:12,alignItems:"center"}}>
        <Btn variant="ghost" small onClick={()=>setEditing(false)}><Icon name="back" size={13}/></Btn>
        <h3 style={{fontFamily:"'Clash Display', sans-serif",fontSize:22,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Biblioteca de Aulas</h3>
        <Btn onClick={()=>{onSave(cls);setEditing(false);}}><Icon name="save" size={14}/> Guardar aula</Btn>
        {cls.id&&classes.find(x=>x.id===cls.id)&&<Btn variant="ghost" small onClick={()=>{
          const newName = window.prompt("Nome da nova aula:", cls.name+" (cópia)");
          if(newName){ onSave({...cls, id:`c-${Date.now()}`, name:newName}); setEditing(false); }
        }}><Icon name="copy" size={13}/> Duplicar</Btn>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:12,alignItems:"end"}}>
        <Field label="Nome da aula" val={cls.name} onChange={v=>setCls(p=>({...p,name:v}))} placeholder="ex. Cardio Flow Quarta"/>
        <div>
          <label style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.08em",display:"block",marginBottom:4}}>Data</label>
          <input type="date" value={cls.date} onChange={e=>setCls(p=>({...p,date:e.target.value}))} style={{width:"100%",fontFamily:"'Satoshi', sans-serif",fontSize:13,padding:"8px 12px",borderRadius:8,border:`1px solid ${C.stone}`,outline:"none",boxSizing:"border-box"}}/>
        </div>
        <div style={{paddingBottom:2}}><Badge label={cls.type==="signature"?"✦ Signature":cls.type==="reformer"?"Reformer":"Barre"} color={cls.type==="signature"?"gold":cls.type==="reformer"?"teal":"coral"}/></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>Aula ({cls.seriesIds.length} séries)</div>
          {cls.seriesIds.length===0&&<div style={{color:C.mist,fontSize:13,padding:"16px 0"}}>Adiciona séries da biblioteca →</div>}
          {cls.seriesIds.map((id,i)=>{ const ser=allSeries.find(s=>s.id===id); if(!ser)return null; return (
              <div key={id} draggable
                onDragStart={()=>{ dragRef.current=i; }}
                onDragOver={e=>e.preventDefault()}
                onDrop={()=>{ if(dragRef.current!=null&&dragRef.current!==i){ const ids=[...cls.seriesIds]; const [item]=ids.splice(dragRef.current,1); ids.splice(i,0,item); setCls(p=>({...p,seriesIds:ids})); } dragRef.current=null; }}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.white,borderRadius:8,border:`1px solid ${C.stone}`,marginBottom:6,cursor:"grab"}}>
                <span style={{color:C.stone,fontSize:13,userSelect:"none"}}>⠿</span>
                <span style={{fontSize:11,fontWeight:700,color:C.mist,minWidth:20}}>0{i+1}</span>
                <span style={{flex:1,fontSize:13,fontWeight:500,color:C.ink}}>{ser.name}</span>
                <button onClick={()=>remSer(id)} style={{background:"none",border:"none",cursor:"pointer",color:C.coral}}><Icon name="x" size={14}/></button>
              </div>
            );})}
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:C.slate,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Biblioteca disponível</div>
          {availableZones.length>0&&(
            <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
              <button onClick={()=>setZoneFilter("all")} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${zoneFilter==="all"?C.neutral:C.stone}`,background:zoneFilter==="all"?C.neutral:"transparent",color:zoneFilter==="all"?C.white:C.mist,cursor:"pointer"}}>Todas</button>
              {availableZones.map(z=>(
                <button key={z} onClick={()=>setZoneFilter(p=>p===z?"all":z)} style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,border:`1px solid ${zoneFilter===z?C.neutral:C.stone}`,background:zoneFilter===z?C.neutral:"transparent",color:zoneFilter===z?C.white:C.mist,cursor:"pointer"}}>{z}</button>
              ))}
            </div>
          )}
          {availableFiltered.map(ser=>(
            <div key={ser.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:C.cream,borderRadius:8,border:`1px solid ${C.stone}`,marginBottom:6}}>
              <span style={{flex:1,fontSize:13,color:C.slate}}>{ser.name}</span>
              <Badge label={ser.type} color={ser.type==="reformer"?"teal":ser.type==="barre"?"coral":"gold"}/>
              <Btn small variant="ghost" onClick={()=>addSer(ser.id)}><Icon name="plus" size={12}/></Btn>
            </div>
          ))}
          {availableFiltered.length===0&&<div style={{color:C.mist,fontSize:13}}>{zoneFilter!=="all"?"Nenhuma série com esta zona.":"Todas as séries já foram adicionadas."}</div>}
        </div>
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

  // Deduplicated movements with notes aggregated
  const movements = React.useMemo(()=>{
    const map = new Map();
    series.forEach(s=>{
      const add = (movs, side, type) => (movs||[]).forEach(m=>{
        if(!m.movement) return;
        const key = m.movement.toLowerCase().trim();
        if(!map.has(key)) map.set(key, { movement:m.movement, notes:new Set(), series:new Set(), types:new Set() });
        const e = map.get(key);
        if(m.notes) m.notes.split(/[.;·]/).map(n=>n.trim()).filter(Boolean).forEach(n=>e.notes.add(n));
        e.series.add(s.name);
        e.types.add(type);
      });
      add(s.reformer?.movements, "r", s.type==="barre"?"barre":"reformer");
      if(s.type==="signature"||s.type==="barre") add(s.barre?.movements, "b", "barre");
    });
    return [...map.values()].sort((a,b)=>a.movement.localeCompare(b.movement,"pt"));
  }, [series]);

  const filtered = search
    ? movements.filter(m=>m.movement.toLowerCase().includes(search.toLowerCase()))
    : movements;

  const typeColor = t => t==="reformer"?C.reformer:t==="barre"?"#c0507a":C.sig;

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
              <th style={{textAlign:"left",padding:"10px 12px",fontSize:11,fontWeight:700,color:C.neutral,textTransform:"uppercase",letterSpacing:"0.06em"}}>Séries</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m,i)=>(
              <tr key={m.movement} style={{borderTop:`1px solid ${C.stone}`,background:i%2===0?C.white:`${C.cream}80`}}>
                <td style={{padding:"10px 16px",fontWeight:600,color:C.ink,verticalAlign:"top"}}>
                  {m.movement}
                  {m.notes.size>0&&(
                    <div style={{fontSize:11,color:C.mist,fontStyle:"italic",marginTop:3,lineHeight:1.45}}>
                      {[...m.notes].join(" · ")}
                    </div>
                  )}
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top"}}>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {[...m.types].map(t=>(
                      <span key={t} style={{fontSize:10,fontWeight:700,color:typeColor(t),background:`${typeColor(t)}15`,border:`1px solid ${typeColor(t)}40`,borderRadius:20,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t}</span>
                    ))}
                  </div>
                </td>
                <td style={{padding:"10px 12px",verticalAlign:"top",fontSize:11,color:C.mist}}>
                  {[...m.series].join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0&&<div style={{padding:40,textAlign:"center",color:C.mist}}>Nenhum movimento encontrado.</div>}
      </div>
    </div>
  );
};


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function HavenInstructor() {
  const [user,    setUser]    = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [series,  setSeries]  = useState(SIGNATURE_SERIES);
  const [classes, setClasses] = useState(DEFAULT_CLASSES);
  const [aiStyle, setAiStyle] = useState("");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [filterType,    setFilterType]    = useState("all");
  const [sortBy,        setSortBy]        = useState("targetZone");
  const [sortOrder,     setSortOrder]     = useState("asc");
  const [editingSeries, setEditingSeries] = useState(null);
  const [addingSeries,  setAddingSeries]  = useState(false);
  const [screen, setScreen] = useState({ mode:"library", cls:null, fromLibrary:false });

  // Auth listener
  useEffect(()=>{
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) { setDataLoaded(false); setSeries(SIGNATURE_SERIES); setClasses(DEFAULT_CLASSES); setAiStyle(""); }
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
      setDataLoaded(true);
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

  const filteredSeries = series.filter(s=>{
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

  const goTab = id => { setScreen({mode:id,cls:null,fromLibrary:false}); setEditingSeries(null); setAddingSeries(false); };
  const isAulaMode = screen.mode==="aula";

  useEffect(()=>{
    const id = "haven-fonts";
    if(!document.getElementById(id)){
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=satoshi@400,500,700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  if (authLoading) return <div style={{minHeight:"100vh",background:C.cream,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Satoshi',sans-serif",color:C.mist}}>A carregar…</div>;
  if (!user) return <Auth />;

  return (
    <ToastProvider>
    <ConfirmProvider>
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
              {[["movements","Movimentos"],["library","Séries"],["builder","Aulas"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>goTab(id)} style={{fontFamily:"'Satoshi', sans-serif",fontWeight:600,fontSize:12,padding:"6px 16px",borderRadius:6,border:"none",cursor:"pointer",background:screen.mode===id?C.cream:"transparent",color:screen.mode===id?C.crimson:`${C.cream}80`,transition:"all 0.15s"}}>{lbl}</button>
              ))}
            </div>
            <AiStylePanel value={aiStyle} onChange={v=>setAiStyle(v)}/>
            <button onClick={()=>supabase.auth.signOut()} style={{fontFamily:"'Satoshi',sans-serif",fontWeight:600,fontSize:12,padding:"6px 14px",borderRadius:6,border:`1px solid ${C.cream}40`,background:"transparent",color:`${C.cream}80`,cursor:"pointer"}} title="Sair">Sair</button>
          </div>
        </div>
      )}

      <div style={{maxWidth:1200,margin:"0 auto",padding:isAulaMode?"0":"28px 24px"}}>

        <MovDatalist series={series}/>

        {/* ── LIBRARY ── */}
        {screen.mode==="library"&&(
          editingSeries||addingSeries
            ? <SeriesEditor series={editingSeries} onSave={saveSeries} onSaveAsNew={s=>{saveSeries(s);}} onCancel={()=>{setEditingSeries(null);setAddingSeries(false);}} onDelete={id=>{deleteSeries(id);setEditingSeries(null);setAddingSeries(false);}} aiStyle={aiStyle}/>
            : <>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <h2 style={{fontFamily:"'Clash Display', sans-serif",fontSize:26,fontWeight:500,color:C.crimson,margin:0,flex:1}}>Biblioteca de Séries</h2>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {[["all","Todas"],["reformer","Reformer"],["barre","Barre"],["signature","Signature"],["approved","✓ Aprovadas"]].map(([val,lbl])=>(
                      <button key={val} onClick={()=>setFilterType(val)} style={{fontFamily:"'Satoshi', sans-serif",fontSize:12,fontWeight:600,padding:"5px 14px",borderRadius:20,border:`1px solid ${filterType===val?C.neutral:C.stone}`,background:filterType===val?C.neutral:"transparent",color:filterType===val?C.white:C.mist,cursor:"pointer"}}>{lbl}</button>
                    ))}
                  </div>
                  {/* Sort controls */}
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:700,color:C.mist,textTransform:"uppercase",letterSpacing:"0.06em"}}>Ordenar:</span>
                    {[["name","Nome"],["createdAt","Data"],["targetZone","Zona"]].map(([val,lbl])=>(
                      <button key={val} onClick={()=>{ if(sortBy===val) setSortOrder(p=>p==="asc"?"desc":"asc"); else { setSortBy(val); setSortOrder("asc"); }}}
                        style={{fontFamily:"'Satoshi',sans-serif",fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,
                          border:`1px solid ${sortBy===val?C.neutral:C.stone}`,
                          background:sortBy===val?C.neutral:"transparent",
                          color:sortBy===val?C.white:C.mist,cursor:"pointer"}}>
                        {lbl}{sortBy===val?(sortOrder==="asc"?" ↑":" ↓"):""}
                      </button>
                    ))}
                  </div>
                  <Btn onClick={()=>setAddingSeries(true)}><Icon name="plus" size={14}/> Nova série</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
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
                            aiStyle={aiStyle}
                          />
                        </React.Fragment>
                      );
                    });
                  })()}
                </div>
              </>
        )}

        {/* ── MOVEMENTS ── */}
        {screen.mode==="movements"&&(
          <MovementLibraryPage series={series} onUpdateSeries={saveSeries} aiStyle={aiStyle}/>
        )}

        {/* ── BUILDER ── */}
        {screen.mode==="builder"&&(
          <ClassBuilder
            key={screen.cls?.id||"builder"}
            allSeries={series} classes={classes}
            onSave={c=>{ saveClass(c); setScreen({mode:"builder",cls:null}); }}
            onDeleteClass={deleteClass}
            onViewAula={c=>setScreen({mode:"aula",cls:c,fromLibrary:false})}
            initialEditCls={screen.cls||null}
          />
        )}

        {/* ── AULA (merged) ── */}
        {screen.mode==="aula"&&screen.cls&&(
          <AulaView
            cls={screen.cls} allSeries={series}
            onBack={()=>setScreen({mode:"builder",cls:null})}
            onEditClass={cls=>setScreen({mode:"builder",cls,fromLibrary:false})}
            onDeleteClass={async id=>{ await deleteClass(id); setScreen({mode:"builder",cls:null}); }}
            onUpdateSeries={saveSeries}
            onUpdateClass={updateClass}
            aiStyle={aiStyle}
          />
        )}

      </div>
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}
