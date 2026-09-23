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
  { id:'symbiosis', name:'Symbiose profonde', copy:'Toute la production est doublée.', cost:35, era:1 },
  { id:'dream', name:'Rêve collectif', copy:'La Résonance dure deux fois plus longtemps.', cost:120, era:2 },
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
  { id:'seed', name:'Semence ancienne', cost:1, copy:'Chaque nouvel océan commence avec 10 lucioles.' },
  { id:'rhythm', name:'Battement ancestral', cost:2, copy:'La Résonance se déclenche après 15 pulsations.' },
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
const ERAS = [
  { name:'Noyau', start:0, end:25000, next:'Fonder la colonie' },
  { name:'Colonies', start:25000, end:1000000000, next:'Dominer les récifs' },
  { name:'Archipel', start:1000000000, end:1000000000000, next:'Unifier l’océan' },
  { name:'Océan souverain', start:1000000000000, end:1e16, next:'Faire renaître le monde' }
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
  return { schemaVersion:4, savedAt:Date.now(), lumen:0, runLifetime:0, allTimeLumen:0,
    generators:Object.fromEntries(GENERATORS.map(g=>[g.id,0])), industry:Object.fromEntries(ERA_TOOLS.map(tool=>[tool.id,0])), insight:0, vitality:0, tides:0, harmony:0, memories:0, prestigeCount:0,
    mutations:[], nodes:[], memoryUpgrades:[], territories:[], scouting:{}, conquestLog:[], nextExpeditionAt:0, riskyWins:0, riskyLosses:0, allocation:{ light:70, insight:20, vitality:10 }, totalTaps:0, buyMode:1, resonanceUntil:0,
    settings:{ motion:true, haptics:true }, stats:{ startedAt:Date.now(), highestRate:0, offlineEarned:0 } };
}
function sanitise(data) {
  const base=freshState(); if (!data || typeof data!=='object') return base; const s={...base,...data};
  ['lumen','runLifetime','allTimeLumen','insight','vitality','tides','harmony','memories','prestigeCount','totalTaps'].forEach(k=>s[k]=Number.isFinite(Number(s[k]))?Math.max(0,Math.min(1e100,Number(s[k]))):base[k]);
  s.generators={...base.generators,...(data.generators||{})}; GENERATORS.forEach(g=>{const value=Number(s.generators[g.id]);s.generators[g.id]=Number.isFinite(value)?Math.max(0,Math.min(1000,Math.floor(value))):0});
  s.industry={...base.industry,...(data.industry||{})};ERA_TOOLS.forEach(tool=>{const value=Number(s.industry[tool.id]);s.industry[tool.id]=Number.isFinite(value)?Math.max(0,Math.min(1000,Math.floor(value))):0});
  s.mutations=Array.isArray(data.mutations)?[...new Set(data.mutations.filter(id=>MUTATIONS.some(m=>m.id===id)))]:[];s.memoryUpgrades=Array.isArray(data.memoryUpgrades)?[...new Set(data.memoryUpgrades.filter(id=>MEMORY_UPGRADES.some(m=>m.id===id)))]:[];
  const linked=Array.isArray(data.nodes)?data.nodes:[];s.nodes=[];for(const node of NODES){if(!linked.includes(node.id))break;s.nodes.push(node.id)}
  s.settings={ motion:data.settings?.motion!==false, haptics:data.settings?.haptics!==false };
  s.stats={...base.stats}; ['startedAt','highestRate','offlineEarned'].forEach(k=>{const value=Number(data.stats?.[k]);if(Number.isFinite(value))s.stats[k]=Math.max(0,value)});
  const rawAllocation={...base.allocation,...(data.allocation||{})}; Object.keys(rawAllocation).forEach(k=>{const value=Number(rawAllocation[k]);rawAllocation[k]=Number.isFinite(value)?Math.max(0,Math.min(100,Math.round(value))):base.allocation[k]});
  const allocationTotal=rawAllocation.light+rawAllocation.insight+rawAllocation.vitality; s.allocation=allocationTotal>0?{light:Math.round(rawAllocation.light/allocationTotal*100),insight:0,vitality:0}:{...base.allocation};if(allocationTotal>0){s.allocation.insight=Math.min(100-s.allocation.light,Math.round(rawAllocation.insight/allocationTotal*100));s.allocation.vitality=100-s.allocation.light-s.allocation.insight}
  const claimed=Array.isArray(data.territories)?data.territories:[];s.territories=[];for(const zone of TERRITORIES){if(!claimed.includes(zone.id))break;s.territories.push(zone.id)}
  s.scouting=Object.fromEntries(TERRITORIES.map(zone=>{const value=Number(data.scouting?.[zone.id]);return[zone.id,Number.isFinite(value)?Math.max(0,Math.min(5,Math.floor(value))):0]}));
  s.conquestLog=Array.isArray(data.conquestLog)?data.conquestLog.slice(-5).filter(item=>item&&TERRITORIES.some(zone=>zone.id===item.zoneId)&&['claim','expedition'].includes(item.kind)&&['safe','risk','patrol','raid'].includes(item.mode)&&typeof item.success==='boolean').map(item=>({zoneId:item.zoneId,kind:item.kind,mode:item.mode,success:item.success,amount:Number.isFinite(Number(item.amount))?Math.max(0,Math.min(1e100,Number(item.amount))):0})):[];
  s.nextExpeditionAt=Number.isFinite(Number(data.nextExpeditionAt))?Math.max(0,Number(data.nextExpeditionAt)):0;s.riskyWins=Number.isFinite(Number(data.riskyWins))?Math.max(0,Math.min(1e9,Math.floor(Number(data.riskyWins)))):0;s.riskyLosses=Number.isFinite(Number(data.riskyLosses))?Math.max(0,Math.min(1e9,Math.floor(Number(data.riskyLosses)))):0;
  s.buyMode=data.buyMode==='max'?'max':([1,10].includes(Number(data.buyMode))?Number(data.buyMode):1); s.savedAt=Number.isFinite(Number(data.savedAt))?Math.max(0,Number(data.savedAt)):Date.now(); s.resonanceUntil=Number.isFinite(Number(data.resonanceUntil))?Math.max(0,Number(data.resonanceUntil)):0; s.schemaVersion=4; return s;
}
function load() { for (const key of [SAVE_KEY,SAVE_BACKUP_KEY]) try { const raw=localStorage.getItem(key); if(raw) return sanitise(JSON.parse(raw)); } catch {} return freshState(); }
let state=load(), tapTimes=[], lastFrame=performance.now(), lastRender=0, lastPanelRender=0, lastSave=Date.now(), knownEra=getEra(), allocationDragging=false, allocationEditingUntil=0;
function save() { state.savedAt=Date.now(); const text=JSON.stringify(state); try { localStorage.setItem(SAVE_TEMP_KEY,text); const old=localStorage.getItem(SAVE_KEY); if(old)localStorage.setItem(SAVE_BACKUP_KEY,old); localStorage.setItem(SAVE_KEY,localStorage.getItem(SAVE_TEMP_KEY)); localStorage.removeItem(SAVE_TEMP_KEY); } catch { toast('Sauvegarde locale indisponible'); } lastSave=Date.now(); }
function format(n, precise=false) { if(!Number.isFinite(n))return '∞'; for(const [v,u] of [[1e15,'Qa'],[1e12,'T'],[1e9,'Md'],[1e6,'M'],[1e3,'k']])if(Math.abs(n)>=v)return `${(n/v).toLocaleString('fr-FR',{maximumFractionDigits:precise?2:1})} ${u}`; return n.toLocaleString('fr-FR',{maximumFractionDigits:precise||Math.abs(n)<100?1:0}); }
function formatAmount(n,roundUp=false){if(!Number.isFinite(n))return '∞';if(n>=1e15)return format(n,true);return (roundUp?Math.ceil(n-1e-9):Math.floor(n+1e-9)).toLocaleString('fr-FR')}
function missing(cost,have){return Math.max(0,Math.ceil(cost-have-1e-9))}
function getEra(){return state.runLifetime>=1e12&&state.nodes.length===NODES.length&&state.territories.length===6?3:state.runLifetime>=1e9&&state.territories.length>=4?2:state.runLifetime>=25000&&state.territories.length>=2?1:0}
function milestone(n){let m=1;if(n>=10)m*=2;if(n>=25)m*=2;if(n>=50)m*=3;if(n>=100)m*=5;return m}
function globalMult(){let m=1+state.memories*(state.mutations.includes('cosmic')?.225:.15);if(state.mutations.includes('symbiosis'))m*=2;NODES.forEach(n=>{if(state.nodes.includes(n.id))m*=n.mult});m*=1+Math.min(.8,TERRITORIES.reduce((sum,zone)=>sum+(state.territories.includes(zone.id)?zone.bonus:0),0));m*=1+state.industry.sail*.08+state.industry.accord*.12;if(Date.now()<state.resonanceUntil)m*=3;if(getEra()>=1){m*=.45+state.allocation.light/70;m*=1+Math.log10(1+state.vitality)*.08}return m}
function baseRate(){return GENERATORS.reduce((sum,g)=>sum+state.generators[g.id]*g.rate*milestone(state.generators[g.id]),0)}
function rate(){return baseRate()*globalMult()}
function generatorOutput(g,owned){return owned*g.rate*milestone(owned)*globalMult()}
function industryRates(){const era=getEra();return{insight:era>=1?state.industry.filter*.6:0,vitality:era>=1?state.industry.garden*.3:0,tides:era>=2?state.industry.beacon*.5+state.territories.length*.05:0,harmony:era>=3?state.industry.choir*.2:0}}
function tapYield(){let n=Math.max(1,Math.sqrt(rate()+1)*.4);if(state.mutations.includes('membrane'))n*=5;return n*(1+state.memories*.1)}
function cost(g,amount=1){const owned=state.generators[g.id],n=Number(amount);return g.cost*Math.pow(g.growth,owned)*(Math.pow(g.growth,n)-1)/(g.growth-1)}
function maxBuy(g){const x=1+state.lumen*(g.growth-1)/(g.cost*Math.pow(g.growth,state.generators[g.id]));let amount=Math.max(0,Math.floor(Math.log(Math.max(1,x))/Math.log(g.growth)));while(amount>0&&cost(g,amount)>state.lumen+1e-8)amount--;while(cost(g,amount+1)<=state.lumen+1e-8)amount++;return amount}
function toolCost(tool){return tool.cost*Math.pow(tool.growth,state.industry[tool.id])}
function addLumen(n){state.lumen+=n;state.runLifetime+=n;state.allTimeLumen+=n}
function haptic(p){if(state.settings.haptics&&navigator.vibrate)navigator.vibrate(p)}
function toast(text){const n=document.createElement('div');n.className='toast';n.textContent=text;$('#toast-region').append(n);setTimeout(()=>n.remove(),2600)}
function buyGenerator(id,forced){const g=GENERATORS.find(x=>x.id===id);if(!g||state.runLifetime<g.unlock)return false;const mode=forced||state.buyMode,amount=mode==='max'?maxBuy(g):Number(mode);if(amount<1)return false;const price=cost(g,amount);if(state.lumen+1e-9<price)return false;const before=state.generators[id];state.lumen-=price;state.generators[id]+=amount;[10,25,50,100].forEach(mark=>{if(before<mark&&state.generators[id]>=mark)toast(`${g.name} · palier ${mark} atteint`)});haptic(12);save();render(true);return true}
function buyTool(id){const tool=ERA_TOOLS.find(item=>item.id===id);if(!tool||getEra()<tool.era)return false;const price=toolCost(tool);if(state[tool.currency]+1e-9<price)return false;state[tool.currency]-=price;state.industry[id]++;toast(`${tool.name} · ${state.industry[id]}`);haptic(12);save();render(true);return true}
function pulse(event){const now=Date.now();tapTimes=tapTimes.filter(t=>now-t<10000);tapTimes.push(now);state.totalTaps++;const gain=tapYield();addLumen(gain);const threshold=state.memoryUpgrades.includes('rhythm')?15:20;if(tapTimes.length>=threshold&&now>=state.resonanceUntil){state.resonanceUntil=now+(state.mutations.includes('dream')?30000:15000);tapTimes=[];toast('Résonance · production ×3');haptic([18,35,28])}if(event&&state.settings.motion){const n=document.createElement('span');n.className='float-gain';n.textContent=`+${format(gain,true)}`;n.style.left=`${event.clientX}px`;n.style.top=`${event.clientY}px`;document.body.append(n);setTimeout(()=>n.remove(),820)}$('#pulse-button').classList.add('pulsing');setTimeout(()=>$('#pulse-button').classList.remove('pulsing'),100);haptic(5);render()}
function economy(seconds){const r=rate(),work=industryRates();addLumen(r*seconds);if(getEra()>=1){const root=Math.sqrt(baseRate())*(state.memoryUpgrades.includes('deep_memory')?1.5:1);state.insight+=(root*state.allocation.insight/100*.025+work.insight)*seconds;state.vitality+=(root*state.allocation.vitality/100*.012+work.vitality)*seconds}state.tides+=work.tides*seconds;state.harmony+=work.harmony*seconds;state.stats.highestRate=Math.max(state.stats.highestRate,r);const era=getEra();if(era>knownEra){knownEra=era;toast(`Nouvelle ère · ${ERAS[era].name}`);haptic([25,45,25,45,50]);save()}}
function recommendation(){return GENERATORS.filter(g=>state.runLifetime>=g.unlock).reduce((best,g)=>{const score=cost(g)/(g.rate*milestone(state.generators[g.id]));return!best||score<best.score?{g,score}:best},null)?.g||GENERATORS[0]}

function nextTerritory(){return TERRITORIES[state.territories.length]}
function territoryChance(zone){return Math.min(.95,.55+(state.scouting[zone.id]||0)*.08)}
function logConquest(zone,kind,mode,success,amount){state.conquestLog.push({zoneId:zone.id,kind,mode,success,amount});state.conquestLog=state.conquestLog.slice(-5)}
function attemptConquest(mode,random=Math.random){
  const zone=nextTerritory();if(!zone||!['safe','risk'].includes(mode)||state.runLifetime<zone.unlock)return false;
  const stake=zone.cost*(mode==='safe'?1.4:.6);if(state.lumen<stake)return false;
  state.lumen-=stake;const success=mode==='safe'||random()<territoryChance(zone);
  if(success){state.territories.push(zone.id);if(mode==='risk'){addLumen(zone.cost*.9);state.riskyWins++}toast(`${zone.name} rejoint votre monde`);haptic([20,35,30])}
  else{state.scouting[zone.id]=Math.min(5,(state.scouting[zone.id]||0)+1);state.riskyLosses++;toast(`Échec dans ${zone.name} · la mise est perdue`);haptic(30)}
  logConquest(zone,'claim',mode,success,stake);save();render(true);return true;
}
function scoutTerritory(){const zone=nextTerritory();if(!zone||state.runLifetime<zone.unlock||(state.scouting[zone.id]||0)>=5)return false;const price=zone.cost*.2;if(state.lumen<price)return false;state.lumen-=price;state.scouting[zone.id]=(state.scouting[zone.id]||0)+1;toast(`Reconnaissance · ${Math.round(territoryChance(zone)*100)}% de chance`);save();render(true);return true}
function expeditionTerms(mode){const stake=Math.max(20,Math.floor(state.lumen*(mode==='raid'?.08:.02)));return{stake,chance:mode==='raid'?.45:.75,payout:stake*(mode==='raid'?2.8:1.4)}}
function launchExpedition(mode,random=Math.random){
  if(!['patrol','raid'].includes(mode)||!state.territories.length||Date.now()<state.nextExpeditionAt)return false;
  const zone=TERRITORIES[state.territories.length-1],terms=expeditionTerms(mode);if(state.lumen<terms.stake)return false;
  state.lumen-=terms.stake;const success=random()<terms.chance;if(success){addLumen(terms.payout);state.riskyWins++;toast(`Expédition réussie · +${format(terms.payout-terms.stake)} lueurs`)}else{state.riskyLosses++;toast(`Expédition perdue · −${format(terms.stake)} lueurs`)}
  state.nextExpeditionAt=Date.now()+180000;logConquest(zone,'expedition',mode,success,terms.stake);save();render(true);return true;
}
function renderConquest(){
  const zone=nextTerritory(),claimed=state.territories.length,route=TERRITORIES.map((item,index)=>`<div class="route-stop ${index<claimed?'claimed':index===claimed?'current':''}"><span>${index<claimed?'✓':item.icon}</span><small>${item.name}</small></div>`).join('');
  const frontier=zone?(()=>{
    const discovered=state.runLifetime>=zone.unlock,safe=zone.cost*1.4,risk=zone.cost*.6,chance=Math.round(territoryChance(zone)*100),scouting=state.scouting[zone.id]||0,scoutPrice=zone.cost*.2;
    const scout=scouting<5?`<button class="scout-button" id="scout-button" ${state.lumen<scoutPrice?'disabled':''}>Reconnaître les lieux · ${formatAmount(scoutPrice,true)} lueurs <small>+8 points de chance, sans risque · ${scouting}/5</small></button>`:`<div class="scout-complete">Reconnaissance complète · ${chance}% de chance</div>`;
    return `<article class="panel-card conquest-card"><span class="eyebrow">FRONTIÈRE ${claimed+1} / ${TERRITORIES.length}</span><h3>${zone.name}</h3><p>${zone.copy}</p><div class="territory-reward">Territoire conservé après conquête · +${Math.round(zone.bonus*100)}% de production</div>${discovered?`<p class="choice-intro">Vous avez ${formatAmount(state.lumen)} lueurs. Choisissez votre approche :</p><div class="choice-grid"><button class="choice-button safe" data-claim="safe" ${state.lumen<safe?'disabled':''}><strong>Établir une colonie</strong><span>Garanti · coût ${formatAmount(safe,true)} lueurs</span><small>${state.lumen>=safe?'Disponible':`Encore ${formatAmount(missing(safe,state.lumen))} lueurs`}</small></button><button class="choice-button risk" data-claim="risk" ${state.lumen<risk?'disabled':''}><strong>Tenter une percée</strong><span>${chance}% de réussite · mise ${formatAmount(risk,true)} lueurs</span><small>Succès : territoire et gain net +${formatAmount(zone.cost*.3)} lueurs. Échec : mise perdue, chance +8 points.</small><small>${state.lumen>=risk?'Disponible':`Encore ${formatAmount(missing(risk,state.lumen))} lueurs`}</small></button></div>${scout}`:`<div class="discovery-lock">Découverte à ${formatAmount(zone.unlock,true)} lueurs produites · encore ${formatAmount(Math.max(0,zone.unlock-state.runLifetime),true)}</div>`}</article>`;
  })():`<article class="panel-card conquest-card"><span class="eyebrow">OCÉAN UNIFIÉ</span><h3>Plus aucune frontière</h3><p>Tous les territoires sont vôtres. Reliez les courants, puis faites renaître un nouveau monde.</p></article>`;
  let expeditions='';if(claimed){const wait=Math.max(0,state.nextExpeditionAt-Date.now()),cooldown=wait>0,options=[['patrol','Patrouille prudente'],['raid','Incursion audacieuse']].map(([mode,label])=>{const terms=expeditionTerms(mode);return `<button class="choice-button ${mode==='raid'?'risk':'safe'}" data-expedition="${mode}" ${cooldown||state.lumen<terms.stake?'disabled':''}><strong>${label}</strong><span>${Math.round(terms.chance*100)}% de réussite · mise ${formatAmount(terms.stake,true)}</span><small>Succès : gain net +${formatAmount(terms.payout-terms.stake)} lueurs. Échec : mise perdue.</small></button>`}).join('');expeditions=`<article class="panel-card expedition-card"><span class="eyebrow">EXPÉDITIONS</span><h3>Explorer pour grandir</h3><p>Engagez une part de vos réserves. Les territoires conquis ne sont jamais perdus.</p><div class="choice-grid">${options}</div><div class="expedition-status">${cooldown?`Prochaine expédition dans ${Math.ceil(wait/60000)} min`:'Une expédition disponible'} · ${state.riskyWins} succès / ${state.riskyLosses} revers</div></article>`}
  const history=state.conquestLog.length?`<article class="conquest-history"><span class="eyebrow">CARNET DE ROUTE</span>${state.conquestLog.slice(-3).reverse().map(entry=>{const item=TERRITORIES.find(t=>t.id===entry.zoneId);return `<p><span>${entry.success?'✦':'◇'}</span> ${entry.kind==='claim'?'Conquête':'Expédition'} · ${item.name} · ${entry.success?'réussie':'échouée'} (${formatAmount(entry.amount,true)} engagées)</p>`}).join('')}</article>`:'';
  $('#conquest-content').innerHTML=`<article class="route-card"><div><span class="eyebrow">CARTE DES OCÉANS</span><strong>${claimed} / ${TERRITORIES.length} territoires</strong></div><div class="conquest-route">${route}</div></article>${frontier}${expeditions}${history}`;
  $$('[data-claim]').forEach(button=>button.onclick=()=>attemptConquest(button.dataset.claim));$$('[data-expedition]').forEach(button=>button.onclick=()=>launchExpedition(button.dataset.expedition));const scoutButton=$('#scout-button');if(scoutButton)scoutButton.onclick=scoutTerritory;
}

function renderGenerators(){
  $('#generator-list').innerHTML=GENERATORS.map(g=>{
    const unlocked=state.runLifetime>=g.unlock,amount=state.buyMode==='max'?maxBuy(g):Number(state.buyMode),owned=state.generators[g.id],price=cost(g,Math.max(1,amount));
    const current=generatorOutput(g,owned),after=generatorOutput(g,owned+Math.max(0,amount)),gain=after-current,affordable=amount>0&&state.lumen+1e-9>=price;
    const detail=unlocked?`${g.copy}<br><span class="purchase-gain">Actuel ${format(current,true)}/s → Après ${format(after,true)}/s <b>(gain +${format(gain,true)}/s)</b></span><br><span class="purchase-status">${affordable?'Achat disponible':`Encore ${formatAmount(missing(price,state.lumen))} lueurs`}</span>`:`Découverte à ${formatAmount(g.unlock,true)} lueurs`;
    return `<article class="generator-card ${unlocked?'':'locked'}"><div class="gen-icon">${unlocked?g.icon:'·'}</div><div class="gen-copy"><h3>${unlocked?g.name:'Espèce inconnue'} <span class="gen-count">${unlocked?owned:''}</span></h3><p>${detail}</p></div><button class="gen-buy" data-buy="${g.id}" ${!unlocked||!affordable?'disabled':''}>${amount>0?`+${amount}`:'Max'}<small>${formatAmount(price,true)} lueurs</small></button></article>`;
  }).join('');$$('[data-buy]').forEach(button=>button.onclick=()=>buyGenerator(button.dataset.buy));renderIndustry();
}
function renderIndustry(){
  const era=getEra();if(!era){$('#era-tools').innerHTML='';return}
  const headings={1:['ÈRE II · SYMBIOSE','Ateliers de la colonie','Des outils dédiés cultivent intuition et vitalité, même pendant votre absence.'],2:['ÈRE III · MARÉES','Routes de l’archipel','Les territoires et les balises recueillent des marées. Les voiliers les transforment en essor durable.'],3:['ÈRE IV · HARMONIE','Chant de l’océan','Les chœurs créent de l’harmonie. Composez des accords pour amplifier votre monde avant sa renaissance.']};
  const currencyName={lumen:'lueurs',tides:'marées',harmony:'points d’harmonie'},outputName={insight:'intuition',vitality:'vitalité',tides:'marées',harmony:'points d’harmonie'};
  $('#era-tools').innerHTML=[1,2,3].filter(stage=>era>=stage).map(stage=>{const [label,title,copy]=headings[stage];const cards=ERA_TOOLS.filter(tool=>tool.era===stage).map(tool=>{
    const count=state.industry[tool.id],price=toolCost(tool),affordable=state[tool.currency]+1e-9>=price;
    const effect=tool.output?`+${format(tool.rate,true)} ${outputName[tool.output]}/s par outil · ces outils : ${format(count*tool.rate,true)}/s`:`+${Math.round(tool.bonus*100)} points de bonus · actuel +${Math.round(count*tool.bonus*100)}%`;
    return `<article class="industry-tool"><div class="tool-icon">${tool.icon}</div><div class="tool-copy"><strong>${tool.name} <span>×${count}</span></strong><small>${tool.copy}</small><small class="tool-effect">${effect}</small><small class="purchase-status">${affordable?'Prêt à construire':`Encore ${formatAmount(missing(price,state[tool.currency]))} ${currencyName[tool.currency]}`}</small></div><button data-tool="${tool.id}" ${affordable?'':'disabled'}>+1<small>${formatAmount(price,true)} ${currencyName[tool.currency]}</small></button></article>`;
  }).join('');return `<section class="industry-section"><span class="eyebrow">${label}</span><h3>${title}</h3><p>${copy}</p><div class="industry-list">${cards}</div></section>`}).join('');
  $$('[data-tool]').forEach(button=>button.onclick=()=>buyTool(button.dataset.tool));
}
function setAllocation(key,value){allocationEditingUntil=performance.now()+1500;const others=Object.keys(state.allocation).filter(k=>k!==key),rest=100-value,sum=state.allocation[others[0]]+state.allocation[others[1]];state.allocation[key]=value;if(!sum){state.allocation[others[0]]=rest;state.allocation[others[1]]=0}else{state.allocation[others[0]]=Math.round(rest*state.allocation[others[0]]/sum);state.allocation[others[1]]=rest-state.allocation[others[0]]}$$('[data-allocation]').forEach(input=>{const id=input.dataset.allocation;input.value=state.allocation[id];input.parentElement.querySelector('b').textContent=`${state.allocation[id]}%`})}
function buyNode(id){const n=NODES.find(x=>x.id===id);if(!n||state.nodes.includes(id)||state.insight<n.cost)return;state.insight-=n.cost;state.nodes.push(id);toast(`${n.name} relié`);save();render(true)}
function refreshReef(){const panel=$('#reef-content');const values=panel.querySelectorAll('.resource-pair strong');if(values.length===2){values[0].textContent=format(state.insight,true);values[1].textContent=format(state.vitality,true)}NODES.forEach((node,index)=>{const button=panel.querySelector(`[data-node="${node.id}"]`);if(button)button.disabled=state.nodes.includes(node.id)||(index>0&&!state.nodes.includes(NODES[index-1].id))||state.insight<node.cost});const locked=panel.querySelector('.inline-lock span');if(locked)locked.textContent=`${format(Math.max(0,1e9-state.runLifetime))} lueurs avant son éveil`}
function renderReef(){const era=getEra(),key=`${era}|${state.nodes.join(',')}`;if($('#reef-content').dataset.renderKey===key){refreshReef();return}$('#reef-content').dataset.renderKey=key;if(!era){$('#reef-content').className='locked-panel';$('#reef-content').innerHTML=`<div class="big-lock">◇</div><h3>Un monde cherche son équilibre</h3><p>Produisez ${format(25000)} lueurs et conquérez deux territoires pour orienter les courants.</p>`;return}$('#reef-content').className='';const rows=[['light','Photosynthèse','Amplifie la production de lueur'],['insight','Exploration','Crée de l’intuition pour muter'],['vitality','Symbiose','La vitalité amplifie progressivement tout le récif']].map(([id,name,copy])=>`<label class="allocation-row"><span><strong>${name}</strong><small>${copy}</small></span><b>${state.allocation[id]}%</b><input type="range" min="0" max="100" value="${state.allocation[id]}" data-allocation="${id}"></label>`).join('');const network=era>=2?`<article class="panel-card"><span class="eyebrow">RÉSEAU DU RÉCIF</span><h3>Relier les grands courants</h3><p>Chaque nœud transforme durablement la production.</p><div class="node-grid">${NODES.map((n,i)=>{const bought=state.nodes.includes(n.id),available=!i||state.nodes.includes(NODES[i-1].id);return`<button class="reef-node ${bought?'bought':''}" data-node="${n.id}" ${bought||!available||state.insight<n.cost?'disabled':''}><i>${n.icon}</i><strong>${n.name}</strong><small>${bought?n.copy:`${n.cost} intuition`}</small></button>`}).join('')}</div></article>`:`<article class="locked-panel inline-lock"><strong>Le grand récif dort encore</strong><span>${format(Math.max(0,1e9-state.runLifetime))} lueurs avant son éveil</span></article>`;$('#reef-content').innerHTML=`<article class="panel-card"><div class="resource-pair"><span><small>Intuition</small><strong>${format(state.insight,true)}</strong></span><span><small>Vitalité</small><strong>${format(state.vitality,true)}</strong></span></div><h3>Orienter les courants</h3><p>La somme reste égale à 100%. Les autres courants s’adaptent.</p>${rows}</article>${network}`;$$('[data-allocation]').forEach(i=>{i.onpointerdown=()=>{allocationDragging=true};i.oninput=()=>setAllocation(i.dataset.allocation,Number(i.value));i.onchange=()=>{allocationDragging=false;save()};i.onpointercancel=()=>{allocationDragging=false;save()}});$$('[data-node]').forEach(b=>b.onclick=()=>buyNode(b.dataset.node))}
function buyMutation(id){const m=MUTATIONS.find(x=>x.id===id);if(!m||state.mutations.includes(id)||getEra()<m.era||state.insight<m.cost)return;state.insight-=m.cost;state.mutations.push(id);toast(`${m.name} acquise`);save();render(true)}
function buyMemoryUpgrade(id){const upgrade=MEMORY_UPGRADES.find(item=>item.id===id);if(!upgrade||state.memoryUpgrades.includes(id)||state.memories<upgrade.cost)return;state.memories-=upgrade.cost;state.memoryUpgrades.push(id);toast(`${upgrade.name} inscrite dans la mémoire`);save();render(true)}
function openAction({title,copy,mode='confirm',value='',confirmText='Confirmer'}){const dialog=$('#action-dialog'),input=$('#action-input'),confirmButton=$('#action-confirm'),copyButton=$('#action-copy-button');dialog.classList.toggle('exporting',mode==='export');dialog.querySelector('[value="cancel"]').textContent=mode==='export'?'Fermer':'Annuler';if($('#settings-dialog').open)$('#settings-dialog').close();$('#action-title').textContent=title;$('#action-copy').textContent=copy;input.hidden=mode==='confirm';input.readOnly=mode==='export';input.value=value;copyButton.hidden=mode!=='export';confirmButton.hidden=mode==='export';confirmButton.textContent=confirmText;dialog.returnValue='cancel';dialog.showModal();if(mode==='import')input.focus();return new Promise(resolve=>dialog.addEventListener('close',()=>resolve({confirmed:dialog.returnValue==='confirm',value:input.value}),{once:true}))}
async function prestige(){const gain=Math.floor(Math.sqrt(state.runLifetime/1e12));if(gain<1||getEra()<3)return;const choice=await openAction({title:'Faire renaître l’océan ?',copy:`Ce monde se dissoudra. Vous gagnerez ${gain} Perle${gain>1?'s':''} de mémoire permanente.`,confirmText:'Renaître'});if(!choice.confirmed)return;const keep={memories:state.memories+gain,prestigeCount:state.prestigeCount+1,allTimeLumen:state.allTimeLumen,settings:state.settings,stats:state.stats,memoryUpgrades:state.memoryUpgrades,mutations:state.mutations.filter(id=>id==='cosmic')};state={...freshState(),...keep};if(state.memoryUpgrades.includes('seed'))state.generators.firefly=10;knownEra=0;save();switchTab('source');toast('Un nouvel océan s’éveille');render(true)}
function renderEvolution(){const era=getEra(),gain=Math.floor(Math.sqrt(state.runLifetime/1e12));const mutations=MUTATIONS.map(m=>{const bought=state.mutations.includes(m.id),available=era>=m.era;return`<button class="mutation-card ${bought?'bought':''}" data-mutation="${m.id}" ${bought||!available||state.insight<m.cost?'disabled':''}><span>${bought?'✓':'✦'}</span><div><strong>${m.name}</strong><small>${available?m.copy:`Disponible à l’ère ${m.era+1}`}</small></div><b>${bought?'Acquise':`${m.cost} ◇`}</b></button>`}).join('');const memoryPanel=state.prestigeCount?`<article class="panel-card memory-card"><span class="eyebrow">PERLES PERMANENTES</span><h3>Mémoire de l’océan</h3><p>Ces lois survivent à chaque renaissance.</p><div class="mutation-list">${MEMORY_UPGRADES.map(upgrade=>{const bought=state.memoryUpgrades.includes(upgrade.id);return`<button class="mutation-card ${bought?'bought':''}" data-memory="${upgrade.id}" ${bought||state.memories<upgrade.cost?'disabled':''}><span>${bought?'✓':'◇'}</span><div><strong>${upgrade.name}</strong><small>${upgrade.copy}</small></div><b>${bought?'Acquise':`${upgrade.cost} ◇`}</b></button>`}).join('')}</div></article>`:'';const install=!matchMedia('(display-mode: standalone)').matches&&!navigator.standalone&&state.totalTaps>20?`<article class="panel-card install-card"><span>＋</span><div><h3>Emportez Nacre</h3><p>Sur iPhone : Partager, puis « Sur l’écran d’accueil ».</p></div></article>`:'';const gate=state.runLifetime>=1e12&&state.territories.length<6?`Conquérez encore ${6-state.territories.length} territoire${6-state.territories.length>1?'s':''} pour unifier l’océan.`:state.runLifetime>=1e12&&state.nodes.length<NODES.length?`Reliez encore ${NODES.length-state.nodes.length} courant${NODES.length-state.nodes.length>1?'s':''} du récif pour éveiller la planète.`:`La planète doit produire encore ${format(Math.max(0,1e12-state.runLifetime))} lueurs avant de muer.`;$('#evolution-content').innerHTML=`${install}<article class="panel-card"><div class="resource-pair"><span><small>Perles de mémoire</small><strong>${format(state.memories)}</strong></span><span><small>Renaissances</small><strong>${state.prestigeCount}</strong></span></div><h3>Mutations</h3><p>L’intuition transforme les lois de votre océan.</p><div class="mutation-list">${mutations}</div></article>${memoryPanel}<article class="panel-card prestige-card"><span class="eyebrow">RENAISSANCE</span><h3>Mue planétaire</h3><p>${era>=3?`Dissoudre ce monde pour obtenir <strong>${gain} ${gain>1?'Perles':'Perle'} de mémoire</strong>.`:gate}</p><button class="primary-wide" id="prestige-button" ${gain<1||era<3?'disabled':''}>Renaître avec ${gain} ◇</button></article><article class="panel-card"><h3>Trace de votre monde</h3><div class="stat-grid"><div class="stat"><strong>${format(state.allTimeLumen)}</strong><small>Lueurs créées</small></div><div class="stat"><strong>${format(state.stats.highestRate)}</strong><small>Record /s</small></div><div class="stat"><strong>${format(state.totalTaps)}</strong><small>Pulsations</small></div><div class="stat"><strong>${format(state.stats.offlineEarned)}</strong><small>Gains hors ligne</small></div></div></article>`;$$('[data-mutation]').forEach(b=>b.onclick=()=>buyMutation(b.dataset.mutation));$$('[data-memory]').forEach(b=>b.onclick=()=>buyMemoryUpgrade(b.dataset.memory));$('#prestige-button').onclick=prestige}

function render(force=false){
  const eraIndex=getEra(),era=ERAS[eraIndex],r=rate();
  document.body.dataset.era=String(eraIndex);
  $('#lumen-display').textContent=state.lumen<1e7?formatAmount(state.lumen):format(state.lumen,true);
  const precise=$('#balance-exact');precise.hidden=state.lumen<1e7;if(!precise.hidden&&(force||!precise.textContent||performance.now()-Number(precise.dataset.updatedAt||0)>1000)){precise.textContent=`Solde ${state.lumen<1e15?'exact':'estimé'} : ${formatAmount(state.lumen)} lueurs`;precise.dataset.updatedAt=String(performance.now())}
  $('#rate-display').textContent=`${format(r,true)} / seconde`;
  const extras=$('#secondary-resources');extras.hidden=eraIndex===0;
  if(eraIndex){const resources=[['insight','Intuition'],['vitality','Vitalité'],...(eraIndex>=2?[['tides','Marées']]:[]),...(eraIndex>=3?[['harmony','Harmonie']]:[])];if(extras.dataset.era!==String(eraIndex)){extras.innerHTML=resources.map(([key,name])=>`<span><small>${name}</small><strong data-resource="${key}"></strong></span>`).join('');extras.dataset.era=String(eraIndex)}resources.forEach(([key])=>{extras.querySelector(`[data-resource="${key}"]`).textContent=state[key]<1?format(state[key],true):formatAmount(state[key])})}
  $('#era-label').textContent=`ÈRE ${['I','II','III','IV'][eraIndex]} · ${era.name.toUpperCase()}`;
  const progress=eraIndex===3?Math.min(100,Math.log10(Math.max(1,state.runLifetime/era.start))*25):Math.min(100,(state.runLifetime-era.start)/(era.end-era.start)*100);
  $('#era-progress').style.width=`${Math.max(0,progress)}%`;
  const needed=[2,4,6,6][eraIndex],territoryGate=state.runLifetime>=era.end&&state.territories.length<needed,reefGate=eraIndex===2&&state.runLifetime>=era.end&&state.nodes.length<NODES.length;
  $('#next-label').textContent=territoryGate?'Conquérir les territoires':reefGate?'Relier tous les grands courants':era.next;
  const remaining=Math.max(0,era.end-state.runLifetime);$('#next-value').textContent=territoryGate?`${state.territories.length} / ${needed}`:reefGate?`${state.nodes.length} / ${NODES.length}`:remaining<1e9?formatAmount(remaining,true):format(remaining,true);
  $('#tap-value').textContent=`+${format(tapYield(),true)}`;
  tapTimes=tapTimes.filter(t=>Date.now()-t<10000);
  const active=Date.now()<state.resonanceUntil,resProgress=active?Math.max(0,(state.resonanceUntil-Date.now())/(state.mutations.includes('dream')?30000:15000)*100):Math.min(100,tapTimes.length/(state.memoryUpgrades.includes('rhythm')?15:20)*100);
  $('#resonance-label').textContent=active?`Résonance ×3 · ${Math.ceil((state.resonanceUntil-Date.now())/1000)}s`:`Résonance ${Math.floor(resProgress)}%`;
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
  if(refreshPanels){if($('#view-life').classList.contains('active'))renderGenerators();if($('#view-reef').classList.contains('active')){renderConquest();if(!allocationDragging&&performance.now()>allocationEditingUntil)renderReef()}if($('#view-evolution').classList.contains('active'))renderEvolution();lastPanelRender=performance.now()}
}
function switchTab(tab){$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.view').forEach(v=>{const on=v.dataset.view===tab;v.hidden=!on;v.classList.toggle('active',on)});if(tab==='life')renderGenerators();if(tab==='reef'){renderConquest();renderReef();}if(tab==='evolution')renderEvolution();scrollTo({top:0,behavior:state.settings.motion?'smooth':'auto'})}
function resumeOffline(){
  const seconds=Math.max(0,Math.min(state.memoryUpgrades.includes('tide_memory')?57600:28800,(Date.now()-Number(state.savedAt||Date.now()))/1000));if(seconds<30)return;
  const efficiency=Math.min(.95,(state.mutations.includes('tide')?.85:.65)+(state.memoryUpgrades.includes('tide_memory')?.15:0)),work=industryRates(),gain=rate()*seconds*efficiency;
  let insightGain=0,vitalityGain=0;
  if(getEra()>=1){const root=Math.sqrt(baseRate())*(state.memoryUpgrades.includes('deep_memory')?1.5:1);insightGain=(root*state.allocation.insight/100*.025+work.insight)*seconds*efficiency;vitalityGain=(root*state.allocation.vitality/100*.012+work.vitality)*seconds*efficiency}
  const tideGain=work.tides*seconds*efficiency,harmonyGain=work.harmony*seconds*efficiency;if(gain<=0&&insightGain<=0&&vitalityGain<=0&&tideGain<=0&&harmonyGain<=0)return;
  addLumen(gain);state.insight+=insightGain;state.vitality+=vitalityGain;state.tides+=tideGain;state.harmony+=harmonyGain;state.stats.offlineEarned+=gain;
  const h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),extras=[['intuition',insightGain],['vitalité',vitalityGain],['marées',tideGain],['harmonie',harmonyGain]].filter(([,value])=>value>0).map(([name,value])=>`${format(value,true)} ${name}`).join(', ');
  $('#offline-copy').innerHTML=`Pendant ${h?`${h} h `:''}${m} min, votre monde a recueilli <strong>${format(gain)} lueurs</strong> à ${Math.round(efficiency*100)}% d’efficacité.${extras?` Vous avez aussi gagné ${extras}.`:''}`;
  if(!$('#offline-dialog').open)$('#offline-dialog').showModal();save();render(true);
}
function exportSave(){save();const text=btoa(unescape(encodeURIComponent(JSON.stringify(state))));openAction({title:'Exporter la sauvegarde',copy:'Copiez ce code et conservez-le pour retrouver votre océan sur un autre appareil.',mode:'export',value:text})}
async function importSave(){const answer=await openAction({title:'Importer une sauvegarde',copy:'Collez ici un code de sauvegarde Nacre.',mode:'import',confirmText:'Restaurer'});if(!answer.confirmed||!answer.value.trim())return;try{state=sanitise(JSON.parse(decodeURIComponent(escape(atob(answer.value.trim())))));knownEra=getEra();save();render(true);toast('Sauvegarde restaurée')}catch{toast('Cette sauvegarde est illisible')}}
function loop(now){const delta=Math.min(1,Math.max(0,(now-lastFrame)/1000));lastFrame=now;if(!document.hidden){economy(delta);if(now-lastRender>180){render();lastRender=now}if(Date.now()-lastSave>10000)save()}requestAnimationFrame(loop)}

$('#pulse-button').onpointerdown=pulse;
$('#focus-action').onclick=()=>buyGenerator($('#focus-action').dataset.generator,1);
$('#frontier-action').onclick=()=>switchTab('reef');
$$('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));
$$('[data-buy-mode]').forEach(b=>b.onclick=()=>{state.buyMode=b.dataset.buyMode==='max'?'max':Number(b.dataset.buyMode);$$('[data-buy-mode]').forEach(x=>x.classList.toggle('active',x===b));renderGenerators()});
$('#settings-button').onclick=()=>$('#settings-dialog').showModal();
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
