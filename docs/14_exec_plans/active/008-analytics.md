# ExecPlan: Analytics

## Ziel
Analytics vollständig und testbar umsetzen.

## Scope
Nur diese Phase.

## Non-Scope
Keine späteren Funktionen vorziehen.

## Meilensteine
- [x] M1: Volume
- [x] M2: Target RPE
- [x] M3: Focus Distribution
- [x] M4: Competition Countdown
- [x] M5: Dashboard

## Akzeptanz
Alle Meilensteine + Quality Gate.

## Fortschritt
M5 umgesetzt: Das Dashboard leitet Kalenderwoche, Mikrozyklus-Ziele,
Session-Kennzahlen, Fokussegmente, Phase, Wettkampf-Count-down und Key Sessions
zur Laufzeit aus dem bestehenden Domain Model ab. Es werden keine zusätzlichen
Dashboarddaten persistiert.

M1–M4 umgesetzt: Der Analysebereich zeigt Wochenumfang, Target RPE und
Sessionanzahl je Kalenderwoche, die Verteilung primärer Session-Schwerpunkte
und eine chronologische Wettkampf-Timeline. Alle Werte werden ausschließlich
aus vorhandenen Planungsdaten abgeleitet. Unit-Tests, Format, Lint, Typecheck
und Build sind grün; der gezielte Desktop-/Mobile-E2E-Test ist grün. Die
vollständige E2E-Suite wird derzeit nach dem ersten Test durch einen beendeten
lokalen Vinext-Server blockiert.

## Entscheidungen
Der geplante Wochenumfang ist die Summe der Session-Umfänge der aktuellen
Trainingswoche. Die aktuelle Phase wird als aktive Macro-/Mesophase dargestellt.
Ein Fokus gilt als Hauptschwerpunkt, wenn sein Fokussegment die aktuelle Woche
schneidet. Datumsberechnungen erfolgen kalendertagsbasiert in UTC.

Die Wochenanalyse verwendet die ISO-Kalenderwochen der Saisonmatrix. Umfang
ist die Summe geplanter Session-Meter, die Sessionanzahl zählt geplante
Sessions, und Target RPE stammt aus dem am stärksten überlappenden
Mikrozyklus. Die Schwerpunktverteilung zählt ausschließlich `mainFocusId`,
damit eine Session nicht durch Main und Technical doppelt gewichtet wird.
Saisonfremde oder verwaiste Datensätze werden nicht berücksichtigt.

## Abschluss
Offen.
