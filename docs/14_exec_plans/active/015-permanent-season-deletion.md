# ExecPlan: Endgültiges Löschen von Saisons

## Ziel

Einstellungsroute um eine Möglichkeit ergänzen, bereits weich gelöschte
Saisons samt aller zugehörigen Planungsobjekte und ihrer Historie
endgültig zu entfernen.

## Scope

- neuer `StorageAdapter`-Methoden `purgeSeason` sowie Implementierungen für
  InMemory und Sites
- neue Worker-Route `DELETE /api/storage/seasons/<id>/purge`
- neuer Domänen-Service `SeasonService.purge`
- Vorschau-Helfer `seasonScopeSummary` für die Löschumfang-Vorschau
- UI-Panel „Saisons endgültig löschen" mit Namensbestätigung und
  Löschvorschau
- ADR 0017

## Non-Scope

- hartes Löschen direkt aus der Saison-Navigation
- frei wählbare Scope-Bereinigung oder Massenlöschen
- automatisches Backup vor dem Löschen

## Voraussetzungen

- ADR 0008, ADR 0007, ADR 0005
- bestehender `StorageAdapter` und Sites-D1-Runtime

## Meilensteine

- [x] M1: Storage-Schnittstellen und Worker-Route
- [x] M2: InMemory- und Sites-Implementierung
- [x] M3: Domänen-Service und Vorschau-Helfer
- [x] M4: UI-Panel mit Bestätigungsmodal
- [x] M5: ADR 0017 und Dokumentation
- [x] M6: Tests und Quality Gate

## Akzeptanzkriterien

- Weich gelöschte Saisons werden mit allen Planungsobjekten und Revisionen
  entfernt.
- Nicht gelöschte Saisons können nicht bereinigt werden.
- Das Löschen erfordert das Eintippen des Saisonnamens.
- Andere Saisons und globale Konfiguration bleiben unverändert.
- Format, Lint, Typecheck, Unit, Build und relevante E2E-Tests sind grün.

## Risiken

- Eltern-Ketten in der Scope-Auflösung müssen zuverlässig sein, um
  verwaiste Daten zu vermeiden.
- Die D1-Spalte `season_id` muss für alle season-gebundenen Objekte gesetzt
  sein.

## Entscheidung

- Scope-Auflösung erfolgt über die bestehende `importSeasonScope`-Logik.
- Bestätigung via Namenseingabe, um versehentliche Löschung zu verhindern.

## Fortschritt

Abgeschlossen am 2026-08-12. `purgeSeason` ist über den `StorageAdapter`
(InMemory + Sites) und die Worker-Route `DELETE /api/storage/seasons/<id>/purge`
umgesetzt. Neue Unit-Tests (purge-scope, in-memory, season-service,
worker-d1-runtime) und ein E2E-Test für die Einstellungs-Bereinigung liegen vor.
Das Quality Gate ist für alle betroffenen Dateien grün.

## Abschluss

Abgeschlossen.