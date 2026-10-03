'use strict';
const modules=[
 {id:'story',bit:1,label:'Story & Social core'},
 {id:'city',bit:2,label:'City Life locations'},
 {id:'music',bit:4,label:'Custom soundtrack'},
 {id:'npc',bit:8,label:'Meanwhile conversations'},
 {id:'names',bit:16,label:'Playthrough renaming'},
 {id:'jobs',bit:32,label:'City Life jobs',requires:['city']},
 {id:'setup',bit:64,label:'Starting relationships (ex / dislike)'},
 {id:'twist',bit:128,label:'Plot Twist'},
 {id:'breakthrough',bit:512,label:'Breakthrough'}
];
function optionsFor(selection){
 if(!Number.isInteger(selection)||selection<1||selection>1023||(selection&256))throw Error('Select at least one supported mod.');
 const options=Object.fromEntries(modules.map(m=>[m.id,!!(selection&m.bit)]));
 if(options.jobs&&!options.city)throw Error('City Life jobs require City Life locations. Select both.');
 return options;
}
module.exports={modules,optionsFor};
