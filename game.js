'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const SAVE_KEY = 'nacre-save-v1';
const SAVE_BACKUP_KEY = `${SAVE_KEY}-backup`;
const SAVE_TEMP_KEY = `${SAVE_KEY}-temp`;

const GENERATORS = [
  { id:'firefly', name:'Luciole', icon:'✦', copy:'Une gardienne minuscule de la source.', cost:10, growth:1.15, rate:.2, unlock:0 },
  { id:'polyp', name:'Polype nacré', icon:'◌', copy:'Filtre l’ombre et relâche de la lueur.', cost:100, growth:1.16, rate:2, unlock:18 },
  { id:'anemone', name:'Anémone solaire', icon:'⌁', copy:'Transforme les courants en lumière vive.', cost:1200, growth:1.17, rate:18, unlock:240 },
  { id:'coral', name:'Jardin de corail', icon:'◇', copy:'Un récif autonome aux milliers de reflets.', cost:18000, growth:1.18, rate:150, unlock:3500 },
  { id:'whale', name:'Baleine astrale', icon:'◒', copy:'Porte un écosystème entier dans son sillage.', cost:420000, growth:1.19, rate:1800, unlock:75000 },
  { id:'moon', name:'Lune lagunaire', icon:'◐', copy:'Soulève chaque marée de la planète.', cost:12000000, growth:1.2, rate:24000, unlock:100000000 }
];
const MUTATIONS = [
  { id:'membrane', name:'Membrane prismatique', copy:'Les pulsations produisent 5× plus.', cost:8, era:1 },
  { id:'symbiosis', name:'Symbiose profonde', copy:'Double les lueurs produites par seconde.', cost:35, era:1 },
  { id:'dream', name:'Rêve collectif', copy:'La Résonance dure 45 s au lieu de 30 s.', cost:120, era:2 },
  { id:'tide', name:'Marée intérieure', copy:'Les gains hors ligne passent à 85%.', cost:320, era:2 },
  { id:'cosmic', name:'Nacre cosmique', copy:'Chaque Perle de mémoire est 50% plus puissante.', cost:900, era:3 }
];
const NODES = [
  { id:'shoal', name:'Banc lumineux', icon:'•••', cost:100, mult:1.1, copy:'+10% de production' },
  { id:'current', name:'Courant chaud', icon:'≈', cost:600, mult:1.15, copy:'+15% de production' },
  { id:'trench', name:'Faille chantante', icon:'⌄', cost:3000, mult:1.2, copy:'+20% de production' },
  { id:'gyre', name:'Grand gyre', icon:'◉', cost:15000, mult:1.3, copy:'+30% de production' },
  { id:'moonpool', name:'Puits de lune', icon:'◐', cost:65000, mult:1.4, copy:'+40% de production' },
  { id:'mind', name:'Esprit océan', icon:'✧', cost:250000, mult:1.5, copy:'+50% de production' }
];
const MEMORY_UPGRADES = [
  { id:'seed', name:'Semence ancienne', cost:1, copy:'+6 lucioles maintenant et au début de chaque nouvel océan.' },
  { id:'rhythm', name:'Battement ancestral', cost:1, copy:'La Résonance se charge deux fois plus vite.' },
  { id:'wayfinder', name:'Boussole des âges', cost:1, copy:'Les 25 premiers achats de chaque espèce coûtent 25% de moins.' },
  { id:'tide_memory', name:'Marée patiente', cost:3, copy:'Jusqu’à 16 h de production hors ligne, avec 15% de rendement en plus.' },
  { id:'deep_memory', name:'Savoir abyssal', cost:5, copy:'L’intuition et la vitalité se créent 50% plus vite.' }
];
const TERRITORIES = [
  { id:'cove', name:'Anse des lucioles', icon:'✦', unlock:20, cost:80, bonus:.06, copy:'Une première anse où la colonie peut s’établir.' },
  { id:'lagoon', name:'Lagune d’ambre', icon:'◌', unlock:250, cost:800, bonus:.08, copy:'Des eaux calmes pleines de lumière captive.' },
  { id:'archipelago', name:'Archipel des coraux', icon:'◇', unlock:5000, cost:20000, bonus:.10, copy:'Un réseau d’îlots prêts à rejoindre votre monde.' },
  { id:'trench', name:'Fosse des veilleurs', icon:'⌄', unlock:1000000, cost:10000000, bonus:.12, copy:'Une frontière obscure qui recèle de nouveaux courants.' },
  { id:'currents', name:'Courants souverains', icon:'≈', unlock:1000000000, cost:2000000000, bonus:.14, copy:'Les grandes routes de l’océan changent de maître.' },
  { id:'world', name:'Océan-monde', icon:'◉', unlock:100000000000, cost:200000000000, bonus:.16, copy:'La dernière frontière avant un monde unifié.' }
];
const TERRITORY_PATHS = {
  cove:[{id:'spark',name:'Éclats vivants',copy:'+25% par pulsation'},{id:'haven',name:'Havre lumineux',copy:'+6% de lueurs/s'}],
  lagoon:[{id:'amber',name:'Ambre savant',copy:'+20% d’intuition'},{id:'garden',name:'Eaux fertiles',copy:'+20% de vitalité'}],
  archipelago:[{id:'sails',name:'Routes des voiles',copy:'+25% de marées'},{id:'beacons',name:'Îles balises',copy:'+8% de lueurs/s'}],
  trench:[{id:'rest',name:'Refuge profond',copy:'+10 points de rendement hors ligne'},{id:'glow',name:'Faille lumineuse',copy:'+10% de lueurs/s'}],
  currents:[{id:'chorus',name:'Courants chantants',copy:'+25% d’harmonie'},{id:'tideway',name:'Routes de marée',copy:'+25% de marées'}],
  world:[{id:'legacy',name:'Monde radieux',copy:'+12% de lueurs/s'},{id:'patient',name:'Océan patient',copy:'+4 h de production hors ligne'}]
};
const ERAS = [
  { name:'Noyau', start:0, end:25000, next:'Fonder la colonie' },
  { name:'Colonies', start:25000, end:1000000000, next:'Dominer les récifs' },
  { name:'Archipel', start:1000000000, end:1000000000000, next:'Unifier l’océan' },
  { name:'Océan souverain', start:1000000000000, end:4e12, next:'Prochaine Perle' }
];
const ERA_ANNOUNCEMENTS = [null,
  {title:'Les Colonies s’éveillent',copy:'Votre océan ne produit plus seulement des lueurs : il apprend à grandir et à s’équilibrer.',unlocks:['Intuition : à dépenser en mutations, puis en nœuds du récif.','Vitalité : son stock augmente les lueurs par seconde.','Courants : répartissez 100% entre lueurs, intuition et vitalité. Les filtres et jardins créent aussi ces ressources.'],tab:'reef',action:'Comprendre les courants'},
  {title:'L’Archipel s’ouvre',copy:'Vos territoires deviennent des routes vivantes.',unlocks:['Marées : produites par les territoires et les balises.','Voiliers : échangez des marées contre davantage de lueurs/s.','Réseau du récif : reliez ses nœuds avec de l’intuition.'],tab:'life',action:'Voir les nouveaux outils'},
  {title:'L’Océan souverain chante',copy:'Votre monde peut maintenant préparer sa renaissance, à votre rythme.',unlocks:['Harmonie : les chœurs achetés avec des marées la produisent.','Accords : dépensez l’harmonie pour amplifier les lueurs/s.','Renaissance : gagnez des Perles qui améliorent aussi les océans suivants.'],tab:'evolution',action:'Voir l’Héritage'}
];
const ERA_TOOLS = [
  { id:'filter', name:'Filtre d’ambre', icon:'◌', era:1, currency:'lumen', cost:25000, growth:1.65, output:'insight', rate:.6, copy:'Recueille lentement de l’intuition.' },
  { id:'garden', name:'Jardin symbiotique', icon:'❋', era:1, currency:'lumen', cost:40000, growth:1.7, output:'vitality', rate:.3, copy:'Cultive de la vitalité en douceur.' },
  { id:'beacon', name:'Balise de courant', icon:'⌁', era:2, currency:'lumen', cost:100000000, growth:1.8, output:'tides', rate:.5, copy:'Capte les marées des territoires.' },
  { id:'sail', name:'Voilier de corail', icon:'◒', era:2, currency:'tides', cost:30, growth:1.8, bonus:.08, copy:'+8% de production de lueurs.' },
  { id:'choir', name:'Chœur abyssal', icon:'♫', era:3, currency:'tides', cost:400, growth:2, output:'harmony', rate:.2, copy:'Fait naître l’harmonie du monde.' },
  { id:'accord', name:'Accord océanique', icon:'✧', era:3, currency:'harmony', cost:15, growth:1.9, bonus:.12, copy:'+12% de production de lueurs.' }
];

function freshState() {
  return { schemaVersion:5, savedAt:Date.now(), lumen:0, runLifetime:0, allTimeLumen:0,
    generators:Object.fromEntries(GENERATORS.map(g=>[g.id,0])), industry:Object.fromEntries(ERA_TOOLS.map(tool=>[tool.id,0])), insight:0, vitality:0, tides:0, harmony:0, memories:0, totalMemories:0, prestigeCount:0,
    mutations:[], nodes:[], memoryUpgrades:[], territories:[], territoryPaths:{}, scouting:{}, conquestLog:[], expeditionZone:null, expeditionProgress:{}, expeditionFinds:[], nextExpeditionAt:0, riskyWins:0, riskyLosses:0, allocation:{ light:70, insight:20, vitality:10 }, totalTaps:0, buyMode:1, resonanceCharge:0, resonanceUntil:0,
    settings:{ motion:true, haptics:true }, stats:{ startedAt:Date.now(), highestRate:0, offlineEarned:0 } };
}
function sanitise(data) {
  const base=freshState(); if (!data || typeof data!=='object') return base; const s={...base,...data};
  ['lumen','runLifetime','allTimeLumen','insight','vitality','tides','harmony','memories','prestigeCount','totalTaps'].forEach(k=>s[k]=Number.isFinite(Number(s[k]))?Math.max(0,Math.min(1e100,Number(s[k]))):base[k]);
  const legacyMemoryCosts={seed:1,rhythm:2,tide_memory:3,deep_memory:5};
  const spentMemories=Array.isArray(data.memoryUpgrades)?[...new Set(data.memoryUpgrades)].reduce((sum,id)=>sum+((!Number.isFinite(Number(data.schemaVersion))||Number(data.schemaVersion)<5)?(legacyMemoryCosts[id]||0):(MEMORY_UPGRADES.find(upgrade=>upgrade.id===id)?.cost||0)),0):0;
  s.totalMemories=Number.isFinite(Number(data.totalMemories))?Math.max(s.memories,Math.floor(Number(data.totalMemories))):Math.max(s.memories,s.prestigeCount,s.memories+spentMemories);
  s.generators={...base.generators,...(data.generators||{})}; GENERATORS.forEach(g=>{const value=Number(s.generators[g.id]);s.generators[g.id]=Number.isFinite(value)?Math.max(0,Math.min(1000,Math.floor(value))):0});
  s.industry={...base.industry,...(data.industry||{})};ERA_TOOLS.forEach(tool=>{const value=Number(s.industry[tool.id]);s.industry[tool.id]=Number.isFinite(value)?Math.max(0,Math.min(1000,Math.floor(value))):0});
  s.mutations=Array.isArray(data.mutations)?[...new Set(data.mutations.filter(id=>MUTATIONS.some(m=>m.id===id)))]:[];s.memoryUpgrades=Array.isArray(data.memoryUpgrades)?[...new Set(data.memoryUpgrades.filter(id=>MEMORY_UPGRADES.some(m=>m.id===id)))]:[];
  const linked=Array.isArray(data.nodes)?data.nodes:[];s.nodes=[];for(const node of NODES){if(!linked.includes(node.id))break;s.nodes.push(node.id)}
  s.settings={ motion:data.settings?.motion!==false, haptics:data.settings?.haptics!==false };
  s.stats={...base.stats}; ['startedAt','highestRate','offlineEarned'].forEach(k=>{const value=Number(data.stats?.[k]);if(Number.isFinite(value))s.stats[k]=Math.max(0,value)});
  const rawAllocation={...base.allocation,...(data.allocation||{})}; Object.keys(rawAllocation).forEach(k=>{const value=Number(rawAllocation[k]);rawAllocation[k]=Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):base.allocation[k]});
  const allocationTotal=rawAllocation.light+rawAllocation.insight+rawAllocation.vitality; s.allocation=allocationTotal>0?{light:Math.round(rawAllocation.light/allocationTotal*100),insight:0,vitality:0}:{...base.allocation};if(allocationTotal>0){s.allocation.insight=Math.min(100-s.allocation.light,Math.round(rawAllocation.insight/allocationTotal*100));s.allocation.vitality=100-s.allocation.light-s.allocation.insight}
  const claimed=Array.isArray(data.territories)?data.territories:[];s.territories=[];for(const zone of TERRITORIES){if(!claimed.includes(zone.id))break;s.territories.push(zone.id)}
  s.territoryPaths={};for(const id of s.territories){const path=data.territoryPaths?.[id];if(TERRITORY_PATHS[id].some(choice=>choice.id===path))s.territoryPaths[id]=path}
  s.expeditionZone=s.territories.includes(data.expeditionZone)?data.expeditionZone:(s.territories.at(-1)||null);
  s.expeditionProgress={};for(const id of s.territories){const count=Number(data.expeditionProgress?.[id]);s.expeditionProgress[id]=Number.isFinite(count)?Math.max(0,Math.min(2,Math.floor(count))):0}
  s.expeditionFinds=Array.isArray(data.expeditionFinds)?[...new Set(data.expeditionFinds.filter(id=>s.territories.includes(id)))]:[];
  s.scouting=Object.fromEntries(TERRITORIES.map(zone=>{const value=Number(data.scouting?.[zone.id]);return[zone.id,Number.isFinite(value)?Math.max(0,Math.min(5,Math.floor(value))):0]}));
  s.conquestLog=Array.isArray(data.conquestLog)?data.conquestLog.slice(-5).filter(item=>item&&TERRITORIES.some(zone=>zone.id===item.zoneId)&&['claim','expedition'].includes(item.kind)&&['safe','risk','patrol','raid'].includes(item.mode)&&typeof item.success==='boolean').map(item=>({zoneId:item.zoneId,kind:item.kind,mode:item.mode,success:item.success,amount:Number.isFinite(Number(item.amount))?Math.max(0,Math.min(1e100,Number(item.amount))):0})):[];
  s.nextExpeditionAt=Number.isFinite(Number(data.nextExpeditionAt))?Math.max(0,Number(data.nextExpeditionAt)):0;s.riskyWins=Number.isFinite(Number(data.riskyWins))?Math.max(0,Math.min(1e9,Math.floor(Number(data.riskyWins)))):0;s.riskyLosses=Number.isFinite(Number(data.riskyLosses))?Math.max(0,Math.min(1e9,Math.floor(Number(data.riskyLosses)))):0;
  s.buyMode=data.buyMode==='max'?'max':([1,10].includes(Number(data.buyMode))?Number(data.buyMode):1); s.savedAt=Number.isFinite(Number(data.savedAt))?Math.max(0,Number(data.savedAt)):Date.now(); s.resonanceUntil=Number.isFinite(Number(data.resonanceUntil))?Math.max(0,Number(data.resonanceUntil)):0; s.resonanceCharge=Number.isFinite(Number(data.resonanceCharge))?Math.max(0,Math.min(100,Number(data.resonanceCharge))):0; s.schemaVersion=5; return s;
}
function load() { for (const key of [SAVE_KEY,SAVE_BACKUP_KEY]) try { const raw=localStorage.getItem(key); if(raw) return sanitise(JSON.parse(raw)); } catch {} return freshState(); }
let state=load(), lastFrame=performance.now(), lastRender=0, lastPanelRender=0, lastSave=Date.now(), knownEra=getEra(), allocationDragging=false, allocationEditingUntil=0, pendingEraAnnouncement=0, activeEraDestination='source';
function save() { state.savedAt=Date.now(); const text=JSON.stringify(state); try { localStorage.setItem(SAVE_TEMP_KEY,text); const old=localStorage.getItem(SAVE_KEY); if(old)localStorage.setItem(SAVE_BACKUP_KEY,old); localStorage.setItem(SAVE_KEY,localStorage.getItem(SAVE_TEMP_KEY)); localStorage.removeItem(SAVE_TEMP_KEY); } catch { toast('Sauvegarde locale indisponible'); } lastSave=Date.now(); }
function format(n, precise=false) { if(!Number.isFinite(n))return '∞'; for(const [v,u] of [[1e15,'Qa'],[1e12,'T'],[1e9,'Md'],[1e6,'M'],[1e3,'k']])if(Math.abs(n)>=v)return `${(n/v).toLocaleString('fr-FR',{maximumFractionDigits:precise?2:1})} ${u}`; return n.toLocaleString('fr-FR',{maximumFractionDigits:precise||Math.abs(n)<100?1:0}); }
function formatAmount(n,roundUp=false){if(!Number.isFinite(n))return '∞';if(n>=1e15)return format(n,true);return (roundUp?Math.ceil(n-1e-9):Math.floor(n+1e-9)).toLocaleString('fr-FR')}
function missing(cost,have){return Math.max(0,Math.ceil(cost-have-1e-9))}
function getEra(){return state.runLifetime>=1e12&&state.nodes.length===NODES.length&&state.territories.length===6?3:state.runLifetime>=1e9&&state.territories.length>=4?2:state.runLifetime>=25000&&state.territories.length>=2?1:0}
function milestone(n){let m=1;if(n>=10)m*=2;if(n>=25)m*=2;if(n>=50)m*=3;if(n>=100)m*=5;return m}
function nextMilestone(){let best=null;for(const g of GENERATORS){if(state.runLifetime<g.unlock)continue;const owned=state.generators[g.id],mark=[10,25,50,100].find(n=>owned<n);if(!mark)continue;const progress=owned/mark;if(!best||progress>best.progress)best={g,owned,mark,progress,bonus:mark===50?3:mark===100?5:2}}return best}
function hasPath(zone,path){return state.territories.includes(zone)&&state.territoryPaths[zone]===path}
function globalMult(){let m=1+state.totalMemories*(state.mutations.includes('cosmic')?.375:.25);if(state.mutations.includes('symbiosis'))m*=2;NODES.forEach(n=>{if(state.nodes.includes(n.id))m*=n.mult});m*=1+Math.min(.8,TERRITORIES.reduce((sum,zone)=>sum+(state.territories.includes(zone.id)?zone.bonus:0),0));m*=1+state.industry.sail*.08+state.industry.accord*.12;m*=1+state.expeditionFinds.length*.04;m*=1+(hasPath('cove','haven')?.06:0)+(hasPath('archipelago','beacons')?.08:0)+(hasPath('trench','glow')?.1:0)+(hasPath('world','legacy')?.12:0);if(Date.now()<state.resonanceUntil)m*=3;if(getEra()>=1){m*=.45+state.allocation.light/70;m*=1+Math.log10(1+state.vitality)*.08}return m}
function baseRate(){return GENERATORS.reduce((sum,g)=>sum+state.generators[g.id]*g.rate*milestone(state.generators[g.id]),0)}
function rate(){return baseRate()*globalMult()}
function generatorOutput(g,owned){return owned*g.rate*milestone(owned)*globalMult()}
function industryRates(){const era=getEra();return{insight:era>=1?state.industry.filter*.6*(hasPath('lagoon','amber')?1.2:1):0,vitality:era>=1?state.industry.garden*.3*(hasPath('lagoon','garden')?1.2:1):0,tides:era>=2?(state.industry.beacon*.5+state.territories.length*.05)*(1+(hasPath('archipelago','sails')?.25:0)+(hasPath('currents','tideway')?.25:0)):0,harmony:era>=3?state.industry.choir*.2*(hasPath('currents','chorus')?1.25:1):0}}
function allocationEffects(){const root=Math.sqrt(baseRate())*(state.memoryUpgrades.includes('deep_memory')?1.5:1),work=industryRates(),insightFromCurrent=root*state.allocation.insight/100*.025*(hasPath('lagoon','amber')?1.2:1),vitalityFromCurrent=root*state.allocation.vitality/100*.012*(hasPath('lagoon','garden')?1.2:1);return{light:.45+state.allocation.light/70,insight:insightFromCurrent+work.insight,vitality:vitalityFromCurrent+work.vitality,insightFromCurrent,vitalityFromCurrent,insightFromTools:work.insight,vitalityFromTools:work.vitality,vitalityBonus:Math.log10(1+state.vitality)*8}}
function formatFlow(n){return n<1?n.toLocaleString('fr-FR',{maximumFractionDigits:3}):format(n,true)}
function tapYield(){let n=Math.max(1,Math.sqrt(rate()+1)*.4);if(state.mutations.includes('membrane'))n*=5;return n*(1+state.totalMemories*.1)*(hasPath('cove','spark')?1.25:1)}
function geometricCost(g,owned,n){return n<=0?0:g.cost*Math.pow(g.growth,owned)*(Math.pow(g.growth,n)-1)/(g.growth-1)}
function cost(g,amount=1){const owned=state.generators[g.id],n=Number(amount),total=geometricCost(g,owned,n);return state.memoryUpgrades.includes('wayfinder')?total-.25*geometricCost(g,owned,Math.min(n,Math.max(0,25-owned))):total}
function maxBuy(g){const x=1+state.lumen*(g.growth-1)/(g.cost*Math.pow(g.growth,state.generators[g.id]));let amount=Math.max(0,Math.floor(Math.log(Math.max(1,x))/Math.log(g.growth)));while(amount>0&&cost(g,amount)>state.lumen+1e-8)amount--;while(cost(g,amount+1)<=state.lumen+1e-8)amount++;return amount}
function toolCost(tool){return tool.cost*Math.pow(tool.growth,state.industry[tool.id])}
function addLumen(n){state.lumen+=n;state.runLifetime+=n;state.allTimeLumen+=n}
function haptic(p){if(state.settings.haptics&&navigator.vibrate)navigator.vibrate(p)}
function toast(text){const n=document.createElement('div');n.className='toast';n.textContent=text;$('#toast-region').append(n);setTimeout(()=>n.remove(),2600)}
function announceEra(era){pendingEraAnnouncement=era;presentEraAnnouncement()}
function presentEraAnnouncement(){if(!pendingEraAnnouncement)return;const blocker=document.querySelector('dialog[open]');if(blocker){blocker.addEventListener('close',presentEraAnnouncement,{once:true});return}const data=ERA_ANNOUNCEMENTS[pendingEraAnnouncement];if(!data)return;activeEraDestination=data.tab;$('#era-dialog-title').textContent=data.title;$('#era-dialog-copy').textContent=data.copy;$('#era-dialog-unlocks').replaceChildren(...data.unlocks.map(copy=>{const item=document.createElement('li');item.textContent=copy;return item}));$('#era-dialog-action').textContent=data.action;pendingEraAnnouncement=0;$('#era-dialog').showModal()}
function buyGenerator(id,forced){const g=GENERATORS.find(x=>x.id===id);if(!g||state.runLifetime<g.unlock)return false;const mode=forced||state.buyMode,amount=mode==='max'?maxBuy(g):Number(mode);if(amount<1)return false;const price=cost(g,amount);if(state.lumen+1e-9<price)return false;const before=state.generators[id];state.lumen-=price;state.generators[id]+=amount;[10,25,50,100].forEach(mark=>{if(before<mark&&state.generators[id]>=mark)toast(`${g.name} · palier ${mark} : production ×${mark===50?3:mark===100?5:2} !`)});haptic(12);save();render(true);return true}
function buyTool(id){const tool=ERA_TOOLS.find(item=>item.id===id);if(!tool||getEra()<tool.era)return false;const price=toolCost(tool);if(state[tool.currency]+1e-9<price)return false;state[tool.currency]-=price;state.industry[id]++;toast(`${tool.name} · ${state.industry[id]}`);haptic(12);save();render(true);return true}
function pulse(event){const now=Date.now();state.totalTaps++;const gain=tapYield();addLumen(gain);if(now>=state.resonanceUntil){if(state.resonanceCharge>=100){state.resonanceUntil=now+(state.mutations.includes('dream')?45000:30000);state.resonanceCharge=0;toast('Résonance · production ×3');haptic([18,35,28])}else state.resonanceCharge=Math.min(100,state.resonanceCharge+(state.memoryUpgrades.includes('rhythm')?10:5))}if(event&&state.settings.motion){const n=document.createElement('span');n.className='float-gain';n.textContent=`+${format(gain,true)}`;n.style.left=`${event.clientX}px`;n.style.top=`${event.clientY}px`;document.body.append(n);setTimeout(()=>n.remove(),820)}$('#pulse-button').classList.add('pulsing');setTimeout(()=>$('#pulse-button').classList.remove('pulsing'),100);haptic(5);render()}
function economy(seconds){const r=rate(),work=industryRates(),flows=allocationEffects();addLumen(r*seconds);if(getEra()>=1){state.insight+=flows.insight*seconds;state.vitality+=flows.vitality*seconds}state.tides+=work.tides*seconds;state.harmony+=work.harmony*seconds;if(Date.now()>=state.resonanceUntil)state.resonanceCharge=Math.min(100,state.resonanceCharge+seconds*(state.memoryUpgrades.includes('rhythm')?2.4:1.2));state.stats.highestRate=Math.max(state.stats.highestRate,r);const era=getEra();if(era>knownEra){knownEra=era;announceEra(era);haptic([25,45,25,45,50]);save()}}
function recommendation(){return GENERATORS.filter(g=>state.runLifetime>=g.unlock).reduce((best,g)=>{const score=cost(g)/(g.rate*milestone(state.generators[g.id]));return!best||score<best.score?{g,score}:best},null)?.g||GENERATORS[0]}

function nextTerritory(){return TERRITORIES[state.territories.length]}
function chooseTerritoryPath(zoneId,pathId){if(!state.territories.includes(zoneId)||state.territoryPaths[zoneId]||!TERRITORY_PATHS[zoneId]?.some(path=>path.id===pathId))return false;state.territoryPaths[zoneId]=pathId;toast(`${TERRITORIES.find(zone=>zone.id===zoneId).name} · ${TERRITORY_PATHS[zoneId].find(path=>path.id===pathId).name}`);save();render(true);return true}
function territoryChance(zone){return Math.min(.95,.55+(state.scouting[zone.id]||0)*.08)}
function logConquest(zone,kind,mode,success,amount){state.conquestLog.push({zoneId:zone.id,kind,mode,success,amount});state.conquestLog=state.conquestLog.slice(-5)}
function conquestTerms(mode,zone=nextTerritory()){
  if(!zone||!['safe','risk'].includes(mode))return null;
  return mode==='safe'?{stake:zone.cost,payout:0,chance:1}:{stake:zone.cost*.75,payout:zone.cost*.35,chance:territoryChance(zone)};
}
function attemptConquest(mode,random=Math.random){
  const zone=nextTerritory();if(!zone||!['safe','risk'].includes(mode)||state.runLifetime<zone.unlock)return false;
  const terms=conquestTerms(mode,zone);if(state.lumen<terms.stake)return false;
  state.lumen-=terms.stake;const success=mode==='safe'||random()<terms.chance;
  if(success){state.territories.push(zone.id);state.expeditionZone=zone.id;state.expeditionProgress[zone.id]=0;if(mode==='risk'){addLumen(terms.payout);state.riskyWins++}toast(`${zone.name} rejoint votre monde · choisissez sa voie`);haptic([20,35,30])}
  else{state.scouting[zone.id]=Math.min(5,(state.scouting[zone.id]||0)+1);state.riskyLosses++;toast(`Échec dans ${zone.name} · la mise est perdue`);haptic(30)}
  logConquest(zone,'claim',mode,success,terms.stake);save();render(true);return true;
}
function scoutTerritory(){const zone=nextTerritory();if(!zone||state.runLifetime<zone.unlock||(state.scouting[zone.id]||0)>=5)return false;const price=zone.cost*.2;if(state.lumen<price)return false;state.lumen-=price;state.scouting[zone.id]=(state.scouting[zone.id]||0)+1;toast(`Reconnaissance · ${Math.round(territoryChance(zone)*100)}% de chance`);save();render(true);return true}
function selectExpeditionZone(zoneId){if(!state.territories.includes(zoneId))return false;state.expeditionZone=zoneId;save();render(true);return true}
function expeditionTerms(mode){if(mode==='patrol')return{stake:0,chance:1,payout:0};const stake=Math.max(20,Math.floor(state.lumen*.02));return{stake,chance:.5,payout:stake*2.1}}
function expeditionSouvenirGain(){const active=Date.now()<state.resonanceUntil?3:1;return rate()/active*.04/(1+state.expeditionFinds.length*.04)}
function launchExpedition(mode,random=Math.random){
  if(!['patrol','raid'].includes(mode)||!state.territories.length||Date.now()<state.nextExpeditionAt)return false;
  const zone=TERRITORIES.find(item=>item.id===state.expeditionZone&&state.territories.includes(item.id))||TERRITORIES[state.territories.length-1],terms=expeditionTerms(mode);if(state.expeditionFinds.includes(zone.id)||state.lumen<terms.stake)return false;
  state.lumen-=terms.stake;const success=mode==='patrol'||random()<terms.chance;if(mode==='patrol'){toast(`Patrouille paisible · ${zone.name} explorée`)}else if(success){addLumen(terms.payout);state.riskyWins++;toast(`Incursion réussie · gain net +${format(terms.payout-terms.stake)} lueurs`)}else{state.riskyLosses++;toast(`Incursion manquée · mise ${format(terms.stake)} perdue`)}
  if(!state.expeditionFinds.includes(zone.id)){state.expeditionProgress[zone.id]=Math.min(2,(state.expeditionProgress[zone.id]||0)+(mode==='raid'&&success?2:1));if(state.expeditionProgress[zone.id]>=2){state.expeditionFinds.push(zone.id);toast(`Souvenir découvert dans ${zone.name} · +4% de lueurs/s pour cet océan`)}}
  state.nextExpeditionAt=Date.now()+180000;logConquest(zone,'expedition',mode,success,terms.stake);save();render(true);return true;
}
function renderExpeditions(claimed){
  const wait=Math.max(0,state.nextExpeditionAt-Date.now()),cooldown=wait>0;
  const target=state.territories.includes(state.expeditionZone)?state.expeditionZone:state.territories.at(-1);
  const found=state.expeditionFinds.includes(target),progress=state.expeditionProgress[target]||0;
  const targets=TERRITORIES.slice(0,claimed).map(item=>`<button class="expedition-target ${item.id===target?'active':''}" data-expedition-zone="${item.id}" aria-pressed="${item.id===target}">${item.icon} ${item.name}${state.expeditionFinds.includes(item.id)?' ✓':''}</button>`).join('');
  const raid=expeditionTerms('raid'),net=raid.payout-raid.stake;
  const options=`<div class="choice-grid"><button class="choice-button safe" data-expedition="patrol" ${cooldown||found?'disabled':''}><strong>Patrouille paisible</strong><span>Gratuite · réussite garantie</span><small>Ajoute 1 sortie vers le souvenir. Aucune lueur perdue.</small></button><button class="choice-button risk" data-expedition="raid" ${cooldown||found||state.lumen<raid.stake?'disabled':''}><strong>Incursion audacieuse</strong><span>50% de réussite · mise ${formatAmount(raid.stake,true)} lueurs</span><small>Succès : souvenir découvert dès maintenant et gain net +${formatAmount(net)} lueurs. Échec : mise perdue, mais 1 sortie validée.</small></button></div>`;
  return `<article class="panel-card expedition-card"><span class="eyebrow">EXPÉDITIONS</span><h3>Explorer pour découvrir</h3><p>Choisissez une destination. La patrouille est gratuite ; l’incursion peut accélérer la découverte, sans jamais risquer un territoire.</p><div class="expedition-targets">${targets}</div><div class="expedition-value"><strong>${found?'Souvenir déjà découvert':`Souvenir : environ +${format(expeditionSouvenirGain(),true)} lueurs/s actuellement`}</strong><br>${found?(state.expeditionFinds.length===claimed?'Tous les souvenirs de vos territoires sont découverts.':'Choisissez un autre territoire à explorer.'):`Bonus durable pour cet océan : +4% de production. ${progress} / 2 sorties faites ; une incursion réussie termine la découverte immédiatement.`}</div>${options}<div class="expedition-status">${cooldown?`Prochaine sortie dans ${Math.ceil(wait/60000)} min`:'Une sortie disponible'} · ${state.expeditionFinds.length} / ${claimed} souvenirs trouvés</div></article>`;
}
function renderConquest(){
  const zone=nextTerritory(),claimed=state.territories.length,route=TERRITORIES.map((item,index)=>`<div class="route-stop ${index<claimed?'claimed':index===claimed?'current':''}"><span>${index<claimed?'✓':item.icon}</span><small>${item.name}</small></div>`).join('');
  const frontier=zone?(()=>{
    const discovered=state.runLifetime>=zone.unlock,safe=conquestTerms('safe',zone).stake,risk=conquestTerms('risk',zone).stake,riskPayout=conquestTerms('risk',zone).payout,chance=Math.round(territoryChance(zone)*100),scouting=state.scouting[zone.id]||0,scoutPrice=zone.cost*.2;
    const scout=scouting<5?`<button class="scout-button" id="scout-button" ${state.lumen<scoutPrice?'disabled':''}>Reconnaître les lieux · ${formatAmount(scoutPrice,true)} lueurs <small>+8 points de chance, sans risque · ${scouting}/5</small></button>`:`<div class="scout-complete">Reconnaissance complète · ${chance}% de chance</div>`;
    return `<article class="panel-card conquest-card"><span class="eyebrow">FRONTIÈRE ${claimed+1} / ${TERRITORIES.length}</span><h3>${zone.name}</h3><p>${zone.copy}</p><div class="territory-reward">Territoire conservé après conquête · +${Math.round(zone.bonus*100)}% de production</div>${discovered?`<p class="choice-intro">Vous avez ${formatAmount(state.lumen)} lueurs. Choisissez votre approche :</p><div class="choice-grid"><button class="choice-button safe" data-claim="safe" ${state.lumen<safe?'disabled':''}><strong>Établir une colonie</strong><span>Garanti · coût ${formatAmount(safe,true)} lueurs</span><small>${state.lumen>=safe?'Disponible':`Encore ${formatAmount(missing(safe,state.lumen))} lueurs`}</small></button><button class="choice-button risk" data-claim="risk" ${state.lumen<risk?'disabled':''}><strong>Tenter une percée</strong><span>${chance}% de réussite · mise ${formatAmount(risk,true)} lueurs</span><small>Succès : territoire, coût net ${formatAmount(risk-riskPayout,true)} lueurs après remboursement. Échec : mise perdue, chance +8 points.</small><small>${state.lumen>=risk?'Disponible':`Encore ${formatAmount(missing(risk,state.lumen))} lueurs`}</small></button></div>${scout}`:`<div class="discovery-lock">Découverte à ${formatAmount(zone.unlock,true)} lueurs produites · encore ${formatAmount(Math.max(0,zone.unlock-state.runLifetime),true)}</div>`}</article>`;
  })():`<article class="panel-card conquest-card"><span class="eyebrow">OCÉAN UNIFIÉ</span><h3>Plus aucune frontière</h3><p>Tous les territoires sont vôtres. Reliez les courants, puis faites renaître un nouveau monde.</p></article>`;
  const paths=claimed?`<article class="panel-card specialties-card"><span class="eyebrow">IDENTITÉ DES TERRITOIRES</span><h3>Choisir leur voie</h3><p>Chaque territoire apporte son bonus de conquête, puis une spécialité pour cet océan.</p>${TERRITORIES.slice(0,claimed).map(item=>{const selected=state.territoryPaths[item.id],options=TERRITORY_PATHS[item.id];return `<div class="specialty-row"><strong>${item.icon} ${item.name}</strong>${selected?`<small>${options.find(option=>option.id===selected).name} · ${options.find(option=>option.id===selected).copy}</small>`:`<div class="specialty-choices">${options.map(option=>`<button data-path-zone="${item.id}" data-path="${option.id}"><b>${option.name}</b><small>${option.copy}</small></button>`).join('')}</div>`}</div>`}).join('')}</article>`:'';
  const expeditions=claimed?renderExpeditions(claimed):'';
  const history=state.conquestLog.length?`<article class="conquest-history"><span class="eyebrow">CARNET DE ROUTE</span>${state.conquestLog.slice(-3).reverse().map(entry=>{const item=TERRITORIES.find(t=>t.id===entry.zoneId);const outcome=entry.mode==='patrol'?'patrouille gratuite':entry.mode==='raid'?`incursion ${entry.success?'réussie':'manquée'} (mise ${formatAmount(entry.amount,true)})`:`${entry.success?'réussie':'échouée'} (${formatAmount(entry.amount,true)} engagées)`;return `<p><span>${entry.success?'✦':'◇'}</span> ${entry.kind==='claim'?'Conquête':'Expédition'} · ${item.name} · ${outcome}</p>`}).join('')}</article>`:'';
  $('#conquest-content').innerHTML=`<article class="route-card"><div><span class="eyebrow">CARTE DES OCÉANS</span><strong>${claimed} / ${TERRITORIES.length} territoires</strong></div><div class="conquest-route">${route}</div></article>${frontier}${paths}${expeditions}${history}`;
  $$('[data-claim]').forEach(button=>button.onclick=()=>attemptConquest(button.dataset.claim));$$('[data-path-zone]').forEach(button=>button.onclick=()=>chooseTerritoryPath(button.dataset.pathZone,button.dataset.path));$$('[data-expedition-zone]').forEach(button=>button.onclick=()=>selectExpeditionZone(button.dataset.expeditionZone));$$('[data-expedition]').forEach(button=>button.onclick=()=>launchExpedition(button.dataset.expedition));const scoutButton=$('#scout-button');if(scoutButton)scoutButton.onclick=scoutTerritory;
}

function renderGenerators(){
  $('#generator-list').innerHTML=GENERATORS.map(g=>{
    const unlocked=state.runLifetime>=g.unlock,amount=state.buyMode==='max'?maxBuy(g):Number(state.buyMode),owned=state.generators[g.id],price=cost(g,Math.max(1,amount));
    const current=generatorOutput(g,owned),after=generatorOutput(g,owned+Math.max(0,amount)),gain=after-current,affordable=amount>0&&state.lumen+1e-9>=price;
    const mark=[10,25,50,100].find(n=>owned<n),step=mark===50?3:mark===100?5:2;
    const detail=unlocked?`${g.copy}<br><span class="purchase-gain">Actuel ${format(current,true)}/s → Après ${format(after,true)}/s <b>(gain +${format(gain,true)}/s)</b></span>${mark?`<br><span class="purchase-gain">Palier ${mark} : production ×${step} · encore ${mark-owned}</span>`:''}<br><span class="purchase-status">${affordable?'Achat disponible':`Encore ${formatAmount(missing(price,state.lumen))} lueurs`}</span>`:`Découverte à ${formatAmount(g.unlock,true)} lueurs`;
    return `<article class="generator-card ${unlocked?'':'locked'}"><div class="gen-icon">${unlocked?g.icon:'·'}</div><div class="gen-copy"><h3>${unlocked?g.name:'Espèce inconnue'} <span class="gen-count">${unlocked?owned:''}</span></h3><p>${detail}</p></div><button class="gen-buy" data-buy="${g.id}" ${!unlocked||!affordable?'disabled':''}>${amount>0?`+${amount}`:'Max'}<small>${formatAmount(price,true)} lueurs</small></button></article>`;
  }).join('');$$('[data-buy]').forEach(button=>button.onclick=()=>buyGenerator(button.dataset.buy));renderIndustry();
}
function renderIndustry(){
  const era=getEra();if(!era){$('#era-tools').innerHTML='';return}
  const headings={1:['ÈRE II · SYMBIOSE','Ateliers de la colonie','Des outils dédiés cultivent intuition et vitalité, même pendant votre absence.'],2:['ÈRE III · MARÉES','Routes de l’archipel','Les territoires et les balises recueillent des marées. Les voiliers les transforment en essor durable.'],3:['ÈRE IV · HARMONIE','Chant de l’océan','Les chœurs créent de l’harmonie. Composez des accords pour amplifier votre monde avant sa renaissance.']};
  const currencyName={lumen:'lueurs',tides:'marées',harmony:'points d’harmonie'},outputName={insight:'intuition',vitality:'vitalité',tides:'marées',harmony:'points d’harmonie'};
  $('#era-tools').innerHTML=[1,2,3].filter(stage=>era>=stage).map(stage=>{const [label,title,copy]=headings[stage];const cards=ERA_TOOLS.filter(tool=>tool.era===stage).map(tool=>{
    const count=state.industry[tool.id],price=toolCost(tool),affordable=state[tool.currency]+1e-9>=price;
    const multiplier=tool.id==='filter'?(hasPath('lagoon','amber')?1.2:1):tool.id==='garden'?(hasPath('lagoon','garden')?1.2:1):tool.id==='beacon'?1+(hasPath('archipelago','sails')?.25:0)+(hasPath('currents','tideway')?.25:0):tool.id==='choir'?(hasPath('currents','chorus')?1.25:1):1;
    const effect=tool.output?`+${formatFlow(tool.rate*multiplier)} ${outputName[tool.output]}/s par outil · ces outils : ${formatFlow(count*tool.rate*multiplier)}/s`:`+${Math.round(tool.bonus*100)} points de bonus · actuel +${Math.round(count*tool.bonus*100)}%`;
    return `<article class="industry-tool"><div class="tool-icon">${tool.icon}</div><div class="tool-copy"><strong>${tool.name} <span>×${count}</span></strong><small>${tool.copy}</small><small class="tool-effect">${effect}</small><small class="purchase-status">${affordable?'Prêt à construire':`Encore ${formatAmount(missing(price,state[tool.currency]))} ${currencyName[tool.currency]}`}</small></div><button data-tool="${tool.id}" ${affordable?'':'disabled'}>+1<small>${formatAmount(price,true)} ${currencyName[tool.currency]}</small></button></article>`;
  }).join('');return `<section class="industry-section"><span class="eyebrow">${label}</span><h3>${title}</h3><p>${copy}</p><div class="industry-list">${cards}</div></section>`}).join('');
  $$('[data-tool]').forEach(button=>button.onclick=()=>buyTool(button.dataset.tool));
}
function setAllocation(key,value){allocationEditingUntil=performance.now()+1500;const others=Object.keys(state.allocation).filter(k=>k!==key),rest=100-value,sum=state.allocation[others[0]]+state.allocation[others[1]];state.allocation[key]=value;if(!sum){state.allocation[others[0]]=rest;state.allocation[others[1]]=0}else{state.allocation[others[0]]=Math.round(rest*state.allocation[others[0]]/sum);state.allocation[others[1]]=rest-state.allocation[others[0]]}$$('[data-allocation]').forEach(input=>{const id=input.dataset.allocation;input.value=state.allocation[id];input.parentElement.querySelector('b').textContent=`${state.allocation[id]}%`});updateAllocationHelp()}
function buyNode(id){const n=NODES.find(x=>x.id===id);if(!n||state.nodes.includes(id)||state.insight<n.cost)return;state.insight-=n.cost;state.nodes.push(id);toast(`${n.name} relié`);save();render(true)}
function refreshReef(){const panel=$('#reef-content');const values=panel.querySelectorAll('.resource-pair strong');if(values.length===2){values[0].textContent=format(state.insight,true);values[1].textContent=format(state.vitality,true)}NODES.forEach((node,index)=>{const button=panel.querySelector(`[data-node="${node.id}"]`);if(button)button.disabled=state.nodes.includes(node.id)||(index>0&&!state.nodes.includes(NODES[index-1].id))||state.insight<node.cost});const locked=panel.querySelector('.inline-lock span');if(locked)locked.textContent=`${format(Math.max(0,1e9-state.runLifetime))} lueurs avant son éveil`}
function renderReef(){const era=getEra(),key=`${era}|${state.nodes.join(',')}`;if($('#reef-content').dataset.renderKey===key){refreshReef();return}$('#reef-content').dataset.renderKey=key;if(!era){$('#reef-content').className='locked-panel';$('#reef-content').innerHTML=`<div class="big-lock">◇</div><h3>Un monde cherche son équilibre</h3><p>Produisez ${format(25000)} lueurs et conquérez deux territoires pour orienter les courants.</p>`;return}$('#reef-content').className='';const rows=[['light','Photosynthèse','Amplifie la production de lueur'],['insight','Exploration','Crée de l’intuition pour muter'],['vitality','Symbiose','La vitalité amplifie progressivement tout le récif']].map(([id,name,copy])=>`<label class="allocation-row"><span><strong>${name}</strong><small>${copy}</small></span><b>${state.allocation[id]}%</b><input type="range" min="0" max="100" value="${state.allocation[id]}" data-allocation="${id}"></label>`).join('');const network=era>=2?`<article class="panel-card"><span class="eyebrow">RÉSEAU DU RÉCIF</span><h3>Relier les grands courants</h3><p>Chaque nœud transforme durablement la production.</p><div class="node-grid">${NODES.map((n,i)=>{const bought=state.nodes.includes(n.id),available=!i||state.nodes.includes(NODES[i-1].id);return`<button class="reef-node ${bought?'bought':''}" data-node="${n.id}" ${bought||!available||state.insight<n.cost?'disabled':''}><i>${n.icon}</i><strong>${n.name}</strong><small>${bought?n.copy:`${n.cost} intuition`}</small></button>`}).join('')}</div></article>`:`<article class="locked-panel inline-lock"><strong>Le grand récif dort encore</strong><span>${format(Math.max(0,1e9-state.runLifetime))} lueurs avant son éveil</span></article>`;$('#reef-content').innerHTML=`<article class="panel-card"><div class="resource-pair"><span><small>Intuition</small><strong>${format(state.insight,true)}</strong></span><span><small>Vitalité</small><strong>${format(state.vitality,true)}</strong></span></div><h3>Orienter les courants</h3><p>La somme reste égale à 100%. Les autres courants s’adaptent.</p>${rows}</article>${network}`;$$('[data-allocation]').forEach(i=>{i.onpointerdown=()=>{allocationDragging=true};i.oninput=()=>setAllocation(i.dataset.allocation,Number(i.value));i.onchange=()=>{allocationDragging=false;save()};i.onpointercancel=()=>{allocationDragging=false;save()}});$$('[data-node]').forEach(b=>b.onclick=()=>buyNode(b.dataset.node))}
function updateAllocationHelp(){const panel=$('#reef-content'),card=panel.querySelector('.panel-card'),inputs=panel.querySelectorAll('[data-allocation]');if(!card||!inputs.length)return;const flows=allocationEffects();let summary=card.querySelector('.allocation-summary');if(!summary){summary=document.createElement('p');summary.className='allocation-impact allocation-summary';card.querySelector('p').after(summary)}summary.textContent=`Les curseurs partagent 100% : monter l’un réduit les autres. Réglage actuel : ${format(rate(),true)} lueurs/s, ${formatFlow(flows.insight)} intuition/s et ${formatFlow(flows.vitality)} vitalité/s.`;const lightFactor=flows.light.toLocaleString('fr-FR',{maximumFractionDigits:2});const effects={light:`Part lumineuse ×${lightFactor} sur les lueurs/s. Augmentez-la pour acheter plus vite.`,insight:`Curseur : +${formatFlow(flows.insightFromCurrent)}/s · filtres : +${formatFlow(flows.insightFromTools)}/s · total : ${formatFlow(flows.insight)} intuition/s.`,vitality:`Curseur : +${formatFlow(flows.vitalityFromCurrent)}/s · jardins : +${formatFlow(flows.vitalityFromTools)}/s · total : ${formatFlow(flows.vitality)} vitalité/s. Le stock apporte +${format(flows.vitalityBonus,true)}% de lueurs/s.`};inputs.forEach(input=>{let note=input.parentElement.querySelector('.allocation-impact');if(!note){note=document.createElement('small');note.className='allocation-impact';input.parentElement.querySelector('span').append(note)}note.textContent=effects[input.dataset.allocation]})}
function renderReefExplained(){renderReef();updateAllocationHelp()}
function buyMutation(id){const m=MUTATIONS.find(x=>x.id===id);if(!m||state.mutations.includes(id)||getEra()<m.era||state.insight<m.cost)return;state.insight-=m.cost;state.mutations.push(id);toast(`${m.name} acquise`);save();render(true)}
function buyMemoryUpgrade(id){const upgrade=MEMORY_UPGRADES.find(item=>item.id===id);if(!upgrade||state.memoryUpgrades.includes(id)||state.memories<upgrade.cost)return;state.memories-=upgrade.cost;state.memoryUpgrades.push(id);if(id==='seed')state.generators.firefly+=6;toast(`${upgrade.name} inscrite dans la mémoire`);save();render(true)}
function openAction({title,copy,mode='confirm',value='',confirmText='Confirmer'}){const dialog=$('#action-dialog'),input=$('#action-input'),confirmButton=$('#action-confirm'),copyButton=$('#action-copy-button');dialog.classList.toggle('exporting',mode==='export');dialog.querySelector('[value="cancel"]').textContent=mode==='export'?'Fermer':'Annuler';if($('#settings-dialog').open)$('#settings-dialog').close();$('#action-title').textContent=title;$('#action-copy').textContent=copy;input.hidden=mode==='confirm';input.readOnly=mode==='export';input.value=value;copyButton.hidden=mode!=='export';confirmButton.hidden=mode==='export';confirmButton.textContent=confirmText;dialog.returnValue='cancel';dialog.showModal();if(mode==='import')input.focus();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve({confirmed:dialog.returnValue==='confirm',value:input.value}),{once:true}))}
function prestigeGain(){const tier=Math.floor(Math.sqrt(state.runLifetime/1e12));return tier>0?tier+1:0}
function nextPearlLifetime(){return prestigeGain()>0?prestigeGain()**2*1e12:1e12}
function prestigeChecklist(){const lightReady=state.runLifetime>=1e12,zonesReady=state.territories.length===TERRITORIES.length,nodesReady=state.nodes.length===NODES.length;const nextZone=nextTerritory(),nextNode=NODES[state.nodes.length];const items=[{ready:lightReady,label:'Lueurs produites',detail:`${format(state.runLifetime,true)} / 1 T${lightReady?'':` · encore ${format(1e12-state.runLifetime,true)}`}`},{ready:zonesReady,label:'Territoires',detail:`${state.territories.length} / ${TERRITORIES.length}${nextZone?` · prochain : ${nextZone.name}`:''}`},{ready:nodesReady,label:'Nœuds du récif',detail:`${state.nodes.length} / ${NODES.length}${nextNode?` · prochain : ${nextNode.name} (${formatAmount(nextNode.cost,true)} intuition)` :''}`}];return `<ul class="prestige-checklist">${items.map(item=>`<li class="${item.ready?'ready':''}"><span aria-hidden="true">${item.ready?'✓':'○'}</span><div><strong>${item.label}</strong><small>${item.detail}</small></div></li>`).join('')}</ul>`}
async function prestige(){const preview=prestigeGain();if(preview<1||getEra()<3)return;const choice=await openAction({title:'Faire renaître l’océan ?',copy:`Vous gagnerez au moins ${preview} Perle${preview>1?'s':''}. Vous garderez vos Perles, améliorations de mémoire et statistiques. Producteurs, territoires, souvenirs d’expédition et ressources de cet océan recommenceront. Le prochain océan naîtra avec ${10+(state.memoryUpgrades.includes('seed')?6:0)} lucioles.`,confirmText:'Renaître'});if(!choice.confirmed)return;const gain=prestigeGain();const keep={memories:state.memories+gain,totalMemories:state.totalMemories+gain,prestigeCount:state.prestigeCount+1,allTimeLumen:state.allTimeLumen,settings:state.settings,stats:state.stats,memoryUpgrades:state.memoryUpgrades,mutations:state.mutations.filter(id=>id==='cosmic')};state={...freshState(),...keep};state.generators.firefly=10+(state.memoryUpgrades.includes('seed')?6:0);knownEra=0;save();switchTab('source');toast(`Nouvel océan · ${gain} Perle${gain>1?'s':''} à investir dans Héritage`);render(true)}
function renderEvolution(){
  const era=getEra(),gain=prestigeGain();
  const mutations=MUTATIONS.map(m=>{const bought=state.mutations.includes(m.id),available=era>=m.era;return`<button class="mutation-card ${bought?'bought':''}" data-mutation="${m.id}" ${bought||!available||state.insight<m.cost?'disabled':''}><span>${bought?'✓':'✦'}</span><div><strong>${m.name}</strong><small>${available?m.copy:`Disponible à l’ère ${m.era+1}`}</small></div><b>${bought?'Acquise':`${m.cost} intuition`}</b></button>`}).join('');
  const memoryPanel=state.prestigeCount?`<article class="panel-card memory-card"><span class="eyebrow">PERLES PERMANENTES</span><h3>Mémoire de l’océan</h3><p>Ces lois survivent à chaque renaissance.</p><div class="mutation-list">${MEMORY_UPGRADES.map(upgrade=>{const bought=state.memoryUpgrades.includes(upgrade.id);return`<button class="mutation-card ${bought?'bought':''}" data-memory="${upgrade.id}" ${bought||state.memories<upgrade.cost?'disabled':''}><span>${bought?'✓':'◇'}</span><div><strong>${upgrade.name}</strong><small>${upgrade.copy}</small></div><b>${bought?'Acquise':`${upgrade.cost} ◇`}</b></button>`}).join('')}</div></article>`:'';
  const install=!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone&&state.totalTaps>20?`<article class="panel-card install-card"><span>＋</span><div><h3>Emportez Nacre</h3><p>Sur iPhone : Partager, puis « Sur l’écran d’accueil ».</p></div></article>`:'';
  const gate=`La planète doit produire encore ${format(Math.max(0,1e12-state.runLifetime))} lueurs avant de muer.`;
  const introduction=era>=3?'Votre océan peut renaître maintenant.':era>=2?'Réunissez ces trois conditions pour faire renaître cet océan.':gate;
  const checklist=era>=2?prestigeChecklist():'';
  const preview=Math.max(2,gain),rewardIntro=era>=3?'Si vous renaissez maintenant':'À votre prochaine mue, une fois les conditions réunies',reward=era>=2?`<div class="prestige-reward">${rewardIntro} : <strong>${preview} Perles de mémoire</strong>. Elles ajoutent au moins ${preview*25} points au bonus permanent des lueurs.${state.prestigeCount===0?' Vous pourrez choisir deux Héritages à 1 Perle.':''}</div>`:'';
  $('#evolution-content').innerHTML=`${install}<article class="panel-card"><div class="resource-pair"><span><small>Perles de mémoire</small><strong>${format(state.memories)}</strong></span><span><small>Renaissances</small><strong>${state.prestigeCount}</strong></span></div><h3>Mutations</h3><p>L’intuition transforme les lois de votre océan.</p><div class="mutation-list">${mutations}</div></article>${memoryPanel}<article class="panel-card prestige-card"><span class="eyebrow">RENAISSANCE</span><h3>Mue planétaire</h3><p>${introduction}</p>${checklist}${reward}<button class="primary-wide" id="prestige-button" ${gain<1||era<3?'disabled':''}>${era>=3?`Renaître avec ${gain} Perles`:'Renaissance à débloquer'}</button></article><article class="panel-card"><h3>Trace de votre monde</h3><div class="stat-grid"><div class="stat"><strong>${format(state.allTimeLumen)}</strong><small>Lueurs créées</small></div><div class="stat"><strong>${format(state.stats.highestRate)}</strong><small>Record /s</small></div><div class="stat"><strong>${format(state.totalTaps)}</strong><small>Pulsations</small></div><div class="stat"><strong>${format(state.stats.offlineEarned)}</strong><small>Gains hors ligne</small></div></div></article>`;
  $$('[data-mutation]').forEach(b=>b.onclick=()=>buyMutation(b.dataset.mutation));$$('[data-memory]').forEach(b=>b.onclick=()=>buyMemoryUpgrade(b.dataset.memory));$('#prestige-button').onclick=prestige;
}
function polishEvolution(){const panel=$('#evolution-content'),memory=panel.querySelector('.memory-card');if(!memory)return;panel.prepend(memory);memory.querySelector('p').textContent=`${formatAmount(state.memories)} Perle${state.memories>1?'s':''} à investir · bonus des Perles +${format(state.totalMemories*(state.mutations.includes('cosmic')?.375:.25)*100,true)}% de lueurs/s, même après un achat.`}

function render(force=false){
  const eraIndex=getEra(),era=ERAS[eraIndex],r=rate();
  document.body.dataset.era=String(eraIndex);
  const grown=Math.max(...GENERATORS.map(g=>state.generators[g.id]));document.body.dataset.milestone=String(grown>=100?4:grown>=50?3:grown>=25?2:grown>=10?1:0);
  document.body.dataset.ecosystem=[state.generators.polyp||eraIndex>=1?'garden':'',state.generators.coral||eraIndex>=1?'coral':'',state.generators.whale?'life':'',eraIndex>=2?'tides':'',eraIndex>=3?'harmony':''].filter(Boolean).join(' ');
  const goal=nextMilestone(),card=$('#milestone-card');card.hidden=!goal;if(goal){$('#milestone-title').textContent=`${goal.g.name} · palier ${goal.mark}`;$('#milestone-copy').textContent=`Encore ${goal.mark-goal.owned} pour multiplier leur production par ${goal.bonus}. Touchez pour voir la Vie.`;$('#milestone-progress').textContent=`${goal.owned} / ${goal.mark}`}
  $('#lumen-display').textContent=state.lumen<1e7?formatAmount(state.lumen):format(state.lumen,true);
  const precise=$('#balance-exact');precise.hidden=state.lumen<1e7;if(!precise.hidden&&(force||!precise.textContent||performance.now()-Number(precise.dataset.updatedAt||0)>1000)){precise.textContent=`Solde ${state.lumen<1e15?'exact':'estimé'} : ${formatAmount(state.lumen)} lueurs`;precise.dataset.updatedAt=String(performance.now())}
  $('#rate-display').textContent=`${format(r,true)} / seconde`;
  const extras=$('#secondary-resources');extras.hidden=eraIndex===0;
  if(eraIndex){const resources=[['insight','Intuition'],['vitality','Vitalité'],...(eraIndex>=2?[['tides','Marées']]:[]),...(eraIndex>=3?[['harmony','Harmonie']]:[])];if(extras.dataset.era!==String(eraIndex)){extras.innerHTML=resources.map(([key,name])=>`<span><small>${name}</small><strong data-resource="${key}"></strong></span>`).join('');extras.dataset.era=String(eraIndex)}resources.forEach(([key])=>{extras.querySelector(`[data-resource="${key}"]`).textContent=state[key]<1?format(state[key],true):formatAmount(state[key])})}
  $('#era-label').textContent=`ÈRE ${['I','II','III','IV'][eraIndex]} · ${era.name.toUpperCase()}`;
  const pearlCount=prestigeGain(),previous=eraIndex===3?(pearlCount-1)*(pearlCount-1)*1e12:0,nextPearl=eraIndex===3?nextPearlLifetime():0;
  const progress=eraIndex===3?Math.min(100,(state.runLifetime-previous)/(nextPearl-previous)*100):Math.min(100,(state.runLifetime-era.start)/(era.end-era.start)*100);
  $('#era-progress').style.width=`${Math.max(0,progress)}%`;
  const needed=[2,4,6,6][eraIndex],territoryGate=state.runLifetime>=era.end&&state.territories.length<needed,reefGate=eraIndex===2&&state.runLifetime>=era.end&&state.nodes.length<NODES.length;
  $('#next-label').textContent=territoryGate?'Conquérir les territoires':reefGate?'Relier tous les grands courants':eraIndex===3?'Prochaine Perle':era.next;
  const remaining=Math.max(0,era.end-state.runLifetime);$('#next-value').textContent=territoryGate?`${state.territories.length} / ${needed}`:reefGate?`${state.nodes.length} / ${NODES.length}`:eraIndex===3?`${format(nextPearl-state.runLifetime,true)} lueurs`:remaining<1e9?formatAmount(remaining,true):format(remaining,true);
  $('#prestige-ready').hidden=eraIndex!==3;if(eraIndex===3)$('#prestige-ready').textContent=`Renaissance disponible · ${pearlCount} Perle${pearlCount>1?'s':''} →`;
  $('#tap-value').textContent=`+${format(tapYield(),true)}`;
  const active=Date.now()<state.resonanceUntil,resProgress=active?Math.max(0,(state.resonanceUntil-Date.now())/(state.mutations.includes('dream')?45000:30000)*100):state.resonanceCharge;
  $('#resonance-label').textContent=active?`Résonance ×3 · ${Math.ceil((state.resonanceUntil-Date.now())/1000)}s`:state.resonanceCharge>=100?'Résonance prête · touchez la perle':`Résonance ${Math.floor(resProgress)}% · se charge avec le temps`;
  $('#resonance-bar').style.width=`${resProgress}%`;
  const pick=recommendation(),price=cost(pick),owned=state.generators[pick.id],gain=generatorOutput(pick,owned+1)-generatorOutput(pick,owned);
  $('#focus-title').textContent=`Faire naître : ${pick.name}`;
  $('#focus-copy').textContent=`Cet achat : +${format(gain,true)} lueurs/s · ${state.lumen>=price?`${owned} déjà présentes`:`encore ${formatAmount(missing(price,state.lumen))} lueurs`}`;
  $('#focus-cost').textContent=formatAmount(price,true);
  $('#focus-action').disabled=state.lumen<price;$('#focus-action').dataset.generator=pick.id;
  const frontier=nextTerritory();$('#frontier-title').textContent=frontier?frontier.name:'Océan unifié';
  $('#frontier-copy').textContent=frontier?`${state.territories.length} / 6 territoires · +${Math.round(frontier.bonus*100)}% à conquérir`:'6 / 6 territoires conquis';
  $('#reef-lock').hidden=true;
  const refreshPanels=force||performance.now()-lastPanelRender>1000;
  if(refreshPanels){if($('#view-life').classList.contains('active'))renderGenerators();if($('#view-reef').classList.contains('active')){renderConquest();if(!allocationDragging&&performance.now()>allocationEditingUntil)renderReefExplained()}if($('#view-evolution').classList.contains('active')){renderEvolution();polishEvolution()}lastPanelRender=performance.now()}
}
function switchTab(tab){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.view').forEach(v=>{const on=v.dataset.view===tab;v.hidden=!on;v.classList.toggle('active',on)});if(tab==='life')renderGenerators();if(tab==='reef'){renderConquest();renderReefExplained()}if(tab==='evolution'){renderEvolution();polishEvolution()}scrollTo({top:0,behavior:state.settings.motion?'smooth':'auto'})}
function resumeOffline(){
  const seconds=Math.max(0,Math.min((state.memoryUpgrades.includes('tide_memory')?57600:28800)+(hasPath('world','patient')?14400:0),(Date.now()-Number(state.savedAt||Date.now()))/1000));if(seconds<30)return;
  const efficiency=Math.min(.95,(state.mutations.includes('tide')?.85:.65)+(state.memoryUpgrades.includes('tide_memory')?.15:0)+(hasPath('trench','rest')?.1:0)),work=industryRates(),gain=rate()*seconds*efficiency;
  let insightGain=0,vitalityGain=0;
  if(getEra()>=1){const flows=allocationEffects();insightGain=flows.insight*seconds*efficiency;vitalityGain=flows.vitality*seconds*efficiency}
  const tideGain=work.tides*seconds*efficiency,harmonyGain=work.harmony*seconds*efficiency;if(gain<=0&&insightGain<=0&&vitalityGain<=0&&tideGain<=0&&harmonyGain<=0)return;
  addLumen(gain);state.insight+=insightGain;state.vitality+=vitalityGain;state.tides+=tideGain;state.harmony+=harmonyGain;state.resonanceCharge=100;state.stats.offlineEarned+=gain;
  const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),extras=[['intuition',insightGain],['vitalité',vitalityGain],['marées',tideGain],['harmonie',harmonyGain]].filter(([,value])=>value>0).map(([name,value])=>`${format(value,true)} ${name}`).join(', ');
  $('#offline-copy').innerHTML=`Pendant ${h?`${h} h `:''}${m} min, votre monde a recueilli <strong>${format(gain)} lueurs</strong> à ${Math.round(efficiency*100)}% d’efficacité.${extras?` Vous avez aussi gagné ${extras}.`:''}`;
  if(!$('#offline-dialog').open)$('#offline-dialog').showModal();save();render(true);
}
function exportSave(){save();const text=btoa(unescape(encodeURIComponent(JSON.stringify(state))));openAction({title:'Exporter la sauvegarde',copy:'Copiez ce code et conservez-le pour retrouver votre océan sur un autre appareil.',mode:'export',value:text})}
async function importSave(){const answer=await openAction({title:'Importer une sauvegarde',copy:'Collez ici un code de sauvegarde Nacre.',mode:'import',confirmText:'Restaurer'});if(!answer.confirmed||!answer.value.trim())return;try{state=sanitise(JSON.parse(decodeURIComponent(escape(atob(answer.value.trim())))));knownEra=getEra();save();render(true);toast('Sauvegarde restaurée')}catch{toast('Cette sauvegarde est illisible')}}
function loop(now){const delta=Math.min(1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;if(!document.hidden){economy(delta);if(now-lastRender>180){render();lastRender=now}if(Date.now()-lastSave>10000)save()}requestAnimationFrame(loop)}

$('#pulse-button').onpointerdown=pulse;
$('#pulse-button').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();pulse()}};
$('#focus-action').onclick=()=>buyGenerator($('#focus-action').dataset.generator,1);
$('#milestone-card').tabIndex=0;$('#milestone-card').setAttribute('role','button');$('#milestone-card').onclick=()=>switchTab('life');$('#milestone-card').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();switchTab('life')}};
$('#frontier-action').onclick=()=>switchTab('reef');
$('#prestige-ready').onclick=()=>switchTab('evolution');
$$('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$$('[data-buy-mode]').forEach(b=>b.onclick=()=>{state.buyMode=b.dataset.buyMode==='max'?'max':Number(b.dataset.buyMode);$$('[data-buy-mode]').forEach(x=>x.classList.toggle('active',x===b));renderGenerators()});
$('#settings-button').onclick=()=>$('#settings-dialog').showModal();
$('#guide-button').onclick=()=>$('#guide-dialog').showModal();
$('#era-dialog-action').onclick=()=>{$('#era-dialog').close();switchTab(activeEraDestination)};
$('#motion-toggle').checked=state.settings.motion;
$('#haptics-toggle').checked=state.settings.haptics;
document.body.classList.toggle('reduced-motion',!state.settings.motion);
$('#motion-toggle').onchange=e=>{state.settings.motion=e.target.checked;document.body.classList.toggle('reduced-motion',!e.target.checked);save()};
$('#haptics-toggle').onchange=e=>{state.settings.haptics=e.target.checked;save()};
$('#export-button').onclick=exportSave;
$('#import-button').onclick=importSave;
$('#action-copy-button').onclick=async()=>{const input=$('#action-input');try{await navigator.clipboard.writeText(input.value);toast('Sauvegarde copiée')}catch{input.focus();input.select();toast('Code sélectionné : copiez-le manuellement')}};
$('#reset-button').onclick=async()=>{const answer=await openAction({title:'Recommencer cette partie ?',copy:'Toute la progression, y compris les Perles de mémoire, sera effacée.',confirmText:'Tout effacer'});if(!answer.confirmed)return;localStorage.removeItem(SAVE_KEY);localStorage.removeItem(SAVE_BACKUP_KEY);state=freshState();save();location.reload()};
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else{resumeOffline();lastFrame=performance.now()}});
addEventListener('pagehide',save);
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
async function registerWebMCP(){if(!navigator.modelContext?.registerTool)return;const tools=[{name:'nacre_state',description:'Lire la progression actuelle du jeu Nacre.',inputSchema:{type:'object',properties:{}},execute:async()=>({content:[{type:'text',text:JSON.stringify({era:ERAS[getEra()].name,lumen:state.lumen,rate:rate(),insight:state.insight,memories:state.memories})}]})},{name:'nacre_pulse',description:'Déclencher une pulsation dans Nacre.',inputSchema:{type:'object',properties:{}},execute:async()=>{pulse();return{content:[{type:'text',text:`Pulsation effectuée. ${format(state.lumen)} lueurs.`}]} }},{name:'nacre_buy',description:'Acheter un producteur dans Nacre.',inputSchema:{type:'object',properties:{id:{type:'string',enum:GENERATORS.map(g=>g.id)}},required:['id']},execute:async({id})=>({content:[{type:'text',text:buyGenerator(id,1)?'Achat effectué.':'Achat impossible.'}]})}];for(const tool of tools)try{await navigator.modelContext.registerTool(tool)}catch{}}
render(true);resumeOffline();registerWebMCP();requestAnimationFrame(loop);
