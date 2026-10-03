// Shared continuity for phone replies; no private facts are granted to uninvolved NPCs.
function buildTextingPrompt(character, info, conversation, newMessage, state, reader) {
  const request=exBaseTextingPrompt(character,info,conversation,newMessage,state,reader);
  const game=useGameStore.getState();
  const memories=info?.memories||[];
  const dates=[...new Set(memories.map(m=>m.date))].sort((a,b)=>b-a).slice(0,4);
  const recent=[];
  for(const date of dates)for(const [time,summary]of Object.entries(game.history?.[date]||{})){
    if(typeof summary==='string'&&summary.includes(fullNameOf(character)))recent.push({date,time,summary:summary.slice(0,2400)});
  }
  const extra=[
    'PHONE / SCENE CONTINUITY',
    'Use the same established character and relationship as face-to-face scenes. Casual texting changes the presentation, not her knowledge, commitments or personality. Do not reflexively act coy or distant when recent events established trust. Do not repeat a revelation she already learned.',
    'Old chat summaries describe past exchanges, not her permanent current attitude. Respect more recent witnessed events. Story direction is author context, not information every character knows: keep secrets private unless this character witnessed or was told them.',
    ...(typeof exPlotTwistContext==='function'?exPlotTwistContext(game):[]),(typeof exBreakthroughContinuity==='function'?exBreakthroughContinuity(game,[character]):''),
    recent.length?'RECENT SCENE REFERENCES (use only what she personally witnessed or learned, not narrator-only secrets): '+JSON.stringify(recent):''
  ].filter(Boolean).join('\n');
  return {...request,system:request.system.replace('You make the women play hard to get; everything is a slow burn.','Let the pace and warmth follow this character’s established relationship and recent interactions; do not automatically play hard to get.'),user:request.user+'\n\n'+extra};
}
function exRememberTextBase(id,conversation,sent) {
  useGameStore.setState(s=>({bunnyboard:{...s.bunnyboard,conversations:{...s.bunnyboard.conversations,[id]:{...s.bunnyboard.conversations[id],exTextBase:{replyTo:sent.id,summary:conversation?.summary||null}}}}}));
}
function exTextPrior(target) {
  const checkpoint=target.conversation.exTextBase;
  return {...target.conversation,messages:target.conversation.messages.slice(0,target.index),summary:checkpoint?.replyTo===target.sent.id?checkpoint.summary:null,exFullHistory:checkpoint?.replyTo!==target.sent.id};
}
function exTextThreadFingerprint(conversation) {
  return JSON.stringify({messages:conversation?.messages||[],summary:conversation?.summary??null,pendingHangout:conversation?.pendingHangout??null});
}
function exTextReplyTarget(game,id) {
  if(!game.characters[id]||sceneActiveOf(game)||epilogueOf(game)||game.charInfo[id]?.flags?.blocked||inFlight.has(id)||failedTurns.has(id))return null;
  const conversation=game.bunnyboard.conversations[id];
  if(!conversation||conversation.pendingHangout||useBunnyboardStore.getState().armedHangout?.charId===id)return null;
  const messages=conversation.messages||[];
  let index=messages.length-1;
  while(index>=0&&messages[index].sender==='contact'&&!messages[index].invite)index--;
  const sent=messages[index],replies=messages.slice(index+1);
  if(!sent||sent.sender!=='player'||!replies.length||replies.some(m=>m.date!==game.date||m.time!==game.time)||sent.date!==game.date||sent.time!==game.time)return null;
  if(replies.some(m=>m.error||(m.exReplyTo&&m.exReplyTo!==sent.id)))return null;
  return {conversation,sent,index,replies};
}
async function exRegenerateText(id) {
  const game=useGameStore.getState(),target=exTextReplyTarget(game,id);
  if(!target)throw Error('Regenerate the latest reply before leaving this time slot or starting a hangout.');
  const ui=useBunnyboardStore.getState();
  const token={abandoned:false,pacer:{cancel(){token.abandoned=true;}}};
  inFlight.set(id,token);ui.setTextBusy(id,true);
  const fingerprint=exTextThreadFingerprint(target.conversation);
  const stale=()=>token.abandoned||useGameStore.getState().playthroughId!==game.playthroughId||useGameStore.getState().date!==game.date||useGameStore.getState().time!==game.time||exTextThreadFingerprint(useGameStore.getState().bunnyboard.conversations[id])!==fingerprint||sceneActiveOf(useGameStore.getState())||useGameStore.getState().charInfo[id]?.flags?.blocked||useBunnyboardStore.getState().armedHangout?.charId===id;
  try {
    const character=game.characters[id];
    // The existing summary contains the rejected reply. Rebuild from earlier
    // messages rather than feeding that reply back as established history.
    const prior=exTextPrior(target);
    const state={date:game.date,time:game.time,stats:game.stats,roster:game.chars.filter(c=>c!==id).map(c=>game.characters[c]).filter(Boolean),charInfo:game.charInfo,npcRelationships:game.npcRelationships,classes:game.classes,playerSchedule:game.playerSchedule,playerJob:game.job,occasions:game.occasions,weather:game.weather,charLocation:charHiddenLocationNow(id),charCompanions:companionsOf(id),charHaunt:charStandingHauntNow(id),springBreakAway:game.springBreakAway};
    const request=buildTextingPrompt(character,game.charInfo[id],prior,target.sent.text,state,readerBlockOf(game));
    const result=await window.api.llm.completeTexting(request,'texting:'+id);
    if(stale())throw Error('The conversation or save changed while regenerating. No messages were replaced.');
    if(!result.ok)throw Error(result.error?.message||'Reply generation failed. Your original messages are unchanged.');
    const data=result.data,lines=data?.messages;
    if(!Array.isArray(lines)||!lines.length||lines.length>12||lines.some(t=>typeof t!=='string'||!t.trim()||t.length>4000)||typeof data.summary!=='string'||!data.summary.trim())throw Error('The replacement reply was incomplete. Original kept.');
    if(data.blocked)throw Error('The new reply would block you. Original kept; try another regeneration.');
    const verdict=await window.api.llm.classifyHangout(buildHangoutClassifierPrompt(character.firstName,prior.messages,target.sent,lines.map(text=>chatMessage('contact',text)),{date:game.date,time:game.time,weather:game.weather}));
    if(stale())throw Error('The conversation or save changed while regenerating. No messages were replaced.');
    if(!verdict.ok)throw Error('Could not check the replacement for changed plans. Original kept.');
    if(normalizeHangout(verdict.data))throw Error('The replacement would create a new hangout. Original kept; send a fresh message to make plans.');
    const live=useGameStore.getState().bunnyboard.conversations[id];
    const next={...live,messages:[...target.conversation.messages.slice(0,target.index+1),...lines.map(text=>({...chatMessage('contact',text.trim()),exReplyTo:target.sent.id}))],summary:data.summary.trim()};
    useGameStore.setState(s=>({...s,bunnyboard:{...s.bunnyboard,conversations:{...s.bunnyboard.conversations,[id]:next}}}));
    try{await exPersistModState();}catch{throw Error('The whole reply was replaced, but autosave failed. Save your game manually.');}
    return {replaced:target.replies.length,created:lines.length};
  } finally {
    if(inFlight.get(id)===token){inFlight.delete(id);useBunnyboardStore.getState().setTextBusy(id,false);}
  }
}
function ExTextRegenerate({charId}) {
  const game=useGameStore(s=>s),busy=useBunnyboardStore(s=>s.busyCharIds.includes(charId));
  const [message,setMessage]=reactExports.useState('');
  reactExports.useEffect(()=>setMessage(''),[charId,game.playthroughId,game.date,game.time]);
  const h=jsxRuntimeExports.jsx,hs=jsxRuntimeExports.jsxs;
  if(!game.characters[charId])return null;
  const target=exTextReplyTarget(game,charId),count=target?.replies.length||0;
  let reason='Available for the latest completed reply in this time slot.';
  if(busy)reason='Wait for all her messages and the plan check to finish.';
  else if(failedTurns.has(charId))reason='Finish or dismiss the failed text request first.';
  else if(sceneActiveOf(game))reason='Unavailable after a scene has started; its events may depend on these texts.';
  else if(game.bunnyboard.conversations[charId]?.pendingHangout||useBunnyboardStore.getState().armedHangout?.charId===charId)reason='This exchange has a hangout attached and cannot be rewritten safely.';
  else if(target)reason='Replaces all '+count+' message'+(count===1?'':'s')+' in her reply to your last text. Earlier exchanges stay intact.';
  return hs('div',{className:'vu-ex-text-regenerate',children:[h('button',{type:'button',className:'vu-btn vu-btn--outline',disabled:busy||!target,onClick:async()=>{setMessage('');try{const result=await exRegenerateText(charId);setMessage('Replaced all '+result.replaced+' old reply message'+(result.replaced===1?'':'s')+' with '+result.created+' new message'+(result.created===1?'':'s')+'.');}catch(e){setMessage(e.message);}},children:busy?'Waiting for reply…':count?'Regenerate whole reply ('+count+')':'Regenerate whole reply'}),h('small',{children:reason+' Uses your configured AI.'}),message&&h('p',{role:'status',children:message})]});
}
