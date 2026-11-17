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

const trader = mundaneActor();
trader.items = [
  { name: 'Verband', type: 'equipment', system: { quantity: { value: 10 }, price: { value: 1.25 }, weight: { value: 0.5 } } },
  { name: 'Gratis', type: 'equipment', system: { quantity: { value: 1 }, price: { value: 0 } } },
  { name: 'Papier', type: 'equipment', system: { quantity: { value: 2 }, price: { value: '0.1' } } },
  { name: 'Unbekannt', type: 'equipment', system: { quantity: { value: 1 } } },
  { name: 'Schwert', type: 'meleeweapon', system: { worn: { value: true }, quantity: { value: 1 }, price: { value: 200 } } },
  { name: 'Silverthaler', type: 'money', system: { quantity: { value: 99 }, price: { value: 1 } } },
];
const valuation = buildActorSnapshot(trader, 'de', { localize, moneyHasWeight: true });
assert.equal(valuation.inventory[0].price, 1.25, 'price is a unit price in silverthalers');
assert.equal(valuation.inventory[0].priceText, '1,25');
assert.equal(valuation.inventory[1].priceText, '0', 'free is different from missing');
assert.equal(valuation.inventory[3].priceText, '—');
assert.equal(valuation.inventoryValue.total, 12.7, 'total multiplies quantities, excludes money and equipment displayed only in combat tables');
assert.equal(valuation.inventoryValue.displayTotal, '12,7');
assert.equal(valuation.inventoryValue.hasPrices, true);
assert.equal(valuation.inventoryValue.complete, false);
assert.equal(valuation.inventoryValue.missingPrices, 1);
assert.equal(buildActorSnapshot(trader, 'en', { localize }).inventory[0].priceText, '1.25');
const noPrices = buildActorSnapshot({ ...trader, items: [{ name: 'Item', type: 'equipment', system: {} }] }, 'de', { localize });
assert.equal(noPrices.inventoryValue.hasPrices, false, 'do not offer a misleading zero valuation when no prices exist');
const fractional = buildActorSnapshot({ ...trader, items: [
  { name: 'Kleinigkeit', type: 'equipment', system: { quantity: { value: 3 }, price: { value: 0.1 } } },
] }, 'de', { localize });
assert.equal(fractional.inventoryValue.total, 0.3, 'currency rounding must not expose floating point noise');

const caster = mundaneActor();
caster.items = [
  { name: 'Schutz', type: 'spell', system: {} },
  { name: 'Ohne Erweiterung', type: 'spell', system: {} },
  { name: 'Schutz', type: 'ritual', system: {} },
  { name: 'Schutz - Verstärkt', type: 'spellextension', system: { source: 'Schutz', category: 'spell', description: { value: '<p>Mehr Wirkung.</p><p>Zwei Zeilen.</p>' }, gmdescription: { value: 'Nicht exportieren' } } },
  { name: 'Ritualerweiterung', type: 'spellextension', system: { source: 'Schutz', category: 'ritual', description: { value: 'Nur für das Ritual.' } } },
  { name: 'Nicht zugeordnet', type: 'spellextension', system: { source: 'Fremder Zauber', category: 'spell', description: { value: 'Nicht zuordnen.' } } },
];
const casting = buildActorSnapshot(caster, 'de', { localize });
assert.deepEqual(casting.spells[0].extensions, [{ name: 'Schutz - Verstärkt', description: 'Mehr Wirkung.\nZwei Zeilen.' }]);
assert.deepEqual(casting.spells[1].extensions, []);
assert.deepEqual(casting.spells[2].extensions, [{ name: 'Ritualerweiterung', description: 'Nur für das Ritual.' }]);

const learner = mundaneActor();
learner.items = [
  ['Zechen', 'body', 9], ['Überreden', 'social', 10], ['Klettern', 'body', 1],
  ['Ätherkunde', 'knowledge', 3], ['Fesseln', 'nature', 2], ['Ölkunde', 'trade', 4],
  ['Alchimie', 'trade', 5], ['Götter & Kulte', 'knowledge', 7], ['Fährtensuchen', 'nature', 6],
  ['Betören', 'social', 11], ['Geographie', 'knowledge', 8], ['Zauberkunde', 'knowledge', 12],
].map(([name, group, value]) => ({ name, type: 'skill', system: { group: { value: group }, talentValue: { value } } }));
const learnerBefore = JSON.stringify(learner);
const talents = buildActorSnapshot(learner, 'de', { localize }).talentGroups;
assert.deepEqual(talents.map(group => group.rows.map(row => row.name)), [
  ['Klettern', 'Zechen'], ['Betören', 'Überreden'], ['Fährtensuchen', 'Fesseln'],
  ['Ätherkunde', 'Geographie', 'Götter & Kulte', 'Zauberkunde'], ['Alchimie', 'Ölkunde'],
], 'talents sort alphabetically within each existing group, using German collation');
assert.equal(talents[0].rows[0].sr, 1, 'values stay attached to their talent when sorting');
assert.equal(JSON.stringify(learner), learnerBefore, 'sorting must not rearrange actor items');
console.log('html-data-regression.test.mjs passed');
