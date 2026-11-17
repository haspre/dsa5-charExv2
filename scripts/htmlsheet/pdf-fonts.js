import fontkit from '../../lib/fontkit.mjs';
import { dsa5char2pdf } from '../shared/module.js';

let fontBytes;

export async function embedSheetFonts(pdf) {
  pdf.registerFontkit(fontkit);
  if (!fontBytes) {
    fontBytes = Promise.all(['DejaVuSans.ttf', 'DejaVuSans-Bold.ttf'].map(async name => {
      const response = await fetch(`modules/${dsa5char2pdf.ID}/assets/fonts/${name}`);
      if (!response.ok) throw new Error(`Could not load sheet font ${name}: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    })).catch(error => { fontBytes = undefined; throw error; });
  }
  const bytes = await fontBytes;
  // Full fonts allow new characters to be typed after export in PDF viewers.
  const [font, boldFont] = await Promise.all(bytes.map(data => pdf.embedFont(data, { subset: false })));
  const { PDFName } = globalThis.PDFLib;
  const acro = pdf.getForm().acroForm.dict;
  const resources = pdf.context.obj({ Font: { [font.name]: font.ref, [boldFont.name]: boldFont.ref } });
  acro.set(PDFName.of('DR'), resources);
  return { font, boldFont };
}
