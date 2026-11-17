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
console.log('html-data-regression.test.mjs passed');
