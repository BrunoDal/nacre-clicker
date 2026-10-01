const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const eras = fs.readFileSync(path.join(__dirname, '..', 'eras.js'), 'utf8');
const game = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const logic = game.slice(0, game.indexOf("$('#pulse-button').onpointerdown"));

function session() {
  const elements = new Map();
  const element = (selector) => {
    if (!elements.has(selector)) elements.set(selector, {
      textContent: '', hidden: false, dataset: {}, open: false, shown: false,
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      replaceChildren(...children) { this.children = children; },
      addEventListener() {}, showModal() { this.open = true; this.shown = true; }, close() { this.open = false; },
      setAttribute() {}, querySelector() { return element(`${selector} child`); },
      querySelectorAll() { return []; },
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    localStorage: { getItem: () => null },
    performance: { now: () => 0 },
    navigator: {},
    document: {
      querySelector: (selector) => selector === 'dialog[open]' ? null : element(selector),
      querySelectorAll: () => [],
      createElement: () => ({ textContent: '' }),
    },
    matchMedia: () => ({ matches: false }),
    scrollTo: () => {},
    setTimeout: () => {},
  });
  vm.runInContext(`${eras}\n${logic}\ntoast=()=>{};render=()=>{};save=()=>{};haptic=()=>{};oceanSound=()=>{};updateOceanSound=()=>{};setOceanSound=()=>{};`, context);
  return (expression) => vm.runInContext(expression, context);
}

test('a failed risky claim loses only the stake and improves the next chance', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=24999');
  assert.equal(run('attemptConquest("risk",()=>.99)'), false);
  assert.equal(run('state.lumen'), 100);
  run('state.runLifetime=1e9');
  assert.equal(run('attemptConquest("risk",()=>.99)'), true);
  assert.equal(run('state.lumen'), 40);
  assert.equal(run('state.territories.length'), 0);
  assert.equal(run('state.scouting.cove'), 1);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .63);
});

test('a risky success claims territory, pays its reward, and unlocks expeditions', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=1e9');
  assert.equal(run('attemptConquest("risk",()=>0)'), true);
  assert.equal(run('state.lumen'), 68);
  assert.equal(run('state.runLifetime'), 1e9);
  assert.equal(run('state.territories[0]'), 'cove');
  assert.equal(run('state.riskyWins'), 1);
  assert.equal(run('attemptConquest("risk",()=>0)'), false);
});

test('scouting is an affordable preparation that improves odds and expected cost', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=1e9');
  assert.equal(run('scoutTerritory()'), true);
  assert.equal(run('state.lumen'), 96);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .63);
  assert.equal(run('expectedRiskCost(TERRITORIES[0]) < expectedRiskCost(TERRITORIES[0],0)'), true);
  assert.equal(run('TERRITORIES[0].cost*.05+expectedRiskCost(TERRITORIES[0]) < expectedRiskCost(TERRITORIES[0],0)'), true);
  assert.equal(run('state.territories.length'), 0);
  run('state.scouting.cove=5');
  assert.equal(run('scoutTerritory()'), false);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .95);
});

test('safe claims cannot fail and old saves remain valid', () => {
  const run = session();
  run('state.lumen=120;state.runLifetime=1e9');
  assert.equal(run('attemptConquest("safe",()=>.99)'), true);
  assert.equal(run('state.lumen'), 40);
  assert.equal(run('state.territories[0]'), 'cove');
  assert.equal(run('sanitise({schemaVersion:2,lumen:10}).territories.length'), 0);
});

test('safe conquest is guaranteed at one territory cost while risk is modestly cheaper in expectation', () => {
  const run = session();
  assert.equal(run('conquestTerms("safe",TERRITORIES[0]).stake'), 80);
  assert.equal(run('conquestTerms("risk",TERRITORIES[0]).stake'), 60);
  assert.equal(run('conquestTerms("risk",TERRITORIES[0]).payout'), 28);
  assert.equal(run('conquestTerms("risk",TERRITORIES[0]).chance'), .55);
  // At base odds with the existing +8 point pity after failures, expected spend
  // over repeated attempts is about 0.91× the zone cost, near the safe 1× cost.
  const expectedCostRatio = run('(()=>{let survival=1,spent=0;for(let misses=0;misses<6;misses++){spent+=survival*60;survival*=1-Math.min(.95,.55+misses*.08)}return (spent-28*(1-survival))/80})()');
  assert.ok(Math.abs(expectedCostRatio-.907)<.002, `expected cost ratio was ${expectedCostRatio}`);
  run('state.runLifetime=1e9;state.lumen=100;renderExploration()');
  assert.match(run("document.querySelector('#conquest-content').innerHTML"), /Préparer l’expédition/);
  assert.doesNotMatch(run("document.querySelector('#conquest-content').innerHTML"), /mise|risque/);
});

test('patrol is free and a failed raid only loses its two-percent stake', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1e9;state.territories=["cove"];state.expeditionZone="cove"');
  assert.equal(run('expeditionTerms("patrol").stake'), 0);
  assert.equal(run('launchExpedition("patrol",()=>.99)'), true);
  assert.equal(run('state.lumen'), 1000);
  assert.equal(run('state.expeditionProgress.cove'), 1);
  run('state.nextExpeditionAt=0');
  assert.equal(run('expeditionTerms("raid").stake'), 20);
  assert.equal(run('launchExpedition("raid",()=>.99)'), true);
  assert.equal(run('state.lumen'), 980);
  assert.equal(run('state.territories.length'), 1);
  assert.equal(run('launchExpedition("raid",()=>0)'), false);
  assert.equal(run('state.nextExpeditionAt>Date.now()'), true);
});

test('territory specialties are exclusive, valid only for claimed zones, and affect their mechanics', () => {
  const run = session();
  run('state.runLifetime=1e9;state.territories=["cove","lagoon","archipelago","trench"]');
  assert.equal(run('chooseTerritoryPath("archipelago","sails")'), true);
  assert.equal(run('industryRates().tides'), .25);
  assert.equal(run('chooseTerritoryPath("archipelago","beacons")'), false);
  assert.equal(run('chooseTerritoryPath("world","unknown")'), false);
  assert.equal(run('chooseTerritoryPath("not-owned","patient")'), false);
  assert.equal(run('chooseTerritoryPath("lagoon","amber")'), true);
  run('state.runLifetime=25000;state.industry.filter=1');
  assert.equal(run('industryRates().insight'), .72);
});

test('expedition destination can be changed only to a claimed territory', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1e9;state.territories=["cove","lagoon"]');
  assert.equal(run('state.expeditionZone'), null);
  assert.equal(run('selectExpeditionZone("cove")'), true);
  assert.equal(run('selectExpeditionZone("archipelago")'), false);
  assert.equal(run('launchExpedition("patrol",()=>.99)'), true);
  assert.equal(run('state.conquestLog.at(-1).zoneId'), 'cove');
});

test('successful raid discovers immediately while a patrol supplies a free first outing', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1e9;state.territories=["cove"];state.expeditionZone="cove"');
  const before = run('globalMult()');
  assert.equal(run('launchExpedition("patrol",()=>.99)'), true);
  assert.equal(run('state.expeditionProgress.cove'), 1);
  assert.equal(run('state.expeditionFinds.includes("cove")'), false);
  run('state.nextExpeditionAt=0');
  assert.equal(run('launchExpedition("raid",()=>0)'), true);
  assert.equal(run('state.expeditionProgress.cove'), 2);
  assert.equal(run('expeditionTerms("raid").payout'), 42);
  assert.equal(run('expeditionTerms("raid").payout-expeditionTerms("raid").stake'), 22);
  assert.equal(run('state.expeditionFinds.filter(id=>id==="cove").length'), 1);
  assert.equal(run('state.lumen'), 1022);
  assert.equal(run('state.runLifetime'), 1e9);
  assert.ok(Math.abs(run('globalMult()') / before - 1.04) < 1e-12);
  run('state.nextExpeditionAt=0');
  assert.equal(run('launchExpedition("patrol",()=>.99)'), false);
  assert.equal(run('state.expeditionProgress.cove'), 2);
  assert.equal(run('state.expeditionFinds.length'), 1);
});

test('allocation effects describe the real light multiplier and intuition/vitality production', () => {
  const run = session();
  run('state.runLifetime=25000;state.territories=["cove","lagoon"];state.generators.firefly=100;state.allocation={light:70,insight:20,vitality:10};state.vitality=99');
  const effects = run('allocationEffects()');
  assert.equal(effects.light, 1.45);
  assert.equal(effects.insight > 0, true);
  assert.equal(effects.vitality > 0, true);
  assert.equal(effects.vitalityBonus, 16);
  run('economy(10)');
  assert.ok(Math.abs(run('state.insight') - effects.insight * 10) < 1e-9);
  assert.ok(Math.abs(run('state.vitality') - 99 - effects.vitality * 10) < 1e-9);
  const beforeLightFocus = run('rate()');
  run('setAllocation("light",100)');
  const lightFocused = run('allocationEffects()');
  assert.ok(lightFocused.light > effects.light);
  assert.ok(Math.abs(run('rate()') / beforeLightFocus - lightFocused.light / effects.light) < 1e-9);
  assert.equal(lightFocused.insight, 0);
  assert.equal(lightFocused.vitality, 0);
});

test('lagoon specialties apply once and slider help separates currents from tools', () => {
  const run = session();
  run('state.runLifetime=25000;state.territories=["cove","lagoon"];state.generators.firefly=100;state.industry.filter=1;state.industry.garden=1;state.territoryPaths.lagoon="amber"');
  const flows = run('allocationEffects()');
  assert.equal(flows.insightFromTools, .72);
  assert.ok(Math.abs(flows.insight - flows.insightFromCurrent - .72) < 1e-9);
  assert.equal(flows.vitalityFromTools, .3);
  run('state.territoryPaths.lagoon="garden"');
  const fertile = run('allocationEffects()');
  assert.equal(fertile.insightFromTools, .6);
  assert.equal(fertile.vitalityFromTools, .36);
  assert.ok(Math.abs(fertile.vitality - fertile.vitalityFromCurrent - .36) < 1e-9);
});

test('crossing an era opens a readable unlock announcement in the mocked dialog', () => {
  const run = session();
  run('state.runLifetime=25000;state.lumen=1;state.territories=["cove","lagoon"];economy(1)');
  assert.equal(run('knownEra'), 1);
  assert.equal(run('pendingEraAnnouncement'), 0);
  assert.equal(run('activeEraDestination'), 'source');
  assert.equal(run("document.querySelector('#era-dialog').shown"), true);
  assert.equal(run("document.querySelector('#era-dialog-title').textContent"), 'Les Colonies s’éveillent');
  assert.equal(run("document.querySelector('#era-dialog-unlocks').children.length"), 3);
});

test('legacy saves migrate safely to specialties, expedition, heritage, and resonance fields', () => {
  const run = session();
  run('legacySave=sanitise({schemaVersion:4,memories:3,prestigeCount:2,memoryUpgrades:["rhythm"],territories:["cove","lagoon"],territoryPaths:{cove:"invalid",world:"patient"},expeditionProgress:{cove:1,lagoon:99},expeditionFinds:["cove","world"],expeditionZone:"world",resonanceCharge:140})');
  assert.equal(run('legacySave.schemaVersion'), 6);
  assert.equal(run('legacySave.territoryPaths.cove'), undefined);
  assert.equal(run('legacySave.expeditionZone'), 'lagoon');
  assert.equal(run('legacySave.expeditionProgress.cove'), 1);
  assert.equal(run('legacySave.expeditionProgress.lagoon'), 2);
  assert.equal(run('legacySave.expeditionFinds.length'), 1);
  assert.equal(run('legacySave.totalMemories'), 5);
  assert.equal(run('legacySave.resonanceCharge'), 100);
});

test('schema v4 preserves the two Pearl cost of Rhythm at zero current balance', () => {
  const run = session();
  run('legacySave=sanitise({schemaVersion:4,memories:0,memoryUpgrades:["rhythm"]})');
  assert.equal(run('legacySave.memories'), 0);
  assert.equal(run('legacySave.totalMemories'), 2);
  assert.equal(run('1+legacySave.totalMemories*.25'), 1.5);
});

test('prestige preserves lifetime heritage and the journal while resetting era choices', async () => {
  const run = session();
  run('openAction=async()=>({confirmed:true});switchTab=()=>{};state.runLifetime=4e12;state.lumen=123;state.allTimeLumen=456;state.memories=2;state.totalMemories=5;state.prestigeCount=3;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.generators.firefly=99;state.industry.filter=4;state.memoryUpgrades=["seed"];state.mutations=["cosmic"];state.songs=[{combo:"lueur-maree-abyme",notes:["lueur","maree","abyme"],createdAt:1}];state.journal=[{text:"Ancien monde",at:1}];state.oceanType="deep";state.nextOceanType="storm";state.routes={cove:"supply"};state.discoveries={cove:"glimmer"};state.symbioses=["spark-garden"];');
  await run('prestige()');
  assert.equal(run('state.memories'), 5);
  assert.equal(run('state.totalMemories'), 8);
  assert.equal(run('state.prestigeCount'), 4);
  assert.equal(run('state.allTimeLumen'), 456);
  assert.equal(run('state.generators.firefly'), 16);
  assert.equal(run('state.industry.filter'), 0);
  assert.equal(run('state.territories.length'), 0);
  assert.equal(run('state.journal.length'), 1);
  assert.equal(run('state.journal[0].text'), 'Ancien monde');
  assert.equal(run('state.oceanType'), 'storm');
  assert.equal(run('state.nextOceanType'), 'storm');
  assert.equal(run('state.songs.length'), 0);
  assert.equal(run('state.routes.cove'), undefined);
  assert.equal(run('state.discoveries.cove'), undefined);
  assert.equal(run('state.symbioses.length'), 0);
  assert.equal(run('globalMult()'), (1 + 8 * .375) * .9);
});

test('buying the first Seed grants six fireflies without reducing the permanent multiplier', () => {
  const run = session();
  run('state.memories=1;state.totalMemories=1');
  const before = run('globalMult()');
  assert.equal(run('buyMemoryUpgrade("seed")'), undefined);
  assert.equal(run('state.generators.firefly'), 6);
  assert.equal(run('state.memories'), 0);
  assert.equal(run('state.totalMemories'), 1);
  assert.equal(run('globalMult()'), before);
});

test('Wayfinder discounts the first 25 generator costs and max-buy remains affordable', () => {
  const run = session();
  run('state.memoryUpgrades=["wayfinder"];const g=GENERATORS[0]');
  assert.equal(run('cost(GENERATORS[0],25)'), run('geometricCost(GENERATORS[0],0,25)*.75'));
  assert.equal(run('cost(GENERATORS[0],26)'), run('geometricCost(GENERATORS[0],0,26)-geometricCost(GENERATORS[0],0,25)*.25'));
  run('state.generators.firefly=20');
  assert.equal(run('cost(GENERATORS[0],10)'), run('geometricCost(GENERATORS[0],20,10)-geometricCost(GENERATORS[0],20,5)*.25'));
  run('state.generators.firefly=0');
  run('state.lumen=cost(GENERATORS[0],7)');
  assert.equal(run('maxBuy(GENERATORS[0])'), 7);
  assert.equal(run('cost(GENERATORS[0],maxBuy(GENERATORS[0]))<=state.lumen'), true);
  assert.equal(run('cost(GENERATORS[0],maxBuy(GENERATORS[0])+1)>state.lumen'), true);
});

test('next milestone previews the multiplier attached to the upcoming threshold', () => {
  const run = session();
  run('state.runLifetime=1e12;state.generators.firefly=9');
  assert.equal(run('nextMilestone().mark'), 10);
  assert.equal(run('nextMilestone().bonus'), 2);
  run('state.generators.firefly=49');
  assert.equal(run('nextMilestone().mark'), 50);
  assert.equal(run('nextMilestone().bonus'), 3);
  run('state.generators.firefly=99');
  assert.equal(run('nextMilestone().mark'), 100);
  assert.equal(run('nextMilestone().bonus'), 5);
});

test('prestige grants two first pearls at one trillion and the next at four trillion', () => {
  const run = session();
  run('state.runLifetime=1e12-1');
  assert.equal(run('prestigeGain()'), 0);
  run('state.runLifetime=1e12');
  assert.equal(run('prestigeGain()'), 2);
  assert.equal(run('nextPearlLifetime()'), 4e12);
  run('state.runLifetime=4e12-1');
  assert.equal(run('prestigeGain()'), 2);
  run('state.runLifetime=4e12');
  assert.equal(run('prestigeGain()'), 3);
  assert.equal(run('nextPearlLifetime()'), 9e12);
});

test('prestige checklist previews production, territories, nodes, and the first song', () => {
  const run = session();
  run('state.runLifetime=1e9;state.territories=TERRITORIES.slice(0,4).map(zone=>zone.id);state.nodes=NODES.slice(0,2).map(node=>node.id);renderEvolution()');
  const card = run("document.querySelector('#evolution-content').innerHTML");
  assert.match(card, /prestige-checklist/);
  assert.match(card, /Lueurs produites/);
  assert.match(card, /Territoires/);
  assert.match(card, /Nœuds du récif/);
  assert.match(card, /Chant de l’océan/);
  assert.match(card, /2 Perles de mémoire/);
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);renderEvolution()');
  const ready = run("document.querySelector('#evolution-content').innerHTML");
  assert.match(ready, /Composez un premier chant/);
  assert.equal((ready.match(/class="ready"/g) || []).length, 3);
  run('state.songs=[{combo:"lueur-maree-abyme",notes:["lueur","maree","abyme"],createdAt:1}];renderEvolution()');
  const complete = run("document.querySelector('#evolution-content').innerHTML");
  assert.match(complete, /Renaître avec 2 Perles/);
  assert.equal((complete.match(/class="ready"/g) || []).length, 4);
});

test('resonance charges with play and time, then activates for the expected duration', () => {
  const run = session();
  run('state.resonanceCharge=80;economy(10)');
  assert.equal(run('state.resonanceCharge'), 92);
  run('state.memoryUpgrades=["rhythm"];economy(5)');
  assert.equal(run('state.resonanceCharge'), 100);
  run('state.resonanceCharge=0;state.resonanceUntil=0;economy(10)');
  assert.equal(run('state.resonanceCharge'), 24);
  run('state.resonanceCharge=0;state.totalTaps=0;pulse()');
  assert.equal(run('state.resonanceCharge'), 10);
  run('state.resonanceCharge=92.5;state.mutations=["dream"];pulse();');
  assert.equal(run('state.resonanceCharge'), 100);
  assert.equal(run('state.resonanceUntil'), 0);
  run('pulse()');
  assert.equal(run('state.resonanceCharge'), 0);
  assert.equal(run('Math.abs((state.resonanceUntil-Date.now())-45000)<100'), true);
});

test('first two eras unlock from production; the sovereign era retains territory and node gates', () => {
  const run = session();
  run('state.runLifetime=24999');
  assert.equal(run('getEra()'), 0);
  run('state.runLifetime=25000');
  assert.equal(run('getEra()'), 1);
  run('state.runLifetime=1e9');
  assert.equal(run('getEra()'), 2);
  run('state.runLifetime=1e12');
  assert.equal(run('getEra()'), 2);
  run('state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id)');
  assert.equal(run('getEra()'), 3);
});

test('colony establishment requires a prepared frontier and spends all three resources atomically', () => {
  const run = session();
  run('state.runLifetime=25000;state.lumen=1e9;state.vitality=1000;state.tides=1000');
  assert.equal(run('prepareColony("cove")'), false);
  run('state.runLifetime=1e9;state.lumen=2e8;state.vitality=80;state.tides=9');
  assert.equal(run('prepareColony("lagoon")'), false);
  assert.equal(run('prepareColony("cove")'), true);
  assert.equal(run('prepareColony("cove")'), false);
  assert.equal(run('state.journal.length'), 1);
  assert.equal(run('establishColony("cove")'), false);
  assert.equal(run('state.lumen'), 2e8);
  assert.equal(run('state.vitality'), 80);
  assert.equal(run('state.tides'), 9);
  run('state.tides=10');
  assert.equal(run('establishColony("cove")'), true);
  assert.equal(run('state.lumen'), 0);
  assert.equal(run('state.vitality'), 0);
  assert.equal(run('state.tides'), 0);
  assert.equal(run('state.territories[0]'), 'cove');
  assert.equal(run('state.expeditionPlans.cove'), undefined);
  assert.equal(run('establishColony("cove")'), false);
  assert.equal(run('prepareColony("archipelago")'), false);
});

test('routes and discoveries validate ownership, uniqueness, and their resource costs', () => {
  const run = session();
  run('state.runLifetime=1e9;state.territories=["cove"];state.tides=19;state.insight=44');
  assert.equal(run('connectRoute("lagoon","supply")'), false);
  assert.equal(run('connectRoute("cove","unknown")'), false);
  assert.equal(run('connectRoute("cove","supply")'), false);
  assert.equal(run('state.tides'), 19);
  run('state.tides=20');
  assert.equal(run('connectRoute("cove","supply")'), true);
  assert.equal(run('state.routes.cove'), 'supply');
  assert.equal(run('state.tides'), 0);
  assert.equal(run('connectRoute("cove","research")'), false);
  assert.equal(run('state.journal.length'), 1);
  run('state.tides=3');
  assert.equal(run('selectDiscovery("lagoon","amber-library")'), false);
  assert.equal(run('selectDiscovery("cove","unknown")'), false);
  assert.equal(run('selectDiscovery("cove","glimmer")'), false);
  assert.equal(run('state.insight'), 44);
  assert.equal(run('state.tides'), 3);
  run('state.insight=46');
  assert.equal(run('selectDiscovery("cove","glimmer")'), true);
  assert.equal(run('state.insight'), 1);
  assert.equal(run('state.tides'), 0);
  assert.equal(run('eraProductionMult()'), 1.08 * 1.025);
  assert.equal(run('selectDiscovery("cove","nursery")'), false);
});

test('ocean, symbiosis, route, and discovery bonuses stay in their own production channels', () => {
  const run = session();
  run('state.runLifetime=1e9;state.generators.firefly=10;state.industry.filter=2;state.allocation={light:70,insight:20,vitality:10};state.oceanType="calm"');
  const calmRate = run('globalMult()');
  const calmInsight = run('allocationEffects().insight');
  run('state.oceanType="storm"');
  assert.ok(Math.abs(run('eraProductionMult()') - .9) < 1e-12);
  assert.ok(Math.abs(run('eraResourceMult("insight")') - 1.3) < 1e-12);
  assert.ok(Math.abs(run('allocationEffects().insight') / calmInsight - 1.3) < 1e-9);
  assert.equal(run('eraResourceMult("tides")'), 1.4);
  assert.equal(run('eraResourceMult("unknown")'), 1);
});

test('three-note songs cost more over time and cannot be composed twice', () => {
  const run = session();
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.harmony=100;state.tides=100');
  assert.equal(run('chooseNote("unknown")'), false);
  assert.equal(run('chooseNote("lueur")'), true);
  assert.equal(run('chooseNote("lueur")'), true);
  assert.equal(run('chooseNote("maree")'), true);
  assert.equal(run('composeSong()'), true);
  assert.equal(run('state.harmony'), 82);
  assert.equal(run('state.tides'), 70);
  assert.equal(run('state.songs.length'), 1);
  assert.equal(run('state.composition.length'), 0);
  run('state.composition=["lueur","lueur","maree"]');
  assert.equal(run('composeSong()'), false);
  assert.equal(run('state.harmony'), 82);
  assert.equal(run('state.tides'), 70);
  run('state.composition=[]');
  assert.equal(run('chooseNote("lueur")'), true);
  assert.equal(run('chooseNote("maree")'), true);
  assert.equal(run('chooseNote("abyme")'), true);
  assert.equal(run('composeSong()'), true);
  assert.equal(run('state.harmony'), 56);
  assert.equal(run('state.tides'), 28);
  assert.equal(run('state.songs.length'), 2);
});

test('legacy and malformed era saves are sanitized while journal history stays bounded', () => {
  const run = session();
  run('legacyEra=sanitise({schemaVersion:5,memories:2,territories:TERRITORIES.map(zone=>zone.id),journal:[{text:"trace",at:2},{text:"<bad>",at:"invalid"},"invalid"],oceanType:"unknown",nextOceanType:"storm",symbioses:["invalid","spark-garden","spark-garden"],routes:{cove:"invalid",world:"chorus"},discoveries:{cove:"invalid",world:"world-song"},composition:["lueur","unknown","maree"],songs:[{combo:"invalid"},{combo:"lueur-maree-abyme",createdAt:3},{combo:"lueur-maree-abyme",createdAt:4}]})');
  assert.equal(run('legacyEra.schemaVersion'), 6);
  assert.equal(run('legacyEra.oceanType'), 'calm');
  assert.equal(run('legacyEra.nextOceanType'), 'storm');
  assert.deepEqual(JSON.parse(run('JSON.stringify(legacyEra.symbioses)')), ['spark-garden']);
  assert.equal(run('legacyEra.routes.cove'), undefined);
  assert.equal(run('legacyEra.routes.world'), 'chorus');
  assert.equal(run('legacyEra.discoveries.cove'), undefined);
  assert.equal(run('legacyEra.discoveries.world'), 'world-song');
  assert.equal(run('legacyEra.composition.length'), 2);
  assert.equal(run('legacyEra.songs.length'), 1);
  assert.equal(run('legacyEra.journal.length'), 2);
  assert.equal(run('legacyEra.journal[1].at'), 0);
  run('state=legacyEra;renderJournal();roundTripEra=sanitise(JSON.parse(JSON.stringify(state)))');
  assert.equal(run('roundTripEra.journal.length'), 2);
  const journalHtml = run('renderJournal()');
  assert.match(journalHtml, /&lt;bad&gt;/);
  assert.doesNotMatch(journalHtml, /<bad>/);
  assert.equal(run('sanitise({journal:Array.from({length:100},(_,i)=>({text:String(i),at:i}))}).journal.length'), 80);
  run('gapEra=sanitise({schemaVersion:5,territories:["world"],routes:{world:"chorus"},discoveries:{world:"world-song"}})');
  assert.equal(run('gapEra.territories.length'), 0);
  assert.equal(run('gapEra.routes.world'), undefined);
  assert.equal(run('gapEra.discoveries.world'), undefined);
});

test('ocean objectives award their type-specific bonus once and reset on renaissance', async () => {
  const run = session();
  run('state.runLifetime=25000;state.symbioses=ERA_SYMBIOSES.map(item=>item.id)');
  assert.equal(run('oceanObjective().title'), 'Tisser trois symbioses');
  const calmBefore = run('eraProductionMult()');
  assert.equal(run('claimOceanObjective()'), true);
  assert.equal(run('state.oceanObjectiveClaimed'), true);
  assert.ok(Math.abs(run('eraProductionMult()') / calmBefore - 1.1) < 1e-12);
  assert.equal(run('claimOceanObjective()'), false);
  assert.equal(run('state.journal.length'), 1);

  run('state.oceanType="storm";state.oceanObjectiveClaimed=false;state.symbioses=[];state.runLifetime=1e9;state.territories=["cove","lagoon","archipelago"];state.routes={cove:"supply",lagoon:"research",archipelago:"research"}');
  assert.equal(run('oceanObjective().title'), 'Relier trois routes');
  assert.equal(run('claimOceanObjective()'), true);
  const stormTideBonus = run('eraResourceMult("tides")');
  assert.ok(Math.abs(stormTideBonus - 1.68) < 1e-12, `storm tides multiplier was ${stormTideBonus}`);
  assert.equal(run('claimOceanObjective()'), false);

  run('state.oceanType="deep";state.oceanObjectiveClaimed=false;state.symbioses=[];state.routes={};state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.songs=[{combo:"lueur-maree-abyme",notes:["lueur","maree","abyme"],createdAt:1},{combo:"lueur-lueur-maree",notes:["lueur","lueur","maree"],createdAt:2}]');
  assert.equal(run('oceanObjective().title'), 'Composer deux chants');
  assert.equal(run('claimOceanObjective()'), true);
  assert.ok(Math.abs(run('eraResourceMult("harmony")') - 1.8) < 1e-12);
  assert.equal(run('claimOceanObjective()'), false);

  run('openAction=async()=>({confirmed:true});switchTab=()=>{};state.runLifetime=4e12;state.memories=0;state.totalMemories=0;state.prestigeCount=0;state.songs=[{combo:"lueur-maree-abyme",notes:["lueur","maree","abyme"],createdAt:1}];state.oceanObjectiveClaimed=true;state.nextOceanType="storm"');
  await run('prestige()');
  assert.equal(run('state.oceanType'), 'storm');
  assert.equal(run('state.oceanObjectiveClaimed'), false);
});

test('composition notes can be removed individually or cleared without spending resources', () => {
  const run = session();
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.harmony=50;state.tides=70');
  assert.equal(run('removeNote(0)'), false);
  assert.equal(run('resetComposition()'), false);
  assert.equal(run('chooseNote("lueur")'), true);
  assert.equal(run('chooseNote("maree")'), true);
  assert.equal(run('chooseNote("abyme")'), true);
  assert.equal(run('removeNote(-1)'), false);
  assert.equal(run('removeNote(3)'), false);
  assert.equal(run('removeNote(1)'), true);
  assert.deepEqual(JSON.parse(run('JSON.stringify(state.composition)')), ['lueur', 'abyme']);
  assert.equal(run('resetComposition()'), true);
  assert.equal(run('state.composition.length'), 0);
  assert.equal(run('state.harmony'), 50);
  assert.equal(run('state.tides'), 70);
  assert.equal(run('resetComposition()'), false);
});

test('the era IV exploration map offers no new colony actions', () => {
  const run = session();
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.expeditionPlans.world=true;renderExploration()');
  const html = run("document.querySelector('#conquest-content').innerHTML");
  assert.doesNotMatch(html, /data-prepare=|data-settle=/);
  assert.equal(run('prepareColony("world")'), false);
  assert.equal(run('establishColony("world")'), false);
});

test('imported upgrades and nodes cannot be duplicated to bypass gates', () => {
  const run = session();
  assert.equal(run('sanitise({nodes:Array(6).fill("shoal")}).nodes.length'), 1);
  assert.equal(run('sanitise({nodes:["current"]}).nodes.length'), 0);
  assert.equal(run('sanitise({memoryUpgrades:["seed","seed"]}).memoryUpgrades.length'), 1);
});

test('purchase amounts stay readable and max never promises an unaffordable purchase', () => {
  const run = session();
  assert.equal(run('formatAmount(1399).replace(/[\u00a0\u202f]/g," ")'), '1 399');
  assert.equal(run('formatAmount(1400).replace(/[\u00a0\u202f]/g," ")'), '1 400');
  assert.equal(run('missing(1400,1399)'), 1);
  run('state.lumen=0');
  assert.equal(run('maxBuy(GENERATORS[0])'), 0);
  run('state.lumen=cost(GENERATORS[0],7)');
  assert.equal(run('maxBuy(GENERATORS[0])'), 7);
  assert.equal(run('cost(GENERATORS[0],maxBuy(GENERATORS[0])+1)>state.lumen'), true);
});

test('mutation cards name intuition as their cost and describe Symbiose output precisely', () => {
  const run = session();
  run('state.runLifetime=25000;state.insight=35;renderMutations()');
  const html = run("document.querySelector('#mutations-content').innerHTML");
  const symbiosis = html.match(/data-mutation="symbiosis"[\s\S]*?<\/button>/)?.[0];
  assert.ok(symbiosis);
  assert.match(symbiosis, /35 intuition/);
  assert.doesNotMatch(symbiosis, /◇/);
  assert.match(symbiosis, /Double les lueurs produites par seconde\./);
  assert.doesNotMatch(html, /Toute la production est doublée/);
});

test('purchase gain includes generator milestones', () => {
  const run = session();
  assert.equal(run('generatorOutput(GENERATORS[0],10)-generatorOutput(GENERATORS[0],9)'), 2.2);
  assert.equal(run('generatorOutput(GENERATORS[0],25)>generatorOutput(GENERATORS[0],24)'), true);
  assert.equal(run('generatorOutput(GENERATORS[0],50)>generatorOutput(GENERATORS[0],49)'), true);
  assert.equal(run('generatorOutput(GENERATORS[0],100)>generatorOutput(GENERATORS[0],99)'), true);
});

test('smart recommendation uses the real marginal gain at the next milestone', () => {
  const run = session();
  run('state.runLifetime=1000;state.generators.firefly=9;state.generators.polyp=1');
  assert.equal(run('recommendation().id'), 'firefly');
  assert.equal(run('generatorOutput(GENERATORS[0],10)-generatorOutput(GENERATORS[0],9)'), 2.2);
});

test('generator cards expose gain, before-after output, milestone, and affordability in a scannable order', () => {
  const run = session();
  run('state.runLifetime=1000;state.lumen=1000;state.generators.firefly=9;renderGenerators()');
  const html = run("document.querySelector('#generator-list').innerHTML");
  assert.match(html, /class="gen-lore"/);
  assert.match(html, /class="purchase-gain"><b>\+2,2 lueurs\/s<\/b>/);
  assert.match(html, /9.*maintenant.*4.*après achat/);
  assert.match(html, /class="milestone-note">Palier 10/);
  assert.match(html, /class="purchase-status">Prêt à accueillir/);
});

test('new era tools produce and spend their resources without blocking older saves', () => {
  const run = session();
  assert.equal(run('sanitise({schemaVersion:3,lumen:100}).industry.filter'), 0);
  assert.equal(run('sanitise({schemaVersion:3,lumen:100}).tides'), 0);
  run('state.runLifetime=1e9;state.lumen=1e9;state.territories=["cove","lagoon","archipelago","trench"]');
  assert.equal(run('buyTool("beacon")'), true);
  assert.equal(run('state.industry.beacon'), 1);
  run('economy(120)');
  assert.equal(run('state.tides'), 84);
  assert.equal(run('buyTool("sail")'), true);
  assert.equal(run('state.tides'), 54);
  assert.equal(run('globalMult()>1'), true);
});

test('ocean era unlocks harmony production and accords', () => {
  const run = session();
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.tides=250;state.harmony=20');
  assert.equal(run('buyTool("choir")'), true);
  assert.equal(run('industryRates().harmony'), .2);
  assert.equal(run('buyTool("accord")'), true);
  assert.equal(run('state.industry.accord'), 1);
  assert.equal(run('freshState().harmony'), 0);
});

test('wait estimates explain when frontiers and late tools become affordable', () => {
  const run = session();
  assert.match(run('affordStatus(100,40,2,"lueurs")'), /Encore 60 lueurs · moins d’1 min/);
  assert.match(run('formatDuration(1334)'), /environ 23 min/);
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.tides=0;renderGenerators()');
  assert.match(run("document.querySelector('#era-tools').innerHTML"), /Chœur abyssal/);
  assert.match(run("document.querySelector('#era-tools').innerHTML"), /Encore 250 marées · environ 14 min/);
});

test('offline progress also restores the new resources', () => {
  const run = session();
  run('document.querySelector=()=>({open:false,showModal(){},set innerHTML(value){}})');
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.industry.beacon=1;state.industry.choir=1;state.savedAt=Date.now()-60000');
  run('resumeOffline()');
  assert.equal(run('state.tides>0'), true);
  assert.equal(run('state.harmony>0'), true);
});
