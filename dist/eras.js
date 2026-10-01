'use strict';

// Systèmes d'ère additionnels. Ce fichier est chargé avant game.js ; les
// fonctions utilisent volontairement les utilitaires et l'état du jeu à l'exécution.
const OCEAN_TYPES = [
  { id:'calm', name:'Lagune calme', icon:'◌', mood:'Dans les eaux paisibles, chaque espèce trouve sa place.', copy:'Production ×1 · ressources ×1. Un courant équilibré.', production:1, resources:{} },
  { id:'storm', name:'Mer de tempête', icon:'⌁', mood:'Les courants grondent. Une route sûre peut tout changer.', copy:'Production ×0,90 · intuition ×1,30 · marées ×1,40.', production:.9, resources:{ insight:1.3, tides:1.4 } },
  { id:'deep', name:'Abysses profondes', icon:'⌄', mood:'Sous la surface, des voix anciennes attendent votre réponse.', copy:'Production ×0,90 · vitalité ×0,85 · intuition ×1,40 · harmonie ×1,50.', production:.9, resources:{ vitality:.85, harmony:1.5, insight:1.4 } }
];

const ERA_SYMBIOSES = [
  { id:'spark-garden', name:'Étincelle fertile', species:['firefly','polyp'], needs:[8,4], insight:30, vitality:12, copy:'Luciole + Polype · +8% de lueurs et +10% d’intuition.', production:1.08, resources:{ insight:1.1 } },
  { id:'sun-coral', name:'Récif solaire', species:['anemone','coral'], needs:[4,3], insight:90, vitality:40, copy:'Anémone + Corail · +12% de lueurs et +12% de vitalité.', production:1.12, resources:{ vitality:1.12 } },
  { id:'moon-whale', name:'Marée céleste', species:['whale','moon'], needs:[2,1], insight:240, vitality:120, copy:'Baleine + Lune · +18% de lueurs et +15% de marées.', production:1.18, resources:{ tides:1.15 } }
];

const ERA_NOTES = [
  { id:'lueur', name:'Lueur', icon:'✦', copy:'Une note claire, tournée vers la production.' },
  { id:'maree', name:'Marée', icon:'≈', copy:'Un rythme ample, tourné vers les ressources.' },
  { id:'abyme', name:'Abîme', icon:'⌄', copy:'Une note profonde, tournée vers la recherche.' }
];

const ERA_DISCOVERIES = {
  cove:[
    { id:'nursery', name:'Abriter les alevins', story:'Sous les racines, une nuée de jeunes poissons cherche un abri.', copy:'+12% de vitalité', cost:{ insight:30, tides:4 }, resources:{ vitality:1.12 } },
    { id:'glimmer', name:'Suivre le reflet', story:'Une lueur file entre les rochers et révèle une veine de nacre.', copy:'+8% de production', cost:{ insight:45, tides:3 }, production:1.08 }
  ],
  lagoon:[
    { id:'amber-library', name:'Lire les bulles d’ambre', story:'Des bulles figées gardent la trace de courants anciens.', copy:'+15% d’intuition', cost:{ insight:65, tides:8 }, resources:{ insight:1.15 } },
    { id:'stillwater', name:'Réensemencer le bassin', story:'Une eau immobile attend que vous y rameniez la vie.', copy:'+12% de vitalité', cost:{ insight:50, tides:9 }, resources:{ vitality:1.12 } }
  ],
  archipelago:[
    { id:'sailstones', name:'Réveiller les pierres de voile', story:'Les pierres vibrent au passage d’un vent qui ne souffle qu’en mer.', copy:'+12% de marées', cost:{ insight:100, tides:14 }, resources:{ tides:1.12 } },
    { id:'choral-isles', name:'Répondre aux îles', story:'Un chœur lointain appelle depuis les récifs voisins.', copy:'+10% de production', cost:{ insight:120, tides:12 }, production:1.1 }
  ],
  trench:[
    { id:'echo-vault', name:'Écouter la chambre d’écho', story:'La fosse renvoie des voix qui semblent venir d’un autre âge.', copy:'+15% d’harmonie', cost:{ insight:180, tides:24 }, resources:{ harmony:1.15 } },
    { id:'deep-garden', name:'Soigner le jardin abyssal', story:'Une forêt de coraux pâles se remet à pousser au fond de la fosse.', copy:'+14% de vitalité', cost:{ insight:160, tides:28 }, resources:{ vitality:1.14 } }
  ],
  currents:[
    { id:'crossroads', name:'Ouvrir le carrefour', story:'Plusieurs courants se croisent et attendent un nouveau passage.', copy:'+12% de production', cost:{ insight:300, tides:45 }, production:1.12 },
    { id:'tide-vault', name:'Garder la marée', story:'Une poche d’eau profonde retient une marée entière.', copy:'+18% de marées', cost:{ insight:260, tides:55 }, resources:{ tides:1.18 } }
  ],
  world:[
    { id:'world-song', name:'Accorder le chant du monde', story:'L’océan tout entier répond à la note que vous donnez.', copy:'+15% de production', cost:{ insight:500, tides:90 }, production:1.15 },
    { id:'living-memory', name:'Réveiller la mémoire', story:'Les eaux racontent les vies qui ont précédé la vôtre.', copy:'+18% d’intuition', cost:{ insight:450, tides:100 }, resources:{ insight:1.18 } }
  ]
};
const ERA_ENCOUNTERS = {
  cove:'Une lueur tremble sous les algues ; de petits poissons se cachent dans les rochers.',
  lagoon:'Dans l’ambre, des bulles immobiles dessinent une carte de la lagune.',
  archipelago:'Le vent traverse les îlots et fait vibrer des pierres couvertes de coquillages.',
  trench:'Au fond de la fosse, un jardin pâle s’éclaire au son d’un écho.',
  currents:'Trois courants se croisent autour d’une poche d’eau qui scintille.',
  world:'L’océan entier se tait un instant, puis laisse remonter une mémoire ancienne.'
};

function freshEraState() {
  return { oceanType:'calm', nextOceanType:'calm', oceanObjectiveClaimed:false, symbioses:[], expeditionPlans:{}, routes:{}, discoveries:{}, journal:[], composition:[], songs:[] };
}

function sanitiseEraState(data) {
  const base=freshEraState(), source=data&&typeof data==='object'?data:{};
  const safeId=(id,choices)=>typeof id==='string'&&choices.some(item=>item.id===id)?id:null;
  const object={...base};
  object.oceanType=safeId(source.oceanType,OCEAN_TYPES)||'calm';
  object.nextOceanType=safeId(source.nextOceanType,OCEAN_TYPES)||object.oceanType;
  object.oceanObjectiveClaimed=source.oceanObjectiveClaimed===true;
  object.symbioses=Array.isArray(source.symbioses)?[...new Set(source.symbioses.filter(id=>ERA_SYMBIOSES.some(item=>item.id===id)))]:[];
  object.expeditionPlans={};
  TERRITORIES.forEach(zone=>{if(source.expeditionPlans?.[zone.id]===true)object.expeditionPlans[zone.id]=true});
  object.routes={};
  TERRITORIES.forEach(zone=>{if(Array.isArray(source.territories)&&source.territories.includes(zone.id)&&['supply','research','chorus'].includes(source.routes?.[zone.id]))object.routes[zone.id]=source.routes[zone.id]});
  object.discoveries={};
  TERRITORIES.forEach(zone=>{const choice=source.discoveries?.[zone.id];if(Array.isArray(source.territories)&&source.territories.includes(zone.id)&&ERA_DISCOVERIES[zone.id]?.some(item=>item.id===choice))object.discoveries[zone.id]=choice});
  object.journal=Array.isArray(source.journal)?source.journal.filter(item=>item&&typeof item==='object'&&typeof item.text==='string'&&item.text.length<=180).slice(-80).map(item=>({text:item.text,at:Number.isFinite(Number(item.at))?Math.max(0,Number(item.at)):0})):[];
  object.composition=Array.isArray(source.composition)?source.composition.filter(id=>ERA_NOTES.some(note=>note.id===id)).slice(0,3):[];
  object.songs=[];
  if(Array.isArray(source.songs))for(const item of source.songs){
    if(!item||typeof item!=='object'||typeof item.combo!=='string'||!/^(lueur|maree|abyme)(-(lueur|maree|abyme)){2}$/.test(item.combo))continue;
    const notes=item.combo.split('-').sort((a,b)=>ERA_NOTES.findIndex(note=>note.id===a)-ERA_NOTES.findIndex(note=>note.id===b)),combo=notes.join('-');
    if(object.songs.some(song=>song.combo===combo))continue;
    object.songs.push({combo,notes,createdAt:Number.isFinite(Number(item.createdAt))?Math.max(0,Number(item.createdAt)):0});
    if(object.songs.length>=10)break;
  }
  return object;
}

function eraJournal(text) {
  if(!Array.isArray(state.journal))state.journal=[];
  state.journal.push({text:String(text).slice(0,180),at:Date.now()});
  state.journal=state.journal.slice(-80);
}
function eraCommit(message,sound=null) {
  if(message&&typeof toast==='function')toast(message);
  if(sound&&typeof oceanSound==='function')try{oceanSound(sound)}catch{}
  if(typeof save==='function')save();
  if(typeof render==='function')render(true);
  return true;
}
function eraProductionMult() {
  let mult=1;
  const ocean=OCEAN_TYPES.find(item=>item.id===state.oceanType)||OCEAN_TYPES[0];
  mult*=ocean.production;
  if(state.oceanObjectiveClaimed&&state.oceanType==='calm')mult*=1.1;
  (state.symbioses||[]).forEach(id=>{const item=ERA_SYMBIOSES.find(value=>value.id===id);if(item)mult*=item.production});
  Object.entries(state.discoveries||{}).forEach(([zone,id])=>{if(!state.territories.includes(zone))return;for(const options of Object.values(ERA_DISCOVERIES)){const item=options.find(value=>value.id===id);if(item?.production)mult*=item.production}});
  (state.songs||[]).forEach(song=>{const counts=song.combo?.split('-').reduce((map,note)=>(map[note]=(map[note]||0)+1,map),{})||{};if((counts.lueur||0)>=2)mult*=1.06;if(counts.lueur&&counts.maree&&counts.abyme)mult*=1.04});
  Object.entries(state.routes||{}).forEach(([zone,mode])=>{if(state.territories.includes(zone)&&mode==='supply')mult*=1.025});
  return mult;
}
function eraResourceMult(resource) {
  if(typeof resource!=='string')return 1;
  let mult=1;
  const ocean=OCEAN_TYPES.find(item=>item.id===state.oceanType)||OCEAN_TYPES[0];
  mult*=ocean.resources?.[resource]||1;
  if(state.oceanObjectiveClaimed&&state.oceanType==='storm'&&resource==='tides')mult*=1.2;
  if(state.oceanObjectiveClaimed&&state.oceanType==='deep'&&resource==='harmony')mult*=1.2;
  (state.symbioses||[]).forEach(id=>{const item=ERA_SYMBIOSES.find(value=>value.id===id);if(item)mult*=item.resources?.[resource]||1});
  Object.entries(state.discoveries||{}).forEach(([zone,id])=>{if(!state.territories.includes(zone))return;for(const options of Object.values(ERA_DISCOVERIES)){const item=options.find(value=>value.id===id);if(item)mult*=item.resources?.[resource]||1}});
  (state.songs||[]).forEach(song=>{const counts=song.combo?.split('-').reduce((map,note)=>(map[note]=(map[note]||0)+1,map),{})||{};if(resource==='insight'&&(counts.abyme||0)>=2)mult*=1.06;if(resource==='tides'&&(counts.maree||0)>=2)mult*=1.08;if(counts.lueur&&counts.maree&&counts.abyme&&(resource==='insight'||resource==='tides'))mult*=1.06});
  Object.entries(state.routes||{}).forEach(([zone,mode])=>{if(!state.territories.includes(zone))return;if(resource==='insight'&&mode==='research')mult*=1.05;if(resource==='tides'&&mode==='chorus')mult*=1.05});
  return mult;
}
function chooseSymbiosis(id) {
  const eraChoice=ERA_SYMBIOSES.find(item=>item.id===id);
  if(!eraChoice||getEra()<1||(state.symbioses||[]).includes(id))return false;
  if(eraChoice.species.some((species,index)=>(state.generators?.[species]||0)<eraChoice.needs[index])||state.insight<eraChoice.insight||state.vitality<eraChoice.vitality)return false;
  state.insight-=eraChoice.insight;state.vitality-=eraChoice.vitality;state.symbioses.push(id);
  eraJournal(`Symbiose créée : ${eraChoice.name}.`);
  return eraCommit(`${eraChoice.name} · symbiose établie`,'discovery');
}

function oceanObjective() {
  const definitions={
    calm:{era:1,title:'Tisser trois symbioses',copy:'Établissez les trois symbioses pour faire grandir l’écosystème.',progress:(state.symbioses||[]).length,goal:3,reward:'+10% de production'},
    storm:{era:2,title:'Relier trois routes',copy:'Reliez trois territoires par des routes pour dompter les courants.',progress:Object.keys(state.routes||{}).filter(id=>state.territories.includes(id)).length,goal:3,reward:'+20% de marées'},
    deep:{era:3,title:'Composer deux chants',copy:'Créez deux compositions uniques pour écouter la mémoire des abysses.',progress:(state.songs||[]).length,goal:2,reward:'+20% d’harmonie'}
  };
  return definitions[state.oceanType]||definitions.calm;
}
function claimOceanObjective() {
  const objective=oceanObjective();
  if(state.oceanObjectiveClaimed||getEra()<objective.era||objective.progress<objective.goal)return false;
  state.oceanObjectiveClaimed=true;
  eraJournal(`Objectif de l’océan accompli : ${objective.title}. Récompense : ${objective.reward}.`);
  return eraCommit(`Objectif accompli · ${objective.reward}`,'discovery');
}

function conquestRequirements(zoneId) {
  const index=TERRITORIES.findIndex(zone=>zone.id===zoneId);
  if(index<0)return null;
  return { lumen:[2e8,6e8,2e9,8e9,3e10,2e11][index], vitality:[80,150,300,600,1000,1800][index], tides:[10,20,35,60,100,160][index] };
}
function prepareColony(zoneId) {
  const zone=TERRITORIES.find(item=>item.id===zoneId);
  if(!zone||getEra()!==2||state.expeditionPlans?.[zoneId]||state.territories.includes(zoneId)||TERRITORIES[state.territories.length]?.id!==zoneId||state.runLifetime<zone.unlock)return false;
  state.expeditionPlans[zoneId]=true;
  eraJournal(`Expédition préparée vers ${zone.name}.`);
  return eraCommit(`Expédition vers ${zone.name} préparée`,'conquest');
}
function establishColony(zoneId) {
  const zone=TERRITORIES.find(item=>item.id===zoneId),cost=conquestRequirements(zoneId);
  if(!zone||!cost||getEra()!==2||!state.expeditionPlans?.[zoneId]||state.territories.includes(zoneId)||TERRITORIES[state.territories.length]?.id!==zoneId||state.runLifetime<zone.unlock)return false;
  if(state.lumen<cost.lumen||state.vitality<cost.vitality||state.tides<cost.tides)return false;
  state.lumen-=cost.lumen;state.vitality-=cost.vitality;state.tides-=cost.tides;
  state.territories.push(zoneId);delete state.expeditionPlans[zoneId];
  if(!state.routes)state.routes={};
  eraJournal(`Colonie établie : ${zone.name}.`);
  return eraCommit(`${zone.name} rejoint votre océan`,'conquest');
}
function connectRoute(zoneId, mode) {
  if(getEra()<2||!state.territories.includes(zoneId)||state.routes?.[zoneId]||!['supply','research','chorus'].includes(mode))return false;
  const cost=20+state.territories.indexOf(zoneId)*15;
  if(state.tides<cost)return false;
  state.tides-=cost;state.routes[zoneId]=mode;
  const labels={supply:'approvisionnement',research:'recherche',chorus:'navigation'};
  eraJournal(`Route ${labels[mode]} reliée à ${TERRITORIES.find(zone=>zone.id===zoneId).name}.`);
  return eraCommit(`Route ${labels[mode]} établie · ${cost} marées`,'conquest');
}
function selectDiscovery(zoneId,choiceId) {
  if(getEra()<2||!state.territories.includes(zoneId)||state.discoveries?.[zoneId])return false;
  const choice=ERA_DISCOVERIES[zoneId]?.find(item=>item.id===choiceId);
  if(!choice||Object.entries(choice.cost).some(([key,cost])=>(state[key]||0)<cost))return false;
  Object.entries(choice.cost).forEach(([key,cost])=>state[key]-=cost);
  state.discoveries[zoneId]=choice.id;
  eraJournal(`Découverte : ${choice.name}, dans ${TERRITORIES.find(zone=>zone.id===zoneId).name}.`);
  return eraCommit(`${choice.name} découverte`,'discovery');
}
function chooseNote(noteId) {
  if(getEra()<3||state.songs.length>=10||state.composition.length>=3||!ERA_NOTES.some(item=>item.id===noteId))return false;
  state.composition.push(noteId);
  return eraCommit(null,'pulse');
}
function removeNote(index) {
  if(!Number.isInteger(Number(index))||Number(index)<0||Number(index)>=state.composition.length)return false;
  state.composition.splice(Number(index),1);
  return eraCommit(null,'pulse');
}
function resetComposition() {
  if(!state.composition.length)return false;
  state.composition=[];
  return eraCommit(null,'pulse');
}
function songBonus(combo) {
  const counts=combo.split('-').reduce((map,id)=>(map[id]=(map[id]||0)+1,map),{});
  if(counts.lueur&&counts.maree&&counts.abyme)return 'production +4% · intuition +6% · marées +6%';
  const bonuses=[];
  if((counts.lueur||0)>=2)bonuses.push('production +6%');
  if((counts.maree||0)>=2)bonuses.push('marées +8%');
  if((counts.abyme||0)>=2)bonuses.push('intuition +6%');
  return bonuses.join(' · ');
}
function compositionCost() {
  return { harmony:18+(state.songs?.length||0)*8,tides:30+(state.songs?.length||0)*12 };
}
function composeSong() {
  if(getEra()<3||state.composition.length!==3)return false;
  const combo=state.composition.slice().sort((a,b)=>ERA_NOTES.findIndex(note=>note.id===a)-ERA_NOTES.findIndex(note=>note.id===b)).join('-');
  if(state.songs.some(song=>song.combo===combo))return false;
  const cost=compositionCost();
  if(state.harmony<cost.harmony||state.tides<cost.tides)return false;
  state.harmony-=cost.harmony;state.tides-=cost.tides;
  state.songs.push({combo,notes:[...state.composition],createdAt:Date.now()});state.composition=[];
  eraJournal(`Accord composé : ${combo.split('-').map(id=>ERA_NOTES.find(note=>note.id===id).name).join(' · ')}.`);
  return eraCommit('Un nouvel accord résonne dans l’océan','composition');
}
function chooseOceanType(typeId) {
  if(getEra()<3||!OCEAN_TYPES.some(item=>item.id===typeId))return false;
  state.nextOceanType=typeId;
  return eraCommit(`Prochain océan : ${OCEAN_TYPES.find(item=>item.id===typeId).name}`);
}

function updateEraPanel(target,html) {
  if(!target||target.innerHTML===html)return;
  const opened=new Map([...target.querySelectorAll('details')].map(item=>[item.querySelector('summary')?.textContent,item.open]));
  const route=target.querySelector('.conquest-route'),scroll=route?.scrollLeft||0;
  const focused=document.activeElement;
  const attributes=focused&&target.contains?.(focused)?focused.getAttributeNames().filter(name=>name==='id'||name.startsWith('data-')).map(name=>[name,focused.getAttribute(name)]):[];
  target.innerHTML=html;
  target.querySelectorAll('details').forEach(item=>{const title=item.querySelector('summary')?.textContent;if(opened.has(title))item.open=opened.get(title)});
  const newRoute=target.querySelector('.conquest-route');if(newRoute)newRoute.scrollLeft=scroll;
  if(attributes.length){const selector=attributes.map(([name,value])=>`[${name}="${CSS.escape(value)}"]`).join('');target.querySelector(selector)?.focus({preventScroll:true})}
}

function renderJournal() {
  const target=$('#journal-content');
  const entries=(state.journal||[]).slice().reverse();
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const list=items=>`<ol>${items.map(entry=>`<li class="journal-entry">${escape(entry.text)}</li>`).join('')}</ol>`;
  const html=`<article class="panel-card era-journal"><span class="eyebrow">JOURNAL DES ÈRES</span><h3>Traces de votre monde</h3>${entries.length?`${list(entries.slice(0,5))}${entries.length>5?`<details data-era-details="journal"><summary>Voir ${entries.length-5} traces anciennes</summary>${list(entries.slice(5))}</details>`:''}`:'<p>Vos découvertes et vos choix importants apparaîtront ici.</p>'}</article>`;
  updateEraPanel(target,html);
  return html;
}
function renderOceanChoices() {
  return `<article class="panel-card ocean-choice-card ocean-identity"><span class="eyebrow">PROCHAIN OCÉAN</span><h3>Choisir son tempérament</h3><p>Ce choix s’appliquera après la renaissance. Les gains et pertes sont indiqués pour chaque type.</p><div class="choice-grid era-grid">${OCEAN_TYPES.map(item=>`<button class="choice-button era-choice ${state.nextOceanType===item.id?'era-selected':''}" data-ocean-type="${item.id}" aria-pressed="${state.nextOceanType===item.id}" ${getEra()<3?'disabled':''}><strong>${item.icon} ${item.name}</strong><span>${item.copy}</span><small>${state.nextOceanType===item.id?'Choisi pour la prochaine renaissance':'Choisir cet océan'}</small></button>`).join('')}</div></article>`;
}
function bindOceanChoices() {
  $$('[data-ocean-type]').forEach(button=>button.onclick=()=>chooseOceanType(button.dataset.oceanType));
}
function renderOceanObjective(era) {
  const objective=oceanObjective();
  if(era<objective.era)return '';
  const complete=objective.progress>=objective.goal,claimed=state.oceanObjectiveClaimed;
  return `<article class="panel-card ocean-objective"><span class="eyebrow">OBJECTIF · ${OCEAN_TYPES.find(item=>item.id===state.oceanType)?.name||'OCÉAN'}</span><h3>${objective.title}</h3><p>${objective.copy}</p><div class="era-budget">Progression : ${Math.min(objective.goal,objective.progress)} / ${objective.goal} · Récompense : ${objective.reward}</div><button class="secondary-button" data-claim-ocean-objective ${!complete||claimed?'disabled':''}>${claimed?'Récompense obtenue':complete?'Réclamer la récompense':'Objectif en cours'}</button></article>`;
}

function renderEraActivity() {
  const target=$('#era-activity');
  if(!target)return '';
  const era=getEra();let html='';
  if(era===0)html=`<article class="panel-card"><span class="eyebrow">RÉSONANCE</span><h3>Le noyau s’éveille</h3><p>Faites grandir vos espèces et pulsez la perle. À mesure que l’océan mûrit, de nouveaux choix d’équilibre apparaissent.</p></article>`;
  if(era>=1){const symbiosis=ERA_SYMBIOSES.map(item=>{const owned=state.symbioses.includes(item.id),hasSpecies=item.species.every((id,index)=>(state.generators[id]||0)>=item.needs[index]),affordable=state.insight>=item.insight&&state.vitality>=item.vitality;return `<button class="choice-button era-choice" data-symbiosis="${item.id}" ${owned||!hasSpecies||!affordable?'disabled':''}><strong>${item.name}</strong><span>${item.copy}</span><small class="era-budget">${owned?'Déjà établie':`${item.species.map((id,index)=>`${state.generators[id]||0}/${item.needs[index]} ${GENERATORS.find(g=>g.id===id)?.name||id}`).join(' · ')} · ${item.insight} intuition · ${item.vitality} vitalité`}</small></button>`}).join('');
    html+=era>=3?`<details class="panel-card era-older"><summary>Symbioses de l’océan</summary><p>Associez des espèces déjà présentes pour renforcer durablement l’écosystème.</p><div class="choice-grid era-grid">${symbiosis}</div></details>`:`<article class="panel-card"><span class="eyebrow">COLONIES · SYMBIOSES</span><h3>Faire coopérer les espèces</h3><p>Associez des espèces déjà présentes ; chaque symbiose renforce durablement une partie de l’écosystème.</p><div class="choice-grid era-grid">${symbiosis}</div></article>`;
  }
  if(era>=2){const next=TERRITORIES[state.territories.length];const archipelago=`<span class="eyebrow">ARCHIPEL · EXPÉDITIONS</span><h3>${next?`Prochaine escale : ${next.name}`:'Archipel relié'}</h3><p>${next?'Préparez une expédition dans Exploration, puis établissez la colonie avec des lueurs, de la vitalité et des marées.':'Les frontières sont reliées. Les routes et découvertes renforcent le réseau.'}</p><button class="secondary-button" data-go-exploration>Ouvrir Exploration</button>`;html+=era>=3?`<details class="panel-card era-older"><summary>Voir l’archipel</summary>${archipelago}</details>`:`<article class="panel-card">${archipelago}</article>`;}
  if(era>=3){const notes=ERA_NOTES.map(note=>`<button class="choice-button era-choice" data-note="${note.id}" ${state.composition.length>=3||state.songs.length>=10?'disabled':''}><strong>${note.icon} ${note.name}</strong><span>${note.copy}</span></button>`).join('');const composition=state.composition||[],combo=composition.length===3?composition.slice().sort((a,b)=>ERA_NOTES.findIndex(note=>note.id===a)-ERA_NOTES.findIndex(note=>note.id===b)).join('-'):null,duplicate=combo&&state.songs.some(song=>song.combo===combo),cost=compositionCost(),canCompose=composition.length===3&&!duplicate&&state.harmony>=cost.harmony&&state.tides>=cost.tides;const songs=(state.songs||[]).map(song=>`<li>${song.combo.split('-').map(id=>ERA_NOTES.find(note=>note.id===id)?.name||id).join(' · ')} · ${songBonus(song.combo)}</li>`).join('');const activeNotes=composition.map((id,index)=>`<span class="composition-note">${ERA_NOTES.find(note=>note.id===id)?.name||id}<button type="button" data-remove-note="${index}" aria-label="Retirer la note ${index+1}">×</button></span>`).join('');html+=`<article class="panel-card composition-card"><span class="eyebrow">OCÉAN SOUVERAIN · COMPOSITION</span><h3>Composer un chant</h3><p>Choisissez trois notes. Deux notes semblables renforcent leur domaine ; une note de chaque type renforce les trois.</p><div class="composition-notes era-grid">${notes}</div><div class="composition-status">${activeNotes||'Aucune note choisie'} · ${composition.length}/3 <button type="button" class="secondary-button" data-reset-composition ${!composition.length?'disabled':''}>Effacer</button></div><p class="era-budget">${state.songs.length>=10?'Tous les accords uniques de cet océan ont été composés.':composition.length===3?duplicate?'Cette combinaison existe déjà. Effacez-la ou changez une note.':`Effet : ${songBonus(combo)}`:'Bonus : deux Lueurs = production +6% · deux Marées = marées +8% · deux Abîmes = intuition +6% · trois notes différentes = production +4%, intuition et marées +6%.'}</p><button class="primary-wide" data-compose ${!canCompose?'disabled':''}>Composer · ${cost.harmony} harmonie · ${cost.tides} marées</button>${songs?`<ol class="song-list">${songs}</ol>`:''}</article>`;}
  html+=renderOceanObjective(era);
  updateEraPanel(target,html);
  $$('[data-symbiosis]').forEach(button=>button.onclick=()=>chooseSymbiosis(button.dataset.symbiosis));
  $$('[data-note]').forEach(button=>button.onclick=()=>chooseNote(button.dataset.note));
  $$('[data-remove-note]').forEach(button=>button.onclick=()=>removeNote(button.dataset.removeNote));
  const reset=target.querySelector('[data-reset-composition]');if(reset)reset.onclick=resetComposition;
  const compose=target.querySelector('[data-compose]');if(compose)compose.onclick=composeSong;
  const explore=target.querySelector('[data-go-exploration]');if(explore)explore.onclick=()=>switchTab('reef');
  const objective=target.querySelector('[data-claim-ocean-objective]');if(objective)objective.onclick=claimOceanObjective;
  renderJournal();
  return html;
}

function renderExploration() {
  const target=$('#conquest-content');if(!target)return '';
  const era=getEra(),locked=era<2;
  const gate=locked?`<article class="locked-panel"><span class="eyebrow">EXPÉDITIONS DE L’ARCHIPEL</span><h3>La carte attend l’ère III</h3><p>Les colonies, routes et découvertes s’ouvrent à l’ère Archipel.</p></article>`:'';
  const productionRate=typeof rate==='function'?rate():0,flows=typeof allocationEffects==='function'?allocationEffects():{},work=typeof industryRates==='function'?industryRates():{};
  const cards=TERRITORIES.map((zone,index)=>{const owned=state.territories.includes(zone.id),plan=state.expeditionPlans?.[zone.id],requirements=conquestRequirements(zone.id),route=state.routes?.[zone.id],discovery=state.discoveries?.[zone.id],choices=ERA_DISCOVERIES[zone.id]||[];
    const colony=owned?`<span class="territory-reward">Territoire possédé · ${route?`route ${route}`:'route à relier'}</span>${!route?`<div class="choice-grid">${[['supply','Approvisionnement',20+index*15],['research','Recherche',20+index*15],['chorus','Navigation',20+index*15]].map(([mode,label,cost])=>`<button class="choice-button" data-route-zone="${zone.id}" data-route-mode="${mode}" ${state.tides<cost?'disabled':''}><strong>${label}</strong><small>${cost} marées · ${mode==='supply'?'+2,5% production':mode==='research'?'+5% intuition':'+5% marées'}</small></button>`).join('')}</div>`:''}${discovery?`<p class="discovery-value">Découverte : ${choices.find(item=>item.id===discovery)?.name||discovery} · ${choices.find(item=>item.id===discovery)?.copy||''}</p>`:`<p class="discovery-scene">${ERA_ENCOUNTERS[zone.id]||'Un détail étrange attire votre attention.'}</p><div class="choice-grid">${choices.map(item=>`<button class="choice-button" data-discovery-zone="${zone.id}" data-discovery-choice="${item.id}" ${Object.entries(item.cost).some(([key,cost])=>(state[key]||0)<cost)?'disabled':''}><strong>${item.name}</strong><span>${item.copy}</span><small>${Object.entries(item.cost).map(([key,cost])=>`${cost} ${key==='insight'?'intuition':'marées'}`).join(' · ')}</small></button>`).join('')}</div>`}`:
      `<p class="expedition-cost">Coût d’établissement : ${formatAmount(requirements.lumen)} lueurs · ${requirements.vitality} vitalité · ${requirements.tides} marées</p><div class="era-budget">Solde : ${formatAmount(state.lumen)} lueurs (production ${format(productionRate,true)}/s) · ${formatAmount(state.vitality)} vitalité (production ${format(flows.vitality||0,true)}/s) · ${formatAmount(state.tides)} marées (production ${format(work.tides||0,true)}/s)</div>${index===state.territories.length&&state.runLifetime<zone.unlock?`<p class="era-budget">Ouverture à ${formatAmount(zone.unlock)} lueurs produites · ${formatAmount(state.runLifetime)} / ${formatAmount(zone.unlock)}</p>`:''}${plan?`<button class="primary-wide" data-settle="${zone.id}" ${getEra()!==2||state.lumen<requirements.lumen||state.vitality<requirements.vitality||state.tides<requirements.tides?'disabled':''}>Établir cette colonie</button>`:`<button class="secondary-button" data-prepare="${zone.id}" ${getEra()!==2||index!==state.territories.length||state.runLifetime<zone.unlock?'disabled':''}>Préparer l’expédition</button>`}`;
    if(locked)return owned?`<article class="panel-card exploration-card"><span class="eyebrow">TERRITOIRE POSSÉDÉ</span><h3>${zone.icon} ${zone.name}</h3><p>${zone.copy}</p><small>Les routes et découvertes de ce territoire s’ouvriront à l’ère Archipel.</small></article>`:'';
    return `<article class="panel-card exploration-card"><span class="eyebrow">${owned?'TERRITOIRE POSSÉDÉ':`FRONTIÈRE ${index+1} / ${TERRITORIES.length}`}</span><h3>${zone.icon} ${zone.name}</h3><p>${zone.copy}</p>${colony}</article>`;
  }).join('');
  const html=`${gate}<article class="route-card era-map"><div><span class="eyebrow">CARTE DES OCÉANS</span><strong>${state.territories.length} / ${TERRITORIES.length} territoires</strong></div><div class="conquest-route">${TERRITORIES.map((zone,index)=>`<div class="route-stop era-island ${state.territories.includes(zone.id)?'claimed':index===state.territories.length?'current':''}"><span>${state.territories.includes(zone.id)?'✓':zone.icon}</span><small>${zone.name}</small></div>`).join('')}</div></article>${cards}`;
  updateEraPanel(target,html);
  renderJournal();
  $$('[data-prepare]').forEach(button=>button.onclick=()=>prepareColony(button.dataset.prepare));
  $$('[data-settle]').forEach(button=>button.onclick=()=>establishColony(button.dataset.settle));
  $$('[data-route-zone]').forEach(button=>button.onclick=()=>connectRoute(button.dataset.routeZone,button.dataset.routeMode));
  $$('[data-discovery-zone]').forEach(button=>button.onclick=()=>selectDiscovery(button.dataset.discoveryZone,button.dataset.discoveryChoice));
  return target.innerHTML;
}
