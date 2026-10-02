// Only native-dialog selections can be imported. No renderer-supplied paths.
const EX_MUSIC_KEYS=['title','landing_day','landing_night','landing_day_alt','landing_night_alt','ending','venue_edm','venue_lofi','venue_pop','venue_rock'];
let exMusicPending=null;
const EX_MUSIC_FILE=/^[a-f0-9]{64}\.(mp3|ogg|wav)$/;
let exMusicWrites=Promise.resolve();
function exMusicExclusive(work){const next=exMusicWrites.then(work,work);exMusicWrites=next.catch(()=>{});return next;}
function exMusicKey(key){if(!EX_MUSIC_KEYS.includes(key))throw Error('Unknown soundtrack slot.');return key;}
function exMusicDir(){return path.join(getDataPath(),'ex-music');}
async function exMusicList(){
  let raw;try{raw=JSON.parse(await promises.readFile(path.join(exMusicDir(),'tracks.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {};throw Error('Could not read soundtrack choices.');}
  const out={};for(const key of EX_MUSIC_KEYS){const item=raw[key];if(item&&EX_MUSIC_FILE.test(item.file)&&typeof item.name==='string')out[key]={file:item.file,name:item.name.slice(0,180),loop:item.loop!==false};}return out;
}
async function exMusicPick(event){
  exMusicPending=null;
  const picked=await showOpenDialogFor(event,{title:'Choose a replacement music track',properties:['openFile'],filters:[{name:'Music',extensions:['mp3','ogg','wav']}]});
  if(picked.canceled||!picked.filePaths?.length)return null;
  const source=picked.filePaths[0],ext=path.extname(source).toLowerCase();
  if(!['.mp3','.ogg','.wav'].includes(ext))throw Error('Choose an MP3, OGG or WAV file.');
  const stat=await promises.stat(source);if(!stat.isFile()||stat.size>50*1024*1024||!stat.size)throw Error('Choose a nonempty audio file under 50 MB.');
  const bytes=await promises.readFile(source);if(bytes.length>50*1024*1024)throw Error('Music file is too large.');
  const token=crypto.randomUUID(),name=path.basename(source),file=crypto.createHash('sha256').update(bytes).digest('hex')+ext;
  exMusicPending={token,name,file,bytes,sender:event.sender.id};
  setTimeout(()=>{if(exMusicPending?.token===token)exMusicPending=null;},60000).unref();
  return {token,name,bytes};
}
async function exMusicCommit(event,key,token){
  exMusicKey(key);const p=exMusicPending;
  if(!p||p.token!==token||p.sender!==event.sender.id)throw Error('Choose the music file again.');
  exMusicPending=null;
  const map=await exMusicList();await promises.mkdir(exMusicDir(),{recursive:true});
  await promises.writeFile(path.join(exMusicDir(),p.file),p.bytes);
  map[key]={file:p.file,name:p.name,loop:map[key]?.loop!==false};
  await writeAtomicJson(path.join(exMusicDir(),'tracks.json'),map,{code:'EX_MUSIC_WRITE',message:'Could not save soundtrack choices.'});
  return map;
}
async function exMusicRemove(key){
  exMusicKey(key);const map=await exMusicList();delete map[key];await promises.mkdir(exMusicDir(),{recursive:true});
  await writeAtomicJson(path.join(exMusicDir(),'tracks.json'),map,{code:'EX_MUSIC_WRITE',message:'Could not restore the original track.'});return map;
}
async function exMusicRead(key){
  exMusicKey(key);const map=await exMusicList(),item=map[key];if(!item)return null;
  const file=path.join(exMusicDir(),item.file),stat=await promises.stat(file);
  if(stat.size>50*1024*1024)throw Error('Music file is too large.');return promises.readFile(file);
}
async function exMusicSetLoop(key,loop){
  exMusicKey(key);if(typeof loop!=='boolean')throw Error('Invalid loop choice.');
  const map=await exMusicList();if(!map[key])throw Error('Choose a replacement track first.');
  map[key]={...map[key],loop};await writeAtomicJson(path.join(exMusicDir(),'tracks.json'),map,{code:'EX_MUSIC_WRITE',message:'Could not save loop preference.'});return map;
}
async function exMusicCleanup(){
  const map=await exMusicList(),used=new Set(Object.values(map).map(x=>x.file));let count=0;
  let files;try{files=await promises.readdir(exMusicDir());}catch(e){if(e.code==='ENOENT')return {count};throw e;}
  // Only direct children with generated content-hash names; never user originals.
  const root=path.resolve(exMusicDir());
  for(const name of files){if(!EX_MUSIC_FILE.test(name)||used.has(name))continue;const file=path.resolve(root,name);if(path.dirname(file)!==root)throw Error('Invalid cleanup path.');const stat=await promises.lstat(file);if(!stat.isFile()||stat.isSymbolicLink())continue;await promises.unlink(file);count++;}
  return {count};
}
