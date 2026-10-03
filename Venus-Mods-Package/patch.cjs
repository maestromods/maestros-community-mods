process.noAsar=true;
/* Venus University Mods 2.30.0. Local, version-checked ASAR patcher. Node.js only. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const changes = [];
function replace(s, before, after, label) {
  const count = s.split(before).length - 1;
  if (count !== 1) throw Error(`${label}: expected one anchor, found ${count}. Port this patch manually; no archive has been written.`);
  changes.push(label);
  return s.replace(before, () => after);
}
const helpers = `
// VENUS UNIVERSITY MODS 2.30.0
const EX_LABELS = { brain: "Dumb", body: "Weakling", heart: "Socially Awkward" };
const EX_DEFAULTS = { detriments: { brain: false, body: false, heart: false }, complication: "none", charId: null };
function exNormalize(options = {}) {
  return { complication: ["none", "dislike", "ex"].includes(options.complication) ? options.complication : "none", charId: options.charId ?? null,
    detriments: Object.fromEntries(["brain", "body", "heart"].map(key => [key, Boolean(options.detriments?.[key] ?? options.hard ?? false)]))
  };
}
function exStartingStats(tiers, options) {
  const selected = exNormalize(options);
  const stats = statsForTiers(tiers);
  return stats;
}
function exChoose(options, roster, rand = Math.random) {
  const result = exNormalize(options);
  if (result.complication === "none" || roster.length === 0) result.charId = null;
  else if (!roster.some(c => c.charId === result.charId)) {
    result.charId = roster[Math.min(roster.length - 1, Math.floor(rand() * roster.length))].charId;
  }
  return result;
}
function exInitialCharacter(character, options, date) {
  if (!options || options.charId !== character.charId || options.complication === "none") return {};
  const isEx = options.complication === "ex";
  return {
    exComplication: { kind: options.complication, date, bias: -30 },
    flags: { ...initialFlags(character), hasMet: isEx, brokenUp: isEx ? 1 : 0,
      exOrigin: isEx ? "ex" : "dislike" },
    nameKnown: isEx,
    ...(isEx ? { brokeUpOn: date - 7 } : {})
  };
}
function exAffectionBias(info, today) {
  const start = info?.exComplication;
  return start ? start.bias * weightFor(Math.max(0, today - start.date)) / 4 : 0;
}
function ExOptions({ value, onChange, roster = [] }) {
  const selected = exNormalize(value);
  return jsxRuntimeExports.jsxs("fieldset", { className: "vu-ex-options", children: [
    jsxRuntimeExports.jsx("legend", { children: "Venus University Mods" }),
    jsxRuntimeExports.jsxs("label", { children: ["Relationship complication ",
      jsxRuntimeExports.jsx("select", { value: selected.complication,
        onChange: e => onChange({ ...selected, complication: e.target.value }),
        children: [["none", "None"], ["dislike", "Dislikes you"], ["ex", "Your ex"]].map(([value, label]) =>
          jsxRuntimeExports.jsx("option", { value, children: label }, value)) })
    ] }),
    selected.complication !== "none" && jsxRuntimeExports.jsxs("label", { className: "vu-ex-target", children: ["Choose girl ",
      jsxRuntimeExports.jsxs("select", { value: selected.charId || "", onChange: e => onChange({ ...selected, charId: e.target.value || null }), children: [
        jsxRuntimeExports.jsx("option", { value: "", children: "Random enrolled girl" }),
        ...roster.map(c => jsxRuntimeExports.jsx("option", { value: c.charId, children: [c.firstName, c.lastName].filter(Boolean).join(" ") }, c.charId))
      ] })
    ] }),
    jsxRuntimeExports.jsx("p", { children: "Choose from your enrolled cast, or let the game pick once. Starting resentment fades and can be overcome." }),

  ] });
}
`;
function patchRenderer(s) {
  if(selected.story||selected.twist||selected.npc)s=replace(s,'function GameMenuModal({',fs.readFileSync(path.join(__dirname,'ex-persistence.js'),'utf8')+'\nfunction GameMenuModal({','Shared safe feature persistence');
  if(selected.jobs) s=require("./ex-venue-jobs.cjs").patchJobs(s,replace);
  if(selected.city) s=require("./ex-locations.cjs").patchLocations(s,replace);
  if(selected.setup){
  s = replace(s, 'const DEFAULT_PLAYER_STATS =', helpers + '\nconst DEFAULT_PLAYER_STATS =', 'EX helpers');
  s = replace(s, 'return affectionOf(windowed, today) +', 'return exAffectionBias(info, today) + affectionOf(windowed, today) +', 'Starting resentment');
  s = replace(s, 'const behavior = character.behavior[behaviorLevelOf(flags, affection)];', `if (flags.exOrigin === "dislike") lines.push("At the beginning of the semester she took an irrational dislike to the reader. He did nothing to cause it. Do not invent wrongdoing to justify it. Let her current disposition and subsequent experiences determine how she treats him now.");
  if (flags.exOrigin === "ex") lines.push("She and the reader dated before this semester and broke up a week before it began after growing apart. They already recognize each other and now attend the same university. Do not introduce them as strangers. Do not invent betrayal or abuse. Their subsequent interactions can change their relationship.");
  const behavior = character.behavior[behaviorLevelOf(flags, affection)];`, 'Complication dialogue context');
  s = replace(s, 'const [tiers, setTiers] = reactExports.useState({', 'const [exOptions, setExOptions] = reactExports.useState({ ...EX_DEFAULTS });\n  const [tiers, setTiers] = reactExports.useState({', 'Setup options state');
  s = replace(s, '      statsForTiers(tiers),\n      bio.trim()\n', '      exStartingStats(tiers, exOptions),\n      bio.trim(),\n      exNormalize(exOptions)\n', 'Submit options');
  s = replace(s, '              askDetails && /* @__PURE__ */', '              jsxRuntimeExports.jsx(ExOptions, { value: exOptions, onChange: setExOptions, roster }),\n              askDetails && /* @__PURE__ */', 'Setup controls');
  s = replace(s, 'function PlayerNameModal({\n  onSubmit,', 'function PlayerNameModal({\n  roster = [],\n  onSubmit,', 'Pass roster to setup');
  s = replace(s, '          askDetails: false,\n          theme,', '          askDetails: false,\n          roster,\n          theme,', 'Quickstart roster');
  s = replace(s, 'PlayerNameModal, { theme, onSubmit: onNamed }', 'PlayerNameModal, { theme, onSubmit: onNamed, roster }', 'Normal setup roster');
  s = replace(s, '    resumed?.enrollment.stats ?? DEFAULT_PLAYER_STATS\n  );', '    resumed?.enrollment.stats ?? DEFAULT_PLAYER_STATS\n  );\n  const [exOptions, setExOptions] = reactExports.useState(resumed?.enrollment.exOptions ?? { ...EX_DEFAULTS });', 'Resume setup options');
  s = replace(s, 'async function enroll(semester, first, last, stats, bio) {', 'async function enroll(semester, first, last, stats, bio, options = exOptions) {', 'Enrollment options argument');
  s = replace(s, '      playerLastName: last,\n      stats,', '      playerLastName: last,\n      exOptions: options,\n      stats,', 'Persist enrollment options');
  s = replace(s, 'function onNamed(first, last, stats, bio) {', 'function onNamed(first, last, stats, bio, options = EX_DEFAULTS) {\n    const selected = exChoose(options, roster);\n    setExOptions(selected);', 'Choose complication once');
  s = replace(s, 'await enroll(semester, first, last, stats, bio);', 'await enroll(semester, first, last, stats, bio, selected);', 'Quickstart options');
  s = replace(s, '    setPlayerStats(DEFAULT_PLAYER_STATS);', '    setPlayerStats(DEFAULT_PLAYER_STATS);\n    setExOptions({ ...EX_DEFAULTS });', 'Reset abandoned setup');
  s = replace(s, '                nameKnown: false,\n                ...job', '                nameKnown: false,\n                ...exInitialCharacter(c, exOptions, FIRST_SLOT.date),\n                ...job', 'Seed selected relationship');
  s = replace(s, '        playerLastName: playerName.last,\n        classes,', '        playerLastName: playerName.last,\n        exOptions: exNormalize(exOptions),\n        classes,', 'Persist playthrough options');
  s = replace(s, 'const initialState = {\n  playthroughId: null,', 'const initialState = {\n  exOptions: exNormalize(),\n  playthroughId: null,', 'Default EX options');
  s = replace(s, '    playerLastName: record.playerLastName,\n    stats: save.stats,', '    playerLastName: record.playerLastName,\n    exOptions: exNormalize(record.exOptions),\n    stats: save.stats,', 'Restore EX options on load');

  } if(selected.story){
  s = replace(s, 'function BunnyboardModal({', ((fs.readFileSync(path.join(__dirname, 'ex-journals.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'ex-player-posts.js'), 'utf8')) + '\n' + fs.readFileSync(path.join(__dirname, 'ex-comment-replies.js'), 'utf8')) + '\nfunction BunnyboardModal({', 'Public journal renderer');
  s = replace(s, '  { id: "updates", word: "UPDATES", Mark: UpdatesIcon }', '  { id: "updates", word: "UPDATES", Mark: UpdatesIcon },\n  { id: "journals", word: "JOURNALS", Mark: ExJournalsIcon }', 'Journal navigation');
  s = replace(s, '              tab === "updates" &&', '              tab === "journals" && jsxRuntimeExports.jsx(ExJournals, {}),\n              tab === "updates" &&', 'Journal feed');
  s = replace(s, 'const initialState = {\n', 'const initialState = {\n  exJournals: {},\n  exJournalNight: null,\n', 'Journal defaults');
  s = replace(s, '    history: save.history,', '    exJournals: save.exJournals ?? {},\n    exJournalNight: save.exJournalNight ?? null,\n    history: save.history,', 'Load journal archive');
  s = replace(s, '      history: state.history,', '      exJournals: state.exJournals,\n      exJournalNight: state.exJournalNight,\n      history: state.history,', 'Persist journal archive');
  s = replace(s, '  for (const send2 of owedTexts) send2();\n  useGameStore.getState().advanceSlot();', '  for (const send2 of owedTexts) send2();\n  exCaptureJournalNight();\n  useGameStore.getState().advanceSlot();', 'Capture night after user memory edits');
  s = replace(s, '    backgrounds: useAssetStore.getState().backgrounds,\n    charInfo: game.charInfo,', '    exJournals: game.exJournals ?? {},\n    backgrounds: useAssetStore.getState().backgrounds,\n    charInfo: game.charInfo,', 'Journal scene state');
  s = replace(s, '      ...whoBlock(cast, state, reader2),', '      ...whoBlock(cast, state, reader2),\n      ...exJournalNarration(cast, state),', 'Journal narrative continuity');

  } if(selected.twist){
  s = replace(s, 'function GameMenuModal({', fs.readFileSync(path.join(__dirname,'ex-plot-twists.js'),'utf8')+'\nfunction GameMenuModal({', 'Plot twist controls');
  s = replace(s, '  if (!host) return null;\n  const saveDead = saveOffer === "waiting";', '  const [exTwistOpen,setExTwistOpen]=reactExports.useState(false);\n  if (!host) return null;\n  const saveDead = saveOffer === "waiting";', 'Plot twist menu state');
  s = replace(s, '/* @__PURE__ */ jsxRuntimeExports.jsxs(motion.nav, { className: "vu-menu-modal-actions vu-fan",', 'exTwistOpen ? jsxRuntimeExports.jsx(ExPlotTwistEditor,{onBack:()=>setExTwistOpen(false),waiting:saveDead}) : /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.nav, { className: "vu-menu-modal-actions vu-fan",', 'Plot twist menu panel');
  s = replace(s, '                saveOffer !== "none" &&', '                jsxRuntimeExports.jsx(motion.button,{type:"button",className:"vu-btn vu-btn--outline vu-paper",variants:dealtItem,...gestures(false,lift,press),onClick:()=>setExTwistOpen(true),children:"Plot twist"}),\n                saveOffer !== "none" &&', 'Plot twist menu button');
  s = replace(s, 'const initialState = {\n', 'const initialState = {\n  exPlotTwist: "",\n', 'Plot twist default');
  s = replace(s, '    history: save.history,', '    exPlotTwist: typeof save.exPlotTwist === "string" ? save.exPlotTwist : "",\n    history: save.history,', 'Load plot twist');
  s = replace(s, '      history: state.history,', '      exPlotTwist: state.exPlotTwist || "",\n      history: state.history,', 'Save plot twist');
  s = replace(s, '    backgrounds: useAssetStore.getState().backgrounds,\n    charInfo: game.charInfo,', '    exPlotTwist: game.exPlotTwist || "",\n    backgrounds: useAssetStore.getState().backgrounds,\n    charInfo: game.charInfo,', 'Plot twist prompt state');
  s = replace(s, '      ...whoBlock(cast, state, reader2),', '      ...whoBlock(cast, state, reader2),\n      ...exPlotTwistContext(state),', 'Plot twist scene direction');
  s = replace(s, '    ...nowBlock([], state),', '    ...nowBlock([], state),\n    ...exPlotTwistContext(state),', 'Solo plot twist direction');
  } if(selected.story){
  s=replace(s,'const initialState = {\n','const initialState = {\n  exDeletedJournals: {},\n','Deleted journal defaults');
  s=replace(s,'    history: save.history,','    exDeletedJournals: save.exDeletedJournals ?? {},\n    history: save.history,','Load deleted journals');
  s=replace(s,'      history: state.history,','      exDeletedJournals: state.exDeletedJournals ?? {},\n      history: state.history,','Save deleted journals');
  } if(selected.names){
  s=replace(s,'function PlaythroughRow({',fs.readFileSync(path.join(__dirname,'ex-playthrough-name.js'),'utf8')+'\nfunction PlaythroughRow({','Playthrough rename component');
  s=replace(s,'        /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteX, { className: "vu-x vu-load-x", hovered: hovered2, label, onDelete })','        jsxRuntimeExports.jsx(ExPlaythroughRename,{playthrough},playthrough.playthroughId),\n        /* @__PURE__ */ jsxRuntimeExports.jsx(DeleteX, { className: "vu-x vu-load-x", hovered: hovered2, label, onDelete })','Playthrough rename control');
  } if(selected.breakthrough){
  s=replace(s,'function SceneChrome(props) {',fs.readFileSync(path.join(__dirname,'ex-breakthrough.js'),'utf8')+'\nfunction SceneChrome(props) {','Breakthrough controls and mechanics');
  s=replace(s,'const initialState = {\n','const initialState = {\n  exBreakthrough: exBreakthroughState(),\n','Breakthrough defaults');
  s=replace(s,'    history: save.history,','    exBreakthrough: exBreakthroughState(save.exBreakthrough, true),\n    history: save.history,','Load Breakthrough and recover interrupted activation');
  s=replace(s,'      history: state.history,','      exBreakthrough: exBreakthroughState(state.exBreakthrough),\n      history: state.history,','Save Breakthrough');
  s=replace(s,'  for (const send2 of owedTexts) send2();','  exSettleBreakthrough(game);\n  for (const send2 of owedTexts) send2();','Settle final interaction scores');
  s=replace(s,'function buildTurnRequest(sceneAction, castCharacters, isContinuation, solo) {\n  const state = scenePromptState();','function exBaseTurnRequest(sceneAction, castCharacters, isContinuation, solo) {\n  const state = scenePromptState();','Breakthrough prompt wrapper');
  s=replace(s,'    action: raw,','    action: raw,\n    exBreakthroughToken: game.exBreakthrough?.pending?.id,','Track spent activation across retries');
  s=replace(s,'  const ending = solo || result.data.end;','  exFinishBreakthrough(snapshot, false, result.data);\n  const ending = solo || result.data.end;','Consume successful Breakthrough');
  s=replace(s,'function failTurn(error, snapshot) {','function failTurn(error, snapshot) {\n  exFinishBreakthrough(snapshot, true);','Refund failed Breakthrough');
  s=replace(s,'      className: "vu-scene",','      className: "vu-scene",','Verify scene UI anchor');
  s=replace(s,'        /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: card && !hidden &&','        jsxRuntimeExports.jsx(ExBreakthroughFlourish, {}),\n        jsxRuntimeExports.jsx(ExBreakthroughPanel, { hidden: dark, blocked: !!quiz || !rowLive || props.inputDead }),\n        /* @__PURE__ */ jsxRuntimeExports.jsx(AnimatePresence, { children: card && !hidden &&','Scene Breakthrough bar');
  } if(selected.story){
  s=replace(s,'function buildTextingPrompt(character, info, conversation, newMessage, state, reader2) {','function exBaseTextingPrompt(character, info, conversation, newMessage, state, reader2) {','Text reply continuity wrapper');
  s=replace(s,'    released += 1;\n    deliver(charId, chatMessage("contact", text));','    released += 1;\n    deliver(charId, {...chatMessage("contact", text),exReplyTo:sent.id});','Group native multi-bubble text replies');
  s=replace(s,'function ConversationView({',fs.readFileSync(path.join(__dirname,'ex-texting.js'),'utf8')+'\nfunction ConversationView({','Text regeneration controls');
  s=replace(s,'    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vu-bb-foot", children: boss ?', '    jsxRuntimeExports.jsx(ExTextRegenerate,{charId}),\n    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "vu-bb-foot", children: boss ?','Text regenerate button');
  } if(selected.music){
  s=replace(s,'function bufferFor(key) {','function exOriginalBufferFor(key) {','Keep original audio decoder');
  s=replace(s,'function AppSettingsModal({',fs.readFileSync(path.join(__dirname,'ex-music.js'),'utf8')+'\nfunction AppSettingsModal({','Custom soundtrack controls and decoder');
  s=replace(s,'/* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "vu-settings-heading vu-settings-data-heading", children: "Game data" }),','jsxRuntimeExports.jsx(ExMusicSettings, {}),\n                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "vu-settings-heading vu-settings-data-heading", children: "Game data" }),','Soundtrack settings panel');
  } if(selected.breakthrough){
  s=replace(s,'    const dropped = {\n      currentSceneTranscript: transcript.slice(0, kept),','    const dropped = {\n      exBreakthrough: exReconcileBreakthrough(state.exBreakthrough,transcript.slice(0,kept),state.date,state.time),\n      currentSceneTranscript: transcript.slice(0, kept),','Reconcile dropped scene tails');
  s=replace(s,'        currentSceneTranscript: transcript.map((line, i2) => i2 === tAt ? edited : line),','        exBreakthrough: exReconcileBreakthrough(state.exBreakthrough,transcript.map((line,i)=>i===tAt?edited:line),state.date,state.time),\n        currentSceneTranscript: transcript.map((line, i2) => i2 === tAt ? edited : line),','Reconcile edited Breakthrough memories');
  } if(selected.story){
  s=replace(s,'  let released = skip;','  exRememberTextBase(charId,conversation,sent);\n  let released = skip;','Checkpoint pre-reply texting summary');
  s=replace(s,'...(conversation?.messages ?? []).slice(-20),','...(conversation?.exFullHistory ? (conversation.messages ?? []) : (conversation?.messages ?? []).slice(-20)),','Retain legacy texting context during regeneration');
  } if(selected.music){
  s=replace(s,'  source.loop = AUDIO_FILES[key].loop;','  source.loop = exMusicLoop(key);','Custom soundtrack loop preference');
  s=replace(s,'  if (!file.loop) armEnd(channel, layer, source, buffer.duration);','  if (!exMusicLoop(key)) armEnd(channel, layer, source, buffer.duration);','Match track end handling to loop preference');
  s=replace(s,'function menuMix(facts) {','function menuMix(facts) {\n  if(exMusicMap?.title) return {music:{key:"title",fade:TITLE_IN},ambience:{key:null,fade:MENU_AMBIENCE_OUT},...noCg()};','Loop custom title on menu reentry');

  if(selected.music)s=replace(s,'    state.wanted = { key: null, semitones: 0 };\n    if (layer.endingTimer !== null)', '    if(!exMusicMap?.[layer.key]||exMusicLoop(layer.key))state.wanted = { key: null, semitones: 0 };\n    if (layer.endingTimer !== null)','Remember completed custom cue until cue changes');
  } if(selected.story){
  s=replace(s,'function castScenePrompt(','function exBaseMemoryCast(','Memory cast prompt wrapper');
  s=replace(s,'function buildSoloPrompt(','function exBaseMemorySolo(','Memory solo prompt wrapper');
  s=replace(s,'function buildTextingPrompt(character, info, conversation, newMessage, state, reader) {','function exBaseMemoryTexting(character, info, conversation, newMessage, state, reader) {','Memory phone wrapper');
  s=replace(s,'function buildSlotIntroPrompt(','function exBaseMemoryIntro(','Memory introduction wrapper');
  s=replace(s,'function buildLedgerPrompt(cast, scene, state, reader2, schedule) {','function exBaseMemoryLedger(cast, scene, state, reader2, schedule) {','Memory ledger wrapper');
  s=replace(s,'function GameMenuModal({',fs.readFileSync(path.join(__dirname,'ex-memory-core.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'ex-memory.js'),'utf8')+'\nfunction GameMenuModal({','Story memory and editor');
  s=replace(s,'const initialState = {\n','const initialState = {\n  exStoryMemory: null,\n','Memory default');
  s=replace(s,'    history: save.history,','    exStoryMemory: exMemStore(save.exStoryMemory),\n    history: save.history,','Load memory facts');
  s=replace(s,'      history: state.history,','      exStoryMemory: exMemStore(state.exStoryMemory),\n      history: state.history,','Save memory facts');
  s=replace(s,'  for (const send2 of owedTexts) send2();','  exMemSettle(game, ledger);\n  for (const send2 of owedTexts) send2();','Settle lasting facts from final scene');
  s=replace(s,'  if (!host) return null;\n  const saveDead = saveOffer === "waiting";','  const [exMemoryOpen,setExMemoryOpen]=reactExports.useState(false);\n  if (!host) return null;\n  const saveDead = saveOffer === "waiting";','Memory menu state');
  s=replace(s,'/* @__PURE__ */ jsxRuntimeExports.jsxs(motion.nav, { className: "vu-menu-modal-actions vu-fan",','exMemoryOpen ? jsxRuntimeExports.jsx(ExMemoryEditor,{onBack:()=>setExMemoryOpen(false),waiting:saveDead}) : /* @__PURE__ */ jsxRuntimeExports.jsxs(motion.nav, { className: "vu-menu-modal-actions vu-fan",','Memory menu panel');
  s=replace(s,'                saveOffer !== "none" &&','                jsxRuntimeExports.jsx(motion.button,{type:"button",className:"vu-btn vu-btn--outline vu-paper",variants:dealtItem,...gestures(false,lift,press),onClick:()=>setExMemoryOpen(true),children:"Story memory"}),\n                saveOffer !== "none" &&','Memory menu button');
  } if(selected.npc){
  s=replace(s,'function ContactPage({',fs.readFileSync(path.join(__dirname,'ex-npc-watch.js'),'utf8')+'\nfunction ContactPage({','NPC spectator viewer');
  s=replace(s,'const initialState = {\n','const initialState = {\n  exNpcWatch: null,\n','NPC viewer default');
  s=replace(s,'    history: save.history,','    exNpcWatch: exWatchStore(save.exNpcWatch),\n    history: save.history,','Load saved NPC scenes');
  s=replace(s,'      history: state.history,','      exNpcWatch: exWatchStore(state.exNpcWatch),\n      history: state.history,','Save NPC scenes');
  s=replace(s,'          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Likes",','          jsxRuntimeExports.jsx(ExNpcWatch,{charId}),\n          /* @__PURE__ */ jsxRuntimeExports.jsx(Field, { label: "Likes",','NPC viewer inside profile scroll');

  }
  if(selected.breakthrough) s=replace(s,'      currentSceneTranscript: state.currentSceneTranscript.slice(0, kept),','      exBreakthrough: exReconcileBreakthrough(state.exBreakthrough,state.currentSceneTranscript.slice(0,kept),state.date,state.time),\n      currentSceneTranscript: state.currentSceneTranscript.slice(0, kept),','Reconcile unread truncation');
  if(selected.breakthrough&&!selected.story){
    s=replace(s,'function buildTextingPrompt(character, info, conversation, newMessage, state, reader2) {','function exBaseBreakthroughTexting(character, info, conversation, newMessage, state, reader2) {','Standalone Breakthrough phone continuity');
    s+='\nfunction buildTextingPrompt(...args){const request=exBaseBreakthroughTexting(...args);const continuity=exBreakthroughContinuity(useGameStore.getState(),[args[0]]);return continuity?{...request,user:request.user+"\\n\\n"+continuity}:request;}\n';
  }
  return s;
}
let selected={};
function patchArchive(source,options={}) { selected=options; if(selected.jobs&&!selected.city)throw Error("City Life jobs require locations."); changes.length=0;
  const b = fs.readFileSync(source);
  const header = JSON.parse(b.subarray(16, 16 + b.readUInt32LE(12)));
  const base = 8 + b.readUInt32LE(4);
  const entries = [];
  function walk(tree, prefix = '') {
    for (const [name, entry] of Object.entries(tree.files || {})) {
      const rel = prefix + name;
      if (entry.files) walk(entry, rel + '/');
      else if (!entry.unpacked && !entry.link) entries.push({ rel, entry, bytes: b.subarray(base + Number(entry.offset), base + Number(entry.offset) + entry.size) });
    }
  }
  walk(header);
  const pkg = JSON.parse(entries.find(e => e.rel === 'package.json').bytes);
  if (pkg.version !== '0.3.0') throw Error(`Unsupported base version ${pkg.version}; port the patch using README.md.`);
  const renderer = entries.filter(e => /^out\/renderer\/assets\/index-.*\.js$/.test(e.rel));
  if (renderer.length !== 1) throw Error('Expected one renderer bundle');
  for (const item of entries) {
    let s = (item === renderer[0] || ['out/main/index.js','out/preload/index.js','out/renderer/index.html'].includes(item.rel)) ? item.bytes.toString('utf8') : '', modified = false;
    if (item === renderer[0]) { s = patchRenderer(s); modified = true; }
    if (item.rel === 'out/main/index.js') {
      if(selected.story) s=replace(s,'async function completeStructured(request, signal, onDelta, override) {',fs.readFileSync(path.join(__dirname,'ex-memory-core.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'ex-memory-main.js'),'utf8')+'\nasync function completeStructured(request, signal, onDelta, override) {\n  request=exMemEnrichRequest(request);','Local SQLite recall before generation');
      if(selected.story) s=replace(s,"    await promises.rm(getPlaythroughPath(playthroughId), { recursive: true, force: true });","    await promises.rm(getPlaythroughPath(playthroughId), { recursive: true, force: true });\n    exMemDeletePlaythrough(playthroughId);",'Remove deleted playthrough memory index');
      if(selected.story) s=replace(s,'  handle("assets:getQuickstart", () => getQuickstart());','  handle("exMemory:inspect", (_event,payload) => exMemRecall(payload));\n  handle("assets:getQuickstart", () => getQuickstart());','Memory database inspection');
      if(selected.music||selected.names) s=replace(s,'function classifyBackupEntry(name) {',fs.readFileSync(path.join(__dirname,'ex-backup-main.js'),'utf8')+'\nfunction classifyBackupEntry(name) {\n  if(/^exMusic\\/[a-f0-9]{64}\\.(mp3|ogg|wav)$/.test(name))return "audio";','EX backup helpers and audio entries');
      if(selected.music||selected.names) s=replace(s,'    await writeAtomicJson(path.join(scratch, BACKUP_NAME), record, {','    await exBackupExport(scratch,record);\n    await writeAtomicJson(path.join(scratch, BACKUP_NAME), record, {','Export music and playthrough labels');
      if(selected.music||selected.names) s=replace(s,'    const record = await readBackupRecord(scratch);','    const record = await readBackupRecord(scratch);\n    await exBackupValidate(scratch,record);','Validate EX backup before restoring');
      if(selected.names) s=replace(s,'      if (playthrough.record) {','      if(playthrough.exName!=null)await writeAtomicJson(path.join(folder,".ex-name"),{name:exValidatePlaythroughName(playthrough.exName)},RESTORE_FAILED);\n      if (playthrough.record) {','Restore playthrough names');
      if(selected.music) s=replace(s,'    await restoreCharacters(scratch, record);','    await restoreCharacters(scratch, record);\n    await exBackupRestoreMusic(scratch,record);','Restore custom music');
      if(selected.music) s=replace(s,'async function readAudio(file) {',fs.readFileSync(path.join(__dirname,'ex-music-main.js'),'utf8')+'\nasync function readAudio(file) {','Local music storage');
      if(selected.music) s=replace(s,'  handle("assets:readAudio", (_event, file) => readAudio(file));','  handle("exMusic:list", () => exMusicList());\n  handle("exMusic:pick", event => exMusicPick(event));\n  handle("exMusic:commit", (event,key,token) => exMusicExclusive(()=>exMusicCommit(event,key,token)));\n  handle("exMusic:remove", (_event,key) => exMusicExclusive(()=>exMusicRemove(key)));\n  handle("exMusic:loop", (_event,key,value) => exMusicExclusive(()=>exMusicSetLoop(key,value)));\n  handle("exMusic:cleanup", () => exMusicExclusive(()=>exMusicCleanup()));\n  handle("exMusic:read", (_event,key) => exMusicRead(key));\n  handle("assets:readAudio", (_event, file) => readAudio(file));','Soundtrack IPC');
      if(selected.names) s=replace(s,'async function listPlaythroughs() {',fs.readFileSync(path.join(__dirname,'ex-playthrough-name-main.js'),'utf8')+'\nasync function listPlaythroughs() {','Playthrough name storage');
      if(selected.names) s=replace(s,'label: `Playthrough ${summaries.length + 1}`,','label: await exReadPlaythroughName(playthroughId) || `Playthrough ${summaries.length + 1}`,','Custom playthrough labels');
      if(selected.names) s=replace(s,'  handle("saves:playthroughs", () => listPlaythroughs());','  handle("saves:rename", (_event,id,name) => exRenamePlaythrough(id,name));\n  handle("saves:playthroughs", () => listPlaythroughs());','Rename IPC handler');
      s = replace(s, '  const none = { current, latest: null, available: false };', '  const none = { current, latest: null, available: false };\n  return none; // Community mods require a separately verified upgrade.', 'Disable stock updates');
      s = replace(s, '  handle("update:apply", async (event) => {', '  handle("update:apply", async (event) => {\n    throw new Error("Venus University Mods: automatic updates are disabled. See README.md for upgrading.");', 'Block stock update installation');
      modified = true;
    }
    if(item.rel==='out/preload/index.js'){
      if(selected.story) s=replace(s,'  platform: "desktop",','  exMemory:{inspect:payload=>electron.ipcRenderer.invoke("exMemory:inspect",payload)},\n  platform: "desktop",','Memory preload');
      if(selected.music) s=replace(s,'  platform: "desktop",','  exMusic: {loop:(key,value)=>electron.ipcRenderer.invoke("exMusic:loop",key,value),cleanup:()=>electron.ipcRenderer.invoke("exMusic:cleanup"),list:()=>electron.ipcRenderer.invoke("exMusic:list"),pick:()=>electron.ipcRenderer.invoke("exMusic:pick"),commit:(key,token)=>electron.ipcRenderer.invoke("exMusic:commit",key,token),remove:key=>electron.ipcRenderer.invoke("exMusic:remove",key),read:key=>electron.ipcRenderer.invoke("exMusic:read",key)},\n  platform: "desktop",','Soundtrack preload API');
      if(selected.names) s=replace(s,'    playthroughs: () => electron.ipcRenderer.invoke("saves:playthroughs"),','    rename: (id,name) => electron.ipcRenderer.invoke("saves:rename",id,name),\n    playthroughs: () => electron.ipcRenderer.invoke("saves:playthroughs"),','Rename preload API');modified=true;
    }
    if (item.rel === 'out/renderer/index.html') {
      s = replace(s, '<title>Venus University</title>', '<title>Venus University Mods</title>\n<style>.vu-ex-options{margin:12px 0;padding:12px;border:1px solid currentColor;border-radius:8px;font-size:14px}.vu-ex-options p{font-size:12px;margin:8px 0}.vu-ex-options select{max-width:100%;padding:6px}.vu-ex-detriments{display:flex;flex-wrap:wrap;gap:10px 20px}.vu-ex-target{display:block;margin-top:10px}.vu-ex-twist{display:flex;flex-direction:column;gap:6px;margin-top:10px}.vu-ex-twist textarea{box-sizing:border-box;width:100%;padding:10px;font:inherit;color:var(--vu-text);background:var(--vu-panel);border:1px solid currentColor;border-radius:6px;resize:vertical;min-height:80px}.vu-ex-twist span{font-size:12px}.vu-ex-journals{box-sizing:border-box;width:100%;height:100%;overflow-y:auto;padding:44px 32px 56px 64px;color:var(--vu-text);font-size:15px;line-height:1.55}.vu-ex-journals h2{margin:0 0 8px}.vu-ex-journal-controls{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.vu-ex-journal-controls select,.vu-ex-journal-controls button{font:inherit;padding:8px 10px;border:1px solid currentColor;border-radius:7px;color:inherit;background:var(--vu-panel,#fff8ee)}.vu-ex-journal-controls button:disabled{opacity:.55;cursor:default}.vu-ex-journal-controls button:focus-visible,.vu-ex-journal-controls select:focus-visible{outline:3px solid #9a6abd;outline-offset:2px}.vu-ex-journal-note{font-size:12px;opacity:.8}.vu-ex-journal-post{margin:20px 0;padding:20px;border:1px solid currentColor;border-radius:10px;background:var(--vu-panel,#fff8ee);overflow-wrap:anywhere}.vu-ex-journal-byline{font-weight:700}.vu-ex-journal-mood{font-style:italic;font-size:13px}.vu-ex-journal-text{white-space:pre-wrap}.vu-ex-journal-comment{border-left:3px solid #ac81bd;margin:12px 0;padding:4px 12px;font-size:14px}.vu-ex-journal-comment p{margin:4px 0}.vu-ex-journals{--ex-journal-bg:#fff8ee;--ex-journal-ink:#302238;color:var(--ex-journal-ink);background:var(--ex-journal-bg)}[data-theme="night"] .vu-ex-journals{--ex-journal-bg:#282332;--ex-journal-ink:#f7efff;color-scheme:dark}.vu-ex-journal-post,.vu-ex-journal-controls select,.vu-ex-journal-controls button{background:var(--ex-journal-bg);color:var(--ex-journal-ink)}.vu-ex-journal-controls option{background:var(--ex-journal-bg);color:var(--ex-journal-ink)}.vu-ex-player-composer{margin:16px 0;border:1px solid currentColor;border-radius:8px;padding:14px}.vu-ex-player-composer summary{cursor:pointer;font-weight:bold}.vu-ex-player-composer form{display:flex;flex-direction:column;gap:10px;margin-top:12px}.vu-ex-player-composer label{display:flex;flex-direction:column;gap:4px}.vu-ex-player-composer input,.vu-ex-player-composer textarea,.vu-ex-player-composer button{box-sizing:border-box;max-width:100%;font:inherit;padding:10px;border:1px solid currentColor;border-radius:6px;background:var(--ex-journal-bg);color:var(--ex-journal-ink)}.vu-ex-player-composer textarea{width:100%;resize:vertical}.vu-ex-player-composer button{align-self:flex-start}.vu-ex-player-composer :focus-visible{outline:3px solid #ac81bd;outline-offset:2px}.vu-ex-player-composer button:disabled{opacity:.6}.vu-ex-journal-comment-head,.vu-ex-journal-reply{display:flex;gap:10px;align-items:flex-start}.vu-ex-journal-comment-head>div,.vu-ex-journal-reply>div{min-width:0;flex:1}.vu-ex-journal-avatar{width:40px;height:40px;object-fit:cover;flex:none;border-radius:50%;border:1px solid currentColor;background:var(--ex-journal-bg)}.vu-ex-journal-avatar--fallback{display:grid;place-items:center;font-size:12px;font-weight:700}.vu-ex-journal-reply{margin:10px 0 0 28px;padding:8px 0 0 10px;border-left:2px solid #ac81bd}.vu-ex-journal-reply .vu-ex-journal-avatar{width:30px;height:30px;font-size:10px}.vu-ex-journal-reply p{margin:3px 0}.vu-ex-journal-reply-button,.vu-ex-journal-reply-form button{font:inherit;margin-top:8px;padding:5px 9px;border:1px solid currentColor;border-radius:5px;color:var(--ex-journal-ink);background:var(--ex-journal-bg)}.vu-ex-journal-reply-form{margin:9px 0 0 50px}.vu-ex-journal-reply-form label{display:flex;flex-direction:column;gap:4px;font-size:13px}.vu-ex-journal-reply-form textarea{box-sizing:border-box;width:100%;font:inherit;padding:7px;border:1px solid currentColor;border-radius:5px;color:var(--ex-journal-ink);background:var(--ex-journal-bg);resize:vertical}.vu-ex-journal-reply-form button+button{margin-left:8px}.vu-ex-journal-reply-form :focus-visible,.vu-ex-journal-reply-button:focus-visible{outline:3px solid #ac81bd;outline-offset:2px}</style>', 'EX title and styles');
      modified = true;
    }
    if (modified) {
      if(item.rel==='out/renderer/index.html')s=replace(s,'</style>',[...(selected.story?['ex-journal-design.css','ex-memory.css','ex-texting.css']:[]),...(selected.breakthrough?['ex-breakthrough.css']:[]),...(selected.twist?['ex-plot-twists.css']:[]),'ex-layout.css',...(selected.setup?['ex-setup.css']:[]),...(selected.names?['ex-playthrough-name.css']:[]),...(selected.music?['ex-music.css']:[]),...(selected.npc?['ex-npc-watch.css']:[])].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n')+'\n</style>','Selected feature design');
      if (item.rel.endsWith('.js')) { const check = require('child_process').spawnSync(process.execPath, ['--check', '--input-type=' + (item === renderer[0] ? 'module' : 'commonjs')], { input: s, encoding: 'utf8' }); if (check.status !== 0) throw Error(check.stderr); }
      item.bytes = Buffer.from(s);
      if (item.entry.integrity) {
        const blockSize = item.entry.integrity.blockSize || 4194304;
        item.entry.integrity = { algorithm: 'SHA256', hash: hash(item.bytes), blockSize, blocks: [] };
        for (let i = 0; i < item.bytes.length; i += blockSize) item.entry.integrity.blocks.push(hash(item.bytes.subarray(i, i + blockSize)));
      }
    }
  }
  if(selected.city) for(const venue of require('./ex-locations.cjs').venues)for(const half of ['day','night']){
    const name='ex-'+venue.id+'_'+half+'.png',bytes=fs.readFileSync(path.join(__dirname,'location-assets',venue.id+'_'+half+'.png'));
    const blockSize=4194304,entry={size:bytes.length,offset:'0',integrity:{algorithm:'SHA256',hash:hash(bytes),blockSize,blocks:[]}};
    for(let i=0;i<bytes.length;i+=blockSize)entry.integrity.blocks.push(hash(bytes.subarray(i,i+blockSize)));
    header.files.out.files.renderer.files.assets.files[name]=entry;entries.push({rel:'out/renderer/assets/'+name,entry,bytes});
  }
  let offset = 0;
  for (const item of entries) { item.entry.offset = String(offset); item.entry.size = item.bytes.length; offset += item.bytes.length; }
  const json = Buffer.from(JSON.stringify(header));
  const pickle = Buffer.alloc(8 + Math.ceil(json.length / 4) * 4);
  pickle.writeUInt32LE(pickle.length - 4, 0); pickle.writeUInt32LE(json.length, 4); json.copy(pickle, 8);
  const size = Buffer.alloc(8); size.writeUInt32LE(4, 0); size.writeUInt32LE(pickle.length, 4);
  return { bytes: Buffer.concat([size, pickle, ...entries.map(e => e.bytes)]), sourceHash: hash(b), changes: [...changes] };
}
module.exports={patchArchive};