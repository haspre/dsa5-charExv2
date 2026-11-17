import { PAGE } from '../config/print.js';

const FIELD_INSET_PX = 1;
const widgetFonts = new WeakMap();

export function htmlRectToPdf(rect, pagePx, pagePt) {
  const sx = pagePt.width / pagePx.width, sy = pagePt.height / pagePx.height;
  return { x: rect.x * sx, y: pagePt.height - (rect.y + rect.height) * sy,
    width: rect.width * sx, height: rect.height * sy };
}

export function collectPdfFields(pageEl) {
  const pageRect = pageEl.getBoundingClientRect();
  return [...pageEl.querySelectorAll('[data-pdf-field]')].map((el) => {
    const r = el.getBoundingClientRect();
    const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
    return {
      name: el.getAttribute('data-pdf-field') || 'field',
      value: (el.innerText ?? el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\n{3,}/g, '\n\n').trim().normalize('NFC'),
      multiline: el.getAttribute('data-pdf-multiline') === 'true',
      align: el.getAttribute('data-pdf-align') || 'left',
      dropdown: (el.getAttribute('data-pdf-dropdown') || '').split(',').map(s => s.trim()).filter(Boolean),
      fontSize: style ? parseFloat(style.fontSize) * 72 / 96 : undefined,
      bold: style ? Number(style.fontWeight) >= 600 || style.fontWeight === 'bold' : false,
      x: r.left - pageRect.left + FIELD_INSET_PX, y: r.top - pageRect.top + FIELD_INSET_PX,
      width: r.width - FIELD_INSET_PX * 2, height: r.height - FIELD_INSET_PX * 2,
    };
  });
}

function textForFont(font, value) {
  const text = String(value ?? '').normalize('NFC');
  const charset = new Set(font.getCharacterSet());
  const missing = [...new Set([...text].filter(c => !/[\n\r\t]/.test(c) && !charset.has(c.codePointAt(0))))];
  if (missing.length) throw new Error(`Unsupported characters: ${missing.join(' ')}`);
  font.encodeText(text);
  return text;
}

export function hidePdfFieldText(root) {
  for (const field of root.querySelectorAll('[data-pdf-field]')) {
    for (const el of [field, ...field.querySelectorAll('*')]) {
      el.style.color = 'transparent'; el.style.webkitTextFillColor = 'transparent';
    }
  }
}

/** Fit actual glyph widths and wrapped line heights; the CSS size is the ceiling. */
export function fieldFontSize(field, box, font) {
  const preferred = field.fontSize || (field.multiline ? 8 : 9);
  if (!font) return Math.min(preferred, Math.max(2, box.height - 4));
  const value = textForFont(font, field.value);
  const width = box.width - 2, height = box.height - 2;
  const fits = size => {
    if (!field.multiline) return font.widthOfTextAtSize(value.replace(/[\r\n]/g, ' '), size) <= width
      && font.heightAtSize(size, { descender: false }) <= height;
    const layout = globalThis.PDFLib.layoutMultilineText(value, {
      alignment: 0, fontSize: size, font, bounds: { x: 0, y: 0, width, height },
    });
    return layout.lines.every(line => line.width <= width + 0.01)
      && layout.lines.length * layout.lineHeight <= height + 0.01;
  };
  if (width <= 0 || height <= 0) throw new Error(`Invalid field size: ${field.name}`);
  if (fits(preferred)) return preferred;
  let low = 2, high = preferred;
  if (high < low || !fits(low)) throw new Error(`Text does not fit field ${field.name}; increase its size or split the content.`);
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle; else high = middle;
  }
  return Math.floor(low * 100) / 100;
}

function logicalName(field, serial) {
  // Couple only identical values. List indices and split prose stay independent.
  if (field.name === 'hero.name' || field.name === 'personal.name') return 'personal.name';
  return `s${serial}.${String(field.name || 'field').replace(/[^A-Za-z0-9._]+/g, '_')}`;
}

export function addPdfFields(pdf, pdfPage, fields, options = {}) {
  const { rgb } = globalThis.PDFLib || {};
  if (!rgb) throw new Error('pdf-lib rgb is not available');
  const form = pdf.getForm();
  const fonts = widgetFonts.get(pdf) || new Map();
  widgetFonts.set(pdf, fonts);
  const pagePx = options.pagePx || { width: PAGE.widthPx, height: PAGE.heightPx };
  const pagePt = options.pagePt || { width: PAGE.widthMm / 25.4 * 72, height: PAGE.heightMm / 25.4 * 72 };
  let serial = options.serial || 0;
  for (const field of fields) {
    serial += 1;
    try {
      const box = htmlRectToPdf(field, pagePx, pagePt);
      const font = field.bold ? (options.boldFont || options.font) : options.font;
      const value = textForFont(font, field.value);
      const size = fieldFontSize({ ...field, value }, box, font);
      const name = logicalName(field, serial);
      const widget = { ...box, borderWidth: 0, backgroundColor: undefined, borderColor: undefined,
        textColor: options.theme === 'print' ? rgb(0.08, 0.08, 0.08) : rgb(0.17, 0.13, 0.09), font };
      let pdfField = form.getFieldMaybe(name);
      if (field.dropdown?.length) {
        pdfField = form.createDropdown(name);
        field.dropdown.forEach(option => textForFont(font, option));
        if (!field.dropdown.includes(value)) throw new Error(`Invalid dropdown value: ${value}`);
        pdfField.setOptions(field.dropdown); pdfField.select(value);
      } else {
        if (!pdfField) {
          pdfField = form.createTextField(name);
          if (field.multiline) pdfField.enableMultiline();
          pdfField.setText(value);
          pdfField.setAlignment(field.align === 'center' ? 1 : field.align === 'right' ? 2 : 0);
        } else if (pdfField.getText() !== value) throw new Error(`Conflicting values for shared field ${name}`);
      }
      pdfField.disableReadOnly();
      if (!pdfField.acroField.getWidgets().length) pdfField.acroField.setDefaultAppearance(`/${font.name} ${size} Tf 0 g`);
      pdfField.addToPage(pdfPage, widget);
      const annotation = pdfField.acroField.getWidgets().at(-1);
      annotation.setDefaultAppearance(`/${font.name} ${size} Tf 0 g`);
      fonts.set(String(pdf.context.getObjectRef(annotation.dict)), font);
    } catch (error) {
      throw new Error(`PDF field ${field.name}: ${error.message}`, { cause: error });
    }
  }
  return serial;
}

export function finishPdfForm(pdf, fallbackFont) {
  const { PDFName, defaultTextFieldAppearanceProvider, defaultDropdownAppearanceProvider } = globalThis.PDFLib;
  const fonts = widgetFonts.get(pdf);
  for (const field of pdf.getForm().getFields()) {
    const provider = typeof field.getText === 'function' ? defaultTextFieldAppearanceProvider : defaultDropdownAppearanceProvider;
    field.updateAppearances(fallbackFont, (current, widget, font) => {
      const selected = fonts?.get(String(pdf.context.getObjectRef(widget.dict))) || font;
      textForFont(selected, typeof current.getText === 'function' ? current.getText() : current.getSelected().join(''));
      return provider(current, widget, selected);
    });
    // updateAppearances installs its font argument in each stream. Providers
    // may choose a different font per widget, so register that resource too.
    for (const widget of field.acroField.getWidgets()) {
      const selected = fonts?.get(String(pdf.context.getObjectRef(widget.dict))) || fallbackFont;
      const normal = pdf.context.lookup(widget.getAppearances().normal);
      normal.dict.lookup(PDFName.of('Resources')).lookup(PDFName.of('Font'))
        .set(PDFName.of(selected.name), selected.ref);
    }
  }
}
