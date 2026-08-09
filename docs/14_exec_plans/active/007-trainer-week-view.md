# ExecPlan: Trainer-Wochenansicht

## Ziel und Scope

Eine editierbare Wochenansicht verbindet den Mikrozyklus-Wochenkopf mit
Montag bis Sonntag, Day Context und beliebig vielen Sessions. Sessionfelder:
Uhrzeit, Dauer, Umfang, Main/Technical Focus, Expected RPE, Key Session,
Equipment und Hinweis. Persistenz läuft ausschließlich über `StorageAdapter`;
jede Mutation erzeugt eine Revision, Session-Löschen ist Soft Delete.

## Non-Scope

Detaillierte Trainingsserien, Athleten- oder Gesundheitsdaten, Analysecharts,
Excel/PDF und Änderungen an der Macro/Meso/Micro-Hierarchie.

## Meilensteine

- [x] M1 TrainingDay- und Session-Domain mit Validierung und Revisionen
- [x] M2 responsive, vollständig anklickbare Trainer-Wochenansicht
- [x] M3 Quality Gate und Dokumentation

## Betroffene Dateien

- `app/src/features/training-week/TrainerWeekView.tsx`
- `app/src/features/seasons/SeasonPlanning.tsx`
- `app/src/lib/domain/seasonPlanning.ts`
- `app/src/lib/domain/types.ts`
- `app/src/lib/validation/domain.ts`
- `app/src/styles/base.css`

## Akzeptanz und Tests

Der Wochenkopf und alle Tages-/Sessionfelder sind direkt bearbeitbar. Die
Ansicht zeigt sieben Tagesbahnen auf Desktop und fokussiert auf Mobile einzelne
Tage per horizontalem Scroll-Snap. Format, Lint, Typecheck, 50 Unit-Tests,
Build und 7 bestehende Playwright-E2E-Tests sind grün.

## Entscheidungen und Risiken

Der Mikrozyklus bildet die Woche. Equipment wird als kommagetrennter,
sessionbezogener Planungshinweis gespeichert; eine spätere Stammdatenauswahl
kann ohne UI-Bruch ergänzt werden. Wochen werden ab Startdatum als sieben Tage
dargestellt.

## Abschlussnotiz

Abgeschlossen am 2026-08-09.
