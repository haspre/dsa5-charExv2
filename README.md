![Version](https://img.shields.io/github/v/tag/haspre/dsa5-charExv2?label=Version&style=flat-square&color=2577a1) ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fgithub.com%2Fhaspre%2Fdsa5-charExv2%2Freleases%2Flatest%2Fdownload%2Fmodule.json&label=Foundry%20Core%20Compatible%20Version&query=$.compatibility.verified&style=flat-square&color=ff6400)

> [!IMPORTANT]  
>  
> This is [haspre's CharEx v2 fork](https://github.com/haspre/dsa5-charExv2), focused on improving the HTML character sheet and editable PDF export.
> Based on the original work by JWinsen and its continuation by Plushtoast. Many thanks to both authors!

<hr>

# DSA5 CharEx v2
*Foundry VTT module to transfer the DSA 5 actors to PDF*

This module is to extend the functionality of the [Foundry VTT](https://foundryvtt.com/) platform and gives the users of [The Dark Eye / Das schwarze Auge 5](https://foundryvtt.com/packages/dsa5) the possibility to export their characters as PDF.

Two export modes:

1. **HTML character sheet** (default) — printable multi-page A4 sheet in the world’s language (`de` / otherwise `en`). Lists are not capped; extra rows become extra pages. Choose parchment (table) or printer-friendly appearance.
2. **Ulisses template (legacy)** — fills the official Ulisses Heldendokument. Long inventories and spell lists still hit the form’s field limit.

Language follows `game.i18n.lang`. There is no language dropdown.  

### HTML sheet PDF fields

The HTML sheet exports text and numbers as editable AcroForm fields. The
character name is shared between the page headers and personal data, so editing
one occurrence updates the same logical field. Regular and bold DejaVu Sans fonts
are bundled and embedded in full for subsequent editing in PDF viewers.

Field typography follows the HTML sheet. Long values automatically shrink to fit
the available width; multiline fields also account for wrapped line height.
Short values keep their normal size. Text is never silently truncated or replaced
by question marks. If a character is unsupported or content cannot fit even at
2 pt, the export reports an error instead of downloading an incomplete PDF.
Editing values does not recalculate derived values or synchronize back to Foundry.

Energy and derived-value fields have additional vertical space for the embedded
font. Talent tables use uniform single-line rows and a wider encumbrance column
so values such as `ja`, `evtl` and `nein` fit. Long talent names shrink within
their row instead of changing its height.
Talents are sorted alphabetically within each group using the document language,
including German umlauts; the established order of the groups is preserved.

Magical special abilities include magical styles and advanced magical abilities.
Tradition artifact abilities (DSA5 category `staff`) are exported separately,
including their ranks. These sections also export for characters without spells
or astral energy, and move to a continuation page when a spell table overflows.

Languages and scripts appear below the personal details and traits on the first
page when space allows. The condition table is omitted. The redundant metadata
row above the spell table is also omitted, leaving more space for spells and
tradition artifact abilities. Longer content still continues onto another page.
After the spell table, cantrips and the following magical abilities start on a
new page. Characters without spells do not receive an empty preceding page.

Owned spell extensions appear directly below their source spell, with editable
names and descriptions. Assignment follows the extension's source name and
category, keeping identically named spells and rituals separate. Extensions are
included in the spell's effect block for pagination; spells without extensions
receive no empty extension section. GM-only descriptions are not exported.

Table columns are measured and fixed before capturing the page background;
editable values use the same cell content area, padding and alignment. The
combat page omits the repeated GS/LeP/AW/INI/SK/ZK summary. GS on the personal
page uses DSA5's prepared `speed.max`; unprepared JSON falls back to base speed
plus modifiers instead of the `speed.value` placeholder.

When item prices are available, the inventory adds an editable unit-price column
in silverthalers (ST). The summary shows the quantity-weighted value of the items
listed in that table, excluding money and equipped items shown only in combat
tables. Missing prices appear as `—`; a subtotal is labeled as the known value
with a missing-price count. Zero is treated as a valid price. Prices follow the
document language's number format. The valuation is calculated at export time.
Weight, carry capacity and value each have a separate, generously sized summary
field below their label. Without prices, only weight and carry capacity appear.
The purse also has separate, full-width quantity fields below each denomination,
so multi-digit balances remain legible instead of shrinking to tiny inline text.

The total weight uses DSA5's prepared `system.totalWeight` when available,
including the system's equipment/container rules. For unprepared imports it falls
back to equipment weight multiplied by quantity, including equipped gear and
money when the world's money-weight setting is enabled.

Development checks for the HTML exporter:

```sh
npm ci
npm run test:html
npx playwright install chromium
npm run test:browser
```

Set `CHAREX_ARTIFACT_DIR` to retain example PDFs and PDF.js-rendered preview images
from the browser test. The browser test uses fixture actors and a local server;
it does not replace validation in a live Foundry world or manual Acrobat/Preview
tests. The original `npm test` also includes legacy Ulisses checks which currently
require external DSA5 language files in `../foundry14/lang`.

`npm run build:fonts` regenerates the bundled fontkit module from the locked npm
dependency. Font licenses are in `assets/fonts/LICENSE.txt`; fontkit and pako
notices accompany their bundle in `lib/`.

## Installation
### Automatic Installation
See https://foundryvtt.wiki/en/basics/Modules. 

1. Open the Add-on Modules tab in the Configuration and Setup dialog.
2. Click Install Module, paste --> `https://github.com/haspre/dsa5-charExv2/releases/latest/download/module.json`
   in as the Manifest URL, then click Install.

### Manual Installation
If the above installation doesn't work you can try doing it manually.
Use this fork's manifest link:
```
https://github.com/haspre/dsa5-charExv2/releases/latest/download/module.json
```

### Automated releases

Every push to `foundry14` runs the HTML export tests and publishes a new release
marked **Latest**, with `module.json` and `dsa5-charexv2.zip` as downloadable assets.
The manifest URL above always points to the latest release. Each released
manifest downloads the ZIP from its own build tag, keeping the manifest and
module files consistent. The ZIP contains `module.json` at its root and excludes
development dependencies and tests.

The workflow uses the built-in `GITHUB_TOKEN`; no additional secret is needed.
It can also be started manually on `foundry14` from GitHub Actions. Increase
`version` in `module.json` when publishing an update that Foundry should detect;
the workflow preserves that version. The latest URLs become available after the
first successful release workflow run.

### Completion of the installation
As `gamemaster` go to the `Manage Modules` options menu in the `Game Settings` for your World, then enable the `DSA5 - CharEx v2` module.

The module ID and installation directory are `dsa5-charexv2`
(`Data/modules/dsa5-charexv2/`). This fork is a separate module from
`dsa5-char2pdfv2`; after installing it, enable CharEx v2 in your world and disable
the original module to avoid duplicate export entries.

## Where to find the button for export ? 

![Where to find the export button](Where_to_find_the_Button.png)

Please be aware. This context menu entry only appears for actors of type `character`. Other types are not recognized. 

## Used libraries
- *FileSaver.js* ([FileSaver.js](https://github.com/eligrey/FileSaver.js)) by [eligrey](https://github.com/eligrey)
- *pdf-lib.js* ([pdf-lib](https://github.com/Hopding/pdf-lib)) by [Hopding](https://github.com/Hopding) — Ulisses fill
- *html2pdf.js* ([html2pdf.js](https://github.com/eKoopmans/html2pdf.js)) by [eKoopmans](https://github.com/eKoopmans) — HTML sheet (html2canvas + jsPDF)

## Image credits

Parchment, frames, logos and combat ornaments in `assets/images/` come from the Roll20 DSA character generator asset set (WebP). They are used as sheet chrome for the HTML export.

## License

Copyright © 2021 JWinsen

This package is under an [MIT license](LICENSE) and the [Foundry Virtual Tabletop Limited License Agreement for module development](https://foundryvtt.com/article/license/).
