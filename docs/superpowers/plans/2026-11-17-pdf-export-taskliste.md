# PDF-Export verbessern — Taskliste

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bestehenden Charakterexport beibehalten und korrekte, gut gestaltete, in Standard-PDF-Viewern editierbare PDFs ausgeben.

**Architecture:** Vorhandenen ActorSnapshot, HTML-Bogen und AcroForm-Erzeugung gezielt verbessern. Eine gemeinsame Feldbeschreibung verbindet logischen Wert, Gestaltung und PDF-Widget; der Ulisses-Export bleibt als zweiter Pfad erhalten. Ein vollständiger Vektorrenderer ist eine spätere Option nach Qualitätsvergleich.

**Tech Stack:** JavaScript, Foundry 14 laut aktuellem Manifest, DSA5 ab 8.0.0 laut Manifest, Handlebars, html2canvas/html2pdf und pdf-lib.

**Spec:** `../../analysis/2026-11-17-pdf-export-analyse.md`

**Status:** Vorläufige Aufgabenplanung auf Basis der Analyse. Gestaltungswerte und Viewer-Matrix sind Vorschläge; noch keine Implementierung begonnen und kein endgültiger Entwurf freigegeben.

## Global Constraints

- Charakterauswahl, Exportdialog und PDF-Download als Grundfunktion beibehalten.
- HTML- und Ulisses-Export erhalten; Korrekturen des einen Pfads nicht ungeprüft auf den anderen übertragen.
- Exportierte Text-, Zahlen- und Auswahlwerte bleiben über echte AcroForm-Felder editierbar; kein Flattening.
- Keine stillen Datenverluste durch Zeichenersetzung, Kürzung, Überlauf oder übersprungene Felder.
- Keine PDF-JavaScript-Abhängigkeit für grundlegendes Anzeigen, Bearbeiten und Speichern.
- Betrieb gegen die tatsächlich unterstützte Foundry-/DSA5-Kombination prüfen; Manifestangaben allein reichen nicht als Nachweis.

## Review Focus

- Lange Namen und große Listen: vollständig lesbar, ohne Abschneiden oder Widgets außerhalb der Seite — Tasks 3, 5, 7.
- Zeichen außerhalb des bisherigen Encoding-Bereichs und spätere Viewer-Eingaben: keine stille Ersetzung — Tasks 3, 8.
- Angelegte Ausrüstung, Behälter, Münzgewicht und aktive Effekte: korrekte Endwerte ohne Doppelzählung — Tasks 2, 6.
- Wiederholte Werte und Fortsetzungstexte: sinnvoll gekoppelte Widgets bei erhaltenem Text — Tasks 4, 7.
- Fehlende Assets, Feldfehler und fehlende Systemdaten: verständliche Fehlermeldung statt scheinbar erfolgreichem unvollständigem PDF — Tasks 3, 6, 8.

## Task 1 — P0: Reproduzierbare Ausgangsbasis und Referenzdaten

**Dateien:** `package.json`, `test/pdf-labels.test.js`, `scripts/ulisses/pdf-labels.js`, `test/templates.test.js`, `test/actor-fixtures.mjs`, `test/actor-snapshot.test.mjs`; neue kleine Testfixtures unter `test/fixtures/`.

- [ ] Externe Sprachdaten als kleine, zulässige Fixtures oder explizit konfigurierte Integrationstestquelle bereitstellen; den hartcodierten Nachbarpfad entfernen.
- [ ] Fehlgeschlagenen Traditionstest mit dem DSA5-Datenmodell abgleichen; Ursache in Fixture oder Implementierung korrigieren, Erwartung nicht lediglich abschwächen.
- [ ] Vorhandene PDF-Vorlagen verbindlich prüfen; einen fehlenden erwarteten Feldtyp als Fehler melden statt relevante Tests zu überspringen.
- [ ] Referenzcharaktere festhalten: profaner Held, Kämpfer mit Schild, Zauberer, Geweihter und großer Charakter mit langen Texten, vielen Gegenständen sowie DE/EN-Namen.
- [ ] Echte Foundry-Endwerte dieser Charaktere als Vergleich festhalten, einschließlich Ausrüstung, Effekten und Weltoptionen.

**Abnahme:** `rtk npm test` ist für die unabhängigen Tests reproduzierbar grün; separat konfigurierte Foundry-Integrationstests sind eindeutig ausgewiesen. Erwartete Referenzwerte liegen vor.

## Task 2 — P0: Datenrichtigkeit im HTML-Export

**Dateien:** `scripts/shared/actor-snapshot.js`, `scripts/shared/dsa5-api.js`, `test/actor-snapshot.test.mjs`, `test/actor-fixtures.mjs`.

- [ ] Zuerst Regressionstest für eine zusätzlich angelegte Rüstung mit Gewicht 100 schreiben: Das vereinbarte Gesamtgewicht erhöht sich um 100, während die Rüstung nur einmal angezeigt wird.
- [ ] Anzeigeinventar und Menge der für das Gesamtgewicht relevanten Gegenstände trennen; Behälter, Mengen, Münzoption und Gewichtsreduktion nach dem Systemmodell behandeln.
- [ ] Waffenwerte gegen den Foundry-Bogen prüfen: AT/FK, PA, Schildparade, tatsächliche TP, Boni, Modifikationen und Effekte. Systemaufbereitung verwenden, wo verfügbar; Actor-Daten beim Export nicht verändern.
- [ ] Initiative, Energie aktuell/maximal, Sozialstatus, Traditionen, Merkmale und Liturgieaspekte mit Referenzdaten absichern. Bei fehlenden Daten nicht ohne Prüfung einen echten Nullwert behaupten.

**Abnahme:** Referenzwerte stimmen überein. Tests unterscheiden fehlende Werte von 0, berücksichtigen ausgerüstete Gegenstände und prüfen, dass der Actor unverändert bleibt.

## Task 3 — P0: Verlustfreie und vollständige Formularerzeugung

**Dateien:** `scripts/htmlsheet/pdf-fields.js`, `html-to-pdf.js`, `test/pdf-fields.test.mjs`; gegebenenfalls neue lokale Schriftdateien unter `assets/fonts/` und zugehörige Lizenzdatei.

**Schnittstelle:** `collectPdfFields()` bleibt Eingang für gemessene Felder. `addPdfFields()` liefert künftig erzeugte Felder und Fehler strukturiert an den Export zurück; Form, Feldwert und Appearance werden vor dem Download gemeinsam validiert.

- [ ] Regressionstests für `Ä Ö Ü ß`, typografische Zeichen, `Ж`, kombinierte Zeichen und einen Text über 8.000 Zeichen schreiben. Nicht abgedeckte Zeichen müssen sichtbar gemeldet werden.
- [ ] Geeignete lizenzierte Schrift samt Einbettung und Formularressourcen integrieren; keine pauschale Ersetzung durch `?`, keine stille Kürzung.
- [ ] Absatz- und `<br>`-Grenzen bei der Übernahme von Notizen erhalten.
- [ ] Erzeugte Felder und ihre Werte mit den erwarteten Daten abgleichen; zu kleine Feldrechtecke, Erzeugungsfehler und Appearance-Fehler gesammelt melden.
- [ ] Speichern und erneutes Einlesen prüfen: Felder existieren, Werte sind vollständig, editierbar und mit gültiger Appearance versehen.

**Abnahme:** Zeichen und Texte bleiben erhalten; ein absichtlich fehlerhaftes Feld verhindert einen als erfolgreich gemeldeten unvollständigen Export.

## Task 4 — P1: Stabile Feldidentitäten und wiederholte Werte

**Dateien:** `scripts/shared/actor-snapshot.js`, `scripts/htmlsheet/render-sheet.js`, `pdf-fields.js`, `templates/htmlsheet/`; Tests in `test/pdf-fields.test.mjs` und `test/htmlsheet-render.test.mjs`.

- [ ] Logische Feldschlüssel auf Basis der Datenbedeutung und vorhandener Item-IDs definieren; seitenlokale Indizes und globale Seriennummern ersetzen, soweit sie Identität verhindern.
- [ ] Wiederholten Namen und andere semantisch identische Werte mit mehreren Widgets desselben Feldes ausgeben.
- [ ] Aktuell/Maximum, verwandte Werte und voneinander unabhängige Listeneinträge getrennt halten; zerlegte Langtexte mit eindeutigen Teilkennungen versehen.
- [ ] Tests für Namensänderung an mehreren Stellen, unterschiedliche Zauber über mehrere Seiten und getrennte Fortsetzungstexte ergänzen.

**Abnahme:** Identische Werte bleiben nach Änderung konsistent; unterschiedliche Items überschreiben einander nicht.

## Task 5 — P1: Gestaltung und Feldtypografie vereinheitlichen

**Dateien:** `styles/htmlsheet.css`, `styles/htmlsheet-print.css`, `scripts/config/print.js`, `scripts/htmlsheet/pdf-fields.js`, `templates/htmlsheet/`; neue visuelle Referenzen unter `test/fixtures/visual/`.

- [ ] Je eine repräsentative Personen-, Kampf- und Magieseite als Gestaltungsentwurf erstellen; Pergament- und Druckvariante vergleichen.
- [ ] Gemeinsame Gestaltungswerte für HTML und PDF festlegen: Titel, Abschnitt, Beschriftung, normaler Wert, Zahl, Tabellenwert und Langtext. Zielvorschlag: normale Werte 9–10 pt, Tabellen mindestens 8 pt.
- [ ] PDF-Widgets übernehmen Schriftrolle, Gewicht, Farbe, Ausrichtung und Innenabstand; Name und Eigenschaften behalten ihre visuelle Hierarchie.
- [ ] Tabellen mit passenden Spaltenbreiten, konsistenter Zahlenformatierung und klaren Einheiten versehen; Druckvariante mit sparsamen Orientierungslinien gestalten.
- [ ] Seitenzahlen, Charaktername und verständliche Fortsetzungshinweise ergänzen. Vor einer Rasterqualitätsänderung Schärfe und Dateigröße der Vergleichsausgaben messen.

**Abnahme:** Beide Varianten sind auf A4 bei 100 % lesbar; Formularwerte passen zum Layout, ohne überlappende Beschriftungen oder pauschale Verkleinerung auf 5 pt.

## Task 6 — P1: Ulisses-Export gezielt korrigieren

**Dateien:** `scripts/ulisses/fill-form.js`, `scripts/shared/image.js`, `scripts/ulisses/field-map.js`, `test/templates.test.js`; neue `test/ulisses-export.test.mjs`.

- [ ] JPG/PNG/WebP-Porträts einschließlich URLs mit Parametern testen; Bildformat korrekt erkennen oder vor dem Einbetten einheitlich konvertieren.
- [ ] Gewichtsberechnung und erste/zweite Inventarseite an den tatsächlichen Vorlagenfeldern prüfen; Grenztests mit 36 und 37 Einträgen ergänzen.
- [ ] Datenabgleich aus Task 2 auch für diesen Pfad durchführen. Gemeinsam genutzte Datenaufbereitung übernehmen, soweit das Vorlagenmodell sie abbildet.
- [ ] Exportierte Datenfelder auf Schreibschutz, Appearance und vollständige Werte prüfen. Feste Listenkapazitäten und Überschreitungen verständlich ausweisen.

**Abnahme:** Beide Exportwege geben für gemeinsame Felder dieselben fachlichen Werte aus; unterstützte Bildformate funktionieren und feste Grenzen sind erkennbar.

## Task 7 — P1: Seitenumbrüche ohne Inhaltsverlust

**Dateien:** `scripts/htmlsheet/paginate.js`, `render-sheet.js`, `styles/htmlsheet.css`; neue `test/pagination-browser.test.mjs` und Browserfixtures.

- [ ] Echte Browserlayouttests für eine übergroße erste Tabellenzeile, Zauber mit langer Wirkung, mehrspaltige Talente, lange Familien-/Berufsnamen und mehrseitige Notizen schreiben.
- [ ] Einzelne große Inhalte in sinnvolle Fortsetzungen aufteilen; Zauberbeschreibung dem richtigen Eintrag zuordnen und Tabellenköpfe wiederholen.
- [ ] Gesamten Dokumentinhalt nach dem Paginieren auf Überlauf und Widgetgrenzen prüfen. Eine erreichte Schutzgrenze muss einen erklärten Fehler auslösen.
- [ ] Feldwerte und Reihenfolge vor und nach der Aufteilung vergleichen; keine verlorenen, vertauschten oder doppelt ausgegebenen Inhalte zulassen.

**Abnahme:** Langtext- und große Listenfixtures bleiben vollständig, alle Widgets liegen innerhalb der vorgesehenen Seitenfläche.

## Task 8 — P1: Echte PDF- und Viewer-Abnahme

**Dateien:** Neue `test/pdf-export-roundtrip.test.mjs`, Browser-Exporttests und `docs/testing/pdf-viewer-matrix.md`; bestehende Testskripte erweitern.

- [ ] Vollständigen HTML→PDF-Export mit einem Browser automatisieren; Feldzahl, Typen, Rechtecke, Werte, Appearance und fehlende Schreibsperren prüfen.
- [ ] Öffnen–Ändern–Speichern–erneut-Öffnen für Text, Zahl, Mehrzeiler, Dropdown und wiederholte Werte testen.
- [ ] Vorgeschlagene manuelle Matrix: Acrobat Reader, Firefox/PDF.js, Edge oder Chrome und macOS Vorschau, sofern verfügbar. Versionen und Ergebnisse protokollieren; ungetestete Viewer ausdrücklich kennzeichnen.
- [ ] Druck und Bildschirm vergleichen: keine Geisterwerte im Hintergrund, keine abgeschnittenen Mehrzeiler, verständliche Tab-Reihenfolge und sichtbare neue Eingaben.
- [ ] Wiederholte Exporte großer Charaktere sowie fehlende Bilder und nicht verfügbare Systemdaten auf verständliches Verhalten und Ressourcenfreigabe prüfen.

**Abnahme:** Vereinbarte Viewer bestehen die vollständige Bearbeitungsfolge; tatsächliche PDF-Artefakte und Ergebnisse liegen als Nachweis vor.

## Task 9 — P2: Dokumentation und Release-Zuordnung

**Dateien:** `README.md`, `module.json`, `lang/de.json`, `lang/en.json`, neue Release-Notizen.

- [ ] Unterstützte Foundry-/DSA5-Kombinationen, Exportwege, feste Vorlagengrenzen und getestete PDF-Viewer dokumentieren.
- [ ] Erklären, dass manuelle PDF-Änderungen keine Rücksynchronisierung nach Foundry auslösen. Eine automatische Neuberechnung nach manuellen Änderungen nur zusagen, wenn sie gesondert umgesetzt und getestet wurde.
- [ ] Notizexport anhand der bestehenden Rollen und Berechtigungen prüfen und dokumentieren.
- [ ] Download-, Manifest- und Projektlinks für den beabsichtigten Fork-Release korrigieren; Modul-ID und Koexistenz mit dem ursprünglichen Modul bewusst behandeln.

**Abnahme:** Installation verweist auf das beabsichtigte Artefakt; Dokumentation stimmt mit der tatsächlich geprüften Funktion überein. Veröffentlichung ist ein nachgelagerter Schritt.

## Reihenfolge und Meilensteine

1. **Verlässliche Grundlage:** Tasks 1–2 — reproduzierbare Tests und korrekte Daten.
2. **Verlässlich editierbar:** Tasks 3–4 — vollständige Werte und stabile Formularfelder.
3. **Gut lesbar und vollständig:** Tasks 5–7 — Gestaltung, zweiter Exportpfad und Seitenumbrüche.
4. **Nachgewiesen nutzbar:** Tasks 8–9 — Viewer-Abnahme und passende Dokumentation.

Die Taskliste ist bewusst auf die bestehende Architektur zugeschnitten. Ein vollständiger Rendererwechsel erhält erst nach dem visuellen Vergleich eine eigene Entscheidung und Planung.
