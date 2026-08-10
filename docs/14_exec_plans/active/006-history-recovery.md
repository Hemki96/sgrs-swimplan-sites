# ExecPlan: History & Recovery

## Ziel
History & Recovery vollständig und testbar umsetzen.

## Scope
Nur diese Phase.

## Non-Scope
Keine späteren Funktionen vorziehen.

## Meilensteine
- [x] M1: Revision List
- [x] M2: Entity History
- [x] M3: Soft Delete
- [x] M4: Restore
- [x] M5: Undo UX

## Akzeptanz
Alle Meilensteine + Quality Gate.

## Entscheidungen

- Die Historie ist ein eigener Tab „Historie“ in der Planungs-Shell, kein
  eigenständiger Drawer. Die Revisionsdaten kommen ausschließlich über
  `StorageAdapter.listRevisions` (Sites-/InMemory-Adapter).
- `HistoryService` kapselt Revision-Listing, Entity-Filterung und Restore.
  Restore schreibt über `storage.put` mit `expectedVersion` (optimistic
  locking); ein parallel überschriebener Datensatz wirft
  `VersionConflictError`, nie wird still überschrieben.
- Restore einer Soft-Delete-Revision stellt `beforeJson` (Zustand vor dem
  Löschen) wieder her; Restore einer Create-/Update-Revision stellt
  `afterJson` (Zustand dieser Revision) wieder her. Jeder Restore erzeugt
  selbst eine neue Revision.
- Der Undo-Toast nach Soft Delete nutzt `HistoryService.restoreEntity` mit
  expliziter Saison-ID; für Entitäten ohne `seasonId` (z. B. Sessions) wird
  die Saison-Zuordnung bei Bedarf aus dem Revision-Trail abgeleitet.
- Die bestehende Saison-Restore- und Undo-Logik (`SeasonService.restore`,
  Saisonliste) bleibt unverändert.

## Fortschritt

2026-08-10: Alle fünf Meilensteine umgesetzt.

- M1: `HistoryView` listet Revisionen der Saison, neueste zuerst, mit
  Revisionsnummer, Operation, Entität, Zeitstempel und Bearbeiter.
- M2: Entitätsfilter plus aufklappbare Detailansicht mit Feld-Diff
  (vorher/nachher).
- M3: Soft Delete war im Storage/Service bereits vollständig; verifiziert und
  durch History-/Undo-Tests abgesichert.
- M4: `HistoryService.restoreRevision`/`restoreEntity` mit
  Konflikterkennung; „Wiederherstellen“-Button je Revision.
- M5: Undo-Toast mit „Rückgängig“ nach Soft Delete in allen
  Planungsdaten-Sections (Eventspuren, Wettkämpfe, Restriktionen,
  Makro-/Meso-/Mikrozyklen, Segmente, Dimensionen, Fokusdefinitionen/-segmente,
  Trainingstage).

Neue Dateien: `HistoryService` (`app/src/lib/domain/history.ts`),
`HistoryView` (`app/src/features/seasons/HistoryView.tsx`), Unit-Tests
`app/tests/unit/history-service.test.ts` (8 Tests), E2E-Szenario
„shows history and restores a deleted entity“.

## Risiken

- Keine offenen.

## Abschluss
Abgeschlossen am 2026-08-10. Format, Lint, Typecheck, 89 Unit-Tests, Build und
die relevanten Chrome-E2E-Tests sind grün.
