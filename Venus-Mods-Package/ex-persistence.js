// Persist only at a native safe point; never manufacture an old scene checkpoint.
async function exPersistModState(expected=useGameStore.getState().playthroughId) {
  if(manualSaveOffer()!=='open')throw Error('Changes are in this session. Wait for narration to finish, then save your game.');
  const before=useGameStore.getState(),loads=before.loads;
  if(before.playthroughId!==expected)throw Error('The active playthrough changed.');
  const draft=manualSaveDraft()||(!sceneActiveOf(before)?{...before.toGameSave(),scene:null}:null);
  if(!draft)throw Error('No safe save point is available. Save your game when the scene finishes.');
  let completed=false;manualWriting=true;
  try{await queueWrite(async()=>{
    const live=useGameStore.getState();
    if(live.playthroughId!==expected||live.loads!==loads)throw Error('The active game changed.');
    const result=await window.api.saves.autosave(expected,draft);
    if(!result.ok)throw Error(result.error?.message||'Could not save changes. Please save manually.');
    completed=true;
  });if(!completed)throw Error('The active game changed before saving completed.');}
  finally{manualWriting=false;}
}
