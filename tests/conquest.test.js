const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const game = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
const logic = game.slice(0, game.indexOf("$('#pulse-button').onpointerdown"));

function session() {
  const context = vm.createContext({
    localStorage: { getItem: () => null },
    performance: { now: () => 0 },
    navigator: {},
    document: {},
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

test('expedition failure keeps claimed territory and starts cooldown', () => {
  const run = session();
  run('state.lumen=1000;state.runLifetime=1000;state.territories=["cove"]');
  assert.equal(run('launchExpedition("raid",()=>.99)'), true);
  assert.equal(run('state.lumen'), 920);
  assert.equal(run('state.territories.length'), 1);
  assert.equal(run('launchExpedition("raid",()=>0)'), false);
  assert.equal(run('state.nextExpeditionAt>Date.now()'), true);
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
