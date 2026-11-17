import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { dsa5char2pdf } from '../scripts/shared/module.js';
import { HTML_SHEET_PARTIALS } from '../scripts/htmlsheet/templates.js';
import { buildChromeLabels } from '../scripts/htmlsheet/labels.js';

const manifest = JSON.parse(await fs.readFile(new URL('../module.json', import.meta.url), 'utf8'));
assert.equal(manifest.id, 'dsa5-charexv2', 'fork needs its own Foundry-compatible module identity');
assert.equal(dsa5char2pdf.ID, manifest.id, 'runtime module lookup must match installed ID');
for (const template of [...Object.values(dsa5char2pdf.TEMPLATES), ...Object.values(HTML_SHEET_PARTIALS)]) {
  assert(template.startsWith('modules/dsa5-charexv2/'), `Template resolves outside fork: ${template}`);
}
const previous = globalThis._loc;
try {
  for (const lang of ['en', 'de']) {
    const dictionary = JSON.parse(await fs.readFile(new URL(`../lang/${lang}.json`, import.meta.url), 'utf8'));
    assert(dictionary[manifest.id]?.exportHtmlsheet, 'new namespace must provide export labels');
    globalThis._loc = key => key.split('.').reduce((value, part) => value?.[part], dictionary) ?? key;
    const labels = buildChromeLabels();
    assert.equal(labels.apTotal, dictionary[manifest.id].ap);
    assert.equal(labels.characterSheet, dictionary[manifest.id].characterSheet);
  }
} finally {
  if (previous === undefined) delete globalThis._loc;
  else globalThis._loc = previous;
}
console.log('module-identity.test.mjs passed');
