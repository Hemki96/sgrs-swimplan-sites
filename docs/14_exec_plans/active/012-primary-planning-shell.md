# ExecPlan: Primäre Planungsoberfläche

## Ziel

Die Saisonmatrix ist die primäre Desktopansicht; auf kleinen Viewports steht
die Tag-/Wochenplanung im Mittelpunkt. Saisonwahl und Browsernavigation sind
URL-basiert.

## Scope

Planungs-Shell, Deep Links, kompakte Saisonverwaltung, responsive Woche/Tag,
Feedback und Accessibility der betroffenen Oberfläche.

## Non-Scope

Keine neuen Fachdaten, kein neues Exportformat, keine Benutzerkonten und keine
detaillierten Trainingsserien.

## Voraussetzungen

- ADR 0004: Saisonmatrix als Desktop-Primäransicht
- ADR 0012: Mobile Wochenansicht
- ADR 0015: URL-basierte Planungsnavigation

## Meilensteine

- [x] M1: Route und Planungs-Shell
- [x] M2: Desktop Master/Detail
- [x] M3: Mobile Tag/Woche
- [x] M4: Feedback und Accessibility
- [x] M5: Quality Gate und Dokumentation

## Akzeptanz

- `/saisons/:seasonId` ist reload- und browsernavigationsfest.
- Desktop zeigt die Matrix ohne vorheriges Durchscrollen der Saisonliste.
- 390 px zeigt Tag/Woche ohne horizontalen Seitenüberlauf.
- Jede Mutation bleibt StorageAdapter-basiert und revisioniert.
- Format, Lint, Typecheck, Unit, Build und relevante E2E sind grün.

## Risiken

- Vorhandene E2E-Tests erwarten die bisherige Ein-Seiten-Struktur.
- Die umfangreichen Planungseditoren dürfen durch Tabs nicht unzugänglich
  werden.

## Entscheidungen

- Breakpoint Desktop/Mobil: 1024 px.
- Bestehende Wasser-/Tannengrün-Palette bleibt erhalten.
- Keine Änderung am Storage-Schema oder JSON-Export.

## Fortschritt

2026-08-10: ExecPlan aus dem UI-Audit angelegt. URL-Route, responsive
Master/Detail-Shell, Matrix-/Woche-/Planungsdaten-Tabs, mobile Tag/Woche,
Feedback, Undo und Dialogfokus umgesetzt. 59 Unit-Tests und 9 E2E-Szenarien
bestanden; Format, Lint, Typecheck und Build sind grün.

## Abschluss

Abgeschlossen am 2026-08-10.
