# ExecPlan: 12-Wochen-Testplanung

## Ziel

Eine zusammenhängende Testplanung über zwölf Wochen mit allen sechs
Periodisierungsdimensionen über die bestehenden Application Services erzeugen
und ihre Persistenz- und Mutationsregeln verifizieren.

## Scope

- 2 Makrozyklen, 4 Mesozyklen und 12 Mikrozyklen
- wechselnde Target-RPE-Werte
- parallele Fokussegmente in Strength, Aerobic, Anaerobic, Speed, Tactical und
  Technical
- Hierarchie-, Überlappungs-, Snapshot/Reload-, Bearbeitungs- und
  Soft-Delete-Prüfungen
- Fehlerkorrekturen innerhalb der bestehenden Periodisierungsfunktionen

## Non-Scope

- Saisonmatrix
- Trainingsserien oder personenbezogene Daten
- neue Storage- oder Runtime-API

## Betroffene Dateien

- `app/tests/fixtures/createTwelveWeekTestPlan.ts`
- `app/tests/unit/twelve-week-test-plan.test.ts`
- `app/src/lib/domain/seasonPlanning.ts`

## Meilensteine

- [x] M1: Testplanung über bestehende Services erzeugen
- [x] M2: Hierarchie und parallele Fokussegmente prüfen
- [x] M3: Snapshot-Reload, Bearbeitung und Soft Delete prüfen
- [x] M4: Quality Gate ausführen und Fehler beheben

## Akzeptanzkriterien

- Alle geforderten Entitäten sind nach Reload vollständig vorhanden.
- Jeder Mesozyklus liegt im zugehörigen Makrozyklus, jeder Mikrozyklus im
  zugehörigen Mesozyklus.
- Alle sechs Dimensionsspuren laufen nachweisbar zeitlich parallel.
- Bearbeitungen erhöhen Version und Revision.
- Soft-gelöschte Daten sind regulär verborgen und mit `includeDeleted` erhalten.
- Format, Lint, Typecheck, Unit-Tests, Build und relevante E2E-Tests sind grün.

## Risiken

- Große Fixtures können fachliche Zusammenhänge verschleiern; deshalb werden
  Zeiträume und Beziehungen aus kompakten, expliziten Wochenblöcken aufgebaut.

## Entscheidungen

- Die Testplanung wird nicht direkt hydriert, sondern ausschließlich über
  `SeasonService` und `SeasonPlanningService` erzeugt.

## Fortschritt

Die Testplanung umfasst zwei Makrozyklen zu je sechs Wochen, vier Mesozyklen
zu je drei Wochen und zwölf lückenlose Wochen-Mikrozyklen mit variierenden
Target-RPE-Werten. Je ein Fokussegment in allen sechs Dimensionen läuft über
den gesamten Zeitraum parallel. Eine absichtlich ungültige Hierarchie wird
abgelehnt.

Nach Export und Hydrate in einen frischen StorageAdapter bleiben alle Daten und
Revisionen erhalten. Eine Mikrozyklus-Bearbeitung nach Reload erhöht die
Version; ein Fokussegment wird anschließend soft gelöscht und bleibt über
`includeDeleted` inklusive Löschzeitpunkt verfügbar.

Gefundene und behobene Produktfehler: Beim Bearbeiten von Makro-, Meso- oder
Mikrozyklen konnte der Elternzeitraum bisher so verkleinert werden, dass bereits
vorhandene Mesozyklen, Mikrozyklen oder Mikrozyklussegmente anschließend
außerhalb ihres Elternobjekts lagen. Die Service-Schicht lehnt solche
Änderungen nun vor dem Schreiben ab.

## Abschluss

Abgeschlossen am 2026-08-09. Format, Lint, Typecheck, 45 Unit-Tests, Build und
7 Browser-E2E-Tests sind erfolgreich. Der E2E-Webserver musste wegen der
Sandbox-Portfreigabe separat mit genehmigter Ausführung gestartet werden.
