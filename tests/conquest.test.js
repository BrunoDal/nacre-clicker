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
