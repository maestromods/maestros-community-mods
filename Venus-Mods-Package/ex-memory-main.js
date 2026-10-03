// SQLite index contains only the supplied save snapshot. No network, external programs, or extensions.
function exMemValidatePayload(p) {
  if(!p||!/^\d{1,20}$/.test(String(p.playthroughId))||!Array.isArray(p.records)||p.records.length>10000||!Array.isArray(p.cast)||p.cast.length>100||typeof p.names!=='object'||!p.names)throw Error('Invalid story-memory snapshot.');
  if(JSON.stringify(p).length>24*1024*1024)throw Error('Story-memory snapshot exceeds the local indexing limit.');
  const ids=new Set();for(const r of p.records){
    if(!r||typeof r.id!=='string'||r.id.length>200||ids.has(r.id)||!['encounter','fact'].includes(r.kind)||typeof r.text!=='string'||r.text.length>12000||!Number.isInteger(r.date)||![0,1].includes(r.time)||!Array.isArray(r.subjects)||!Array.isArray(r.knownBy)||[...r.subjects,...r.knownBy].some(x=>typeof x!=='string'||x.length>200))throw Error('Invalid story-memory record.');ids.add(r.id);
  }
  return p;
}
function exMemDatabase() {
  const dir=path.join(getDataPath(),'ex-memory');fs.mkdirSync(dir,{recursive:true});
  const db=new(require('node:sqlite').DatabaseSync)(path.join(dir,'memory.sqlite'),{timeout:1000,enableForeignKeyConstraints:true,allowExtension:false});
  try {db.exec(`PRAGMA journal_mode=DELETE; PRAGMA user_version=1;
    CREATE TABLE IF NOT EXISTS snapshots (playthrough TEXT PRIMARY KEY, fingerprint TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (playthrough TEXT NOT NULL,id TEXT NOT NULL,kind TEXT NOT NULL,slot INTEGER NOT NULL,search TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(playthrough,id));
    CREATE TABLE IF NOT EXISTS characters (playthrough TEXT NOT NULL,id TEXT NOT NULL,character TEXT NOT NULL,PRIMARY KEY(playthrough,id,character));
    CREATE INDEX IF NOT EXISTS memory_recent ON records(playthrough,kind,slot DESC);
    CREATE INDEX IF NOT EXISTS memory_character ON characters(playthrough,character,id);`);return db;
  }catch(e){db.close();throw e;}
}
function exMemRecall(payload) {
  const p=exMemValidatePayload(payload),id=String(p.playthroughId),db=exMemDatabase();
  try {
    const fingerprint=crypto.createHash('sha256').update(JSON.stringify(p.records)).digest('hex');
    if(db.prepare('SELECT fingerprint FROM snapshots WHERE playthrough=?').get(id)?.fingerprint!==fingerprint){
      db.exec('BEGIN IMMEDIATE');try{
        db.prepare('DELETE FROM records WHERE playthrough=?').run(id);db.prepare('DELETE FROM characters WHERE playthrough=?').run(id);
        const insert=db.prepare('INSERT INTO records VALUES(?,?,?,?,?,?)'),link=db.prepare('INSERT OR IGNORE INTO characters VALUES(?,?,?)');
        for(const r of p.records){insert.run(id,r.id,r.kind,exMemSlot(r.date,r.time),r.text.toLowerCase(),JSON.stringify(r));for(const c of new Set([...r.subjects,...r.knownBy]))link.run(id,r.id,c);}
        db.prepare('INSERT OR REPLACE INTO snapshots VALUES(?,?)').run(id,fingerprint);db.exec('COMMIT');
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    const rows=new Map(),add=list=>list.forEach(x=>{const r=JSON.parse(x.data);rows.set(r.id,r);});
    add(db.prepare("SELECT data FROM records WHERE playthrough=? AND kind='fact'").all(id));
    if(p.cast.length){for(const char of p.cast)add(db.prepare("SELECT r.data FROM records r JOIN characters c ON r.playthrough=c.playthrough AND r.id=c.id WHERE r.playthrough=? AND c.character=? AND r.kind='encounter' ORDER BY r.slot DESC LIMIT 2").all(id,char));}
    else add(db.prepare("SELECT data FROM records WHERE playthrough=? AND kind='encounter' ORDER BY slot DESC LIMIT 2").all(id));
    const words=exMemWords(p.query||'');
    if(words.length){
      const score=words.map(()=>'(instr(r.search,?)>0)').join('+');
      const chars=p.cast.length?' AND EXISTS(SELECT 1 FROM characters c WHERE c.playthrough=r.playthrough AND c.id=r.id AND c.character IN ('+p.cast.map(()=>'?').join(',')+'))':'';
      add(db.prepare("SELECT r.data, ("+score+") AS relevance FROM records r WHERE r.playthrough=? AND r.kind='encounter'"+chars+' ORDER BY relevance DESC,r.slot DESC LIMIT 3').all(...words,id,...p.cast));
    }
    const selected=exMemSelect([...rows.values()],p.cast,p.query||'');
    return {...exMemFormat(selected,p.names,p.cast),engine:'SQLite',indexed:p.records.length};
  }finally{db.close();}
}
function exMemEnrichRequest(request) {
  if(!request?._exMemory)return request;
  const {_exMemory,...clean}=request;let memory;
  try{memory=exMemRecall(_exMemory);}catch(e){
    console.warn('[EX memory] SQLite unavailable; using this save’s in-memory recall:',e.message);
    const p=exMemValidatePayload(_exMemory);memory=exMemFormat(exMemSelect(p.records,p.cast,p.query),p.names,p.cast);
  }
  return memory.text?{...clean,user:clean.user+'\n\n'+memory.text}:clean;
}

function exMemDeletePlaythrough(id) {
  if(!fs.existsSync(path.join(getDataPath(),'ex-memory','memory.sqlite')))return;
  const db=exMemDatabase();try{db.exec('BEGIN IMMEDIATE');for(const table of ['records','characters','snapshots'])db.prepare('DELETE FROM '+table+' WHERE playthrough=?').run(String(id));db.exec('COMMIT');}finally{db.close();}
}
