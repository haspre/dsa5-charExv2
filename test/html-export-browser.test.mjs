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
actor.items = actor.items.filter(item => item.type === 'spell' ? ++spells <= 3 : item.type === 'equipment' ? ++equipment <= 4 : true);
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
    const editedBytes = await page.evaluate(async ({ bytes, prefix }) => {
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
        const nameWidget = (await first.getAnnotations()).find(annotation => annotation.fieldName === 'personal.name');
        doc.annotationStorage.setValue(nameWidget.id, { value: 'Änderung Ω im Viewer' });
        const edited = Array.from(await doc.saveDocument());
        await loading.destroy();
        return edited;
      }, { bytes: result.bytes, prefix });
    const editedPdf = await PDFDocument.load(Uint8Array.from(editedBytes));
    assert.equal(editedPdf.getForm().getTextField('personal.name').getText(), 'Änderung Ω im Viewer');
    if (out) {
      await page.locator('canvas').screenshot({ path: path.join(out, `html-heldenbogen-${theme}.png`) });
    }
    console.log(`HTML export ${theme}: ${pdf.getPageCount()} pages, ${fields.length} editable fields, ${bytes.length} bytes`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
