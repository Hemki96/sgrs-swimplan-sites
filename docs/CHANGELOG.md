# Changelog

## 2026-08-12 – Production Release Hardening

- Persistierte Zod-Schemata und gemeinsame Snapshot-/Relationsvalidierung für
  Browser-Preview und Worker ergänzt.
- Worker-Requests defensiv geparst, strukturierte API-Fehler und typisierte
  Adapterfehler eingeführt; Mutation und Revision bleiben atomar.
- Playwright-Läufe auf temporäre, voneinander isolierte D1-Persistenz umgestellt.
- Settings, Saisonplanung, Analyse und Historie lazy geladen; initialen
  App-Chunk von rund 703 kB auf 15 kB reduziert.
- Saison-Editor und Planungsdaten-Sektionen aus den koordinierenden UI-
  Containern extrahiert.

## 2026-08-12 – Formular-Entlastung (ExecPlan 016)

- Pflichtfelder entspannt: Saison (`description`, `mainGoal`), Wettkampf
  (`endDate`), Kalenderrestriktion (`severity`), Zyklen (`goal`, `notes`),
  Mikrozyklus (`targetRpe`), Codes (Dimension/Fokus/Equipment) und
  Fokussegment (`dimensionId`) sind jetzt optional.
- Smarte Defaults im `SeasonPlanningService`: Wettkampf-`endDate` übernimmt
  bei leerer Eingabe das Startdatum; Codes werden aus dem Namen generiert;
  die Fokussegment-Dimension wird aus dem Fokus abgeleitet; bei der
  Periodisierung wird automatisch ein „Standard“-Eventtrack angelegt.
- Neues Formular „Wochen automatisch erzeugen“: Ein Klick erzeugt alle
  Kalenderwochen eines Mesozyklus als Mikrozyklen (`KW nn`, idempotent).
- `Microcycle.targetRpe` ist optional geworden; die Matrix zeigt leere Werte
  als „–“ und erlaubt deren Pflege.
- SessionEditor mit progressive Disclosure: Titel, Uhrzeit, Dauer, Technical
  Focus, Equipment, Status und Key Session sind unter „Weitere Optionen“
  aufklappbar; sichtbar bleiben Main Focus, Umfang, RPE und Hinweis.
- Wochenansicht mit Schnellbearbeitung: Main Focus, RPE und Umfang werden
  ohne vollen Dialog inline gepflegt („Speichern“, „Abbrechen“,
  „Mehr bearbeiten“).
- 6 neue Unit-Tests in `tests/unit/season-planning-service.test.ts`;
  Quality Gate (format, lint, typecheck, 166 Unit-Tests, Build) grün.

## 2026-08-11 – Wiederkehrende Trainingstermine (ExecPlan 015)

- Neue Entity `TrainingScheduleTemplate` für regelmäßige Trainingszeiten
  (Wochentag, Start-/Endzeit, Ort, Gültigkeitszeitraum, aktiv) mit
  versioniertem und soft-deletable CRUD über den `SeasonPlanningService`.
- Automatische, idempotente Generierung von `TrainingSession`s für jede
  passende Kalenderwoche innerhalb der Saison (inaktiv/deaktiviert/außerhalb
  des Gültigkeitszeitraums → keine Erzeugung).
- Template-Änderungen werden auf zukünftige, noch nicht individuell
  veränderte Sessions übernommen; vergangene und getrennte Sessions bleiben
  unverändert (`scheduleDetached`).
- `TrainingSession` um `scheduleTemplateId`, `generatedFromSchedule`,
  `scheduleDetached` und `status` (`planned` | `cancelled`) ergänzt; eine
  Session wird bei abweichender Startzeit/Dauer automatisch vom Template
  getrennt.
- Neue Verwaltungsseite „Einstellungen → Trainingszeiten“ mit Tabelle,
  Hinzufügen/Bearbeiten, Deaktivieren und Soft Delete.
- Wochenansicht kennzeichnet automatische Sessions als „Standardtermin“,
  zeigt ausgefallene Sessions und eine Restriktionswarnung bei
  Kalenderrestriktionen.
- Export/Import (JSON) inklusive `trainingScheduleTemplates`; Seed-Daten um
  zwei Standardtermine ergänzt.
- 11 neue Unit-Tests (`training-schedule.test.ts`) sowie angepasste
  Fixture-Zählungen; Quality Gate (format, lint, typecheck, 160 Unit-Tests,
  Build) grün.

## 2026-08-11 – Massenpflege für Wettkämpfe (Bulk-Editor)

- Neuer Tabellarischer Bulk-Editor für Wettkämpfe, erreichbar über den Button
  „Massenpflege“ in der Wettkampfverwaltung (Planungsdaten-Tab).
- UI-unabhängiges Bearbeiten-Modell unter `features/seasons/bulkEventsModel.ts`
  mit Validierung, Speicherplanung, Paste-Parsing und Filterlogik.
- Standardspalten Datum, Name, Priorität, Ort; optionale Spalten Enddatum,
  Eventspur, Kategorie, Ziel, Notiz per Toggle einblendbar.
- Excel-ähnliche Bedienung: Tab/Enter navigieren zwischen Zellen, in der
  letzten Zelle der letzten Zeile wird automatisch eine neue Zeile erzeugt,
  Copy & Paste verteilt tabulatorgetrennte Zeilen auf Tabellenzeilen.
- Globale Defaults für neue Zeilen: Event Track (vorausgewählt) und Priorität.
- Bestehende Wettkämpfe bearbeitbar mit Filtern nach Zeitraum, Eventspur
  und Priorität; Duplizieren je Zeile; Soft Delete mit Bestätigung.
- Validierung pro Zeile: Harte Fehler (Datum/Name fehlend, Enddatum vor
  Startdatum, ungültige Werte) blockieren Speichern; Warnungen (Ort/Ziel
  fehlend, mehrere Wettkämpfe am selben Tag, außerhalb Periodisierung)
  blockieren nicht.
- Gemeinsames Speichern mit Revision pro Mutation, Teilfehler werden
  pro Zeile dokumentiert (erfolgreiche Zeilen bleiben gespeichert).
- 16 Unit-Tests in `tests/unit/bulk-events-model.test.ts`; Typecheck, Lint,
  160 Unit-Tests und Format grün.

## 2026-08-11 – Automatische Zyklusvorschläge aus Wettkämpfen (ExecPlan 003 Erweiterung)

- Pure Function `generateCycleSuggestions` in `src/lib/domain/cycleSuggestions.ts`, die aus Wettkämpfen Makro-, Meso- und Mikrozyklen als Vorschläge erzeugt
- A-Wettkämpfe definieren Makrozyklus-Zielpunkte, B-Wettkämpfe definieren Mesozyklus-Grenzen
- Mikrozyklen als 7-Tage-Einheiten innerhalb von Mesozyklen (angepasst an Zyklusgrenzen)
- Hierarchie-Enforcement: Neuer Makro → neuer Meso → neuer Micro; neuer Meso → neuer Micro
- Konflikterkennung: A-Wettkämpfe am selben Tag, nahe A-Wettkämpfe < 14 Tage, Meso < 7 Tage, Micro < 3 Tage
- Bestehende Planungen werden niemals überschrieben – Warnhinweis stattdessen
- Vorschau-UI mit Bearbeiten-Modus: Namen ändern, Datumsbereiche anpassen,
  Zielwettkampf je Makro ändern, Micro-Namen editieren, Zyklen hinzufügen
  (Makro/Meso/Micro) und „Neu berechnen“-Aktion
- Micro-Naming nach Konvention „Micro 1.1.1“ bis „Micro 1.2.n“ (Sektion 16)
- Hierarchie-Validierung (`validateSuggestionHierarchy`): Hinweise, wenn Meso/
  Micro nach einer Grenzänderung außerhalb des übergeordneten Zyklus liegen –
  es wird nichts automatisch verändert
- Übernahme ausschließlich über den bestehenden `SeasonPlanningService` mit Revisionserstellung
- 19 Unit-Tests und 5 Integrationstests; Typecheck, Lint und Build grün

## 2026-08-10 – Mobile Today & Session Card (ExecPlan 007)

- Mobile Startansicht „Heute“ (M1): `TodayView` mit Meso-/Mikrozyklus-Summary,
  Target RPE, Wochenziel, Day Context, Sessions, nächstem Wettkampf sowie
  Ausrüstung und Hinweisen; Tagesdaten dedupliziert über das `todayViewModel`
  abgeleitet.
- Session Card (M3): `SessionCard` als fokussierbare, barrierefreie Karte mit
  Zeit, Titel, Dauer, Umfang, RPE und Fokus; Klick öffnet den `SessionEditor`
  in der Heute-Ansicht.
- Tag-/Woche-Navigation (`MobileWeekPlanning`) mit `tablist`/`aria-selected`-
  Semantik; alle Mutationspfade über `SeasonPlanningService`/`StorageAdapter`.
- Verifikation: kein horizontaler Überlauf bei 320 px und 390 px; Quality Gate
  grün mit 92 Unit-Tests und 13 Chrome-E2E-Tests (inkl. Responsive 320–1440 px).
- ExecPlan 007 abgeschlossen: M1/M3 nachträglich bestätigt; M4 Navigation bleibt
  wie dokumentiert ExecPlan 012 überlassen.

## 2026-08-10 – History & Recovery (ExecPlan 006)

- Neuer Tab „Historie“ in der Planungs-Shell mit Revisionsliste (neueste zuerst),
  Entitätsfilter und Feld-Diff je Revision (M1/M2).
- `HistoryService` mit `listRevisions`, `listEntityHistory`, `restoreRevision`
  und `restoreEntity`; Restore unterliegt optimistischem Locking –
  Konflikte werden gemeldet, nie still überschrieben (M4).
- „Wiederherstellen“ je Revision stellt den Zustand vor dem Löschen bzw. den
  Zustand der gewählten Revision wieder her und erzeugt eine neue Revision.
- Undo-Toast „Rückgängig“ nach Soft Delete in allen Planungsdaten-Sections
  (M5); Saison-Undo bleibt unverändert.
- 8 neue Unit-Tests (`history-service.test.ts`) und ein neues E2E-Szenario;
  Format, Lint, Typecheck, 89 Unit-Tests und Build grün.

## 2026-08-10 – Import/Export REST (ExecPlan 009, M3)

- `GET /api/storage/export` liefert nun das dokumentierte, versionierte
  JSON-Format (`schemaVersion: "1.0"`, `exportedAt`, camelCase-Collections)
  direkt als Backup-Datei.
- `POST /api/storage/import` validiert den Snapshot serverseitig
  (Struktur, bekannte Collections, gültige Entities und Versionszähler,
  Saison-Scope) und wird weiterhin als eine atomare D1-Batch-Operation
  angewendet; Konflikte geben 409 ohne Teilwrites.
- Storage-REST-Logik in `worker/storage.ts` extrahiert; Worker-Tests mit
  Mock-D1 decken Exportformat, Export-Import-Roundtrip über Preview/Remap,
  Validierungsfehler und atomare Konfliktbehandlung ab.
- Das Collection-Mapping liegt zentral in `EXPORT_COLLECTION_KEYS`
  (`StorageAdapter.ts`) und wird von Export, Import und Adapter geteilt.
- Quality Gate: 91 Unit-Tests bestanden; der E2E-Import-Vorschaufiuss bleibt
  grün.

## 2026-08-10 – Saisonmatrix-Editing (ExecPlan 004, M5)

- Blöcke der Saisonmatrix sind direkt bearbeitbar: Klick öffnet einen Dialog
  mit dem vollständigen Entity-Formular für Wettkämpfe, Restriktionen,
  Macro-/Meso-/Mikrozyklen und Fokussegmente.
- Löschen im Dialog als Soft Delete mit Bestätigung; Speichern und Löschen über
  den `SeasonPlanningService` mit Revision, Validierung und
  Versionskonflikt-Schutz.
- Klick auf eine Leerfläche einer Matrixzeile legt ein neues Entity mit dem
  Zeitraum der angeklickten Kalenderwoche an; das „+“ im Bereichslabel ebenso
  für die erste Woche.
- Micro Target RPE ist inline im Block editierbar (Zahl anklicken, Wert
  bestätigen mit Enter oder Blur).
- UI-unabhängiges Bearbeiten-Modell unter `season-matrix/matrixEditingModel.ts`
  mit 5 neuen Unit-Tests; E2E deckt Anlegen, Bearbeiten, Löschen und Inline-RPE
  ab. Quality Gate: 75 Unit- und 12 E2E-Tests bestanden.

## 2026-08-10 – Primäre Planungsoberfläche

- URL-basierte Saisonplanung unter `/saisons/:seasonId` mit Reload- und
  Browsernavigation.
- Desktop Master/Detail mit Saisonfilter und Saisonmatrix im ersten Viewport.
- Mobile Saisonwahl sowie Tag-/Wochensteuerung ohne horizontalen
  Seitenüberlauf.
- Kompakte Planungs-Tabs, globale Fokuszustände, Dialog-Fokusfalle,
  Lade-/Fehlerfeedback und Undo nach Soft Delete.
- ADR 0015 und ExecPlan 012 dokumentiert; Quality Gate inklusive 59 Unit- und
  9 E2E-Tests bestanden.

## 2026-08-10 – Offizielles SGRS-Branding

- Offizielles Logo der SG Rhein-Sieg aus
  `/Users/christian/Downloads/base_logo_transparent_background.png` transparent
  zugeschnitten, quadratisch auf 512 Pixel optimiert und als Web-Asset
  integriert.
- Responsiver Brandblock im globalen Seitenkopf mit fest reservierter Logogröße
  und zugänglichem Alternativtext ergänzt.
- Globale Oberflächenfarben auf semantische Tokens aus dem offiziellen
  `#0085CA`, dem kontraststarken Aktionsblau `#00689D` und dem tiefen
  `#0F2940` umgestellt.
- Semantische Erfolgs-, Fehler-, Warn-, Event- und RPE-Farben beibehalten.
- Responsive E2E-Abdeckung für 320, 375, 768, 1024 und 1440 Pixel ergänzt und
  mobile Kartenaktionen gegen horizontalen Überlauf abgesichert.

## 2026-08-09 – Trainer-Wochenansicht

- Editierbarer Wochenkopf mit KW, Mesozyklus, Target RPE, Target Volume und Wochenziel.
- Montag bis Sonntag mit direkt bearbeitbarem Day Context und 0..n Sessions.
- Session-Editor für Zeit, Dauer, Umfang, Main/Technical Focus, Expected RPE,
  Key Session, Equipment und Hinweis; revisionierte Speicherung und Soft Delete.
- Responsive Pooldeck-Board-Darstellung mit mobilen Tagesbahnen.

## Unreleased

- Initiales ChatGPT-Sites-Engineering-Repository.

### M1: React/TypeScript Scaffold (2026-08-09)

#### Geänderte Dateien

- `app/package.json` bereinigt und um die erforderlichen Node-Typen ergänzt.
- `app/package-lock.json` für reproduzierbare Installationen hinzugefügt.
- `app/src/App.tsx` und `app/src/styles/base.css` auf eine neutrale,
  fachfunktionsfreie Startansicht reduziert.
- `app/tsconfig.json` für die verwendete Toolchain vervollständigt.
- `docs/14_exec_plans/active/000-bootstrap.md` während der Umsetzung
  fortgeschrieben und M1 abgeschlossen.

#### Testergebnisse

- `npm install`: erfolgreich, 0 bekannte Schwachstellen.
- `npm run typecheck`: erfolgreich nach Ergänzung der fehlenden Toolchain-Typen.
- `npm test`: erfolgreich, 4 von 4 Tests bestanden.
- `npm run build`: erfolgreich, 29 Module transformiert.
- `python3 scripts/check_docs.py`: erfolgreich.
- Kein M1-relevanter E2E-Test; die E2E-Infrastruktur ist Teil von M2.

#### Offene Punkte

- M2–M5 des Foundation-ExecPlans bleiben offen und wurden nicht begonnen.
- Bereits vorhandene Dateien späterer Meilensteine wurden nicht erweitert.

#### Architekturentscheidungen

- ADR 0011 (`React + TypeScript`) umgesetzt; keine neue
  Architekturentscheidung und kein neuer ADR.
- Keine Sites-Runtime-Annahmen und keine ChatGPT-Sites-Persistenz eingeführt.

#### Bekannte Einschränkungen

- Die Anwendung zeigt nur das lokale, statische Scaffold ohne Fachmodule.
- Format-, Lint- und E2E-Automatisierung folgen frühestens in M2.
- Kein Private Preview und kein Publishing im Rahmen von M1.

### M2: Quality Gates (2026-08-09)

#### Geänderte Dateien

- Prettier und ESLint mit TypeScript-/React-Regeln eingerichtet.
- Vitest-Unit-Suite und Playwright-E2E-Suite getrennt konfiguriert.
- Browser-Smoke-Test für die neutrale M1-Startansicht ergänzt.
- npm-Skripte für `format`, `format:check`, `lint`, `test:e2e` und das
  zusammenfassende `check`-Gate hinzugefügt.
- Playwright-Ergebnisordner in `.gitignore` aufgenommen.
- Bestehende App-Dateien ausschließlich mechanisch mit Prettier formatiert;
  keine fachlichen Module oder Funktionen implementiert.

#### Testergebnisse

- `npm run format:check`: erfolgreich.
- `npm run lint`: erfolgreich, keine Fehler oder Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich, 4 von 4 Unit-Tests bestanden.
- `npm run build`: erfolgreich, 29 Module transformiert.
- `npm run test:e2e`: erfolgreich, 1 von 1 Chrome-Smoke-Test bestanden.
- `npm run check`: vollständiges Quality-Gate erfolgreich.
- `python3 scripts/check_docs.py`: erfolgreich.

#### Offene Punkte

- M3–M5 bleiben offen und wurden nicht begonnen.
- Fachliche E2E-Szenarien folgen erst mit den jeweiligen Fachmeilensteinen.

#### Architekturentscheidungen

- Keine Architekturänderung und kein neuer ADR.
- Tests laufen lokal gegen Vite und greifen nicht auf eine Sites-Runtime oder
  Persistenz zu.

#### Bekannte Einschränkungen

- Der Playwright-Test setzt derzeit einen lokal installierten Google Chrome
  voraus.
- Vorhandene Storage-Platzhalter besitzen eine eng begrenzte ESLint-Ausnahme,
  die bei deren Umsetzung in M4 zu entfernen ist.

### M3: Domain Types (2026-08-09)

#### Geänderte Dateien

- `app/src/lib/domain/types.ts` um runtime-neutrale TypeScript-Typen für alle
  Entitäten des Datenwörterbuchs erweitert.
- Macro-/Meso-/Micro-Hierarchie und parallele Periodisierungsdimensionen über
  typisierte IDs modelliert.
- Gemeinsame Typen für Versionierung und das dokumentierte Soft Delete
  eingeführt.
- `app/tests/unit/domain-types.test.ts` mit typisierten Fixtures für
  Hierarchie, Fokusdimensionen und Saison-Metadaten ergänzt.
- Foundation-ExecPlan fortgeschrieben und M3 abgeschlossen.

#### Testergebnisse

- `npm ci`: erfolgreich, 198 Pakete aus dem Lockfile installiert.
- `npm run format:check`: erfolgreich.
- `npm run lint`: erfolgreich, keine Fehler oder Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich, 7 von 7 Unit-Tests bestanden.
- `npm run build`: erfolgreich, 29 Module transformiert.
- `npm run test:e2e`: mit lokaler Portfreigabe erfolgreich, 1 von 1
  Browser-Smoke-Test bestanden.
- `npm run check`: mit lokaler Portfreigabe vollständig erfolgreich.
- `python3 scripts/check_docs.py`: erfolgreich.

#### Offene Punkte

- M4 InMemory Storage und M5 Seed Demo Season bleiben offen und wurden nicht
  begonnen.
- Laufzeitvalidierung und fachliche UI späterer Meilensteine wurden nicht
  vorgezogen.

#### Architekturentscheidungen

- Das dokumentierte Domainmodell und ADR 0011 wurden typisiert umgesetzt.
- Keine Architekturänderung und kein neuer ADR.

#### Bekannte Einschränkungen

- Nicht abschließend dokumentierte Kategorien, Codes und Operationen bleiben
  als freie Strings modelliert.
- Die M3-Typen erzwingen keine zeitlichen Hierarchieregeln zur Laufzeit.

### M4: InMemory Storage (2026-08-09)

#### Geänderte Dateien

- `StorageAdapter` um dokumentierte Collections, typisierte
  Mutationsoptionen, Revisionszugriff und Snapshot-Hydration konkretisiert.
- `InMemoryStorageAdapter` mit defensiven Kopien, optimistischer
  Versionierung, standardmäßig ausgeblendetem Soft Delete und atomarer
  Revision pro Create, Update und Soft Delete umgesetzt.
- `SitesStorageAdapter` ausschließlich an die Adapter-Signaturen angepasst;
  keine unbestätigte Sites-Runtime-API implementiert.
- Alte ESLint-Ausnahme für den M4-Platzhalter entfernt.
- Fünf Unit-Tests für Versionierung, Konflikte, Revisionen, Soft Delete,
  verschachtelten Saisonkontext und Reload aus Snapshot ergänzt.
- Foundation-ExecPlan fortgeschrieben und M4 abgeschlossen.

#### Testergebnisse

- `npm run format:check`: erfolgreich.
- `npm run lint`: erfolgreich, keine Fehler oder Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich, 12 von 12 Unit-Tests bestanden.
- `npm run build`: erfolgreich, 29 Module transformiert.
- `npm run test:e2e`: erfolgreich, 1 von 1 Browser-Smoke-Test bestanden.
- `npm run check`: vollständig erfolgreich.
- `python3 scripts/check_docs.py`: erfolgreich.

#### Offene Punkte

- M5 Seed Demo Season bleibt offen und wurde nicht begonnen.
- Echte Sites-Persistenz folgt erst nach Verifikation der Runtime-Bindings in
  einem eigenen ExecPlan.

#### Architekturentscheidungen

- ADR 0005, 0007, 0008 und 0009 innerhalb des bestehenden Adapterdesigns
  umgesetzt; keine neue Architekturentscheidung und kein neuer ADR.
- Snapshot-Hydration ist ein interner Reload-Mechanismus und kein Ersatz für
  den späteren validierten Import mit Vorschau.

#### Bekannte Einschränkungen

- In-Memory-Daten überleben keinen echten Prozess- oder Browser-Neustart.
- Verschachtelte Entitäten ohne eigenes `seasonId` benötigen beim Schreiben
  expliziten Revisionskontext.

### M5: Seed Demo Season (2026-08-09)

#### Geänderte Dateien

- Explizite `seedDemoSeason`-Funktion für eine Saison 2026/27 vom 2026-08-01
  bis 2027-07-31 ergänzt.
- Sechs dokumentierte Periodisierungsdimensionen, 14 Fokusdefinitionen und
  neun Ausrüstungsstammdaten vollständig aufgenommen.
- Alle 30 Seed-Schreibvorgänge laufen ausschließlich über den
  `StorageAdapter` und erzeugen Version 1 sowie je eine Revision.
- Drei Unit-Tests für Vollständigkeit, Dimensionszuordnung, leere
  Planungscollections und Snapshot-Reload ergänzt.
- Foundation-ExecPlan fortgeschrieben und M5 abgeschlossen.

#### Testergebnisse

- `npm run format:check`: erfolgreich.
- `npm run lint`: erfolgreich, keine Fehler oder Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich, 15 von 15 Unit-Tests bestanden.
- `npm run build`: erfolgreich, 29 Module transformiert.
- `npm run test:e2e`: erfolgreich, 1 von 1 Browser-Smoke-Test bestanden.
- `npm run check`: vollständig erfolgreich.
- `python3 scripts/check_docs.py`: erfolgreich.

#### Offene Punkte

- Keine offenen Meilensteine im Foundation-ExecPlan.
- Fachmodule, UI, echte Sites-Persistenz und Import/Export folgen ausschließlich
  in ihren eigenen ExecPlans.

#### Architekturentscheidungen

- Seed-Daten werden ausschließlich über die vorhandene Adaptergrenze geladen;
  keine neue Architekturentscheidung und kein neuer ADR.
- Stabile UUID-formatierte Seed-IDs gewährleisten reproduzierbare Beziehungen
  und Tests.

#### Bekannte Einschränkungen

- Der Seed wird nicht automatisch beim App-Start ausgeführt und ist in der
  neutralen Scaffold-UI noch nicht sichtbar.
- Strength und Tactical bleiben ohne Fokusdefinition, weil die Seed-Vorgabe
  dafür keine eindeutig zugeordneten Beispiele enthält.

### Foundation-Abschlussreview (2026-08-09)

- M1 bis M5 einschließlich aller dokumentierten Akzeptanzkriterien bestätigt.
- Reproduzierbare Installation mit `npm ci` sowie Format, Lint, Typecheck,
  15 Unit-Tests, Produktions-Build und Playwright-Smoke-Test erfolgreich.
- Dokumentationscheck, Abhängigkeitsprüfung und lokaler Start der
  Demo-Anwendung erfolgreich.
- Repository-Inventar vervollständigt und generierte TypeScript-Build-Metadaten
  in `.gitignore` ausgeschlossen.
- Keine Secrets und keine personenbezogenen oder gesundheitsbezogenen
  Beispieldaten gefunden.
- Foundation-ExecPlan nach `docs/14_exec_plans/completed/000-bootstrap.md`
  verschoben; keine spätere Phase begonnen.
