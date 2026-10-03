// Reuses the original Web Audio channels, volume sliders, fades and scene cues.
const EX_MUSIC_LABELS={title:'Title screen',landing_day:'Weekday · day',landing_night:'Weekday · night',landing_day_alt:'Weekend · day',landing_night_alt:'Weekend · night',ending:'Ending',venue_edm:'Venue · electronic',venue_lofi:'Venue · lo-fi',venue_pop:'Venue · pop',venue_rock:'Venue · rock'};
let exMusicMap=null,exMusicLoading=null;
const exMusicBuffers=new Map(),exMusicErrors=new Map();
function exMusicResult(r){if(!r?.ok)throw Error(r?.error?.message||'Could not access local music.');return r.data;}
async function exMusicLoad(){
  if(exMusicMap)return exMusicMap;
  if(!exMusicLoading)exMusicLoading=window.api.exMusic.list().then(r=>exMusicMap=exMusicResult(r)).finally(()=>exMusicLoading=null);
  return exMusicLoading;
}
async function bufferFor(key){
  if(!ctx||!Object.hasOwn(EX_MUSIC_LABELS,key))return exOriginalBufferFor(key);
  try{
    const map=await exMusicLoad();if(!map[key])return exOriginalBufferFor(key);
    const identity=map[key].file;
    let cached=exMusicBuffers.get(key);
    if(!cached||cached.identity!==identity){
      cached={identity,promise:(async()=>{const data=exMusicResult(await window.api.exMusic.read(key));if(!data||!ctx)throw Error('Replacement unavailable.');const b=new Uint8Array(data);return ctx.decodeAudioData(b.buffer);})()};
      exMusicBuffers.set(key,cached);
      // Keep only a few decoded replacements; the live source owns its buffer.
      for(const other of exMusicBuffers.keys()){if(exMusicBuffers.size<=3)break;if(other!==key)exMusicBuffers.delete(other);}
    }
    const decoded=await cached.promise;
    if(exMusicMap?.[key]?.file!==identity)return bufferFor(key);
    return decoded;
  }catch(e){exMusicErrors.set(key,'Using original music: '+(e.message||'replacement could not be played.'));return exOriginalBufferFor(key);}
}
function exMusicLoop(key){return exMusicMap?.[key]?exMusicMap[key].loop!==false:AUDIO_FILES[key].loop;}
function exMusicRefresh(key,map){
  exMusicMap=map;exMusicBuffers.delete(key);exMusicErrors.delete(key);
  const channelId=AUDIO_FILES[key]?.group==='ambience'?'ambience':'music';
  const channel=channels[channelId];
  if(channel.wanted.key===key){
    const wanted={...channel.wanted};channel.wanted={key:null,semitones:0};
    apply(channelId,{...wanted,fade:.35});
  }
  if(typeof recompute==='function')recompute();
}
function ExMusicSettings(){
  const h=jsxRuntimeExports.jsx,hs=jsxRuntimeExports.jsxs;
  const [map,setMap]=reactExports.useState({}),[key,setKey]=reactExports.useState('landing_day'),[busy,setBusy]=reactExports.useState(false),[message,setMessage]=reactExports.useState(''),[now,setNow]=reactExports.useState(current('music')),[preview,setPreview]=reactExports.useState(false),[cleanConfirm,setCleanConfirm]=reactExports.useState(false);
  const previewTimer=reactExports.useRef(null);
  const mounted=reactExports.useRef(true);
  const stopPreview=()=>{stopSnippet();clearTimeout(previewTimer.current);setPreview(false);};
  reactExports.useEffect(()=>{mounted.current=true;const tick=setInterval(()=>setNow(current('music')),500);return()=>{mounted.current=false;clearInterval(tick);clearTimeout(previewTimer.current);stopSnippet();};},[]);
  reactExports.useEffect(()=>{stopPreview();},[key]);
  reactExports.useEffect(()=>{let live=true;exMusicLoad().then(m=>{if(live)setMap(m);}).catch(e=>{if(live)setMessage(e.message);});return()=>{live=false;};},[]);
  async function choose(){
    stopPreview();setBusy(true);setMessage('');let validation;
    try{
      const picked=exMusicResult(await window.api.exMusic.pick());if(!picked)return;
      validation=new AudioContext();const decoded=await validation.decodeAudioData(new Uint8Array(picked.bytes).buffer);
      if(!Number.isFinite(decoded.duration)||decoded.duration<=0||decoded.duration>1200)throw Error('Choose a track up to 20 minutes long.');
      const updated=exMusicResult(await window.api.exMusic.commit(key,picked.token));exMusicRefresh(key,updated);setMap(updated);setMessage('Saved '+picked.name+'. Your replacement follows this track automatically.');
    }catch(e){setMessage(e.message||'This file could not be decoded. Try another MP3, OGG or WAV.');}
    finally{if(validation)await validation.close().catch(()=>{});setBusy(false);}
  }
  async function restore(){stopPreview();setBusy(true);try{const updated=exMusicResult(await window.api.exMusic.remove(key));exMusicRefresh(key,updated);setMap(updated);setMessage('Original track restored.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  async function toggleLoop(value){setBusy(true);try{const updated=exMusicResult(await window.api.exMusic.loop(key,value));exMusicRefresh(key,updated);setMap(updated);setMessage(value?'Loop enabled.':'Play once enabled. Plays again when the cue changes away and returns, or you replace this track.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  async function hear(){if(preview){stopPreview();return;}setBusy(true);try{start();await ctx.resume();const buffer=await bufferFor(key);if(!mounted.current)return;if(!buffer)throw Error('Could not preview this track.');playSnippet(key,0,10);setPreview(true);previewTimer.current=setTimeout(()=>setPreview(false),10000);setMessage('10-second preview uses the existing Music or Ambience volume.');}catch(e){if(mounted.current)setMessage(e.message);}finally{if(mounted.current)setBusy(false);}}
  async function cleanup(){setBusy(true);try{const result=exMusicResult(await window.api.exMusic.cleanup());setMessage('Removed '+result.count+' unused imported audio file(s). Original files were untouched.');setCleanConfirm(false);}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return hs('section',{className:'ex-local-music',children:[h('h3',{children:'Custom soundtrack'}),h('p',{children:'Now playing: '+(EX_MUSIC_LABELS[now]||'No soundtrack cue')+(map[now]?' — '+map[now].name:'')}),h('p',{children:'Replace individual tracks with your own MP3, OGG or WAV files. Music plays in the background and follows the game’s scenes. Applies to all playthroughs.'}),hs('label',{children:['Game track',h('select',{value:key,disabled:busy,onChange:e=>{setKey(e.target.value);setMessage('');},children:Object.entries(EX_MUSIC_LABELS).map(([value,label])=>h('option',{value,children:label},value))})]}),h('button',{type:'button',className:'vu-pill',disabled:busy,onClick:hear,children:preview?'Stop preview':'Preview · 10 seconds'}),hs('label',{children:[h('input',{type:'checkbox',checked:map[key]?.loop!==false,disabled:busy||!map[key],onChange:e=>toggleLoop(e.target.checked)}),'Loop replacement']}),h('p',{className:'ex-music-file',children:map[key]?.name||'Original game music'}),hs('div',{className:'ex-music-actions',children:[h('button',{type:'button',className:'vu-pill',disabled:busy,onClick:choose,children:busy?'Working…':'Choose audio file'}),h('button',{type:'button',className:'vu-pill',disabled:busy||!map[key],onClick:restore,children:'Restore original'})]}),h('button',{type:'button',className:'vu-pill',disabled:busy,onClick:()=>setCleanConfirm(!cleanConfirm),children:'Clean up unused imports'}),cleanConfirm&&hs('div',{children:[h('p',{children:'Delete imported copies that are not assigned to any track? Your original files and assigned songs will be kept.'}),h('button',{type:'button',disabled:busy,onClick:cleanup,children:'Delete unused copies'}),h('button',{type:'button',disabled:busy,onClick:()=>setCleanConfirm(false),children:'Cancel cleanup'})]}),h('small',{children:'Files are copied into the EX data folder. Up to 50 MB / 20 minutes per track. Uses the existing Music volume (venue tracks use Ambience). No player or video appears during gameplay.'}),h('p',{role:'status','aria-live':'polite',children:message||exMusicErrors.get(key)||''})]});
}
