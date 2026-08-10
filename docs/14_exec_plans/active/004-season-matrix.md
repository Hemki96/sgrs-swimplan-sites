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
- [ ] M5: Editing

## Akzeptanz

Alle Meilensteine + Quality Gate.

## Fortschritt

M1 abgeschlossen: UI-unabhängiges ViewModel für Monate, ISO-Kalenderwochen,
optionale Mikrozyklussegmente und die vertikalen Matrixbereiche inklusive
Eventspuren. Unit-Tests decken eine Saison mit 53 sichtbaren Wochen ab.

M2–M4 abgeschlossen: Die Desktop-Matrix zeigt Monate und Kalenderwochen sowie
Wettkämpfe, Restriktionen, Macro-/Mesozyklen, Fokussegmente und wöchentliches
Target RPE. Die Zeitachse scrollt horizontal; Bereichslabels und Header bleiben
sticky. Mobile Optimierung und M5 Editing bleiben im Non-Scope.

## Entscheidungen

Die Einbettung als primäre Desktopansicht wird in ExecPlan 012 umgesetzt.

## Abschluss

Offen.
