# ExecPlan 019: Validierung, Löschsichtbarkeit und Ladepfade

## Ziel

Fachlich ungültige Einträge werden vor dem Speichern abgewiesen, Saisonnamen sind eindeutig, weich gelöschte Daten verschwinden zuverlässig aus aktiven Ansichten und häufige Ladepfade verursachen keine unnötigen oder wiederholten Requests.

## Scope

- Validierungsregeln an Domain- und Storage-Grenzen ergänzen.
- Eindeutige Saisonnamen beim Anlegen, Bearbeiten, Wiederherstellen und Import sicherstellen.
- Soft-Delete-Anzeige- und Reload-Probleme reproduzieren und beheben.
- Saison- und Planungsdaten-Ladepfade messen und gezielt verbessern.
- Regressionstests und relevante Dokumentation aktualisieren.

## Non-Scope

- Benutzerkonten oder personenbezogene Daten.
- Neue Storage-Runtime oder undokumentierte Sites-APIs.
- Detaillierte Trainingsserien.
- Änderung der grundsätzlichen Soft-Delete-Architektur.

## Voraussetzungen

- ADR 0005, 0007, 0008, 0009 und 0017 bleiben verbindlich.
- Persistenz läuft ausschließlich über `StorageAdapter`.

## Meilensteine

1. Bestehende Regeln, Mutationspfade und Ladepfade inventarisieren; rote Regressionstests erstellen.
2. Validierung und Eindeutigkeit in Domain und persistenter Storage-Grenze implementieren.
3. Soft-Delete- und Ladeprobleme beheben.
4. Quality Gate ausführen und Dokumentation/Traceability abschließen.

## Betroffene Dateien

- `app/src/lib/domain/**`
- `app/src/lib/storage/**`
- `app/src/lib/validation/**`
- `app/src/features/**`
- `app/worker/storage.ts`
- `app/tests/**`
- `docs/03_domain/BUSINESS_RULES.md`
- `docs/16_traceability/REQUIREMENTS_MATRIX.md`

## Akzeptanzkriterien

- Aktive und weich gelöschte Saisons können nicht denselben normalisierten Namen belegen.
- Create, Update, Restore und Import liefern verständliche Validierungsfehler bei Namenskonflikten.
- Normale Listen und Ansichten zeigen keine weich gelöschten Datensätze.
- Nach einer Löschung wird die betroffene Ansicht deterministisch aktualisiert.
- Der initiale Saison-Load wird nicht durch die eigene Auswahl erneut ausgelöst.
- Bestehende fachliche Beziehungen und Wertebereiche werden an der Storage-Grenze geprüft.

## Tests

- Gezielte Unit-/Worker-Regressionstests für Duplikate, Soft Delete und Ladeaufrufe.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Relevante E2E-Tests für Anlegen, Löschen und Reload.

## Risiken

- Historische Bestandsdaten können bereits doppelte Namen enthalten.
- Cross-Entity-Validierung muss atomar mit konkurrierenden Schreibvorgängen bleiben.
- Zusätzliche Prüfungen dürfen Bulk-Importe nicht unnötig verlangsamen.

## Entscheidungen

- Saisonnamen werden nach Trim und sprachneutraler Kleinschreibung verglichen; Soft-Deletes reservieren den Namen bis zur endgültigen Löschung.
- Clientvalidierung dient der Rückmeldung, die persistente Grenze bleibt maßgeblich.

## Fortschritt

- [x] ExecPlan angelegt.
- [x] Regressionstests rot und anschließend grün ausgeführt.
- [x] Implementierung abgeschlossen.
- [x] Quality Gate grün.

## Abschlussnotiz

Validierung greift in Domain, Importvorschau und D1-Storage. Soft-Delete-Listen
bleiben standardmäßig gefiltert; Initial- und Saisonwechsel-Loads sind
deterministisch. Planungslisten werden über den vorhandenen Saisonindex geladen
und vermeiden rekursive Eltern-Requests. Format, Lint, Typecheck, 183 Unittests,
Build und 17 E2E-Tests sind grün. Der Miniflare-D1-Test wurde wegen lokalem
Socket-Bedarf separat außerhalb der Sandbox ausgeführt.
