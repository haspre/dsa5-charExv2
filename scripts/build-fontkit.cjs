// Produce a self-contained ES module for Foundry's browser/Electron clients.
// Shadow CommonJS/AMD globals: Foundry can expose them inside its renderer.
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(require.resolve('@pdf-lib/fontkit/dist/fontkit.umd.min.js'), 'utf8');
fs.writeFileSync(path.join(__dirname, '../lib/fontkit.mjs'),
  'var module, exports, define;\n' + source.replace('}(this,', '}(globalThis,') + '\nexport default globalThis.fontkit;\n');
