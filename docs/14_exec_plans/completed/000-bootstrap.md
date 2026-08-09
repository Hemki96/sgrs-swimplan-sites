# ExecPlan: Foundation

## Ziel

Foundation vollständig und testbar umsetzen.

## Scope

Nur diese Phase. Im aktuellen Auftrag ausschließlich M5: ein explizit
aufrufbarer Demo-Seed für die Saison 2026/27 mit den dokumentierten
Periodisierungsdimensionen, Fokusdefinitionen und Ausrüstungsstammdaten,
geladen ausschließlich über den `StorageAdapter`.

## Non-Scope

- Keine späteren Meilensteine vorziehen.
- Keine fachliche UI oder allgemeine Anwendungsservices implementieren.
- Keine ChatGPT-Sites-Persistenz implementieren.
- Keine Sites-Runtime annehmen oder veröffentlichen.
- Keine fachlichen E2E-Szenarien vorziehen, die Domain-, Storage- oder
  Import-/Export-Funktionen späterer Meilensteine benötigen.

## Voraussetzungen

- ADR 0011 (`React + TypeScript`) ist akzeptiert.
- Node.js und npm sind für Installation und Build verfügbar.

## Betroffene Dateien

- `.gitignore`
- `app/package.json`
- `app/package-lock.json`
- `app/eslint.config.js`
- `app/.prettierignore`
- `app/.prettierrc.json`
- `app/playwright.config.ts`
- `app/vitest.config.ts`
- `app/tests/e2e/scaffold.spec.ts`
- `app/tests/unit/domain-types.test.ts`
- `app/tests/unit/in-memory-storage.test.ts`
- `app/tests/unit/seed-demo-season.test.ts`
- `app/src/App.tsx`
- `app/src/lib/domain/types.ts`
- `app/src/lib/domain/seedDemoSeason.ts`
- `app/src/lib/storage/InMemoryStorageAdapter.ts`
- `app/src/lib/storage/SitesStorageAdapter.ts`
- `app/src/lib/storage/StorageAdapter.ts`
- `app/src/styles/base.css`
- `app/tsconfig.json`
- `docs/14_exec_plans/active/000-bootstrap.md`
- `docs/CHANGELOG.md`

## Meilensteine

- [x] M1: React/TypeScript Scaffold
- [x] M2: Quality Gates
- [x] M3: Domain Types
- [x] M4: InMemory Storage
- [x] M5: Seed Demo Season

## Akzeptanz für M1

- Abhängigkeiten sind durch ein Lockfile reproduzierbar festgehalten.
- Die React-Anwendung besitzt einen neutralen, fachfunktionsfreien Einstieg.
- TypeScript läuft im Strict Mode ohne Fehler.
- Der Produktions-Build mit Vite ist erfolgreich.
- Vorhandene Unit-Tests bleiben erfolgreich.

## Akzeptanz für M2

- Format- und Lint-Prüfung sind als npm-Skripte reproduzierbar ausführbar.
- Typecheck, Unit-Tests und Produktions-Build bleiben erfolgreich.
- Ein Browser-Smoke-Test prüft, dass das M1-Scaffold erreichbar ist und seine
  neutrale Startansicht rendert.
- Ein zusammenfassendes npm-Skript führt alle Quality Gates sequenziell aus.
- M3–M5 bleiben unverändert und offen.

## Akzeptanz für M3

- Alle Entitäten des dokumentierten Datenwörterbuchs sind als exportierte,
  runtime-neutrale TypeScript-Typen verfügbar.
- Macro-, Meso- und Microcycle bilden ihre Hierarchie über typisierte IDs ab.
- Periodisierungsdimensionen, Fokusdefinitionen und Fokussegmente bleiben als
  parallele Struktur zur Zyklushierarchie modelliert.
- Versionierung und dokumentiertes Soft Delete sind in den betroffenen
  Entitätstypen abgebildet.
- Es werden keine personenbezogenen Daten, detaillierten Trainingsserien,
  Persistenzimplementierungen oder Seed-Daten ergänzt.
- M4 und M5 bleiben unverändert und offen.

## Akzeptanz für M4

- Domain und spätere UI können ausschließlich gegen den runtime-neutralen
  `StorageAdapter` arbeiten; der In-Memory-Adapter implementiert diese Grenze.
- Neue Entitäten beginnen mit Version 1; Updates und Soft Delete erhöhen die
  Version genau einmal.
- Updates und Soft Delete benötigen bei vorhandenen Entitäten die aktuelle
  `expectedVersion`; Konflikte überschreiben weder Daten noch History.
- Soft-gelöschte Entitäten sind standardmäßig ausgeblendet und explizit
  weiterhin lesbar.
- Create, Update und Soft Delete erzeugen atomar eine fortlaufende Revision
  mit Before-/After-Zustand und Saisonbezug.
- Lesezugriffe und Snapshots geben defensive Kopien zurück; ein neuer Adapter
  kann einen Snapshot für einen Reload-Test isoliert hydratisieren.
- Keine Sites-Runtime wird angenommen oder implementiert; M5 bleibt offen.

## Akzeptanz für M5

- Eine Saison `Saison 2026/27` umfasst den Zeitraum 2026-08-01 bis
  2027-07-31 und kann explizit in einen leeren `StorageAdapter` geladen werden.
- Die sechs dokumentierten Dimensionen Strength, Aerobic, Anaerobic, Speed,
  Tactical und Technical werden aktiv und sortiert angelegt.
- Alle 14 in `SEED_DATA.md` genannten Fokusbeispiele und alle neun
  Ausrüstungsstammdaten werden vollständig angelegt.
- Alle 30 Seed-Mutationen laufen durch den Adapter, beginnen mit Version 1 und
  erzeugen je eine Revision mit Saisonbezug.
- Ein Snapshot-Reload erhält Saison und Stammdaten unverändert.
- Der Seed enthält keine personenbezogenen Daten, Gesundheitsdaten,
  detaillierten Trainingsserien oder undokumentierte Planungsinhalte.
- Events, Restriktionen, Zyklen, Fokussegmente, Trainingstage und Sessions
  werden nicht vorgezogen und bleiben im Seed leer.

## Prüfungen für M1

- `npm run typecheck`
- `npm test`
- `npm run build`
- `python3 scripts/check_docs.py`

Format- und Lint-Automatisierung sowie E2E-Infrastruktur gehören zu M2 und
werden in M1 nicht implementiert. Für die reine statische Startansicht ist kein
fachlicher E2E-Test relevant.

## Prüfungen für M2

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run check`
- `python3 scripts/check_docs.py`

## Prüfungen für M3

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run check`
- `python3 scripts/check_docs.py`

## Prüfungen für M4

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run check`
- `python3 scripts/check_docs.py`

## Prüfungen für M5

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e`
- `npm run check`
- `python3 scripts/check_docs.py`

## Risiken

- Das Ausgangsarchiv enthält bereits Dateien für spätere Meilensteine. Diese
  werden in M1 nicht erweitert; die Startansicht wird von ihnen entkoppelt.
- Ohne verifizierte Sites-Runtime bleibt M1 bewusst ein lokales Vite-Gerüst.
- Für nicht abschließend spezifizierte Kategorien, Codes und Operationen
  bleiben die Typen bewusst offen (`string`), statt undokumentierte Wertemengen
  zu erfinden.
- Verschachtelte Entitäten ohne direktes `seasonId` benötigen beim Schreiben
  einen expliziten Revisionskontext, damit jede Mutation eindeutig einer
  Saison zugeordnet wird.
- `SEED_DATA.md` ordnet die Fokusbeispiele nicht explizit Dimensionen zu. M5
  verwendet nur eindeutige fachliche Zuordnungen zu Aerobic, Anaerobic, Speed
  und Technical; Strength und Tactical bleiben ohne erfundene Fokusdefinition.

## Fortschritt

- 2026-08-09: Vorgaben, Produktkontext, Requirements, Architektur, ADR 0011
  und Teststrategie gelesen.
- 2026-08-09: M1 gegen den vorhandenen Repository-Zustand abgegrenzt; M2–M5
  bleiben offen.
- 2026-08-09: Erster Prüflauf: Unit-Tests und Dokumentationscheck erfolgreich;
  Typecheck und Build wegen fehlender Node-/Disposable-Typen fehlgeschlagen.
  Toolchain-Konfiguration innerhalb M1 korrigiert.
- 2026-08-09: Abhängigkeiten installiert und mit `package-lock.json`
  festgeschrieben; npm-Audit meldet 0 Schwachstellen.
- 2026-08-09: Neutralen App-Einstieg hergestellt und von der vorhandenen
  Demo-Fachansicht entkoppelt.
- 2026-08-09: Zweiter Prüflauf vollständig erfolgreich; M1 abgeschlossen.
- 2026-08-09: M1-Nachprüfung gegen `AGENTS.md`, M1-Akzeptanz,
  Architekturregeln und vorhandene Coding Standards abgeschlossen. Keine
  M1-Codefehler gefunden; M2 wurde nicht begonnen.
- 2026-08-09: M2 begonnen. `AGENTS.md`, ExecPlan-Konvention, ADR 0011,
  nichtfunktionale Anforderungen, Teststrategie, QA-Checkliste sowie die
  Skills `testing` und `playwright` gelesen. M2 auf Quality-Gate-Infrastruktur
  und einen statischen Browser-Smoke-Test begrenzt.
- 2026-08-09: Erster M2-Prüflauf: Format, Typecheck und Build erfolgreich.
  Unit-Gate sammelte den Playwright-Test irrtümlich ein; Lint traf auf
  vorgezogene Storage-Platzhalter aus M4; E2E-Webserver durfte in der Sandbox
  keinen lokalen Port binden. Test-Suites werden getrennt, die Lint-Ausnahme
  wird eng auf die unberührten M4-Platzhalter begrenzt und E2E mit lokaler
  Prozessfreigabe wiederholt.
- 2026-08-09: Unit- und E2E-Suites getrennt, eng begrenzte Lint-Ausnahme für
  die vorgezogenen M4-Storage-Platzhalter dokumentiert und Browser-Smoke-Test
  gegen den lokalen Vite-Server erfolgreich ausgeführt.
- 2026-08-09: Vollständiges `npm run check` erfolgreich; M2 abgeschlossen.
  M3–M5 bleiben offen und wurden nicht begonnen.
- 2026-08-09: M3 begonnen. ExecPlan, PRD, funktionale und nichtfunktionale
  Anforderungen, Akzeptanzkriterien, Excel-Traceability, Domainmodell,
  Glossar, Business Rules, Datenwörterbuch, Architektur-/Modulgrenzen,
  Teststrategie, QA-Checkliste sowie ADR 0002, 0003, 0008 und 0011 gelesen.
  Die Skills `product-context`, `periodization` und `testing` angewendet.
- 2026-08-09: Domain-Typen auf alle Entitäten des Datenwörterbuchs erweitert
  und typisierte Unit-Fixtures für Hierarchie, parallele Fokusdimensionen und
  Saison-Metadaten ergänzt. M4-Storage-Dateien und M5-Seed-Daten unverändert
  gelassen.
- 2026-08-09: Erster M3-Prüflauf nach erfolgreichem Lint wegen beschädigter,
  duplizierter lokaler Type-Paketordner fehlgeschlagen; Abhängigkeiten mit
  `npm ci` reproduzierbar aus dem Lockfile wiederhergestellt.
- 2026-08-09: Format, Lint, Typecheck, 7 Unit-Tests und Build erfolgreich.
  Das zusammenfassende Gate erreichte E2E und scheiterte dort ausschließlich
  an der Sandbox-Portbindung; der unveränderte Browser-Smoke-Test bestand mit
  lokaler Portfreigabe. M3 abgeschlossen; M4 und M5 nicht begonnen.
- 2026-08-09: M4 begonnen. Storage-, Product-Context- und Testing-Skill sowie
  PRD, Requirements, Traceability, Business Rules, Domain-/Storagemodell,
  Architektur, Concurrency, Datenwörterbuch, Teststrategie, QA-Checkliste,
  Sites-Buildregeln und ADR 0005, 0007, 0008 und 0009 gelesen.
- 2026-08-09: `StorageAdapter` mit dokumentierten Collections, typisierten
  Mutationsoptionen, Revisionszugriff und Snapshot-Hydration konkretisiert.
  In-Memory-Adapter mit defensiven Kopien, Version Guards, Soft Delete und
  atomarer Revisionserzeugung umgesetzt; Sites-Adapter bleibt ein bewusst
  nicht implementierter Runtime-Platzhalter.
- 2026-08-09: Eng begrenzte M2-Lint-Ausnahme für den damaligen
  In-Memory-Platzhalter entfernt und nur die notwendigen ungenutzten Parameter
  des Sites-Platzhalters ausgenommen.
- 2026-08-09: Vollständiges Quality Gate erfolgreich: Format, Lint,
  Typecheck, 12 Unit-Tests, Build und Browser-Smoke-Test bestanden. M4
  abgeschlossen; M5 nicht begonnen.
- 2026-08-09: M5 begonnen. Product-Context-, Periodization-, Storage- und
  Testing-Skill sowie PRD, Requirements, Traceability, Business Rules,
  Domainmodell, Glossar, Seed Data, Datenwörterbuch, Storagemodell,
  Architektur, Concurrency, Teststrategie, QA-Checkliste und ADR 0002, 0003,
  0005, 0007, 0008 und 0009 gelesen.
- 2026-08-09: Expliziten Demo-Seed für Saison 2026/27 mit sechs Dimensionen,
  14 Fokusdefinitionen und neun Ausrüstungsstammdaten umgesetzt. Alle Daten
  werden über `StorageAdapter.put` geladen und erzeugen Versionen sowie
  Revisionen; Planungsinhalte späterer ExecPlans bleiben leer.
- 2026-08-09: Erster M5-Prüflauf nach erfolgreichem Lint an einer zu breit
  inferierten `Season.status`-Zeichenkette gescheitert; den generischen
  Adapteraufruf explizit mit dem vorhandenen `Season`-Typ gebunden.
- 2026-08-09: Vollständiges Quality Gate erfolgreich: Format, Lint,
  Typecheck, 15 Unit-Tests, Build und Browser-Smoke-Test bestanden. M5 und
  damit der Foundation-ExecPlan abgeschlossen.

## Entscheidungen

- React, TypeScript und Vite werden entsprechend ADR 0011 und dem vorhandenen
  Scaffold beibehalten.
- Keine neue Architekturentscheidung erforderlich; es wird kein ADR angelegt.
- Die M1-Startansicht bleibt statisch und enthält keine fachlichen Planungsdaten.
- M3 bildet das bestehende Datenwörterbuch ohne neue Architekturentscheidung
  ab; freie fachliche Codes bleiben offen, bis eine dokumentierte Wertemenge
  beschlossen wird.
- Snapshot-Hydration dient in M4 ausschließlich dem isolierten Reload eines
  bereits kontrollierten Adapter-Snapshots und ist kein Import-Workflow; die
  vorgeschriebene Importvalidierung und Vorschau werden nicht vorgezogen.
- Revisionen werden innerhalb einer In-Memory-Mutation zusammen mit dem
  Entitätszustand geschrieben; Sites-spezifische Transaktionsmechanismen
  bleiben bis zur verifizierten Runtime bewusst offen.
- Der M5-Seed besitzt stabile UUID-formatierte IDs, damit Beziehungen und
  Tests reproduzierbar bleiben; die Fokusbeispiele werden nur den aus ihren
  Namen eindeutig ableitbaren Dimensionen zugeordnet.
- Seed-Ausführung ist bewusst explizit und nicht an App-Start oder UI
  gekoppelt, damit kein vorhandener gemeinsamer Datenstand überschrieben wird.

## Geänderte Dateien

### M1

- `app/package.json`: Paketdefinition formatiert, Build-Werkzeuge als
  Entwicklungsabhängigkeiten eingeordnet und Node-Typen ergänzt.
- `app/package-lock.json`: reproduzierbare npm-Auflösung hinzugefügt.
- `app/src/App.tsx`: fachliche Demo-Ansicht durch neutrale Scaffold-Ansicht
  ersetzt.
- `app/src/styles/base.css`: Styles auf die neutrale Scaffold-Ansicht reduziert.
- `app/tsconfig.json`: lesbar formatiert und `ESNext.Disposable` für die
  verwendete Vite-/Vitest-Toolchain ergänzt.
- `docs/14_exec_plans/active/000-bootstrap.md`: M1-Scope, Verlauf,
  Entscheidungen und Abschluss dokumentiert.
- `docs/CHANGELOG.md`: M1-Ergebnis dokumentiert.

### M2

- `.gitignore`: Playwright-Ergebnisordner ausgeschlossen.
- `app/package.json` und `app/package-lock.json`: Prettier, ESLint,
  TypeScript-/React-Lintregeln und Playwright sowie die Skripte `format`,
  `format:check`, `lint`, `test:e2e` und `check` ergänzt.
- `app/.prettierrc.json` und `app/.prettierignore`: reproduzierbare
  Formatregeln und generierte Ausschlüsse definiert.
- `app/eslint.config.js`: Flat-Config für TypeScript und React eingerichtet;
  Ausnahme auf die bereits vorhandenen, erst zu M4 gehörenden
  Storage-Platzhalter begrenzt.
- `app/vitest.config.ts`: Unit-Test-Erkennung auf `tests/unit` begrenzt.
- `app/playwright.config.ts`: lokaler Vite-Webserver und headless Chrome für
  den Scaffold-Smoke-Test konfiguriert.
- `app/tests/e2e/scaffold.spec.ts`: Titel, Hauptüberschrift und neutralen
  Scaffold-Hinweis im Browser geprüft.
- `app/index.html`, `app/src/main.tsx`, `app/vite.config.ts`, vorhandene Dateien
  unter `app/src/features`, `app/src/lib` und `app/tests/unit`: ausschließlich
  mechanisch mit Prettier formatiert; keine fachliche oder semantische Änderung.
- `docs/14_exec_plans/active/000-bootstrap.md` und `docs/CHANGELOG.md`:
  M2-Umfang, Verlauf, Ergebnisse und Einschränkungen dokumentiert.

### M3

- `app/src/lib/domain/types.ts`: vollständige exportierte Typen für alle
  Entitäten des Datenwörterbuchs sowie gemeinsame ID-, Datums-, Zeit-,
  Versions- und Soft-Delete-Grundtypen ergänzt.
- `app/tests/unit/domain-types.test.ts`: typisierte Repräsentativ-Fixtures für
  Macro-/Meso-/Micro-Hierarchie, parallele Fokusdimensionen und
  Saison-Metadaten ergänzt.
- `docs/14_exec_plans/active/000-bootstrap.md` und `docs/CHANGELOG.md`:
  M3-Scope, Verlauf, Prüfergebnisse und Abschluss dokumentiert.

### M4

- `app/src/lib/storage/StorageAdapter.ts`: dokumentierte Collections,
  Storage-/Mutationsoptionen, Revisionsliste und Snapshot-Hydration typisiert.
- `app/src/lib/storage/InMemoryStorageAdapter.ts`: typisierte In-Memory-
  Speicherung mit defensiven Kopien, optimistischer Versionierung, Soft
  Delete, atomaren Revisionen und Snapshot-Hydration umgesetzt.
- `app/src/lib/storage/SitesStorageAdapter.ts`: Signaturen an die
  Adaptergrenze angepasst, ohne eine unbestätigte Sites-API zu implementieren.
- `app/eslint.config.js`: alte M4-Platzhalterausnahme entfernt; Ausnahme eng
  auf ungenutzte Parameter des absichtlich inaktiven Sites-Adapters begrenzt.
- `app/tests/unit/in-memory-storage.test.ts`: Create/Update, Konflikte,
  Revisionen, Soft Delete, verschachtelten Saisonkontext, defensive Kopien und
  Reload über Snapshot abgedeckt.
- `docs/14_exec_plans/active/000-bootstrap.md` und `docs/CHANGELOG.md`:
  M4-Scope, Verlauf, Ergebnisse und Abschluss dokumentiert.

### M5

- `app/src/lib/domain/seedDemoSeason.ts`: explizite Seed-Funktion für Saison
  2026/27, sechs Dimensionen, 14 Fokusdefinitionen und neun
  Ausrüstungsstammdaten ergänzt; sämtliche Writes laufen über den
  `StorageAdapter`.
- `app/tests/unit/seed-demo-season.test.ts`: Vollständigkeit, fachliche
  Dimensionszuordnung, Versionen, 30 Revisionen, leere Planungscollections
  und Snapshot-Reload geprüft.
- `docs/14_exec_plans/active/000-bootstrap.md` und `docs/CHANGELOG.md`:
  M5-Scope, Verlauf, Ergebnisse und Foundation-Abschluss dokumentiert.

## Testergebnisse

- `npm install`: erfolgreich; 107 Pakete geprüft, 0 Schwachstellen.
- Erster Lauf `npm run typecheck`: fehlgeschlagen wegen fehlender Node- und
  Disposable-Typen; anschließend behoben.
- Erster Lauf `npm run build`: aus demselben Grund fehlgeschlagen;
  anschließend behoben.
- Zweiter Lauf `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich, 1 Testdatei mit 4 Tests bestanden (in beiden
  Läufen).
- Zweiter Lauf `npm run build`: erfolgreich, Vite hat 29 Module transformiert.
- `python3 scripts/check_docs.py`: erfolgreich, `Documentation baseline OK`
  (in beiden Läufen).
- Kein E2E-Test: M1 enthält nur eine statische Startansicht; E2E-Infrastruktur
  ist Teil von M2.

### M1-Nachprüfung vom 2026-08-09

- `npm ci`: erfolgreich; das Lockfile ist konsistent und reproduzierbar.
- Vorhandene npm-Gates ermittelt: `typecheck`, `test` und `build`.
- `npm run typecheck`: erfolgreich, Strict TypeScript ohne Fehler.
- `npm test`: erfolgreich, 1 Testdatei und 4 von 4 Tests bestanden.
- `npm run build`: erfolgreich, Vite 7.3.6 hat 29 Module transformiert.
- `python3 scripts/check_docs.py`: erfolgreich, `Documentation baseline OK`.
- `format`: nicht vorhanden; keine Format-Infrastruktur im M1-Scaffold.
- `lint`: nicht vorhanden; keine Lint-Infrastruktur im M1-Scaffold.
- E2E: nicht vorhanden und für die statische M1-Startansicht nicht relevant.
- Zusätzlicher `npm audit --omit=dev`: wegen fehlender DNS-/Netzwerkverbindung
  zur npm-Registry nicht ausführbar; kein vorhandenes Quality Gate und kein
  Hinweis auf einen M1-Codefehler.

## Prüfung gegen Vorgaben

- `AGENTS.md`: M1 bleibt im ExecPlan, enthält keine Benutzerkonten,
  personenbezogenen Daten, Trainingsserien, Mutationen oder Persistenz und
  erfindet keine Sites-API.
- M1-Akzeptanz: Lockfile, neutraler React-Einstieg, Strict TypeScript,
  Produktions-Build und bestehende Unit-Tests sind nachgewiesen.
- Architektur: ADR 0011 wird eingehalten; Domain-, Storage- und Runtime-Grenzen
  werden durch M1 nicht berührt.
- Coding Standards: keine zusätzlichen projektspezifischen Regeln gefunden;
  der kleine React-Einstieg ist typisiert, statisch und enthält keine
  unnötigen Abhängigkeiten, Effects oder Renderarbeit.
- Ergebnis: keine M1-bezogene Korrektur erforderlich.

### M2-Abschlussprüfung vom 2026-08-09

- `npm run format:check`: erfolgreich; alle erfassten Dateien entsprechen
  Prettier.
- `npm run lint`: erfolgreich; 0 Fehler und 0 Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich; 1 Unit-Testdatei, 4 von 4 Tests bestanden.
- `npm run build`: erfolgreich; Vite 7.3.6 hat 29 Module transformiert.
- `npm run test:e2e`: erfolgreich; 1 von 1 Chrome-Smoke-Test bestanden.
- `npm run check`: erfolgreich; alle obigen Gates sequenziell bestanden.
- `python3 scripts/check_docs.py`: nach Dokumentationsaktualisierung
  erfolgreich, `Documentation baseline OK`.

### M3-Abschlussprüfung vom 2026-08-09

- `npm ci`: erfolgreich; 198 Pakete reproduzierbar aus dem Lockfile
  installiert.
- `npm run format:check`: erfolgreich; alle erfassten Dateien entsprechen
  Prettier.
- `npm run lint`: erfolgreich; 0 Fehler und 0 Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich; 2 Unit-Testdateien, 7 von 7 Tests bestanden.
- `npm run build`: erfolgreich; Vite 7.3.6 hat 29 Module transformiert.
- `npm run check`: Format, Lint, Typecheck, Unit-Tests und Build erfolgreich;
  E2E-Webserver anschließend ausschließlich wegen `EPERM` bei der
  Sandbox-Portbindung abgebrochen.
- `npm run test:e2e`: mit lokaler Portfreigabe erfolgreich; 1 von 1
  Chrome-Smoke-Test bestanden.
- Abschließendes `npm run check`: mit lokaler Portfreigabe vollständig
  erfolgreich; alle Quality Gates sequenziell bestanden.
- `python3 scripts/check_docs.py`: nach Dokumentationsaktualisierung
  erfolgreich, `Documentation baseline OK`.

### M4-Abschlussprüfung vom 2026-08-09

- `npm run format:check`: erfolgreich; alle erfassten Dateien entsprechen
  Prettier.
- `npm run lint`: erfolgreich; 0 Fehler und 0 Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich; 3 Unit-Testdateien, 12 von 12 Tests bestanden.
- `npm run build`: erfolgreich; Vite 7.3.6 hat 29 Module transformiert.
- `npm run test:e2e`: erfolgreich; 1 von 1 Chrome-Smoke-Test bestanden.
- `npm run check`: mit lokaler Portfreigabe vollständig erfolgreich; alle
  Quality Gates sequenziell bestanden.
- `python3 scripts/check_docs.py`: nach Dokumentationsaktualisierung
  erfolgreich, `Documentation baseline OK`.

### M5-Abschlussprüfung vom 2026-08-09

- `npm run format:check`: erfolgreich; alle erfassten Dateien entsprechen
  Prettier.
- `npm run lint`: erfolgreich; 0 Fehler und 0 Warnungen.
- `npm run typecheck`: erfolgreich.
- `npm test`: erfolgreich; 4 Unit-Testdateien, 15 von 15 Tests bestanden.
- `npm run build`: erfolgreich; Vite 7.3.6 hat 29 Module transformiert.
- `npm run test:e2e`: erfolgreich; 1 von 1 Chrome-Smoke-Test bestanden.
- `npm run check`: mit lokaler Portfreigabe vollständig erfolgreich; alle
  Quality Gates sequenziell bestanden.
- `python3 scripts/check_docs.py`: nach Dokumentationsaktualisierung
  erfolgreich, `Documentation baseline OK`.

## Offene Punkte

- Keine offenen Meilensteine in diesem Foundation-ExecPlan.
- Fachmodule, UI, Sites-Persistenz und Import/Export bleiben Gegenstand ihrer
  eigenen ExecPlans.

## Architekturentscheidungen

- ADR 0011 (`React + TypeScript`) wurde umgesetzt.
- Alle weiteren bestehenden ADRs wurden respektiert und nicht verändert.
- M1 führt keine neue Architekturentscheidung ein; kein neuer ADR notwendig.
- M2 ergänzt ausschließlich Entwicklungs- und Testwerkzeuge; auch hier ist
  keine neue Architekturentscheidung und kein ADR erforderlich.
- M3 konkretisiert ausschließlich die bereits in Domainmodell und
  Datenwörterbuch beschriebene typisierte Domain; keine neue
  Architekturentscheidung und kein ADR erforderlich.
- M4 setzt ADR 0005, 0007, 0008 und 0009 innerhalb des bestehenden
  Adapterdesigns um; keine neue Architekturentscheidung und kein ADR
  erforderlich.
- M5 ergänzt reproduzierbare Stammdaten innerhalb der vorhandenen Domain- und
  Adaptergrenzen; keine neue Architekturentscheidung und kein ADR
  erforderlich.

## Bekannte Einschränkungen

- Noch keine fachlichen Funktionen oder fachliche Navigation.
- In-Memory-Snapshots überleben keinen echten Prozess-/Browser-Neustart; es
  gibt weiterhin kein ChatGPT-Sites-Storage.
- Der E2E-Smoke-Test verwendet den lokal installierten Google-Chrome-Kanal;
  eine andere CI-/Host-Umgebung muss Chrome bereitstellen oder die
  Playwright-Projektkonfiguration anpassen.
- Der Sites-Adapter bleibt bis zur Verifikation der realen Runtime absichtlich
  nicht implementiert.
- Fachliche E2E-Szenarien zu Hierarchien, Reload, Konflikten und Import/Export
  bleiben bis zu den jeweiligen späteren Meilensteinen offen.
- M3 definiert strukturelle Typen; Laufzeitvalidierung zeitlicher Hierarchien,
  RPE und Volumen bleibt Aufgabe der dafür vorgesehenen Validation- und
  Fachmeilensteine.
- Snapshot-Hydration validiert keine externen Importdateien und darf nicht als
  Ersatz für den späteren validierten Import-mit-Vorschau verwendet werden.
- Der Demo-Seed wird nicht automatisch ausgeführt und erscheint noch nicht in
  der neutralen Scaffold-UI.
- Strength und Tactical besitzen im Seed keine Fokusdefinitionen, weil
  `SEED_DATA.md` dafür keine eindeutig zugeordneten Fokusbeispiele vorgibt.
- Kein Private Preview und kein Publishing, da dies nicht zur
  Foundation-Quality-Gate-Infrastruktur gehört und keine Sites-Runtime
  verifiziert wurde.

## Abschluss

M1 bis M5 wurden am 2026-08-09 abgeschlossen. Der Foundation-ExecPlan ist nach
dem erfolgreichen M5-Quality-Gate vollständig umgesetzt. Spätere ExecPlans
wurden nicht begonnen.

## Abschlussreview vom 2026-08-09

- Alle fünf Meilensteine und ihre Akzeptanzkriterien sind abgeschlossen.
- `npm ci` hat die Abhängigkeiten reproduzierbar aus dem Lockfile installiert.
- Format, Lint, Typecheck, 15 Unit-Tests und Produktions-Build sind erfolgreich.
- Der Playwright-Smoke-Test ist mit 1 von 1 Test erfolgreich.
- `python3 scripts/check_docs.py` bestätigt den aktuellen Dokumentationsstand.
- Alle deklarierten Abhängigkeiten werden von Anwendung oder Toolchain genutzt;
  `npm ls` meldet nach `npm ci` keine überzähligen Pakete.
- Der Repository-Scan findet keine Secret-Dateien oder bekannten
  Zugangsdatenmuster.
- Seed, Beispiel- und Testdaten enthalten keine personenbezogenen
  Athletendaten oder Gesundheitsdaten.
- `npm run dev -- --host 127.0.0.1 --port 4174` startet die Demo-Anwendung;
  der lokale HTTP-Abruf liefert die Vite-Einstiegsseite erfolgreich aus.
- Generierte TypeScript-Build-Metadaten sind in `.gitignore` ausgeschlossen;
  das Repository-Inventar enthält alle Bootstrap-Dateien aus M1 bis M5.
- Es wurden keine Bootstrap-Codefehler gefunden und keine spätere Phase
  begonnen.
