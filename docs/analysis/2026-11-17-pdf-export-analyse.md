# Analyse: schönere, korrekte und editierbare Charakter-PDFs

Stand: 17.11.2026. Untersucht wurde **haspre/dsa5-charExv2**, Commit `32a4852713b5dcbd97224ee6ef29db08bfa761d1`, Modulversion `0.10.2`. Die Befunde beziehen sich ausschließlich auf dieses Repository. Das zuvor genannte ältere Modul ist keine Grundlage dieser Analyse.

## Ziel und Umfang

Der Ablauf bleibt erhalten: Charakter auswählen, Exportoptionen wählen, PDF herunterladen. Beide vorhandenen Exportwege bleiben verfügbar. Verbesserungen betreffen die Richtigkeit der exportierten Daten, Lesbarkeit und Gestaltung sowie die Bearbeitbarkeit der exportierten Text-, Zahlen- und Auswahlfelder.

Ein Standard-PDF-Viewer soll Felder ändern, die Datei speichern und nach erneutem Öffnen die Änderungen anzeigen können. Hierfür sind echte AcroForm-Felder notwendig. Automatische Neuberechnungen nach Änderungen und das Austauschen von Porträts sind zusätzliche Anforderungen, die aus normaler Formularbearbeitung nicht automatisch folgen. Vorschlag: Text-, Zahlen- und Auswahlfelder verbindlich unterstützen; Bildaustausch separat klären.

## Bestehende Architektur

| Bereich | Umsetzung | Bedeutung |
|---|---|---|
| Datenaufbereitung | `scripts/shared/actor-snapshot.js` | Erstellt das Datenmodell für den HTML-Bogen. |
| DSA5-Anbindung | `scripts/shared/dsa5-api.js` | Kapselt unter anderem den systemeigenen Kampftechnikrechner. |
| Bogenaufbau | `templates/htmlsheet/`, `render-sheet.js` | A4-Bogen mit Personen-, Talent-, Kampf-, Inventar-, Magie-, Karma- und Notizseiten. |
| Gestaltung | `styles/htmlsheet.css`, `htmlsheet-print.css` | Pergamentvariante und druckerfreundliche Variante. |
| Seitenaufteilung | `render-sheet.js`, `paginate.js` | Zunächst feste Zeilenpakete, anschließend Aufteilung nach gemessener DOM-Höhe. |
| PDF-Erstellung | `html-to-pdf.js` | Rastert jede Seite als JPEG und legt AcroForm-Felder darüber. |
| Editierbare Werte | `pdf-fields.js` | Liest `data-pdf-field`-Elemente aus und erstellt Textfelder bzw. Dropdowns. |
| Ulisses-Export | `scripts/ulisses/fill-form.js` | Separater Daten- und Exportpfad mit fester PDF-Vorlage. |

Das Manifest nennt Foundry **14** und DSA5 mindestens **8.0.0**. Diese Angaben wurden gelesen, ihre Laufzeitkompatibilität wurde hier nicht in einer Foundry-Welt verifiziert. Modul-ID, Download-, Manifest- und Projektlinks verweisen weiterhin auf Plushtoast; ein Release des Forks benötigt deshalb eine bewusste Prüfung seiner Installationsziele.

## Was bereits gut gelöst ist

- Echte Formularfelder sind bereits vorhanden; eine komplette Neuentwicklung ist für Editierbarkeit nicht erforderlich.
- Exportwerte werden bei der Rasteraufnahme ausgeblendet. Dadurch bleibt beim späteren Bearbeiten grundsätzlich kein alter Wert im Seitenbild stehen.
- Der HTML-Export begrenzt Listen nicht mehr auf die festen Kapazitäten der Ulisses-Vorlage.
- Datenaufbereitung, Templates, Seitenaufteilung und PDF-Felder sind getrennt und können gezielt verbessert werden.
- Vorhandene Tests prüfen unter anderem Templates, Koordinatenumrechnung, Darstellungsströme der Felder und Aufräumen der Capture-Elemente.

## Bestätigte Befunde

### 1. Datenverlust bei Zeichen und langen Inhalten — hohe Priorität

`pdf-fields.js:54–65` ersetzt bei Encoding-Problemen Zeichen außerhalb eines eingeschränkten Bereichs durch `?`. Ein gezielter Test mit `Name Ж` ergab nach Erzeugung und erneutem Einlesen `Name ?`. Der vorhandene Test erwartet den Verlust eines Schneemannzeichens sogar ausdrücklich. Außerdem kürzt `textForFont()` Inhalte ohne Hinweis auf 8.000 UTF-16-Codeeinheiten pro Feld.

**Folgerung:** Eine geeignete eingebettete Schrift mit definiertem Zeichenvorrat und ein sichtbarer Umgang mit nicht unterstützten Zeichen sind nötig. Inhalt soll durch Layoutaufteilung erhalten bleiben. Schriftunterstützung muss auch nach einer Änderung im Viewer geprüft werden.

### 2. Das Gesamtgewicht enthält angelegte Gegenstände nicht — hohe Priorität

`actor-snapshot.js` berechnet `weightTotal` ausschließlich aus `snapshot.inventory`. Diese Liste schließt angelegte Waffen und Rüstungen aus. Im gezielten Test blieb der Wert bei **41**, nachdem eine angelegte Rüstung mit Gewicht **100** hinzugefügt wurde; die Rüstung erschien gleichzeitig korrekt in der Rüstungsliste.

**Folgerung:** Darstellungsort und Gewichtsberechnung trennen. Wenn der Footer Gesamtgewicht meint, müssen alle relevanten getragenen Gegenstände genau einmal eingehen. Falls nur Rucksackgewicht gemeint ist, braucht der Wert eine eindeutige Beschriftung. DSA5-Regeln für Behälter, Gewichtsreduktion und Münzen mit dem System abgleichen.

### 3. Wiederholte Werte sind unabhängige PDF-Felder — mittlere Priorität

`fieldName()` versieht jedes Vorkommen mit einer neuen Seriennummer. Zwei Vorkommen von `hero.name` werden beispielsweise `s1.hero.name` und `s2.hero.name`. Im Speichern–Ändern–Speichern-Test änderte sich nur das erste Feld; das zweite blieb bei `Alrik`.

**Folgerung:** Identische logische Werte durch mehrere Widgets desselben Feldes darstellen, wo dieselbe Bedeutung vorliegt. Listen benötigen stabile Element-IDs statt seitenlokaler Indizes. Seitenteile eines langen Textes müssen dagegen getrennte, eindeutig zuordenbare Inhalte behalten.

### 4. HTML-Typografie und PDF-Typografie widersprechen sich — hohe gestalterische Priorität

Die HTML-Vorlage verwendet unter anderem 24 px für den Namen, 15 px und Fettschrift für Eigenschaften sowie kleinere Tabellenwerte. Das PDF verwendet für sämtliche Felder Helvetica und bevorzugt pauschal 9 pt bzw. 8 pt bei Mehrzeilern; bis zu 5 pt sind möglich. Weil die HTML-Werte ausgeblendet werden, gehen Hierarchie und Gewichtung im fertigen Formular verloren. Schriftgröße wird nach Feldhöhe gewählt, ohne den tatsächlichen Textumfang zuverlässig einzupassen.

**Folgerung:** Gemeinsame Gestaltungswerte für HTML und PDF einführen: Schrift, Gewicht, Größe, Ausrichtung, Innenabstand und Zeilenhöhe nach Feldrolle. Lange Inhalte erhalten mehr Platz oder Folgeseiten, statt unlesbar klein zu werden.

### 5. Fehler können ein unvollständiges PDF erzeugen — hohe Priorität

Fehler bei der Feldanlage und Appearance-Erzeugung werden in `pdf-fields.js` teilweise nur mit `console.warn` protokolliert. Der Download kann danach weiterlaufen. Wird ein Feld ausgelassen, ist sein Wert wegen der ausgeblendeten HTML-Texte unter Umständen vollständig verschwunden.

**Folgerung:** Erwartete Felder gegen tatsächlich erzeugte Felder prüfen und Fehler gesammelt an den Export zurückgeben. Ein unvollständiger Export darf nicht als erfolgreicher Export erscheinen.

### 6. Die vorhandene Testbasis ist nicht vollständig grün — hohe Priorität

Nach `npm ci --ignore-scripts --no-audit --no-fund` wurde `npm test` ausgeführt. Es stoppt bei einer fehlenden Datei außerhalb des Repositorys: `../foundry14/lang/en.json`.

Die acht Testdateien wurden anschließend soweit möglich einzeln geprüft:

| Test | Ergebnis |
|---|---|
| `locale-map.test.js` | bestanden |
| `pdf-labels.test.js` | durch fehlende externe Sprachdatei blockiert |
| `templates.test.js` | übersprungen: `Talent_Name_1` fehlt in der vorhandenen Vorlage |
| `actor-snapshot.test.mjs` | fehlgeschlagen: klerikale Tradition ist leer, erwartet wird `Praios` |
| `sheet-pages.test.mjs` | bestanden |
| `htmlsheet-render.test.mjs` | bestanden |
| `pdf-fields.test.mjs` | bestanden; akzeptiert derzeit Zeichenersetzung durch `?` |
| `capture-memory.test.mjs` | bestanden |

Der Traditionsfehler belegt zunächst eine Inkonsistenz zwischen Fixture/Test und Implementierung. Ob reale Charakterdaten ebenfalls betroffen sind, muss anhand der unterstützten DSA5-Version geprüft werden. Die fünf bestandenen Tests belegen keine vollständige Viewer-Kompatibilität.

### 7. Der Ulisses-Pfad enthält eigenständige Fehlerquellen

`fill-form.js:356–367` lädt JPG-Dateien direkt und übergibt die Bytes anschließend an `embedPng()`. Das passt nicht zum Bildformat. Die Gewichtsaufteilung verwendet außerdem `i <= 36`, also 37 Einträge für den ersten Block bei nullbasiertem Index; die tatsächlich beabsichtigte Seitengrenze ist mit der Vorlage abzugleichen. Die feste Listenkapazität bleibt ein Unterschied zum HTML-Export und muss sichtbar dokumentiert bleiben.

## Risiken und noch zu verifizierende Punkte

Diese Punkte sind aus dem Code begründet, aber hier nicht durch einen vollständigen Browser-/Foundry-Export bestätigt:

- **Seitenumbrüche:** `splitTable()` kann bei der ersten übergroßen Zeile nicht aufteilen; der Paginator beendet sich spätestens nach 40 Teilungen ohne abschließende Fehlerprüfung. Zusammen mit `overflow: hidden` besteht Abschneiderisiko. Lange Zauberwirkungen, einzelne übergroße Einträge, mehrspaltige Talente und sehr lange Notizen brauchen echte Layouttests.
- **Notizstruktur:** `collectPdfFields()` verwendet `textContent`. Absatz- und `<br>`-Grenzen müssen gezielt als Zeilenumbrüche in das PDF übertragen werden; bloßes Zusammenfügen kann Wörter und Absätze verschmelzen lassen.
- **Kampfwerte:** Kampftechniken nutzen den Systemrechner. Waffenwerte werden anschließend teilweise manuell zusammengesetzt. Schaden inklusive Eigenschaftsbonus, Waffenmodifikationen, Schildparade, Fernkampf, Zustände und aktive Effekte gegen den tatsächlichen Foundry-Bogen vergleichen; die Anzeige roher Itemwerte ist kein Nachweis berechneter Endwerte.
- **Rasterhintergrund:** JPEG bei Canvas-Skalierung 2 entspricht ungefähr 192 dpi auf A4. Beschriftungen und Linien sind daher beim starken Zoom rasterbasiert; Formularwerte bleiben separat. Druckschärfe und Dateigröße messen, bevor ein Rendererwechsel beschlossen wird.
- **Druckvariante:** Sie entfernt nahezu sämtliche Rahmen. Eine sparsame Gestaltung mit feinen Linien und klarer Spaltenführung wäre ein sinnvoller Entwurf, dessen Lesbarkeit visuell geprüft werden muss.
- **Viewer:** AcroForm-Speichern wurde mit pdf-lib technisch geprüft, nicht mit Acrobat Reader, Firefox, Edge/Chrome oder macOS Vorschau. Schriftwechsel, mehrzeilige Felder, Dropdowns, Tab-Reihenfolge und Druck bleiben offen.
- **Notizumfang:** Spieler-, Besitzer- und SL-Notizen werden gemeinsam aufbereitet. Vor Freigabe anhand der Foundry-Berechtigungen prüfen, welche Inhalte der jeweilige Exportierende tatsächlich sehen darf.

## Empfohlener Lösungsweg

**Empfehlung: bestehende Architektur schrittweise verbessern.** Datenmodell korrigieren, Formularfelder verlustfrei und vollständig erzeugen, anschließend Gestaltung und Seitenaufteilung vereinheitlichen. Den Ulisses-Pfad gezielt mit absichern. Das erhält die Grundfunktion und nutzt die vorhandenen Komponenten.

Alternative: den gestalteten Bogen vollständig mit PDF-Vektortext und Vektorlinien erzeugen. Das bietet schärfere Beschriftungen und mehr Kontrolle, erfordert aber einen zusätzlichen Layoutmechanismus einschließlich Seitenumbrüchen. Dafür erst entscheiden, wenn Vergleichs-PDFs zeigen, dass der bestehende Weg die Qualitätsziele nicht erreicht. Eine bloße Erhöhung der Rasterauflösung behebt weder falsche Daten noch fehlerhafte Formularfelder.

Vorgeschlagene Gestaltung: ruhiger A4-Bogen, klare Trennung von Abschnittsüberschrift, Beschriftung und Wert, sparsame DSA-Farben, konsistente Zahlen- und Einheitendarstellung, wiederholte Tabellenköpfe, Seitenzahlen sowie gut erkennbare Fortsetzungen. Pergament bleibt dezent; die Druckvariante erhält schwarze Texte, weiße Flächen und feine Orientierungslinien.

## Abnahme

1. Exportierte Werte stimmen für vereinbarte Referenzcharaktere mit dem Foundry-Bogen überein; Abweichungen sind erklärt.
2. Alle vorgesehenen Datenfelder sind echte, nicht schreibgeschützte AcroForm-Felder. Jeder exportierte Wert ist einem Feld oder einer ausdrücklich statischen Darstellung zugeordnet.
3. Öffnen → ändern → speichern → schließen → erneut öffnen erhält Änderungen in den vereinbarten Standard-Viewern. Wiederholte identische Werte bleiben konsistent.
4. Keine stillen Zeichenersetzungen, Textkürzungen oder ausgelassenen Felder. Kein alter Wert bleibt im Hintergrund stehen.
5. Lange Listen und Texte bleiben vollständig; kein Inhalt und kein Formularwidget liegt außerhalb der nutzbaren Seite.
6. Beide Gestaltungsvarianten sind bei 100 % auf A4 gut lesbar. Vorschlag: 9–10 pt für normale Werte, mindestens 8 pt für dichte Tabellen; längere Inhalte werden umgebrochen.
7. Bestehender Exportablauf bleibt erhalten. Beide Exportwege werden geprüft; feste Grenzen der Ulisses-Vorlage werden klar ausgewiesen.

## Quellen und Prüfumfang

- Quellcode: https://github.com/haspre/dsa5-charExv2/tree/32a4852713b5dcbd97224ee6ef29db08bfa761d1
- AcroForm-Felder und Mehrfach-Widgets: https://pdf-lib.js.org/docs/api/classes/pdffield
- Formular-Appearances und Flattening: https://pdf-lib.js.org/docs/api/classes/pdfform
- Textfeldfunktionen: https://pdf-lib.js.org/docs/api/classes/pdftextfield

Durchgeführt: Quellcodeanalyse, Installation der festgeschriebenen Testabhängigkeiten, Testläufe und gezielte Node/pdf-lib-Reproduktionen für Zeichenersetzung, Mehrfachfelder und Gewichtsberechnung. Nicht durchgeführt: Betrieb in einer Foundry-Welt, vollständiger HTML-zu-PDF-Browserexport, visuelle Begutachtung eines solchen Exports und manuelle Viewer-Tests. Die Gestaltungsempfehlungen sind daher ein begründeter Entwurf, keine behauptete Sichtprüfung.
