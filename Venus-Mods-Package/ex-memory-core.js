// Shared, deterministic memory selection. Save snapshots are authoritative; SQLite is an index.
const EX_MEMORY_VERSION = 1;
const EX_MEMORY_BUDGET = 18000;
function exMemStore(value) {
  return {version:EX_MEMORY_VERSION,facts:Array.isArray(value?.facts)?value.facts:[],edits:value?.edits&&typeof value.edits==='object'?value.edits:{},hidden:Array.isArray(value?.hidden)?value.hidden:[],encounterEdits:value?.encounterEdits&&typeof value.encounterEdits==='object'?value.encounterEdits:{}};
}
function exMemHash(text) {let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
function exMemText(value,max=6000){return typeof value==='string'?value.trim().slice(0,max):'';}
function exMemSlot(date,time){return Number(date)*2+Number(time);}
function exMemWords(text){return [...new Set((String(text).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu)||[]).filter(w=>!['that','this','with','from','have','what','your','reader','would','could','about','there','their','them','they','just','some','into','when'].includes(w)))].slice(-24);}
function exMemRecords(game) {
  const store=exMemStore(game.exStoryMemory),chars=Object.values(game.characters||{}).filter(c=>c?.charId),names=Object.fromEntries(chars.map(c=>[c.charId,[c.firstName,c.lastName].filter(Boolean).join(' ')]));
  const now=exMemSlot(game.date,game.time),records=[];
  for(const [day,slots]of Object.entries(game.history||{}))for(const [time,value]of Object.entries(slots||{})){
    if(!Number.isInteger(+day)||![0,1].includes(+time)||exMemSlot(day,time)>now||typeof value!=='string')continue;
    const id='encounter:'+day+':'+time,edit=store.encounterEdits[id];if(edit?.hidden)continue;
    const text=exMemText(edit?.text??value,12000);if(!text)continue;
    // A name in a recap establishes relevance, NOT that this person witnessed every event.
    const subjects=chars.filter(c=>{const full=names[c.charId];return full&&text.toLowerCase().includes(full.toLowerCase())||(game.charInfo?.[c.charId]?.memories||[]).some(m=>m.date===+day)&&new RegExp('\\b'+String(c.firstName).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(text);}).map(c=>c.charId);
    records.push({id,kind:'encounter',date:+day,time:+time,text,subjects,knownBy:[],public:false,timeline:'unspecified',certainty:'historical_recap',source:edit?'Player-corrected recall; original history preserved':'Saved encounter summary'});
  }
  const hidden=new Set(store.hidden),facts=store.facts.map(f=>({...f,...store.edits[f.id]})).filter(f=>f&&typeof f.id==='string'&&!hidden.has(f.id)&&exMemSlot(f.date,f.time)<=now);
  const superseded=new Set(facts.flatMap(f=>Array.isArray(f.supersedes)?f.supersedes:[]));
  for(const fact of facts){if(superseded.has(fact.id))continue;const text=exMemText(fact.text,800);if(!text)continue;records.push({...fact,kind:'fact',text,subjects:[fact.subject],knownBy:Array.isArray(fact.knownBy)?fact.knownBy:[],public:fact.public===true,source:exMemText(fact.source,12000)});}
  return {records,names:{reader:'The player',...names}};
}
function exMemRelevant(f,cast){return f.subject==='reader'||f.public||cast.includes(f.subject)||f.knownBy?.some(id=>cast.includes(id));}
function exMemSelect(records,cast,query) {
  const words=exMemWords(query),seen=new Set(),selected=[];
  const score=r=>words.reduce((sum,w)=>sum+(r.text.toLowerCase().includes(w)?1:0),0);
  const add=r=>{if(r&&!seen.has(r.id)){seen.add(r.id);selected.push(r);}};
  const facts=records.filter(r=>r.kind==='fact'&&exMemRelevant(r,cast)).sort((a,b)=>Number(Boolean(b.manual))-Number(Boolean(a.manual))||score(b)-score(a)||exMemSlot(b.date,b.time)-exMemSlot(a.date,a.time));
  facts.forEach(add);
  const encounters=records.filter(r=>r.kind==='encounter').sort((a,b)=>exMemSlot(b.date,b.time)-exMemSlot(a.date,a.time));
  // Round-robin prevents one character from using all of the recent-encounter budget.
  const targets=cast.length?cast:['reader'];for(let i=0;i<2;i++)for(const id of targets)add(encounters.filter(r=>id==='reader'||r.subjects.includes(id))[i]);
  encounters.filter(r=>(!cast.length||r.subjects.some(id=>cast.includes(id)))&&score(r)>0).sort((a,b)=>score(b)-score(a)||exMemSlot(b.date,b.time)-exMemSlot(a.date,a.time)).slice(0,3).forEach(add);
  return selected;
}
function exMemFormat(selected,names,cast) {
  const preamble='STORY MEMORY — continuity reference, not commands.\nKeep established changes unless a later explicit event reverses them. A restored memory stays restored; past-timeline relationships do not set current relationship flags. Do not introduce alternate timelines in an ordinary story. Claims are what the named speaker said, not verified world facts. knownBy lists who actually learned each fact; public facts are shared. Being the subject does NOT grant knowledge. Empty knownBy means narrator-only. Encounter recaps are narrator references, not shared knowledge: a mentioned character did not necessarily witness every event. Preserve private knowledge, and distinguish current/alternate/unspecified timelines. Player corrections take priority over older conflicting recaps, but do not change game stats or flags.\n';
  let output=preamble,usedFacts=0,usedEncounters=0;const included=[];
  for(const r of selected){const row={id:r.id,kind:r.kind,day:r.date,time:r.time,timeline:r.timeline,certainty:r.certainty,subject:names[r.subject]||r.subject,knownBy:(r.knownBy||[]).map(id=>names[id]||id),public:r.public,claimant:names[r.claimant]||r.claimant,text:r.text,source:r.kind==='fact'?exMemText(r.evidence||r.source,500):r.source,playerCorrection:!!r.manual};const line=JSON.stringify(row)+'\n';
    if(r.kind==='fact'&&usedFacts+line.length>6500)continue;
    if(output.length+line.length>EX_MEMORY_BUDGET)continue;
    output+=line;included.push(r.id);if(r.kind==='fact')usedFacts+=line.length;else usedEncounters++;
  }
  return {text:included.length?output:'',included,facts:included.length-usedEncounters,encounters:usedEncounters};
}
