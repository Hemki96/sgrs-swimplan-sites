# ExecPlan: Vollständige Demo-Daten

## Ziel

Beim ersten Start eine datenschutzkonforme Demo-Saison erzeugen, in der alle
zentralen Planungsansichten unmittelbar mit zusammenhängenden Beispieldaten
sichtbar sind.

## Scope

- Wettkampfspuren, Wettkämpfe und Kalenderrestriktionen
- Makro-, Meso- und zwölf Mikrozyklen inklusive Mikrozyklussegmenten
- parallele Fokussegmente in allen sechs Periodisierungsdimensionen
- Trainingstage mit mehreren Sessions und Ausrüstungszuordnungen
- automatische, idempotente Initialisierung nur bei leerem Storage
- Unit-Tests, Reload-Prüfung und Quality Gate

## Non-Scope

- personenbezogene Daten, Gesundheitsdaten oder detaillierte Trainingsserien
- neues Storage- oder Importformat
- Änderung der Architektur

## Entscheidungen

- Alle Demo-Mutationen laufen über den bestehenden `StorageAdapter` und
  erzeugen Revisionen.
- Die Demo wird ausschließlich angelegt, wenn noch keine Saison existiert.
- Stabile IDs machen Beziehungen und Tests nachvollziehbar.

## Meilensteine

- [x] M1: Vollständigen Demo-Seed umsetzen
- [x] M2: Leeren Erststart mit Demo-Seed verbinden
- [x] M3: Tests und Dokumentation aktualisieren
- [x] M4: Quality Gate ausführen

## Abschluss

Abgeschlossen am 2026-08-10. Die Demo-Saison enthält 87 revisionierte
Mutationen und bleibt nach Snapshot/Reload vollständig erhalten. Format, Lint,
Typecheck, 59 Unit-Tests, Build und 9 Browser-E2E-Tests sind erfolgreich.
