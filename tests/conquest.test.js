const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  vm.runInContext(`${logic}\ntoast=()=>{};render=()=>{};save=()=>{};haptic=()=>{};`, context);
  return (expression) => vm.runInContext(expression, context);
}

test('a failed risky claim loses only the stake and improves the next chance', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=100');
  assert.equal(run('attemptConquest("risk",()=>.99)'), true);
  assert.equal(run('state.lumen'), 52);
  assert.equal(run('state.territories.length'), 0);
  assert.equal(run('state.scouting.cove'), 1);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .63);
});

test('a risky success claims territory, pays its reward, and unlocks expeditions', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=100');
  assert.equal(run('attemptConquest("risk",()=>0)'), true);
  assert.equal(run('state.lumen'), 124);
  assert.equal(run('state.territories[0]'), 'cove');
  assert.equal(run('state.riskyWins'), 1);
  assert.equal(run('attemptConquest("risk",()=>0)'), false);
});

test('scouting costs resources, increases odds, and never endangers territory', () => {
  const run = session();
  run('state.lumen=100;state.runLifetime=100');
  assert.equal(run('scoutTerritory()'), true);
  assert.equal(run('state.lumen'), 84);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .63);
  assert.equal(run('state.territories.length'), 0);
  run('state.scouting.cove=5');
  assert.equal(run('scoutTerritory()'), false);
  assert.equal(run('territoryChance(TERRITORIES[0])'), .95);
});

test('safe claims cannot fail and old saves remain valid', () => {
  const run = session();
  run('state.lumen=120;state.runLifetime=120');
  assert.equal(run('attemptConquest("safe",()=>.99)'), true);
  assert.equal(run('state.lumen'), 8);
  assert.equal(run('state.territories[0]'), 'cove');
  assert.equal(run('sanitise({schemaVersion:2,lumen:10}).territories.length'), 0);
});

test('patrol is free and a failed raid only loses its two-percent stake', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1000;state.territories=["cove"];state.expeditionZone="cove"');
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
  run('state.lumen=1000;state.runLifetime=5000;state.territories=["cove","lagoon"]');
  assert.equal(run('state.expeditionZone'), null);
  assert.equal(run('selectExpeditionZone("cove")'), true);
  assert.equal(run('selectExpeditionZone("archipelago")'), false);
  assert.equal(run('launchExpedition("patrol",()=>.99)'), true);
  assert.equal(run('state.conquestLog.at(-1).zoneId'), 'cove');
});

test('successful raid discovers immediately while a patrol supplies a free first outing', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1000;state.territories=["cove"];state.expeditionZone="cove"');
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
  assert.equal(run('globalMult()'), before * 1.04);
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
  assert.equal(run('activeEraDestination'), 'reef');
  assert.equal(run("document.querySelector('#era-dialog').shown"), true);
  assert.equal(run("document.querySelector('#era-dialog-title').textContent"), 'Les Colonies s’éveillent');
  assert.equal(run("document.querySelector('#era-dialog-unlocks').children.length"), 3);
});

test('legacy saves migrate safely to specialties, expedition, heritage, and resonance fields', () => {
  const run = session();
  run('legacySave=sanitise({schemaVersion:4,memories:3,prestigeCount:2,memoryUpgrades:["rhythm"],territories:["cove","lagoon"],territoryPaths:{cove:"invalid",world:"patient"},expeditionProgress:{cove:1,lagoon:99},expeditionFinds:["cove","world"],expeditionZone:"world",resonanceCharge:140})');
  assert.equal(run('legacySave.schemaVersion'), 5);
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

test('prestige preserves lifetime heritage count and scales production from that count', async () => {
  const run = session();
  run('openAction=async()=>({confirmed:true});switchTab=()=>{};state.runLifetime=4e12;state.lumen=123;state.allTimeLumen=456;state.memories=2;state.totalMemories=5;state.prestigeCount=3;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.generators.firefly=99;state.industry.filter=4;state.memoryUpgrades=["seed"];state.mutations=["cosmic"]');
  await run('prestige()');
  assert.equal(run('state.memories'), 4);
  assert.equal(run('state.totalMemories'), 7);
  assert.equal(run('state.prestigeCount'), 4);
  assert.equal(run('state.allTimeLumen'), 456);
  assert.equal(run('state.generators.firefly'), 16);
  assert.equal(run('state.industry.filter'), 0);
  assert.equal(run('state.territories.length'), 0);
  assert.equal(run('globalMult()'), 1 + 7 * .375);
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

test('prestige gains start at one trillion and increase at four trillion', () => {
  const run = session();
  run('state.runLifetime=1e12-1');
  assert.equal(run('prestigeGain()'), 0);
  run('state.runLifetime=1e12');
  assert.equal(run('prestigeGain()'), 1);
  run('state.runLifetime=4e12-1');
  assert.equal(run('prestigeGain()'), 1);
  run('state.runLifetime=4e12');
  assert.equal(run('prestigeGain()'), 2);
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

test('eras require territory gates in addition to production', () => {
  const run = session();
  run('state.runLifetime=1e12');
  assert.equal(run('getEra()'), 0);
  run('state.territories=["cove","lagoon"]');
  assert.equal(run('getEra()'), 1);
  run('state.territories=["cove","lagoon","archipelago","trench"]');
  assert.equal(run('getEra()'), 2);
  run('state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id)');
  assert.equal(run('getEra()'), 3);
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

test('purchase gain includes generator milestones', () => {
  const run = session();
  assert.equal(run('generatorOutput(GENERATORS[0],10)-generatorOutput(GENERATORS[0],9)'), 2.2);
  assert.equal(run('generatorOutput(GENERATORS[0],25)>generatorOutput(GENERATORS[0],24)'), true);
  assert.equal(run('generatorOutput(GENERATORS[0],50)>generatorOutput(GENERATORS[0],49)'), true);
  assert.equal(run('generatorOutput(GENERATORS[0],100)>generatorOutput(GENERATORS[0],99)'), true);
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
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.tides=400;state.harmony=20');
  assert.equal(run('buyTool("choir")'), true);
  assert.equal(run('industryRates().harmony'), .2);
  assert.equal(run('buyTool("accord")'), true);
  assert.equal(run('state.industry.accord'), 1);
  assert.equal(run('freshState().harmony'), 0);
});

test('offline progress also restores the new resources', () => {
  const run = session();
  run('document.querySelector=()=>({open:false,showModal(){},set innerHTML(value){}})');
  run('state.runLifetime=1e12;state.territories=TERRITORIES.map(zone=>zone.id);state.nodes=NODES.map(node=>node.id);state.industry.beacon=1;state.industry.choir=1;state.savedAt=Date.now()-60000');
  run('resumeOffline()');
  assert.equal(run('state.tides>0'), true);
  assert.equal(run('state.harmony>0'), true);
});
