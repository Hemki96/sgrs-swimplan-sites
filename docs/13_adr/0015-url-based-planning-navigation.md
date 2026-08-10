# ADR 0015: URL-basierte Planungsnavigation

## Status

Accepted

## Kontext

Die ausgewählte Saison wurde bisher nur in lokalem React-Zustand gehalten. Ein
Reload, Browser Zurück/Vorwärts oder ein geteilter Link konnte die Planung nicht
wiederherstellen. Außerdem lag die Desktop-Matrix unter der vollständigen
Saisonliste.

## Entscheidung

Die öffentliche Planungsansicht erhält die Route `/saisons/:seasonId`. Die
Startseite wählt deterministisch eine aktive, aktuell laufende oder zuletzt
beginnende nicht archivierte Saison und ersetzt die URL. Desktop nutzt eine
Master/Detail-Shell mit Matrix als Primäransicht; unter 1024 px wird Tag/Woche
priorisiert. Persistenter Fachzustand bleibt ausschließlich im StorageAdapter.

## Alternativen

- Nur lokaler React-Zustand: einfacher, aber nicht teilbar oder reloadfest.
- Query-Parameter: technisch möglich, bildet die fachliche Ressource jedoch
  weniger klar ab als eine eigene Saisonroute.

## Konsequenzen

- Saisonlinks sind direkt teilbar und browsernavigationsfest.
- App-Router und Client-Navigation müssen denselben Auswahlzustand abbilden.
- Unbekannte oder gelöschte IDs benötigen einen expliziten Fehlerzustand.
- Domain, Storage-Schema und Exportformat bleiben unverändert.
