'use strict';
process.noAsar=true;
const fs=require('fs'),path=require('path');
const {modules,optionsFor}=require('./modules.cjs');
const ALL=modules.reduce((bits,m)=>bits|m.bit,0);
function selectionFor(text){
 if(text===undefined)return ALL;
 const ids=text.split(',').map(s=>s.trim()).filter(Boolean);
 if(!ids.length)throw Error('Select at least one feature.');
 let bits=0;for(const id of ids){const m=modules.find(m=>m.id===id);if(!m)throw Error('Unknown feature: '+id+'. Choices: '+modules.map(m=>m.id).join(', '));bits|=m.bit;}
 optionsFor(bits);return bits;
}
function parse(args){
 const [action,folder,...rest]=args;
 if(!['check','install','uninstall'].includes(action))throw Error('Use check, install or uninstall. Run mods.cmd help for usage.');
 if(!folder||folder.includes('"'))throw Error('Provide a game folder path.');
 let features;
 if(rest.length){if(action==='uninstall')throw Error('Uninstall restores all code mods; no feature selection is needed.');if(rest.length!==2||rest[0]!=='--features')throw Error('Expected --features followed by comma-separated feature IDs.');features=rest[1];}
 const game=fs.realpathSync(folder);if(!fs.existsSync(path.join(game,'resources/app.asar')))throw Error('Choose the game folder containing resources/app.asar.');
 return {action,game,bits:selectionFor(features)};
}
function execute(request){
 console.log('\n'+(request.action==='uninstall'?'Restoring the original game.':request.action==='check'?'Checking compatibility.':'Installing selected mods: '+modules.filter(m=>request.bits&m.bit).map(m=>m.label).join(', ')));
 // Run in this process so the game's runtime is not mistaken for a second open game.
 const argv=process.argv;
 try{process.argv=[process.execPath,path.join(__dirname,'install.cjs'),request.action,request.game,String(request.bits)];require('./install.cjs');return 0;}
 finally{process.argv=argv;}
}
module.exports={ALL,selectionFor,parse,execute};
if(require.main===module){
 try{process.exitCode=execute(parse(process.argv.slice(2)));}
 catch(error){console.error('\nUnable to complete operation: '+error.message);process.exitCode=1;}
}
