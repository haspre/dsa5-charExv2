import assert from 'node:assert/strict';
import { buildActorSnapshot } from '../scripts/shared/actor-snapshot.js';
import { mundaneActor, localize } from './actor-fixtures.mjs';

const actor = mundaneActor();
actor.items = [
  { id: 'armor', name: 'Armor', type: 'armor', system: { worn: { value: true }, quantity: { value: 1 }, weight: { value: 8 } } },
  { id: 'pack', name: 'Pack', type: 'equipment', system: { quantity: { value: 2 }, weight: { value: 3 } } },
  { id: 'coin', name: 'Silverthaler', type: 'money', system: { quantity: { value: 10 }, weight: { value: 0.01 } } },
];
const original = JSON.stringify(actor);
const snapshot = buildActorSnapshot(actor, 'en', { localize });
assert.equal(snapshot.weightTotal, 14, 'total includes equipped armor and item quantities');
assert.equal(snapshot.inventory.length, 1, 'equipped armor stays in combat tables');
assert.equal(buildActorSnapshot(actor, 'en', { localize, moneyHasWeight: true }).weightTotal, 14.1);
assert.equal(JSON.stringify(actor), original, 'export must not mutate actor data');

actor.system.tradition = { magical: 'Guild Mage', clerical: 'Praios' };
assert.equal(buildActorSnapshot(actor, 'en', { localize }).clerical.tradition, 'Praios');
actor.items.push({ name: 'Tradition of Hesinde', type: 'specialability', system: { isTradition: true, category: { value: 'clerical' } } });
assert.equal(buildActorSnapshot(actor, 'en', { localize }).clerical.tradition, 'Tradition of Hesinde');
actor.system.totalWeight = 12.5;
assert.equal(buildActorSnapshot(actor, 'en', { localize }).weightTotal, 12.5, 'prefer system-prepared total (including container rules)');

const mage = mundaneActor();
mage.items = [
  { name: 'Bindung des Stabes', type: 'specialability', system: { category: { value: 'staff' }, artifact: 'magierstab', step: { value: 1 } } },
  { name: 'Flammenschwert', type: 'specialability', system: { category: { value: 'staff' }, artifact: 'magierstab', step: { value: 2 } } },
  { name: 'Zauberstil', type: 'specialability', system: { category: { value: 'magicalStyle' }, step: { value: 1 } } },
  { name: 'Erweiterte Magie', type: 'specialability', system: { category: { value: 'extMagical' }, step: { value: 2 } } },
];
const mageSnapshot = buildActorSnapshot(mage, 'de', { localize });
assert.deepEqual(mageSnapshot.traditionArtifactAbilities, ['Bindung des Stabes I', 'Flammenschwert II']);
assert.deepEqual(mageSnapshot.magicalAbilities, ['Zauberstil I', 'Erweiterte Magie II']);
assert.equal(mageSnapshot.skip.spells, false, 'abilities must export even without spells or astral energy');
const artifactOnly = buildActorSnapshot({ ...mage, items: mage.items.slice(0, 2) }, 'de', { localize });
assert.equal(artifactOnly.skip.spells, false, 'tradition artifact abilities alone require their export page');

const runner = mundaneActor();
for (const [speed, expected] of [
  [{ initial: 8, modifier: 0, value: 0 }, 8],
  [{ initial: 8, modifier: -2, gearmodifier: 1, value: 99 }, 7],
  [{ initial: 8, modifier: 0, value: 0, max: 10 }, 10],
  [{ initial: 8, modifier: 0, value: 0, max: 0 }, 0],
]) {
  runner.system.status.speed = speed;
  assert.equal(buildActorSnapshot(runner, 'de', { localize }).derived.mov.value, expected,
    'GS uses prepared speed.max or base speed plus modifiers, never the raw speed.value placeholder');
}
console.log('html-data-regression.test.mjs passed');
