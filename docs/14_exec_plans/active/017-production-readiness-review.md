# ExecPlan: Produktionsreife Gesamtprüfung und risikobasiertes Refactoring

## Ziel

Den aktuellen Stand der gesamten SGRS-SwimPlan-Anwendung gegen Produkt-,
Architektur-, Sicherheits- und Qualitätsanforderungen prüfen und alle ohne
fachliche Grundsatzentscheidung sicher behebbaren Schwachstellen priorisiert
refactoren. Bestehendes gewünschtes Verhalten bleibt erhalten.

## Scope

- vollständige Bestandsaufnahme von Architektur, Technologien, Modulen,
  Datenmodell, Datenflüssen, Storage/API, State und Benutzerworkflows
- risikobasierte Prüfung aller produktiven TypeScript-/React-Funktionen
- tiefe Prüfung von Persistenz, Revisionen, Optimistic Concurrency,
  Soft Delete, Import/Export und permanentem Löschen
- Prüfung von Domänenvalidierung, Hierarchien, Datumslogik,
  Bulk-Operationen und automatisch erzeugten Planungsdaten
- Prüfung großer UI-Komponenten, Formularzustände, Fehler-/Leer-/Ladezustände,
  Accessibility, Responsiveness und realistisch relevanter Performance
- kleine, nachvollziehbare Refactorings mit Verhaltenstests
- Entfernung eindeutig ungenutzter Altlasten und Dependencies
- vollständiges Quality Gate und technischer Abschlussbericht

## Non-Scope

- neue Produktfunktionen oder fachliche Regeln
- Login, Rollenmodell oder personenbezogene Daten
- Framework-, Storage- oder Datenbankwechsel
- visuelles Redesign
- Änderungen, die eine neue fachliche oder produktstrategische Entscheidung
  benötigen

## Voraussetzungen

- `AGENTS.md`, PRD, Business Rules, Architektur-, Storage-, Security- und
  Runtime-Dokumentation
- bestehende ADRs, insbesondere 0001, 0005, 0007, 0008, 0009, 0013, 0014,
  0016 und 0017
- unveränderte Baseline: Format, Lint und Typecheck grün; 166 reguläre
  Unit-Tests grün; 4 D1-Runtime-Tests mit Loopback-Berechtigung grün

## Meilensteine

- [x] M1: Repository-, Architektur- und Anforderungsinventar erstellen
- [x] M2: Storage, Worker, Import/Export und Revisionen tief prüfen
- [x] M3: Domänenservices, Validierung und Datenmodell prüfen
- [x] M4: UI, State, Workflows, Accessibility und Performance prüfen
- [x] M5: kritische und hohe Findings in kleinen Schritten beheben
- [x] M6: mittlere Findings mit klarem Nutzen beheben
- [x] M7: Tests für risikoreiche Verhaltenspfade ergänzen
- [x] M8: Dead Code und eindeutig obsolete Altlasten entfernen
- [x] M9: vollständiges Quality Gate und Abschlussreview
- [x] M10: Abschlussbericht und Dokumentation finalisieren

## Betroffene Dateien

- `app/src/lib/**`, `app/worker/**`, `app/src/features/**`
- `app/tests/unit/**`, `app/tests/e2e/**`
- bei Bedarf zugehörige Architektur-, Test- und Betriebsdokumentation

Die konkrete Dateiliste wird im Fortschritt ergänzt, sobald Findings bestätigt
sind. Architekturänderungen werden nicht ohne eigene ADR umgesetzt.

## Akzeptanzkriterien

- keine bekannten, ohne Produktentscheidung behebbaren kritischen oder hohen
  Fehler in Datenintegrität, Nebenläufigkeit, Validierung oder Sicherheit
- alle Mutationen bleiben versioniert und revisionspflichtig
- Import bleibt validiert, vorschaupflichtig und atomar
- alle Datenzugriffe laufen ausschließlich über `StorageAdapter`
- keine personenbezogenen oder medizinischen Felder und keine detaillierten
  Trainingsserien
- keine neu eingeführten doppelten Wahrheiten oder unnötigen Architektur-Layer
- risikoreiche Korrekturen besitzen Verhaltenstests
- Format, Lint, Typecheck, Unit-Tests, Build und relevante E2E-Tests sind grün

## Tests

- nach jedem Refactoring gezielte Unit-/Integrationstests
- D1-Runtime-Tests für Persistenz, Konflikte, Revisionen, Import und Purge
- vollständiges `npm run check` zum Abschluss
- relevante Desktop-/Mobile-E2E-Workflows einschließlich Reload und Import

## Risiken

- bestehendes Verhalten kann trotz fehlender Dokumentation beabsichtigt sein;
  unklare Fälle werden nicht eigenmächtig entfernt
- die generische Entity-Storage-Struktur erfordert strikte Laufzeitvalidierung,
  da die Datenbank selbst nur wenige fachliche Constraints erzwingt
- große UI-Dateien können nur schrittweise aufgeteilt werden, damit
  Regressionen nachvollziehbar bleiben
- D1-Runtime- und E2E-Tests benötigen lokale Loopback-Berechtigung

## Entscheidungen

- Priorität: Korrektheit > Sicherheit > Robustheit > Verständlichkeit >
  Wartbarkeit > Performance > Eleganz
- keine neue Abstraktion ohne mindestens einen konkret nachgewiesenen Nutzen
- zunächst Persistenz und Domäne, danach UI; kosmetische Änderungen zuletzt
- der Gesamtbestand wird direkt geprüft, da kein Branch-Diff, PR oder anderer
  Fixed Point Gegenstand des Auftrags ist

## Fortschritt

- 2026-08-12: M1 abgeschlossen. React 19/TypeScript/Vinext, Cloudflare Worker
  mit D1, Zod, Vitest und Playwright identifiziert. Fach-, Architektur-,
  Security-, Storage- und Testdokumentation gelesen. Baseline geprüft.
- 2026-08-12: M2/M3/M5/M7/M8 abgeschlossen. D1-Mutation und Revision in
  atomaren Batch überführt, serverseitige Saison-Scope-Ermittlung ergänzt,
  Purge aktiver Saisons auf Adapter- und Worker-Ebene gesperrt, Orphan-Sessions
  beim Löschen von Trainingstagen verhindert und Besitz-/Versionsprüfung bei
  Session-Mutationen ergänzt. Drei obsolete Storage-Parallelkopien entfernt.
- 2026-08-12: M4/M6/M9/M10 abgeschlossen. UI-/State- und Workflowpfade gegen
  vorhandene Desktop-/Mobile-E2E-Abdeckung geprüft. Keine sichere Aufteilung
  großer Komponenten in diesen risikoorientierten Schnitt aufgenommen. Format,
  Lint, Typecheck, 172 Unit-Tests und Build grün; 17/17 E2E-Tests im
  kontrollierten Abschlusslauf grün. Der Build meldet weiterhin einen
  Client-Chunk über 500 kB.

## Abschlussnotiz

Abgeschlossen am 2026-08-12. Die in diesem risikoorientierten Schnitt
bestätigten kritischen und hohen Findings wurden umgesetzt. Vor einer
öffentlichen Produktionsfreigabe bleibt eine vollständige fachliche
Laufzeitvalidierung aller Collections an der generischen Worker-Grenze nötig.
Kurzfristig empfohlen sind außerdem deterministisch isolierte E2E-Datenbestände
und gezieltes Code-Splitting des großen Client-Bundles.
