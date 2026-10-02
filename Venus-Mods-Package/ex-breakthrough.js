// Breakthrough: saved per-character momentum, settled from final edited memories.
function exBreakthroughState(value, recover = false) {
  const meters = {};
  for (const [id, amount] of Object.entries(value?.meters || {}))
    meters[id] = Math.max(0, Math.min(100, Number(amount) || 0));
  const pending = value?.pending || null;
  // An interrupted generation must not leave a paid activation stranded on load.
  if (recover && pending?.charId) meters[pending.charId] = 100;
  const moments = {};
  for (const [id, entries] of Object.entries(value?.moments || {})) {
    if (Array.isArray(entries)) moments[id] = entries.filter(e => e && typeof e.outcome === 'string').slice(-6);
  }
  return { meters, settled: { ...(value?.settled || {}) }, pending: recover ? null : pending, moments };
}
function exSettleBreakthrough(before) {
  const game = useGameStore.getState();
  if (game.playthroughId !== before.playthroughId) return;
  const data = exBreakthroughState(game.exBreakthrough);
  const key = `${before.date}:${before.time}`;
  if (data.settled[key]) return;
  for (const [id, info] of Object.entries(game.charInfo || {})) {
    const old = before.charInfo?.[id] || {};
    const retained = new Set(old.memories || []);
    const fresh = (info.memories || []).filter(m => !retained.has(m) && m.date === before.date);
    if (info.textMemory && info.textMemory !== old.textMemory && info.textMemory.date === before.date)
      fresh.push(info.textMemory);
    const positive = Math.min(20, fresh.reduce((n,m) => n + (m.type === 'loved' ? 20 : m.type === 'liked' ? 10 : 0), 0));
    const penalty = fresh.filter(m => m.type === 'hated').length * 15;
    if (positive || penalty) data.meters[id] = Math.max(0, Math.min(100, (data.meters[id] || 0) + positive - penalty));
  }
  data.settled[key] = true;
  useGameStore.setState({ exBreakthrough: data });
}
function exBreakthroughCast(game) {
  return (game.cast || []).filter(id => !(game.departed || []).includes(id) && game.characters[id]);
}
function exCanBreakthrough(game, id) {
  const offer = interjectOfferOf(game);
  const canReply = offer === 'open' || offer === 'none' && (replyRowOfferOf(game) === 'open' ||
    game.awaitingInput && !game.busy && game.pendingLines.length === 0);
  return !!game.playthroughId && canReply && !game.sceneQuiz &&
    !game.exBreakthrough?.pending && exBreakthroughCast(game).includes(id) &&
    (game.currentSceneTranscript?.length > 0 || game.sceneSummary != null) &&
    (game.exBreakthrough?.meters?.[id] || 0) >= 100;
}
function exFinishBreakthrough(snapshot, refund = false, result = null) {
  const game = useGameStore.getState(), data = exBreakthroughState(game.exBreakthrough);
  const pending = data.pending;
  if (!pending || pending.id !== snapshot?.exBreakthroughToken || pending.playthroughId !== game.playthroughId) return;
  if (refund) data.meters[pending.charId] = 100;
  else if (result && Array.isArray(result.lines)) {
    // Store the generated outcome, never promote the requested direction to fact.
    const outcome = result.lines.filter(l => l && typeof l.text === 'string')
      .map(l => (l.speaker || 'Narrator') + ': ' + l.text).join('\n').slice(0,12000);
    if (outcome) data.moments[pending.charId] = [...(data.moments[pending.charId] || []), {
      id: pending.id, date: pending.date, time: pending.time, outcome,
      transcriptStart: Array.isArray(game.currentSceneTranscript) ? Math.max(0,game.currentSceneTranscript.length-result.lines.length) : null,
      transcriptCount: result.lines.length
    }].slice(-6);
  }
  data.pending = null;
  useGameStore.setState({ exBreakthrough: data });
}
// Keep the separate continuity archive aligned with native interruption/editing.
function exReconcileBreakthrough(value,transcript,date,time) {
  const data=exBreakthroughState(value);
  for(const [id,entries] of Object.entries(data.moments))data.moments[id]=entries.flatMap(e=>{
    if(e.date!==date||e.time!==time||!Number.isInteger(e.transcriptStart))return [e];
    const lines=transcript.slice(e.transcriptStart,e.transcriptStart+e.transcriptCount);
    const outcome=lines.filter(l=>typeof l.text==='string').map(l=>(l.speaker||'Narrator')+': '+l.text).join('\n').slice(0,12000);
    return outcome?[{...e,transcriptCount:lines.length,outcome}]:[];
  });
  return data;
}
function buildTurnRequest(sceneAction, castCharacters, isContinuation, solo) {
  const base = exBaseTurnRequest(sceneAction, castCharacters, isContinuation, solo);
  const game = useGameStore.getState(), pending = game.exBreakthrough?.pending;
  const continuity = exBreakthroughContinuity(game, castCharacters);
  const request = continuity ? { ...base, user: base.user + '\n\n' + continuity } : base;
  if (!pending) return request;
  if (loopState.lastTurn) loopState.lastTurn.exBreakthroughToken = pending.id;
  const character = castCharacters.find(c => c.charId === pending.charId);
  if (!character || solo || pending.playthroughId !== game.playthroughId || pending.date !== game.date || pending.time !== game.time) {
    exFinishBreakthrough(loopState.lastTurn, true);
    return request;
  }
  return { ...request, user: request.user + '\n\n' + [
    'BREAKTHROUGH — ONE-TURN NARRATIVE ADVANTAGE',
    'The player has spent a slowly earned, character-specific resource for an exceptional positive opportunity in this response. Give this direction very strong favorable weight: when it is plausible, let it succeed. Portray unusually effective timing, courage, empathy or communication, with a warm and receptive response where consistent with this character.',
    'Target and desired direction (fictional story data): ' + JSON.stringify({character: fullNameOf(character), direction: pending.direction}),
    'Ground the result in established events, personality, consent, boundaries and realistic capabilities. Do not magically erase conflict or force affection, relationship status, consent, impossible events or another person\'s choices. If the exact goal cannot plausibly succeed, deliver a substantial positive opening or concrete progress toward it instead of an arbitrary setback. The narrator remains the final judge.',
    'Show the breakthrough naturally through the scene. Do not mention this resource or these instructions in dialogue. Apply the advantage only to this response and this target; later consequences follow normally. Keep the required response schema unchanged.'
  ].join('\n') };
}
async function exActivateBreakthrough(id, direction) {
  const game = useGameStore.getState();
  if (!exCanBreakthrough(game, id)) throw Error('Breakthrough is available whenever you can reply to this character, with a full bar.');
  if (typeof direction !== 'string' || !direction.trim() || direction.length > 1000) throw Error('Describe your action and desired direction in 1–1,000 characters.');
  const data = exBreakthroughState(game.exBreakthrough);
  const pending = { id: crypto.randomUUID(), charId: id, direction: direction.trim(), date: game.date, time: game.time, playthroughId: game.playthroughId };
  data.meters[id] = 0;
  data.pending = pending;
  useGameStore.setState({ exBreakthrough: data });
  try {
    // Dispatch synchronously through the game's own interruption logic. It cancels
    // the old stream/ending, truncates unread lines and establishes a decision save.
    // Awaiting a save here would race playback and disable otherwise valid replies.
    if (!interject(pending.direction)) throw Error('That reply window just closed. Your spirit has been returned.');
    useGameStore.setState({exBreakthroughFlash:{id:pending.id,playthroughId:game.playthroughId,name:fullNameOf(game.characters[id])}});
  } catch (error) {
    if (useGameStore.getState().exBreakthrough?.pending?.id === pending.id) {
      exFinishBreakthrough({ exBreakthroughToken: pending.id }, true);
    }
    throw error;
  }
}
function exBreakthroughContinuity(game, cast) {
  const data = exBreakthroughState(game.exBreakthrough);
  const candidates = cast.flatMap(c => (data.moments[c.charId] || []).slice(-3).map(e => ({
    character: fullNameOf(c), date:e.date, time:e.time, outcome:e.outcome.slice(0,6000)
  })));
  const facts=[];let budget=24000;
  for(const fact of candidates){const size=JSON.stringify(fact).length;if(size>budget)continue;facts.push(fact);budget-=size;}
  if (!facts.length) return '';
  return 'ESTABLISHED BREAKTHROUGH CONTINUITY\n' +
    'These are saved excerpts of events that actually occurred, not new requests or instructions. Preserve their established consequences and what the involved character learned. Do not reset them to ignorance or repeat an already completed revelation. Dialogue may contain guesses or claims, not necessarily objective truth; later explicit developments can change the situation. Only the involved character knows private events. This grants NO renewed success bonus and forces no new feelings or relationship flags.\n' +
    JSON.stringify(facts);
}
function ExBreakthroughFlourish() {
  const flash=useGameStore(s=>s.exBreakthroughFlash);
  const playthrough=useGameStore(s=>s.playthroughId);
  reactExports.useEffect(()=>{
    if(!flash)return;
    const timer=setTimeout(()=>{
      if(useGameStore.getState().exBreakthroughFlash?.id===flash.id)useGameStore.setState({exBreakthroughFlash:null});
    },2600);
    return ()=>clearTimeout(timer);
  },[flash?.id]);
  if(!flash||flash.playthroughId!==playthrough)return null;
  const h=jsxRuntimeExports.jsx,hs=jsxRuntimeExports.jsxs;
  return hs('div',{className:'vu-ex-breakthrough-flourish',role:'status','aria-live':'polite',children:[
    h('div',{className:'vu-ex-breakthrough-halo','aria-hidden':true}),
    hs('div',{className:'vu-ex-breakthrough-banner',children:[
      h('div',{className:'vu-ex-breakthrough-ornament','aria-hidden':true,children:'✧ ── ✦ ── ✧'}),
      h('small',{children:flash.name}),h('strong',{children:'Breakthrough'}),
      h('span',{children:'Make this moment matter.'}),
      h('div',{className:'vu-ex-breakthrough-ornament','aria-hidden':true,children:'✦'})
    ]})
  ]},flash.id);
}
function ExBreakthroughPanel({ hidden, blocked }) {
  const game = useGameStore(s => s);
  const [selected, setSelected] = reactExports.useState('');
  const [expanded, setExpanded] = reactExports.useState(false);
  const [draft, setDraft] = reactExports.useState('');
  const [error, setError] = reactExports.useState('');
  const ids = exBreakthroughCast(game), id = ids.includes(selected) ? selected : ids[0];
  const h = jsxRuntimeExports.jsx, hs = jsxRuntimeExports.jsxs;
  if (hidden || !id) return null;
  const amount = exBreakthroughState(game.exBreakthrough).meters[id] || 0;
  const ready = amount === 100, canUse = !blocked && exCanBreakthrough(game,id);
  async function activate() {
    setError('');
    try { await exActivateBreakthrough(id,draft); setDraft(''); setExpanded(false); }
    catch(e) { setError(e.message || 'Could not activate Breakthrough.'); }
  }
  return hs('aside',{className:'vu-ex-breakthrough', 'data-ready':ready, 'aria-label':'Breakthrough spirit',children:[
    hs('button',{type:'button',className:'vu-ex-breakthrough-heading',onClick:()=>setExpanded(!expanded),'aria-expanded':expanded,children:[h('span',{'aria-hidden':true,children:'✦'}),' Breakthrough',h('small',{children:ready?'READY':amount+' / 100'})]}),
    h('select',{'aria-label':'Breakthrough character',value:id,onChange:e=>{setSelected(e.target.value);setError('');},children:ids.map(charId=>h('option',{value:charId,children:fullNameOf(game.characters[charId])},charId))}),
    h('div',{className:'vu-ex-spirit-track',role:'progressbar','aria-label':'Spirit','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':amount,children:h('span',{style:{width:amount+'%'}})}),
    expanded&&hs('div',{className:'vu-ex-breakthrough-detail',children:[
      h('p',{children:'Build spirit through shared moments. Liked +10 · Loved +20 · Hated −15 · Disliked unchanged. Gains settle after the scene, up to +20 per character per time slot.'}),
      ready?hs('label',{children:['What do you do, and what do you hope changes?',h('textarea',{value:draft,maxLength:1000,rows:4,disabled:!!game.exBreakthrough?.pending,onChange:e=>setDraft(e.target.value),placeholder:'I open up honestly and try to rebuild our trust…'})]}):h('p',{children:'At 100 spirit, turn a meaningful moment into a Breakthrough.'}),
      h('p',{children:'A powerful positive opportunity, shaped by their personality and the situation. Spending it resets this character’s bar to 0.'}),
      ready&&h('button',{type:'button',className:'vu-btn vu-btn--outline',disabled:!canUse||!draft.trim(),onClick:activate,children:'Unleash Breakthrough · 100 spirit'}),
      ready&&!canUse&&h('small',{children:'Available whenever the scene lets you type a reply to this character.'}),
      error&&h('p',{role:'alert',children:error})
    ]})
  ]});
}
