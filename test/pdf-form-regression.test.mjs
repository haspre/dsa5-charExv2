import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { addPdfFields, finishPdfForm, fieldFontSize, collectPdfFields } from '../scripts/htmlsheet/pdf-fields.js';
const require = createRequire(import.meta.url);
globalThis.PDFLib = require('../lib/pdf-lib.js');
const { PDFDocument, StandardFonts } = globalThis.PDFLib;
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const field = (name, value, y = 10, extra = {}) => ({ name, value, x: 10, y, width: 300, height: 32, multiline: false, align: 'left', dropdown: [], ...extra });
const options = { font, boldFont: bold };
const page = pdf.addPage();
addPdfFields(pdf, page, [field('hero.name', 'Alrik', 10, { fontSize: 18, bold: true }), field('personal.name', 'Alrik', 50)], options);
assert.equal(pdf.getForm().getFields().length, 1, 'all occurrences of the hero name share one logical field');
assert.equal(pdf.getForm().getFields()[0].acroField.getWidgets().length, 2);
const long = 'A '.repeat(4050);
addPdfFields(pdf, page, [field('notes.player', long, 90, { multiline: true, width: 8000, height: 800 })], options);
assert.equal(pdf.getForm().getFields().find(f => f.getName().includes('notes')).getText(), long, 'never silently truncate long notes');
assert.throws(() => addPdfFields(pdf, page, [field('unsupported', 'Name Ж')], options), /unsupported|encode|character/i, 'unsupported glyphs must not become question marks');
assert.throws(() => addPdfFields(pdf, page, [field('bad', 'lost', 10, { width: 0 })], options), /field|size|rectangle/i);
assert.equal(fieldFontSize({ fontSize: 18 }, { height: 32 }), 18, 'preserve title hierarchy');
const shortSize = fieldFontSize(field('short', 'Alrik'), { width: 80, height: 22 }, font);
const longSize = fieldFontSize(field('long', 'Alrik der außergewöhnlich lang benannte Held'), { width: 80, height: 22 }, font);
assert(longSize < shortSize, 'long single-line values shrink to the measured width');
assert(font.widthOfTextAtSize('Alrik der außergewöhnlich lang benannte Held', longSize) <= 78.01);
const prose = field('prose', 'A long description with several words '.repeat(6), 10, { multiline: true });
assert(fieldFontSize(prose, { width: 100, height: 35 }, font) < 8, 'multiline values shrink to fit their height');

const domField = {
  innerText: 'First paragraph\nSecond line', textContent: 'First paragraphSecond line',
  getAttribute(name) { return name === 'data-pdf-field' ? 'notes.player' : null; },
  getBoundingClientRect() { return { left: 10, top: 10, width: 200, height: 50 }; },
};
const element = { getBoundingClientRect() { return { left: 0, top: 0 }; }, querySelectorAll() { return [domField]; } };
assert.equal(collectPdfFields(element)[0].value, 'First paragraph\nSecond line');
finishPdfForm(pdf, font);
const bytes = await pdf.save({ updateFieldAppearances: false });
const reopened = await PDFDocument.load(bytes);
const name = reopened.getForm().getFields().find(f => f.acroField.getWidgets().length === 2);
assert.equal(name.isReadOnly(), false);
name.setText('Änderung');
const edited = await PDFDocument.load(await reopened.save());
assert.equal(edited.getForm().getTextField(name.getName()).getText(), 'Änderung');
assert.equal(edited.getForm().getTextField(name.getName()).acroField.getWidgets().length, 2);
console.log('pdf-form-regression.test.mjs passed');
