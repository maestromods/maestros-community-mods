function exValidatePlaythroughName(value) {
  if(typeof value!=="string"||!value.trim()||value.trim().length>80||/[\u0000-\u001f\u007f]/.test(value))throw Error("Enter a playthrough name of 1–80 characters, on one line.");
  return value.trim();
}
async function exReadPlaythroughName(id) {
  assertSafePlaythroughId(id);
  try{const value=JSON.parse(await promises.readFile(path.join(getPlaythroughPath(id),'.ex-name'),'utf8'));return exValidatePlaythroughName(value.name);}
  catch(err){if(err.code==='ENOENT'||err instanceof SyntaxError)return null;throw err;}
}
async function exRenamePlaythrough(id,name) {
  assertSafePlaythroughId(id);const clean=exValidatePlaythroughName(name);
  const folder=getPlaythroughPath(id);if(!(await promises.stat(folder)).isDirectory())throw Error("Playthrough not found.");
  await writeAtomicJson(path.join(folder,'.ex-name'),{name:clean},{code:'PLAYTHROUGH_UNWRITABLE',message:'Could not save the playthrough name.'});
  return {playthroughId:id,label:clean};
}
