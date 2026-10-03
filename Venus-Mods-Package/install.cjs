process.noAsar=true;
'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process');const {patchArchive}=require('./patch.cjs');const crypto=require('crypto'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'manifest.json'))),BASE_SHA='bf6d54c42d507d48415f5beb9a6950de5a216d307a6d4c42dc39e05e3c1ee72a';if(manifest.baseSha256!==BASE_SHA)throw Error('Invalid package: the baseline is not the original game.');
const mode=process.argv[2],folder=process.argv[3];if(!['install','check','uninstall'].includes(mode)||!folder)throw Error('Usage: node install.cjs check|install|uninstall "GAME FOLDER"');
const root=fs.realpathSync(folder),archive=path.join(root,'resources','app.asar'),record=path.join(root,'venus-mods-mod.json');
if(!fs.existsSync(archive))throw Error('Select the game folder containing resources/app.asar');
function closed(){if(process.platform!=='win32')return;const query="@(Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like 'Venus University*' -and $_.Id -ne "+process.pid+" }).Count";const n=cp.execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',query],{encoding:'utf8',windowsHide:true}).trim();if(!/^\d+$/.test(n)||Number(n)>0)throw Error('Save and close all Venus University windows first.');}
if(mode==='uninstall'){
 closed();
 if(!fs.existsSync(record)){
  throw Error('No installed code-mod record was found. Nothing changed.');
 }
 const r=JSON.parse(fs.readFileSync(record));
 if(r.mod!=='Venus Mods'||!['1.0.0','1.0.1','1.0.2','1.1.0','1.3.0','1.3.1','1.3.2','1.4.0','1.4.1','1.5.0-preview','1.5.1-preview','1.6.0-preview','1.6.1-preview','1.7.0','1.7.1'].includes(r.version))throw Error('Unrecognized installation record. Nothing changed.');
 function verifiedBackup(meta,subfolder,expected){
  if(typeof meta.backup!=='string')throw Error('Missing backup path. Nothing changed.');
  const parent=path.resolve(root,subfolder),file=path.resolve(root,meta.backup);
  if(!file.startsWith(parent+path.sep)||path.basename(file)!=='app.asar')throw Error('Invalid backup path. Nothing changed.');
  if(!fs.existsSync(file))throw Error('The required backup is missing: '+file+'. Nothing changed.');
  const bytes=fs.readFileSync(file);
  if(sha(bytes)!==expected||meta.sourceSha256!==expected)throw Error('The backup does not match its recorded source. Nothing changed.');
  return bytes;
 }
 const current=fs.readFileSync(archive);
 if(sha(current)!==r.patchedSha256)throw Error('Game archive changed since installation. Nothing changed.');
 const legacySource='312c2df2b2eea127a7000e0d6be6d2ee6eaca7365a48f8a593e72f3011147d29';
 let original,cityRecord=null;
 if(r.sourceSha256===BASE_SHA)original=verifiedBackup(r,'venus-mods-backups',BASE_SHA);
 else if(r.version==='1.0.0'&&r.sourceSha256===legacySource){
  const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,'legacy-1.0.0.json')));
  if(legacy.baseSha256!==legacySource||legacy.combinations[r.selection]!==r.patchedSha256)throw Error('Unrecognized legacy installation. Nothing changed.');
  verifiedBackup(r,'venus-mods-backups',legacySource);
  cityRecord=path.join(root,'city-life-mod.json');
  if(!fs.existsSync(cityRecord))throw Error('This older installation was layered over City Life. Its City Life installation record is needed to verify the original backup. Nothing changed.');
  const city=JSON.parse(fs.readFileSync(cityRecord));
  if(city.mod!=='City Life'||city.version!=='1.0.0'||city.patchedSha256!==legacySource)throw Error('City Life backup chain does not match this installation. Nothing changed.');
  original=verifiedBackup(city,'city-life-backups',BASE_SHA);
 }else throw Error('Unrecognized backup source. Nothing changed.');
 // Every archive and both records have passed verification before the first write.
 closed();
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const recovery=path.join(root,'venus-mods-backups','uninstall-'+stamp);
 fs.mkdirSync(recovery,{recursive:true});
 fs.writeFileSync(path.join(recovery,'installed-app.asar'),current,{flag:'wx'});
 fs.copyFileSync(record,path.join(recovery,'venus-mods-record.json'),fs.constants.COPYFILE_EXCL);
 if(cityRecord)fs.copyFileSync(cityRecord,path.join(recovery,'city-life-record.json'),fs.constants.COPYFILE_EXCL);
 if(sha(fs.readFileSync(path.join(recovery,'installed-app.asar')))!==r.patchedSha256)throw Error('Recovery backup failed verification. Original installation retained.');
 const temp=archive+'.restore-'+stamp,moved=[];
 fs.writeFileSync(temp,original,{flag:'wx'});
 if(sha(fs.readFileSync(temp))!==BASE_SHA)throw Error('Restoration staging failed verification. Original installation retained.');
 let replaced=false;
 try{
  fs.renameSync(temp,archive);replaced=true;
  const records=[record,...(cityRecord?[cityRecord]:[])];
  for(const file of records){const destination=path.join(recovery,'retired-'+path.basename(file));fs.renameSync(file,destination);moved.push([file,destination]);}
 }catch(error){
  for(const [file,destination]of moved.reverse())fs.renameSync(destination,file);
  if(replaced){const rollback=archive+'.rollback-'+stamp;fs.writeFileSync(rollback,current,{flag:'wx'});fs.renameSync(rollback,archive);}
  throw error;
 }
 console.log('Original game restored'+(cityRecord?' after verifying both the general-mod and City Life backups':'')+'. Saves retained. Recovery copy: '+recovery+'\nYou can now install your selected mods with this setup.');process.exit(0);
}

const selection=Number(process.argv[4]);const {optionsFor}=require('./modules.cjs');const options=optionsFor(selection);
const bits=selection;
if(fs.existsSync(record)){const installed=JSON.parse(fs.readFileSync(record));if(mode==='check'&&sha(fs.readFileSync(archive))===installed.patchedSha256){console.log('Existing mods are installed. Uninstall before changing selections; older records use a different option layout.');process.exit(0);}throw Error('Venus Mods is already installed. Uninstall before changing selections.');}if(sha(fs.readFileSync(archive))!==BASE_SHA)throw Error('Requires the original unmodified Windows game 0.3.0');const r=patchArchive(archive,options);if(sha(r.bytes)!==manifest.combinations[bits])throw Error('Package source/assets differ from validated release. Rebuild and test before publishing your edited version.');
if(mode==='check'){console.log('Compatible pristine base game 0.3.0; '+r.changes.length+' integrations verified. No files changed.');process.exit(0);}
closed();const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backup=path.join(root,'venus-mods-backups',stamp);fs.mkdirSync(backup,{recursive:true});fs.copyFileSync(archive,path.join(backup,'app.asar'),fs.constants.COPYFILE_EXCL);if(sha(fs.readFileSync(path.join(backup,'app.asar')))!==BASE_SHA)throw Error('Backup verification failed');
const meta={selection:bits,mod:'Venus Mods',version:'1.7.1',baseVersion:'0.3.0',sourceSha256:BASE_SHA,patchedSha256:sha(r.bytes),backup:path.relative(root,path.join(backup,'app.asar')),installedAt:new Date().toISOString()};
const tmp=archive+'.venus-mods-'+stamp;fs.writeFileSync(tmp,r.bytes,{flag:'wx'});if(sha(fs.readFileSync(tmp))!==meta.patchedSha256)throw Error('Staging verification failed');fs.writeFileSync(record,JSON.stringify(meta,null,2),{flag:'wx'});try{fs.renameSync(tmp,archive);}catch(e){const recovery=archive+'.install-rollback-'+stamp;fs.copyFileSync(path.join(backup,'app.asar'),recovery);fs.renameSync(recovery,archive);fs.unlinkSync(record);throw e;}console.log('Community mods installed. Backup: '+backup+'\nLaunch your normal game executable.');
