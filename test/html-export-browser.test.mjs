import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
import Handlebars from 'handlebars';
import { HTML_SHEET_PARTIALS } from '../scripts/htmlsheet/templates.js';
import { renderSheet } from '../scripts/htmlsheet/render-sheet.js';
import { buildActorSnapshot } from '../scripts/shared/actor-snapshot.js';
import { fatActor, localize } from './actor-fixtures.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { PDFDocument, PDFName } = require('../lib/pdf-lib.js');
const prefix = '/modules/dsa5-charexv2/';
const moduleLabels = JSON.parse(await fs.readFile(path.join(root, 'lang/en.json'), 'utf8'));
globalThis._loc = key => {
  const moduleValue = key.split('.').reduce((value, part) => value?.[part], moduleLabels);
  if (typeof moduleValue === 'string') return moduleValue;
  const translated = localize(key);
  if (translated !== key) return translated;
  const label = key.split('.').at(-1).replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
};
const templates = {};
for (const [alias, source] of Object.entries(HTML_SHEET_PARTIALS)) {
  const text = await fs.readFile(path.join(root, source.slice(prefix.length - 1)), 'utf8');
  Handlebars.registerPartial(alias, text);
  templates[alias] = Handlebars.compile(text);
}
const actor = fatActor();
actor.img = '';
actor.name = 'Älrik Ж der außergewöhnlich lang benannte Held aus Gareth';
actor.system.details.career.value = 'Gildenmagier und außerordentlicher Bibliothekar der Akademie zu Punin';
actor.system.details.notes.value = '<p>Erster Absatz.</p><p>Zweiter Absatz.<br>Dritte Zeile.</p>';
// Keep every export section, while limiting capture time for the smoke test.
let spells = 0, equipment = 0;
actor.items = actor.items.filter(item => item.type === 'spell' ? ++spells <= 16 : item.type === 'equipment' ? ++equipment <= 4 : true);
const skillTemplate = actor.items.find(item => item.type === 'skill');
actor.items = actor.items.filter(item => item.type !== 'skill');
for (const [group, count] of [['body', 14], ['social', 9], ['nature', 7], ['knowledge', 12], ['trade', 18]]) {
  for (let index = 0; index < count; index++) {
    const item = structuredClone(skillTemplate);
    item.name = index % 2 ? 'Heilkunde Krankheiten und außergewöhnlich lange Talentbezeichnung' : 'Reiten';
    item.system.group.value = group;
    item.system.burden.value = ['ja', 'evtl', 'nein'][index % 3];
    actor.items.push(item);
  }
}
actor.items.push({ name: 'Flammenschwert', type: 'specialability', system: { category: { value: 'staff' }, artifact: 'magierstab', step: { value: 2 } } });
for (const spell of actor.items.filter(item => item.type === 'spell')) {
  spell.system.effect.value = 'Lange Zauberwirkung mit mehreren Zeilen. '.repeat(12);
}
const snapshot = buildActorSnapshot(actor, 'en', { localize });

const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/') {
      res.setHeader('Content-Type', 'text/html');
      res.end(`<link rel="stylesheet" href="${prefix}styles/htmlsheet.css"><link rel="stylesheet" href="${prefix}styles/htmlsheet-print.css"><script src="${prefix}lib/pdf-lib.js"></script>`);
      return;
    }
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(prefix.length);
    const file = path.resolve(root, relative);
    if (!req.url.startsWith(prefix) || !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  for (const theme of ['table', 'print']) {
    const html = await renderSheet(snapshot, theme, { render: (alias, data) => templates[alias](data) });
    const layout = await page.evaluate(async ({ html, prefix }) => {
      const host = document.createElement('div');
      host.id = 'dsa5-htmlsheet-host'; host.innerHTML = html; document.body.appendChild(host);
      try {
        await document.fonts.ready;
        await Promise.all([...host.querySelectorAll('img')].map(img => img.decode().catch(() => {})));
        const { paginateSheet } = await import(`${prefix}scripts/htmlsheet/paginate.js`);
        paginateSheet(host.querySelector('#dsa5-htmlsheet'));
        const energy = [...host.querySelectorAll('[data-pdf-field="derived.lp"], [data-pdf-field="derived.ae"], [data-pdf-field="derived.kp"], [data-pdf-field="magic.ae"]')];
        const rows = [...host.querySelectorAll('.talent-group tbody tr')];
        const enc = [...host.querySelectorAll('.talent-group tbody .col-enc')];
        const abilities = host.querySelector('[data-pdf-field="magic.artifactAbilities"]');
        const magical = host.querySelector('[data-pdf-field="magic.abilities"]');
        const fitsPage = element => {
          if (!element) return false;
          const r = element.getBoundingClientRect();
          const body = element.closest('.sheet-page').querySelector('.sheet-page-body');
          return r.bottom <= body.getBoundingClientRect().bottom - 4 && r.height > 0;
        };
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        return {
          energyHeights: energy.map(el => el.getBoundingClientRect().height),
          rowHeights: rows.map(el => el.getBoundingClientRect().height),
          enc: enc.map(el => {
            const style = getComputedStyle(el); ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            return { text: el.innerText, spare: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - ctx.measureText(el.innerText).width };
          }),
          artifactText: abilities?.innerText,
          artifactsVisible: fitsPage(abilities), magicalVisible: fitsPage(magical),
          skillsVisible: rows.every(fitsPage),
          skillFooterVisible: [...host.querySelectorAll('[data-pdf-field="skills.languages"], [data-pdf-field="skills.scripts"]')].every(fitsPage),
          skillFooterBounds: [...host.querySelectorAll('[data-pdf-field="skills.languages"], [data-pdf-field="skills.scripts"]')].map(el => ({ name: el.dataset.pdfField, bottom: el.getBoundingClientRect().bottom, bodyBottom: el.closest('.sheet-page-body').getBoundingClientRect().bottom, scroll: el.closest('.sheet-page-body').scrollHeight, client: el.closest('.sheet-page-body').clientHeight })),
        };
      } finally { host.remove(); }
    }, { html, prefix });
    assert(layout.energyHeights.every(height => height >= 28), `${theme}: energy fields need enough vertical space: ${layout.energyHeights}`);
    assert(Math.max(...layout.rowHeights) - Math.min(...layout.rowHeights) < 0.5, `${theme}: talent rows must have equal height`);
    assert(layout.enc.some(row => row.text === 'nein'));
    assert(layout.enc.every(row => row.spare >= 0), `${theme}: BE values must fit without clipping`);
    assert.equal(layout.artifactText, 'Flammenschwert II');
    assert(layout.artifactsVisible && layout.magicalVisible, `${theme}: magical and artifact abilities must remain on-page after table pagination`);
    assert(layout.skillsVisible, `${theme}: every talent row must remain visible`);
    assert(layout.skillFooterVisible, `${theme}: languages and scripts must stay inside the content area: ${JSON.stringify(layout.skillFooterBounds)}`);
    assert.equal(layout.skillFooterBounds.length, 2, 'short language/script blocks must not leave empty duplicate fields after moving');
    if (process.argv.includes('--layout-only')) { console.log(`Layout ${theme}: passed`); continue; }
    const result = await page.evaluate(async ({ html, theme, prefix }) => {
      let resolveDownload;
      const download = new Promise(resolve => { resolveDownload = resolve; });
      window.saveAs = async blob => resolveDownload(Array.from(new Uint8Array(await blob.arrayBuffer())));
      const { htmlToPdf } = await import(`${prefix}scripts/htmlsheet/html-to-pdf.js`);
      await htmlToPdf(html, 'smoke.pdf', { theme, lang: 'en' });
      return { bytes: await download, leftover: document.querySelector('#dsa5-htmlsheet-host') !== null };
    }, { html, theme, prefix });
    assert.equal(result.leftover, false);
    const bytes = Uint8Array.from(result.bytes);
    const pdf = await PDFDocument.load(bytes);
    const fields = pdf.getForm().getFields();
    const artifactField = fields.find(field => field.getName().endsWith('magic.artifactAbilities'));
    assert.equal(artifactField?.getText(), 'Flammenschwert II');
    const artifactWidgetRef = pdf.context.getObjectRef(artifactField.acroField.getWidgets()[0].dict);
    const artifactPageIndex = pdf.getPages().findIndex(p => p.node.Annots()?.asArray()
      .some(ref => ref.toString() === artifactWidgetRef.toString())) + 1;
    assert(artifactPageIndex > 0, 'artifact field is attached to an actual PDF page');
    for (const ending of ['derived.lp', 'derived.ae', 'derived.kp', 'magic.ae']) {
      const energy = fields.find(field => field.getName().endsWith(ending));
      assert(energy.acroField.getWidgets()[0].getRectangle().height >= 19, 'energy widgets retain their enlarged height in the PDF');
    }
    const encFields = fields.filter(field => /skill\..*\.enc$/.test(field.getName()));
    assert.equal(encFields.length, 60);
    assert.equal(encFields.filter(field => field.getText() === 'nein').length, 19);
    const name = pdf.getForm().getTextField('personal.name');
    assert.equal(name.getText(), actor.name);
    assert.equal(name.acroField.getWidgets().length, pdf.getPageCount() + 1);
    assert(fields.every(f => !f.isReadOnly()));
    const career = fields.find(f => f.getName().endsWith('personal.career'));
    assert.equal(career.getText(), actor.system.details.career.value);
    const careerSize = Number(/ ([\d.]+) Tf/.exec(career.acroField.getWidgets()[0].getDefaultAppearance())[1]);
    assert(careerSize < 9 && careerSize >= 2, 'long career shrinks to fit without truncation');
    const notes = fields.find(f => f.getName().endsWith('notes.player'));
    assert.match(notes.getText(), /Erster Absatz\.\n+Zweiter Absatz\.\nDritte Zeile\./);
    const resources = pdf.getForm().acroForm.dict.lookup(PDFName.of('DR')).lookup(PDFName.of('Font'));
    assert.equal(resources.keys().length, 2, 'full regular and bold fonts are available for viewer editing');
    for (const widget of name.acroField.getWidgets()) {
      const normal = pdf.context.lookup(widget.getAppearances().normal);
      const fontName = /\/([^\s]+) [\d.]+ Tf/.exec(widget.getDefaultAppearance())[1];
      assert(normal.dict.lookup(PDFName.of('Resources')).lookup(PDFName.of('Font')).has(PDFName.of(fontName)));
    }
    const out = process.env.CHAREX_ARTIFACT_DIR;
    if (out) {
      await fs.mkdir(out, { recursive: true });
      await fs.writeFile(path.join(out, `html-heldenbogen-${theme}.pdf`), bytes);
    }
    const editedBytes = await page.evaluate(async ({ bytes, prefix, artifactPageIndex }) => {
        const pdfjs = await import(`${prefix}node_modules/pdfjs-dist/build/pdf.mjs`);
        pdfjs.GlobalWorkerOptions.workerSrc = `${prefix}node_modules/pdfjs-dist/build/pdf.worker.mjs`;
        const loading = pdfjs.getDocument({ data: new Uint8Array(bytes) });
        const doc = await loading.promise;
        const first = await doc.getPage(1);
        const viewport = first.getViewport({ scale: 1.5 });
        document.querySelector('canvas')?.remove();
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        document.body.appendChild(canvas);
        await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        for (const [id, number] of [['skills-preview', 2], ['artifact-preview', artifactPageIndex]]) {
          document.getElementById(id)?.remove();
          const sourcePage = await doc.getPage(number);
          const view = sourcePage.getViewport({ scale: 1.5 });
          const preview = document.createElement('canvas'); preview.id = id;
          preview.width = view.width; preview.height = view.height;
          document.body.appendChild(preview);
          await sourcePage.render({ canvasContext: preview.getContext('2d'), viewport: view }).promise;
        }
        const nameWidget = (await first.getAnnotations()).find(annotation => annotation.fieldName === 'personal.name');
        doc.annotationStorage.setValue(nameWidget.id, { value: 'Änderung Ω im Viewer' });
        const edited = Array.from(await doc.saveDocument());
        await loading.destroy();
        return edited;
      }, { bytes: result.bytes, prefix, artifactPageIndex });
    const editedPdf = await PDFDocument.load(Uint8Array.from(editedBytes));
    assert.equal(editedPdf.getForm().getTextField('personal.name').getText(), 'Änderung Ω im Viewer');
    if (out) {
      await page.locator('canvas').first().screenshot({ path: path.join(out, `html-heldenbogen-${theme}.png`) });
      await page.locator('#skills-preview').screenshot({ path: path.join(out, `talente-${theme}.png`) });
      await page.locator('#artifact-preview').screenshot({ path: path.join(out, `artefakte-${theme}.png`) });
    }
    console.log(`HTML export ${theme}: ${pdf.getPageCount()} pages, ${fields.length} editable fields, ${bytes.length} bytes`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
