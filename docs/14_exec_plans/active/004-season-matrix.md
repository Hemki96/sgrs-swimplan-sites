# ExecPlan: Season Matrix

## Ziel

Season Matrix vollständig und testbar umsetzen.

## Scope

Nur diese Phase.

## Non-Scope

Keine späteren Funktionen vorziehen.

## Meilensteine

- [x] M1: Matrix Model
- [x] M2: Headers
- [x] M3: Rows
- [x] M4: Sticky UX
- [x] M5: Editing

## Akzeptanz

Alle Meilensteine + Quality Gate.

## Fortschritt

M1 abgeschlossen: UI-unabhängiges ViewModel für Monate, ISO-Kalenderwochen,
optionale Mikrozyklussegmente und die vertikalen Matrixbereiche inklusive
Eventspuren. Unit-Tests decken eine Saison mit 53 sichtbaren Wochen ab.

M2–M4 abgeschlossen: Die Desktop-Matrix zeigt Monate und Kalenderwochen sowie
Wettkämpfe, Restriktionen, Macro-/Mesozyklen, Fokussegmente und wöchentliches
Target RPE. Die Zeitachse scrollt horizontal; Bereichslabels und Header bleiben
sticky. Mobile Optimierung bleibt im Non-Scope.

M5 abgeschlossen: Direktes Bearbeiten in der Matrix. Klick auf einen Block
öffnet den Dialog mit dem vollständigen Entity-Formular (Wettkämpfe,
Restriktionen, Macro-/Meso-/Mikrozyklen, Fokussegmente); Löschen erfolgt als
Soft Delete mit Bestätigung. Klick auf eine Leerfläche der Zeile legt ein neues
Entity mit dem Kalenderwochenzeitraum an, das „+“ im Bereichslabel ebenso. Das
Micro Target RPE ist inline direkt im Block editierbar. Alle Mutationen laufen
über den `SeasonPlanningService` mit Revision, Validierung und
Versionskonflikt-Schutz; das Bearbeiten-Modell ist UI-unabhängig unter
`season-matrix/matrixEditingModel.ts` und unit-getestet.

## Entscheidungen

Die Einbettung als primäre Desktopansicht wird in ExecPlan 012 umgesetzt.

## Abschluss

M1–M5 sind abgeschlossen. Der ExecPlan 004 ist nach dem bestandenen Quality
Gate am 2026-08-10 vollständig umgesetzt. Geänderte Dateien: `SeasonMatrix.tsx`,
`SeasonMatrixEditing.tsx` (neu), `matrixEditingModel.ts` (neu),
`SeasonPlanning.tsx`, `styles/base.css`, Tests `matrix-editing-model.test.ts`
(neu) und E2E `scaffold.spec.ts`. Quality Gate: 75 Unit- und 12 E2E-Tests,
Lint, Format, Typecheck und Build bestanden.
