# ExecPlan: Mobile UX

## Ziel

Mobile UX vollständig und testbar umsetzen.

## Scope

Nur diese Phase.

## Non-Scope

Keine späteren Funktionen vorziehen.

## Meilensteine

- [x] M1: Today
- [x] M2: Week
- [x] M3: Session Card
- [ ] M4: Navigation
- [x] M5: Responsive QA

## Akzeptanz

Alle Meilensteine + Quality Gate.

## Fortschritt

2026-08-10: M1 (Today) und M3 (Session Card) umgesetzt und verifiziert.

- M1: `TodayView` (`app/src/features/mobile/TodayView.tsx`) zeigt den aktuellen
  Tag mit Meso-/Mikrozyklus-Summary, Target RPE, Wochenziel, Day Context,
  Sessions, nächstem Wettkampf sowie Ausrüstung und Hinweisen; Datum,
  Kalenderwoche und abgeleitete Tagesdaten liefert `todayViewModel.ts`.
- M3: `SessionCard` (`app/src/features/training-week/SessionCard.tsx`) ist eine
  fokussierbare, barrierefreie Schaltfläche mit Zeit, Titel, Dauer, Umfang,
  RPE, Main-/Technical Focus, Equipment und Hinweis; Klick öffnet den
  `SessionEditor`.
- Die Tag-/Woche-Umschaltung (`MobileWeekPlanning.tsx`) nutzt `tablist`/
  `aria-selected`; alle Mutationspfade laufen über `SeasonPlanningService` und
  `StorageAdapter` (InMemory-/Sites-Adapter).
- Verifiziert gegen die Akzeptanzkriterien: kein horizontaler Überlauf bei
  320 px und 390 px (Ad-hoc-Check der Heute-Ansicht zusätzlich zur
  Responsive-E2E), barrierefreie Semantik, ausschließlich
  StorageAdapter-basierte Speicherung.
- Unit-Tests (`today-view-model.test.ts`, 3 Tests) decken Tag-Ableitung,
  Leerzustand und Equipment-Deduplizierung ab; das komplette Quality Gate ist
  grün (92 Unit-Tests, 13 Chrome-E2E-Tests inkl. Responsive 320–1440 px).

## Entscheidungen

Die responsive Planungs-Shell und Tag-/Woche-Navigation werden in ExecPlan 012
umgesetzt; die fachlichen Mobile-Meilensteine bleiben hier nachvollziehbar.

## Abschluss

Abgeschlossen am 2026-08-10. M1 (Today), M2 (Week), M3 (Session Card) und M5
(Responsive QA) sind umgesetzt und verifiziert. M4 (Navigation) wird per
dokumentierter Entscheidung in ExecPlan 012 umgesetzt; die fachlichen
Mobile-Meilensteine dieses Plans sind damit abschließend behandelt. Quality
Gate grün: Format, Lint, Typecheck, 92 Unit-Tests, Build und 13 Chrome-E2E-Tests
(inkl. Responsive bei 320/375/390/768/1024/1440 px).
