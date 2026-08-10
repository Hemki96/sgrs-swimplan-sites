# ExecPlan: Publishing

## Ziel
Publishing vollständig und testbar umsetzen.

## Scope
Nur diese Phase.

## Non-Scope
Keine späteren Funktionen vorziehen.

## Meilensteine
- [x] M1: Private Preview
- [x] M2: Security Review
- [x] M3: Data Review
- [x] M4: Public Publish Checklist
- [x] M5: Operational Handover

## Akzeptanz
Alle Meilensteine + Quality Gate.

## Fortschritt

Der Sites-Projektcontainer ist owner-only konfiguriert. Der deployfähige Stand,
D1-Persistenz und die Browserabläufe wurden validiert. Die Reviews M2/M3 und die
Checklisten M4/M5 wurden am 2026-08-10 durchgeführt und dokumentiert. Das
Quality Gate ist vollständig grün (Format, Lint, Typecheck, 92 Unit-Tests,
Build, 13 E2E-Tests). Eine öffentliche Freigabe bleibt ausschließlich der
ausdrücklichen Entscheidung des Users vorbehalten; dafür sind die unter M4
genannten Punkte abzuarbeiten.

## M2 Security Review (2026-08-10)

Grundlage: `docs/09_security/THREAT_MODEL.md`, `SECURITY_MODEL.md`, `PRIVACY.md`.

Bestanden:

- Validierte Inputs: Zod-Validierung der Domäneneingaben in
  `app/src/lib/validation/domain.ts`; Worker prüft Collection-Allowlist,
  `id`/`version`-Integrität und Import-Snapshot-Struktur in
  `app/worker/storage.ts`.
- Kein ungefiltertes HTML: keine Vorkommen von `dangerouslySetInnerHTML`,
  `innerHTML`, `eval`, `document.write` in `app/src`; React-Escaping greift.
- Race Conditions: optimistische Versionsprüfung in atomaren D1-Batches;
  `VersionConflictError` (409) bei stale writes; Unit-Stresstest vorhanden.
- Soft Delete: jede Löschung ist Soft Delete (`deletedAt`) mit Revision.
- Revisionen: jede Mutation erzeugt eine Revision; History- und Restore-UI
  vorhanden und E2E-getestet.
- JSON-Gesamtexport: versioniert (`schemaVersion: 1`), vor großen Änderungen
  vorgesehen.
- Keine Secrets/Identitäten: kein Login, keine API-Keys, kein
  `localStorage`/Cookies; `editorLabel` ist hartkodiert
  (`public`/`demo-seed`/`settings`/`json-import`) und enthält keine
  Benutzeridentität.

Befunde (nicht blockierend für die private Preview):

1. Keine serverseitige Schema-Validierung der PUT-Entity: Die Worker-Route
   akzeptiert beliebige JSON-Strukturen (nur Collection/`id`/`version`
   geprüft). UI-Validierung greift nur über die App.
2. Keine Längenlimits auf API-Ebene: Zod-Schemas definieren nur `.min(1)`,
   keine `.max()`; Entity- und Payload-Größe sind unbegrenzt. Die im
   THREAT_MODEL genannte Control „Längenlimits“ ist nicht vollständig
   umgesetzt.
3. Kein Rate Limiting: Spam/DoS auf öffentlicher Site ungehindert möglich
   (anerkanntes Risiko; optionale Mitigation Edit-Code).
4. Security-Header: `dist/client/_headers` setzt nur Cache-Control für
   statische Assets; keine CSP/X-Frame-Options/HSTS. Plattform-Header der
   Sites-Hosting-Infrastruktur vor öffentlicher Freigabe verifizieren.

## M3 Data Review (2026-08-10)

Grundlage: `docs/09_security/PRIVACY.md`, `docs/05_data/DATA_DICTIONARY.md`,
ADR 0002, `app/src/lib/domain/types.ts` und `seedDemoSeason.ts`.

- Keine personenbezogenen Daten: keine Namen Minderjähriger, keine
  Geburtsdaten, keine Mail/Telefon, keine Adressen (Event-Orte nur
  Regionsebene wie „Region“/„NRW“).
- Keine Gesundheits-/Verletzungsdaten und keine individuellen
  RPE-/Feedbackdaten; `athleteNote` im Seed ist ein generischer Beispielhinweis.
- Revisions enthalten ausschließlich die personenfreien Domänendaten
  (before/afterJson).
- Kein R2, kein Upload, keine externe Datenbank; D1 speichert nur
  Planungsdaten. Analyse-Ansicht deklariert „keine Athleten- oder
  Gesundheitsdaten“.
- Ergebnis: PASS.

## M4 Public Publish Checklist (2026-08-10)

Grundlage: `docs/07_sites/PUBLISHING_MODEL.md`, `BUILD_PLAYBOOK.md`,
`OPENAI_SITES_FACTS.md`, `docs/11_operations/OPERATING_MODEL.md`.

Quality Gate (2026-08-10, Commit-Stand main):

| Gate | Ergebnis |
| --- | --- |
| Format (`prettier --check`) | Passed |
| Lint (`eslint --max-warnings 0`) | Passed |
| Typecheck (`tsc --noEmit`) | Passed |
| Unit (`vitest run`) | Passed, 23 Dateien / 92 Tests |
| Build (`vinext build`) | Passed |
| E2E (`playwright test`) | Passed, 13/13 (Chrome, 320–1440 px) |

Status:

- Private Preview: freigabefähig (owner-only Container, D1-Persistenz,
  Browserabläufe validiert).
- Öffentliche Freigabe: NICHT ausgeführt und NICHT empfohlen, solange keine
  ausdrückliche User-Entscheidung vorliegt. Vor öffentlicher Freigabe
  abzuarbeiten: Befunde M2.1–M2.3, Edit-Code (optional), Verifikation der
  Sites-Limits und aktueller OpenAI-Dokumentation sowie
  Backup/Export-Nachweis.

## M5 Operational Handover (2026-08-10)

- Owner-Modell: eine verantwortliche Person laut `OPERATING_MODEL.md`; Release
  Ablauf: private Preview → fachlich → Persistenz → Export → Mobile →
  öffentlich.
- Backup/Restore: JSON-Gesamtexport vor großen Änderungen und mindestens
  monatlich; Restore-Prozedur in `BACKUP_RESTORE.md`; Export-Flow in der
  Einstellungen-Ansicht und E2E-getestet.
- Smoke Test nach jedem Release; monatlich Export und Beta-Limits prüfen
  (openAI-Doku vor jeder öffentlichen Freigabe neu prüfen).
- Build Playbook Schritt 10 („erst dann öffentlich“) wird eingehalten.

## Entscheidungen
Keine. Öffentliche Freigabe erfordert ausdrückliche User-Entscheidung.

## Abschluss
Offen bis zur ausdrücklichen Entscheidung über die öffentliche Freigabe.
M1–M5 inklusive Quality Gate sind abgeschlossen.
