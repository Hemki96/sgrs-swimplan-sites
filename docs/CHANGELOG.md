# Changelog

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
