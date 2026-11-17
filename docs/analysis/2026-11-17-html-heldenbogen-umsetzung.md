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
