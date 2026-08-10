# ExecPlan: Export & Import

## Ziel
Export & Import vollständig und testbar umsetzen.

## Scope
Nur diese Phase.

## Non-Scope
Keine späteren Funktionen vorziehen.

## Meilensteine
- [x] M1: JSON Export
- [x] M2: JSON Import Preview
- [x] M3: Roundtrip Test
- [ ] M4: Excel Mapping
- [ ] M5: PDF Spec

## Akzeptanz
Alle Meilensteine + Quality Gate.

## Fortschritt

M1 ist umgesetzt: Der Gesamtexport enthält `schemaVersion`, `exportedAt`, alle
fachlichen Collections einschließlich Stammdaten und Revisionen. Unit- und
Browser-Downloadtest sind vorhanden. Import bleibt bis zur validierten Vorschau
und Bestätigung bewusst gesperrt.

Am 2026-08-10 wurde das Exportformat auf die verbindliche Schema-Version `1.0`
konsolidiert. Der Downloadname enthält den Saisonzeitraum und das Exportdatum;
Tests decken sämtliche Storage-Collections, Soft Deletes, Revisionen,
Dateinamensbildung und den Export-Import-Roundtrip ab. Numerische Altexporte der
Versionen 1 und 2 bleiben importierbar.

Ebenfalls am 2026-08-10 sind M2 und M3 umgesetzt: `GET /api/storage/export`
liefert das dokumentierte Format (`schemaVersion`, `exportedAt`, camelCase)
direkt als Backup-Datei, `POST /api/storage/import` validiert den Snapshot
serverseitig und wendet ihn als eine atomare D1-Batch-Operation an (409 bei
Konflikten ohne Teilwrites). Die Storage-REST-Logik liegt in `worker/storage.ts`;
Worker-Tests mit Mock-D1 decken Exportformat, den vollständigen
Export-Import-Roundtrip über Preview und Remap sowie Validierungs- und
Konfliktfälle ab. Das Collection-Mapping teilen Export, Import und Adapter über
`EXPORT_COLLECTION_KEYS`.

## Entscheidungen
- Der REST-Export liefert das dokumentierte JSON-Format, der
  `StorageAdapter.exportAll()` bildet es für die Domain auf snake_case zurück.
- Der REST-Import akzeptiert den bereits validierten/remappten
  snake_case-Snapshot (Adaptervertrag) und validiert ihn serverseitig erneut.
- M4 (Excel-Mapping) und M5 (PDF-Spezifikation) bleiben laut FR-026 für später
  offen.

## Abschluss
M1–M3 abgeschlossen. M4/M5 offen.
