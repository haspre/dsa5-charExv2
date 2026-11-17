# Umsetzung: HTML-Heldenbogen

## Umfang

Vom Nutzer freigegeben: bestehende Architektur schrittweise verbessern, Fokus auf Datenfelder, Typografie und Formularfelder des HTML-Heldenbogens. Die alte Ulisses-Vorlage und ihr Exportcode bleiben unverändert. Zusatzanforderung: Eingefügter Text soll beim Export abhängig vom verfügbaren Platz dynamisch verkleinert werden.

Der separate Checkout unter `charexv2/` wurde in-place bearbeitet. Keine Veröffentlichung, kein Push und kein Eingriff in das übergeordnete Home-Repository.

## Änderungen

- Gewichtsberechnung verwendet den vorbereiteten DSA5-Wert `system.totalWeight`, falls vorhanden; der Fallback berücksichtigt sämtliche Ausrüstung einschließlich angelegter Gegenstände, Mengen und der Münzgewichtsoption. Der Fallback ersetzt keine komplexen Systemregeln für Behälter.
- Traditionen werden aus passenden Traditions-Sonderfertigkeiten gelesen; ältere Stringwerte bleiben als Fallback erhalten. Mehrere vorhandene Traditionen werden vollständig ausgegeben.
- Lokale reguläre und fette DejaVu-Sans-Schriften werden für HTML und PDF verwendet. Die PDF-Schriften werden vollständig eingebettet und als Formularressourcen registriert, damit spätere Eingaben zusätzliche unterstützte Zeichen verwenden können.
- PDF-Werte übernehmen die gemessene CSS-Schriftgröße und Fettschrift. Größere Titel und Eigenschaftswerte behalten damit ihre Hierarchie.
- Zu lange Texte werden anhand echter Glyphenbreiten und bei Mehrzeilern anhand des Umbruchs und der Zeilenhöhe verkleinert. Die normale Schriftgröße ist die Obergrenze. Bei weniger als 2 pt nötiger Größe wird ein Fehler gemeldet, statt den Inhalt abzuschneiden.
- Kein Abschneiden bei 8.000 Zeichen und keine stille Ersetzung fehlender Zeichen durch Fragezeichen. Nicht unterstützte Zeichen führen zu einer verständlichen Fehlermeldung.
- Rich-Text-Absätze und Zeilenumbrüche bleiben im Formularwert erhalten.
- Wiederholte Namensanzeigen verwenden mehrere Widgets eines gemeinsamen Namensfeldes; Listenfelder und aufgeteilte Texte bleiben getrennt.
- Fehler bei der Feldanlage stoppen den Export; sie verschwinden nicht mehr nur in der Konsole.
- Tabellen haben lesbarere Grundschrift und Innenabstände; die Druckvariante hat feine Tabellenlinien und einen korrigierten, über die volle Breite laufenden Seitenkopf.

Die automatische Verkleinerung erfolgt beim Export. Spätere manuelle Änderungen in einem Viewer sind editierbar, lösen aber keine eigene Modul-Logik zur Neuberechnung der Schriftgrößen oder abgeleiteter Charakterwerte aus.

## Nachweise

- Zuerst fehlgeschlagene Regressionstests für fehlendes Ausrüstungsgewicht und unabhängige Namensfelder; anschließend bestanden.
- `npm run test:html`: acht Testdateien bestanden, einschließlich Daten-, PDF-Formular-, Rendering- und Ressourcenprüfungen.
- Browserexport mit Playwright: Pergament- und Druckvariante mit langem Namen, langem Beruf, kyrillischen Zeichen, mehrzeiligen Notizen sowie allen Exportabschnitten erzeugt.
- Beide Testausgaben enthalten sieben Seiten und 189 editierbare logische Felder. Wiederholte Namen sind Widgets desselben Feldes.
- Die PDFs werden zusätzlich mit PDF.js gerendert. Ein Namensfeld wird über PDF.js geändert und gespeichert; der Wert wird anschließend mit pdf-lib erneut eingelesen und geprüft.
- Die erste Seite beider tatsächlichen PDF-Ausgaben wurde visuell geprüft.
- Unabhängige Codeprüfung: keine wichtigen Fehler in Formularressourcen, Appearances, Namens-Widgets oder der Textanpassung gefunden.
- Der ursprüngliche Gesamtbefehl `npm test` bleibt beim bestehenden Ulisses-Test wegen der externen Datei `../foundry14/lang/en.json` blockiert. Diese Legacy-Abhängigkeit wurde entsprechend dem gewünschten Umfang nicht verändert.

Die neuen Browserprüfungen benötigen einen lokal installierten Playwright-Chromium und einen erlaubten lokalen Testserver. Mit `CHAREX_ARTIFACT_DIR` lassen sich PDF-Dateien und Vorschaubilder behalten; der Renderer- und Speichertest läuft auch ohne diese Variable.

## Verbleibende Abnahme

Ein realer Foundry-Export mit Nutzerdaten sowie manuelle Tests in Acrobat Reader und macOS Vorschau wurden nicht durchgeführt. Komplexe Kampfwertberechnungen, eine generelle Überarbeitung des Paginators und stabile Item-IDs für alle Listen sind weitere Schritte aus der ursprünglichen Analyse; sie sind durch diese Änderung nicht als erledigt erklärt.

## Nachtrag: eigene Modul-ID

Auf Nutzerwunsch wurde die Modul-ID auf `dsa5-charexv2` umgestellt. Manifest,
Laufzeitkonstante, Modulpfade, Übersetzungs-Namespace, Dialog und Tests verwenden
die neue Identität. Im alten Ulisses-Pfad wurden dafür lediglich Modulreferenzen,
Übersetzungsschlüssel, Protokollpräfixe und die Projekt-Metadaten angepasst.
Die fachliche Exportlogik blieb unverändert. Das zusätzliche Identitätstestskript
prüft Manifest, Laufzeitpfade und beide Sprachdateien. Die Installation erfolgt
als eigenständiges Modul; die ursprüngliche Modulaktivierung wird nicht migriert.

## Nachtrag: Feldhöhen, Talentzeilen und Traditionsartefakte (0.10.4)

- Energiefelder und vergleichbare Werte erhalten mindestens 28 CSS-Pixel Höhe
  statt der bisherigen etwa 18 Pixel; die Schriftgröße bleibt erhalten.
- Talentzeilen bleiben bei 24 Pixeln Höhe. Lange Namen werden innerhalb der
  einzeiligen Felder angepasst. Die BE-Spalte nutzt 16 statt 10 Prozent der
  Tabellenbreite, damit `ja`, `evtl` und `nein` vollständig passen.
- Magische Sonderfertigkeiten verwenden die Kategoriengruppe des DSA5-Systems
  mit einem Fallback für magische Stile und erweiterte Fertigkeiten.
- Sonderfertigkeiten der Traditionsartefakte werden aus Kategorie `staff` samt
  Stufe in einem eigenen editierbaren Abschnitt ausgegeben. Sie werden auch ohne
  Zauber oder AsP exportiert und nicht zusätzlich in der allgemeinen Magieliste
  dupliziert.
- Beim Aufteilen einer Tabelle werden nachfolgende Abschnitte mitgenommen.
  Zuvor blieben Zaubertricks und Sonderfertigkeiten hinter direkt im Seitenkörper
  liegenden Tabellen auf der überlaufenden Ursprungsseite stehen.
- Die Umbruchgrenze berücksichtigt die tatsächliche Inhaltsfläche statt des
  äußeren Seitencontainers. Sprach-/Schriften- und Merkmalsblöcke innerhalb von
  `display: contents` werden einzeln geprüft. Vollständig verschobene Abschnitte
  hinterlassen keine leeren, abgeschnittenen Formularfelder auf der alten Seite.
- Browserregressionen prüfen 60 Talente einschließlich langer Namen und aller
  drei BE-Werte sowie 16 Zauber mit langen Wirkungen. Zusätzlich werden die
  tatsächlichen PDF-Widgets und die Artefaktfähigkeiten nach erneutem Einlesen
  geprüft. Der Browsertest erzeugt Vorschaubilder der Personen-, Talent- und
  Artefaktseiten.

Referenz für Kategorie `staff` und die magischen Kategorien:
https://github.com/Plushtoast/dsa5-foundryVTT/blob/foundry14/modules/data/item/specialability.js

Die bestehende externe Sprachdatei-Abhängigkeit der Legacy-Gesamttests besteht
weiter; die HTML-Tests können unabhängig davon ausgeführt werden.

## Nachtrag: kompaktere Seitenaufteilung (0.10.5)

Auf Nutzerwunsch entfällt die Zustandstabelle vollständig aus dem HTML-PDF.
Sprachen und Schriften stehen unter den Angaben und Merkmalen auf der
Personenseite. Die Kopfzeile mit Tradition, Merkmal, Leiteigenschaft und AsP vor
der Zaubertabelle entfällt ebenfalls, damit Sonderfertigkeiten und
Traditionsartefakte mehr Platz erhalten. Die automatische Aufteilung längerer
Inhalte bleibt aktiv; es werden keine festen Seitenzahlen erzwungen.

Die Rendering- und Browsertests prüfen die neue Zuordnung, das Fehlen der
entfernten Formularfelder und die weiterhin vollständigen Artefaktfähigkeiten.
Die vom Nutzer bereitgestellte Beispiel-PDF bleibt außerhalb des Repositorys.

## Nachtrag: Tabellenpositionen und Geschwindigkeit (0.10.6)

Beim Vergleich des tatsächlichen html2canvas-Klons mit dem gemessenen
Original-Layout wurde eine Abweichung von etwa 13 Pixeln in der ersten
Kampftabellenspalte reproduziert. Die Normalisierung von Groß-/Kleinschreibung
und Schriftabständen findet nun bereits vor Seitenaufteilung und Feldmessung
statt. Für die Aufnahme werden die gemessenen Spaltenbreiten zusätzlich per
`colgroup` fixiert. PDF-Widgets berücksichtigen Rahmen, CSS-Innenabstände und das
interne 1-pt-Textpadding von pdf-lib; die CSS-Ausrichtung wird übernommen.

Die wiederholten Werte GS/LeP/AW/INI/SK/ZK entfallen auf der Kampfseite. GS auf
der Personenseite nutzt den vorbereiteten DSA5-Wert `status.speed.max`, auch wenn
dieser legitim 0 ist. Für unvorbereitete Daten wird `initial + modifier +
gearmodifier` verwendet. Im bereitgestellten JSON ist `initial = 8` und
`value = 0`; letzteres ist nicht die exportierbare vorbereitete Geschwindigkeit.
Der Export liefert damit 8.

Regressionstests prüfen die Zellgeometrie während der tatsächlichen
html2canvas-Aufnahme, PDF-Textpositionen relativ zu CSS-Innenabständen und
Geschwindigkeitsdaten einschließlich einer vorbereiteten Geschwindigkeit 0.
Die persönlichen JSON-/PDF-Beispieldaten verbleiben außerhalb des Repositorys.

## Nachtrag: Inventarpreise und Summenübersicht (0.10.7)

`system.price.value` enthält den Stückpreis in Silbertalern, passend zu den
Münzwerten Silber = 1 und Dukaten = 10 im bereitgestellten JSON. Bei vorhandenen
Preisen erscheint eine zusätzliche editierbare Stückpreisspalte. Der Gesamtwert
summiert Stückpreis mal Anzahl für sämtliche gelisteten Inventareinträge, auch
über mehrere Seiten hinweg. Münzen und ausschließlich in Kampftabellen
aufgeführte Ausrüstung werden nicht in diesen Tabellenwert eingerechnet.

Fehlende, leere oder ungültige Preise werden als `—` angezeigt und nicht als 0
interpretiert. Bei unvollständigen Preisen werden bekannter Wert und Anzahl der
Einträge ohne Preis ausgewiesen. 0 bleibt ein gültiger Preis. Ohne jegliche
Preisangaben entfallen Preisspalte und Bewertung. Die Summe wird auf Kreuzer
(0,01 ST) gerundet; die Anzeige nutzt deutsche bzw. englische Zahlenformatierung.

Gewicht, Tragkraft und Preiswert stehen in getrennten Übersichtsboxen mit
mindestens 28 Pixel hohen Wertefeldern und 6 Pixel Abstand zur Beschriftung.
Diese Boxen können zusammen auf eine Folgeseite wechseln, statt abgeschnitten
zu werden. Die Felder bleiben editierbar; die Summe wird beim Export berechnet.

Tests decken Mengen, Nullpreise, fehlende Preise, Währungsrundung und die
Trennung vom Geldbeutel ab. Browserprüfungen kontrollieren Mindestabmessungen,
Abstände, Feldwerte und die unveränderten Spaltenpositionen im tatsächlichen
Capture-Klon.

## Nachtrag: Zaubererweiterungen (0.10.8)

Im Actor vorhandene `spellextension`-Items werden über `system.source` und
`system.category` dem passenden Zauber, Ritual bzw. der passenden Liturgie oder
Zeremonie zugeordnet. Name und Beschreibung aus `system.description.value`
erscheinen als editierbare Felder direkt im Wirkungsblock des jeweiligen
Eintrags. Absatz- und Zeilenumbrüche bleiben als Klartext erhalten. Verfügbare,
aber nicht im Actor enthaltene Erweiterungen werden nicht ergänzt; SL-interne
Beschreibungen bleiben ausgeschlossen.

Der gemeinsame Tabellenblock hält Erweiterungen und Zauber beim Seitenumbruch
zusammen. Ohne Erweiterungen wird kein leerer Abschnitt angelegt. Die Tests
prüfen Zuordnung trotz gleicher Namen verschiedener Zaubertypen, unzugeordnete
Erweiterungen, Beschreibungen und die tatsächlichen PDF-Felder auf Folgeseiten.
