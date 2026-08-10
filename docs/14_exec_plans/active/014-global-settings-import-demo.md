# ExecPlan: Globale Einstellungen, Import/Export und Demo-Daten

## Ziel

Eine öffentliche Einstellungsroute mit globalen Wertelisten, validiertem
JSON-Import, Gesamtexport und manuell ladbaren Demo-Saisons umsetzen.

## Scope

- globale, revisionierte und soft-deletable Konfigurationswerte
- Einstellungsoberfläche für Wertelisten, Import/Export und Demo-Daten
- Exportformat Version 2 und kompatibler Import von Version 1 und 2
- atomare Importmutation mit neuen IDs
- zusätzliche Demo-Saisons ohne Überschreiben bestehender Daten

## Non-Scope

- frei definierbare Listengruppen oder Form-Builder
- Farben und Icons
- Benutzerkonten, Rollen oder personenbezogene Daten
- Excel- und PDF-Roundtrip

## Voraussetzungen

- ADR 0016
- bestehender `StorageAdapter` und Sites-D1-Runtime

## Meilensteine

- [x] M1: Domänen- und Storage-Schnittstellen
- [x] M2: Export-, Preview- und Importpipeline
- [x] M3: Einstellungs- und Demo-Oberfläche
- [x] M4: Migration und dynamische Formularoptionen
- [x] M5: Tests, Dokumentation und Quality Gate

## Akzeptanzkriterien

- Jede Konfigurations- und Importmutation erzeugt eine Revision.
- Kein Import verändert Daten vor Vorschau und Bestätigung.
- Importierte Saisons überschreiben keine vorhandenen IDs.
- Referenzierte Konfigurationswerte werden nicht hart gelöscht.
- Mehrfaches Laden der Demo erzeugt unabhängige Saisons.
- Format, Lint, Typecheck, Unit, Build und relevante E2E-Tests sind grün.

## Risiken

- Alte Exporte enthalten saisonbezogene Stammdaten und benötigen Migration.
- Globale Überschreibungen dürfen bestehende Referenzen nicht ungültig machen.
- Große Imports müssen innerhalb der D1-Batch-Grenzen bleiben.

## Entscheidungen

- Globale Revisionen verwenden `__global_configuration__` als Scope-ID.
- Im Import fehlende, bereits verwendete Codes bleiben deaktiviert erhalten.
- Bei mehreren Saisons wählt die Vorschau genau eine Saison aus.

## Fortschritt

Abgeschlossen am 2026-08-10. Globale Konfiguration, Importvorschau,
atomarer Saisonimport, Gesamtexport und zusätzliche Demo-Saisons sind umgesetzt.
Das Quality Gate bestand mit 64 Unit- und 10 Browser-E2E-Tests.

## Abschluss

Abgeschlossen.
