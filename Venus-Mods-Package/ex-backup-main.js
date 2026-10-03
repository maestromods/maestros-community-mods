// Optional EX extension to the native portable backup. Older backups still load.
async function exBackupExport(scratch,record) {
  if(typeof exReadPlaythroughName==='function')for(const [id,item] of Object.entries(record.playthroughs))item.exName=await exReadPlaythroughName(id);
  if(typeof exMusicList!=='function')return;
  record.exMusic=await exMusicList();
  for(const file of new Set(Object.values(record.exMusic).map(item=>item.file))){
    const from=path.join(exMusicDir(),file),stat=await promises.stat(from);
    if(stat.size>50*1024*1024)throw Error('A custom soundtrack file exceeds the backup limit.');
    const bytes=await promises.readFile(from);
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==file.slice(0,64))throw Error('A custom soundtrack file has changed. Restore or replace that track before exporting a backup.');
    await promises.mkdir(path.join(scratch,'exMusic'),{recursive:true});
    await promises.copyFile(from,path.join(scratch,'exMusic',file));
  }
}
async function exBackupValidate(scratch,record) {
  if(typeof exValidatePlaythroughName==='function')for(const item of Object.values(record.playthroughs||{}))if(item.exName!=null)exValidatePlaythroughName(item.exName);
  if(typeof exMusicKey!=='function'||record.exMusic===undefined)return;
  if(!record.exMusic||typeof record.exMusic!=='object'||Array.isArray(record.exMusic))throw Error('Invalid EX soundtrack backup.');
  for(const [key,item] of Object.entries(record.exMusic)){
    exMusicKey(key);
    if(!item||!EX_MUSIC_FILE.test(item.file)||typeof item.name!=='string'||item.name.length>180||(item.loop!==undefined&&typeof item.loop!=='boolean'))throw Error('Invalid EX soundtrack assignment.');
    const file=path.join(scratch,'exMusic',item.file),stat=await promises.stat(file);
    if(!stat.isFile()||stat.size>50*1024*1024)throw Error('Invalid EX soundtrack file size.');
    const bytes=await promises.readFile(file);
    if(crypto.createHash('sha256').update(bytes).digest('hex')!==item.file.slice(0,64))throw Error('A soundtrack backup file failed its integrity check.');
  }
}
async function exBackupRestoreMusic(scratch,record) {
  // Legacy backups have no EX extension: retain local music choices.
  if(record.exMusic===undefined)return;
  await promises.mkdir(exMusicDir(),{recursive:true});
  for(const file of new Set(Object.values(record.exMusic).map(item=>item.file)))await promises.copyFile(path.join(scratch,'exMusic',file),path.join(exMusicDir(),file));
  await writeAtomicJson(path.join(exMusicDir(),'tracks.json'),record.exMusic,{code:'EX_MUSIC_RESTORE',message:'Could not restore music assignments.'});
}
