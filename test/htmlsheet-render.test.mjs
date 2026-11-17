import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import { HTML_SHEET_PARTIALS } from '../scripts/htmlsheet/templates.js';
import { renderSheet } from '../scripts/htmlsheet/render-sheet.js';
import { buildActorSnapshot } from '../scripts/shared/actor-snapshot.js';
import { fatActor, mundaneActor, localize } from './actor-fixtures.mjs';
import { THEMES } from '../scripts/config/print.js';
import { plainText } from '../scripts/shared/locale.js';
import { buildChromeLabels } from '../scripts/htmlsheet/labels.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fileFor(modulePath) {
  return path.join(root, modulePath.replace(/^modules\/dsa5-charexv2\//, ''));
}

for (const [alias, modulePath] of Object.entries(HTML_SHEET_PARTIALS)) {
  Handlebars.registerPartial(alias, fs.readFileSync(fileFor(modulePath), 'utf8'));
}

function render(alias, data) {
  const src = fs.readFileSync(fileFor(HTML_SHEET_PARTIALS[alias]), 'utf8');
  return Handlebars.compile(src)(data);
}

const fat = buildActorSnapshot(fatActor(), 'en', { localize });
const mundane = buildActorSnapshot(mundaneActor(), 'en', { localize });
const html = await renderSheet(fat, THEMES.TABLE, { localize, render });
const printHtml = await renderSheet(fat, THEMES.PRINT, { localize, render });
const mundaneHtml = await renderSheet(mundane, THEMES.TABLE, { localize, render });

assert(html.includes('id="dsa5-htmlsheet"'));
assert(html.includes('data-theme="table"'));
assert(printHtml.includes('data-theme="print"'));
assert(html.includes('Alrik'));
assert(html.includes('Flying'));
assert(html.includes('COU'));
assert(html.includes('Longsword'));
assert(html.includes('Spell 45'));
assert(html.includes('Item 80'));
assert(!html.includes('Born in Gareth'));
const withBioHtml = await renderSheet(
  buildActorSnapshot(fatActor(), 'en', { localize, includeBiography: true }),
  THEMES.TABLE,
  { localize, render },
);
assert(withBioHtml.includes('Born in Gareth'));
assert((html.match(/class="sheet-page"/g) || []).length >= 10);
assert(html.includes('data-page="spells"'));
assert(html.includes('data-page="notes"'));
assert(mundaneHtml.includes('data-page="inventory"'));
assert(!mundaneHtml.includes('data-page="spells"'));
assert(!mundaneHtml.includes('data-page="liturgy"'));
assert(!mundaneHtml.includes('data-page="notes"'));
assert(html.includes('dsa5-htmlsheet'));
assert(html.includes('sheet-page-bg-img'));
assert(html.includes('attr-lily'));
assert(!html.includes('attr-strip'));
assert(html.includes('data-pdf-field="personal.name"'));
assert(html.includes('data-pdf-field="attr.mu"'));
assert(!html.includes('data-pdf-field="cond.'), 'conditions are not part of the exported sheet');
assert(!html.includes('data-pdf-field="magic.tradition"'), 'redundant magic metadata row is omitted');
assert(!html.includes('data-pdf-field="magic.guidevalue"'));
assert(!html.includes('data-pdf-field="magic.ae"'), 'astral energy already appears on personal page');
for (const key of ['mov', 'lp', 'dodge', 'ini', 'spi', 'tou']) {
  assert(!html.includes(`data-pdf-field="combat.${key}"`), 'redundant combat summary is omitted');
}
const personalPage = html.split('data-page="personal"')[1].split('</section>')[0];
const skillsPage = html.split('data-page="skills"')[1].split('</section>')[0];
assert(personalPage.includes('data-pdf-field="skills.languages"'), 'languages belong on the personal page');
assert(personalPage.includes('data-pdf-field="skills.scripts"'), 'scripts belong on the personal page');
assert(!skillsPage.includes('data-pdf-field="skills.languages"'));
assert(!skillsPage.includes('data-pdf-field="skills.scripts"'));
assert(html.includes('Hair color'));
assert(!html.includes('cond-grid'));
assert(html.includes('data-pdf-field="traits.generalAbilities"'));
assert(html.includes('trait-text'));
assert(html.includes('data-pdf-field="derived.tou">2<'));
assert(!html.includes('data-pdf-field="derived.tou">1 / 2<'));
assert(html.includes('data-pdf-field="inventory.weight"'));
assert(html.includes('data-pdf-field="inventory.carry"'));
assert(html.includes('data-split-prose'));
assert(html.includes('col-check">Check</th>'));
assert(html.includes('>SR</th>'));
assert(html.includes('sheet-zierleiste'));
assert(html.includes('class="spell-effect"'));
assert(html.includes('colspan="7"'));
assert(!html.includes('col-effect'));
assert(!html.includes('data-pdf-field="item.0.location"'));
assert(!html.includes('data-pdf-field="item.0.price"'), 'no price column when prices are unavailable');
const pricedActor = fatActor();
pricedActor.items.find(item => item.type === 'equipment').system.price = { value: 1.25 };
const pricedHtml = await renderSheet(buildActorSnapshot(pricedActor, 'en', { localize }), THEMES.TABLE, { render });
assert(pricedHtml.includes('data-pdf-field="item.0.price"'), 'available unit prices are exported as form fields');
assert(pricedHtml.includes('data-pdf-field="inventory.value"'), 'quantity-weighted valuation is exported');
assert.strictEqual(plainText('Leit&shy;eigenschaft'), 'Leiteigenschaft');
assert.strictEqual(plainText('GE&#47;KK'), 'GE/KK');
assert.strictEqual(plainText('A&amp;shy;B'), 'AB');
globalThis._loc = (key) => (key === 'guidevalue_small' ? 'Leit&shy;eigenschaft' : key);
assert.strictEqual(buildChromeLabels().attr, 'Leiteigenschaft');
delete globalThis._loc;

console.log('htmlsheet-render.test.mjs passed');
