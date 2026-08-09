# ExecPlan: Periodization

## Ziel

Periodization vollständig und testbar umsetzen.

## Scope

Nur diese Phase.

## Non-Scope

Keine späteren Funktionen vorziehen.

## Meilensteine

- [x] M1: Macrocycles
- [x] M2: Mesocycles
- [x] M3: Microcycles
- [x] M4: Segments
- [x] M5: Dimensions & Focus Segments

## Akzeptanz

Alle Meilensteine + Quality Gate.

## Fortschritt

M1 abgeschlossen: Makrozyklen mit Name, Zeitraum, Ziel, optionalem Zielwettkampf
und Notiz sind über den StorageAdapter anlegbar, bearbeitbar und per Soft Delete
löschbar. Zeitraum und Zielwettkampf werden gegen die Saison validiert.

M2 abgeschlossen: Mesozyklen mit genau einem Makrozyklus, Name, Zeitraum, Ziel
und Notiz sind über den StorageAdapter anlegbar, bearbeitbar und per Soft Delete
löschbar. Ihr Zeitraum wird vollständig gegen den Makrozyklus validiert.

M3 abgeschlossen: Mikrozyklen mit genau einem Mesozyklus, Name/KW, Zeitraum,
Ziel, Target RPE und optionalem Zielumfang sind über den StorageAdapter
anlegbar, bearbeitbar und per Soft Delete löschbar. Zeitraum, RPE 1–10 und
Zielumfang >= 0 werden validiert.

M4 abgeschlossen: Mikrozyklussegmente mit genau einem Mikrozyklus, Name,
Zeitraum, Typ und Reihenfolge sind über den StorageAdapter anlegbar,
bearbeitbar und per Soft Delete löschbar. Ihr Zeitraum wird vollständig gegen
den Mikrozyklus validiert.

M5 abgeschlossen: Die sechs Standarddimensionen und die vorgegebenen
Beispiel-Fokusdefinitionen werden je Saison initialisiert und bleiben frei
bearbeitbar. Fokussegmente referenzieren Dimension und Fokus, liegen innerhalb
der Saison und dürfen dimensionsübergreifend zeitlich parallel laufen. Alle
Mutationen sind versioniert, revisioniert und Löschungen erfolgen als Soft Delete.

## Entscheidungen

Keine.

## Abschluss

Abgeschlossen am 2026-08-09. Format, Lint, Typecheck, 40 Unit-Tests, Build und
7 relevante Browser-E2E-Tests sind erfolgreich.
