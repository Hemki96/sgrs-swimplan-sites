# ExecPlan: Export & Import

## Ziel
Export & Import vollständig und testbar umsetzen.

## Scope
Nur diese Phase.

## Non-Scope
Keine späteren Funktionen vorziehen.

## Meilensteine
- [x] M1: JSON Export
- [ ] M2: JSON Import Preview
- [ ] M3: Roundtrip Test
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

## Entscheidungen
Keine.

## Abschluss
Offen.
