# JSON Format

Root enthält `schemaVersion: "1.0"`, `exportedAt`, `configurationValues`, `seasons`, `eventTracks`, `events`, `calendarConstraints`, `macrocycles`, `mesocycles`, `microcycles`, `microcycleSegments`, `periodizationDimensions`, `focusDefinitions`, `focusSegments`, `trainingDays`, `trainingSessions`, `equipmentItems`, `sessionEquipment` und `revisions`.

Alle Collections werden einschließlich soft-gelöschter Datensätze exportiert. Damit enthält der Gesamtexport die globalen Konfigurationswerte, sämtliche zur vollständigen Rekonstruktion der Saisons benötigten Fachdaten und die Revisionshistorie.

Der Dateiname folgt `sgrs-swimplan-<saisonzeitraum>-<exportdatum>.json`, zum Beispiel `sgrs-swimplan-2026-27-2026-08-09.json`. Enthält ein Export mehrere unterschiedliche Saisonzeiträume, wird `gesamt` als Zeitraum verwendet.
