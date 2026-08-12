# ExecPlan: Formular-Entlastung (Pflichtfelder und Eingabeprozess)

## Ziel

Den Pflichtfeld-Druck in den Planungsformularen reduzieren und den
Eingabeprozess verschlanken: weniger Pflichtfelder, smarte Defaults,
progressive Disclosure und eine Schnellbearbeitung in der Wochenansicht.
Das Ergebnis ist der minimale Eingabeweg für Saison, Wettkämpfe,
Zyklen und Sessions bei gleichbleibender Validierungsstrenge.

## Scope

- Pflichtfelder entspannen in der Validierung (zod): Saison
  (`description`, `mainGoal`), Event (`endDate`), Kalenderrestriktion
  (`severity`), Makro-/Meso-/Mikrozyklus (`goal`, `notes`),
  Mikrozyklus (`targetRpe`), Codes (Dimension, Fokus, Equipment) und
  Fokussegment (`dimensionId`).
- `Microcycle.targetRpe` im Domain-Typ optional machen.
- Smarte Defaults im `SeasonPlanningService`:
  - Event `endDate` = `startDate`, wenn leer.
  - Code-Autogenerierung aus dem Namen (`toCode`).
  - Fokussegment `dimensionId` wird aus der Fokusdefinition abgeleitet.
  - Default-Eventtrack „Standard" bei Periodisierung-Initialisierung.
  - `generateWeeklyMicrocycles`: ein Klick erzeugt alle Kalenderwochen
    eines Mesozyklus als Mikrozyklen (Name `KW nn`, idempotent).
- UI-Anpassungen: Saison-Pflichtmarkierungen, optionales Target RPE,
  Wochengenerierung-Formular, Fokussegment-Auto-Dimension,
  SessionEditor mit aufklappbaren „Weitere Optionen",
  Schnellbearbeitung (Main Focus / RPE / Umfang) in der Wochenansicht.
- Dokumentation (ExecPlan, Changelog) und E2E-Absicherung.

## Non-Scope

- neue Entitäten oder Datenfelder
- Änderungen an der Validierung harter Fehler (fehlendes Datum/Name)
- Migration bestehender Daten

## Voraussetzungen

- ADR 0005 (StorageAdapter), ADR 0007 (Revisionen), ADR 0008 (Soft Delete)
- bestehende ExecPlans 003 (Periodization), 005 (Training Sessions),
  007 (Trainer-Wochenansicht)

## Meilensteine

- [x] M1: Analyse der Formulare (Pflichtfeld-Inventar)
- [x] M2: Validierungsschemata entspannen
- [x] M3: Domain-Typ `targetRpe` optional
- [x] M4: Smart Defaults im Service
- [x] M5: UI-Formulare und progressive Disclosure
- [x] M6: Schnellbearbeitung in der Wochenansicht
- [x] M7: Unit-Tests (6 neue Szenarien)
- [x] M8: Dokumentation, Changelog, E2E-Tests, Quality Gate

## Akzeptanzkriterien

- Saison ist mit Name, Start- und Enddatum anlegbar (Beschreibung und
  Hauptziel optional).
- Wettkämpfe sind mit Name und Startdatum anlegbar (Enddatum defaultet
  auf das Startdatum).
- Codes (Dimension, Fokus, Equipment) werden bei leerer Eingabe aus dem
  Namen generiert.
- Fokussegmente brauchen keine manuelle Dimension; sie wird aus dem
  Fokus abgeleitet.
- Mikrozyklen sind ohne Target RPE anlegbar.
- Ein Klick erzeugt alle Kalenderwochen eines Mesozyklus (idempotent).
- Sessions: Die häufigsten Felder (Fokus, Umfang, RPE, Hinweis) sind
  sofort sichtbar, erweiterte Felder unter „Weitere Optionen".
- Wochenansicht erlaubt Schnellbearbeitung von Fokus/RPE/Umfang ohne
  vollen Dialog.
- Format, Lint, Typecheck, Unit, Build und relevante E2E-Tests sind grün.

## Risiken

- Optionalisierte Felder dürfen die Validierung harter Kernfehler nicht
  aushebeln (Name/Datum bleiben Pflicht).
- `toCode` muss eindeutig genug sein; Kollisionen werden weiterhin über
  die bestehenden Unique-Checks abgefangen.

## Entscheidungen

- Leere optionale Felder werden als leere Zeichenkette bzw. `undefined`
  normalisiert, nie mit Platzhalter-Defaults befüllt (außer Event
  `endDate` und generierte Codes).
- Progressive Disclosure im SessionEditor über `<details>` mit State.

## Fortschritt

Umgesetzt: Validierung entspannt, `targetRpe` optional, Smart Defaults
(Event endDate, Code-Autogen, Fokus-Dimension, Default-Track,
Wochengenerierung), UI-Formulare, SessionEditor „Weitere Optionen" und
Schnellbearbeitung in der Wochenansicht. 6 neue Unit-Tests, insgesamt
166 Unit-Tests grün.

## Abschluss

Abgeschlossen am 2026-08-12. Format, Lint, Typecheck, 166 Unit-Tests,
Build und relevante E2E-Tests sind erfolgreich.
