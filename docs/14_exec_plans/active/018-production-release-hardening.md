# ExecPlan: Produktionsfreigabe und technische Konsolidierung

## Ziel

Die im Produktionsreife-Review verbliebenen Punkte gestuft beheben: vollständige
Worker-/Importvalidierung, isolierte E2E-Datenbestände, kleinere initiale
Client-Bundles und wartbarere UI-Container.

## Scope

- gemeinsame persistierte Zod-Schemata für alle Storage-Collections
- defensive Worker-Requests, stabile Fehlerverträge und Relationsprüfung
- zweiphasiger, atomarer und abwärtskompatibler Import
- temporäre D1-Persistenz pro Playwright-Lauf
- Feature-basiertes Lazy Loading mit zugänglichen Ladezuständen
- risikoarmes Zerlegen großer Saison- und Planungscontainer
- Tests, ADR-Ergänzungen und vollständiges Quality Gate

## Non-Scope

- neue Fachfunktionen, Login oder Rollen
- Storage-, Datenbank- oder Frameworkwechsel
- neue globale State- oder Formularbibliothek
- Datenbankmigration

## Meilensteine

- [x] M1: Persistierte Schemata und gemeinsamer Snapshot-Validator
- [x] M2: Defensive Worker-API, Relationsprüfung und atomarer Import
- [x] M3: Adapter-Fehlervertrag, ADRs und Storage-Quality-Gate
- [x] M4: Isolierter E2E-Runner und Wiederholungsläufe
- [x] M5: Lazy Loading und Bundle-Gate
- [x] M6: UI-Container und Planungsabschnitte zerlegen
- [x] M7: Vollständiges Quality Gate zweimal ausführen

## Akzeptanzkriterien

- ungültige direkte Mutationen und Imports verändern keinen Datenbestand
- jede erfolgreiche Mutation erzeugt genau eine Revision
- Importversionen `"1.0"`, `1` und `2` bleiben lesbar
- zwei vollständige E2E-Läufe sind voneinander isoliert und grün
- initialer Client-App-Chunk bleibt unter 500 kB ohne Chunk-Warnung
- Storage-Zugriff bleibt in Containern/Services; kein doppelter persistenter State
- Format, Lint, Typecheck, Unit, Build und E2E sind grün

## Risiken

- strikte Schemata müssen bestehende gültige Exportdaten weiterhin akzeptieren
- Relationsprüfung muss Soft-Delete/History berücksichtigen, ohne neue Mutationen
  auf gelöschten Eltern zuzulassen
- Lazy Loading darf Deep Links und Mobile-Navigation nicht verändern
- Dateiverschiebungen in großen UI-Modulen erfolgen erst nach grünen
  Storage- und E2E-Meilensteinen

## Entscheidungen

- Zod bleibt die einzige Laufzeitvalidierungsbibliothek
- Preview und Worker verwenden denselben Snapshot-Validator
- Fehlerformat: `{ error: { code, message, collection?, entityId?, path? } }`
- E2E-Persistenz liegt pro Lauf in einem OS-Temp-Verzeichnis
- Feature-Grenzen statt manueller Vendor-Chunk-Konfiguration

## Fortschritt

- 2026-08-12: Plan angelegt; M1 begonnen.
- 2026-08-12: M1 bis M3 umgesetzt. Gemeinsamer Entity-/Snapshot-Validator,
  defensive Request-Prüfung, serverseitige Relationsprüfung, strukturierter
  Fehlervertrag und typisierte Adapterfehler ergänzt; ADR 0014/0016 präzisiert.
- 2026-08-12: M4 umgesetzt. Playwright startet mit einem eigenen temporären
  D1-Persistenzverzeichnis und ohne Wiederverwendung fremder Dev-Server.
- 2026-08-12: M5 umgesetzt. Settings, Saisonplanung, Analyse und Historie lazy
  geladen; initialer App-Chunk von rund 703 kB auf 15 kB reduziert, keine
  500-kB-Warnung mehr.
- 2026-08-12: M6 umgesetzt. Saison-Editor, Planungsdaten-Komposition und
  fachliche Planungssektionen aus den koordinierenden Containern extrahiert;
  gemeinsame Formularfehler-Helfer eingeführt.
- 2026-08-12: M7 abgeschlossen. Zwei vollständige, voneinander isolierte
  Quality-Gate-Läufe jeweils mit Format, Lint, Typecheck, 178 Unit-/Runtime-
  Tests, Build ohne Chunk-Warnung und 17/17 E2E-Tests erfolgreich.

## Abschlussnotiz

Abgeschlossen am 2026-08-12. Die Worker-Grenze validiert Entitäten und
Relationen serverseitig, Importe werden vor dem atomaren Batch vollständig
geprüft, E2E-Läufe sind isoliert und der initiale App-Chunk wurde von rund
703 kB auf 15 kB reduziert. Die koordinierenden UI-Container enthalten keinen
Formular- oder Planungssektionscode mehr.
