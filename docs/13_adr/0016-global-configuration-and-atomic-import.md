# ADR 0016: Globale Konfiguration und atomarer Import

## Status

Accepted

## Datum

2026-08-10

## Kontext

Auswahllisten waren teils als TypeScript-Enums und teils als saisonbezogene
Stammdaten modelliert. Sie sollen öffentlich und saisonübergreifend gepflegt
werden. Import darf bestehende Planungen nicht teilweise verändern und jede
Mutation muss weiterhin eine Revision erzeugen.

## Entscheidung

1. Globale Werte liegen versioniert und soft-deletable in der Collection
   `configuration_values` und werden ausschließlich über den `StorageAdapter`
   verändert.
2. Die vorhandene Revisionsstruktur bleibt erhalten. Globale Revisionen tragen
   die reservierte Scope-ID `__global_configuration__` im Feld `seasonId`.
3. Codes sind stabile technische Schlüssel. Referenzierte Werte dürfen nur
   deaktiviert, nicht entfernt werden.
4. Exportformat Version 2 enthält globale Konfiguration und alle Collections.
   Version 1 bleibt als Importquelle lesbar.
5. Ein bestätigter Import wird als eine atomare Adapter-Operation ausgeführt.
   Saison-IDs und abhängige IDs werden vor der Mutation neu vergeben.
6. Vorschau und Worker verwenden denselben vollständigen Snapshot-Validator.
   Zuerst werden alle Entitäten syntaktisch validiert, danach IDs, Relationen,
   Saison-Scope und Zeitraumhierarchien. Erst ein fehlerfreier Snapshot darf
   einen D1-Batch erzeugen.
7. Exportierte Revisionen dienen dem Backup und der Anzeige, werden bei einem
   ausgewählten Saisonimport aber nicht wieder eingespielt. Der Import erzeugt
   neue Revisionen für die tatsächlich neu geschriebenen Entitäten.

## Alternativen

- Direkte D1-Abfragen aus der UI wurden wegen ADR 0005 verworfen.
- Eine Tabelle pro Werteliste wurde zugunsten eines einheitlichen, erweiterbaren
  Katalogs verworfen.
- Nicht-atomare Einzel-PUTs wurden verworfen, da Fehler Teilimporte hinterlassen
  könnten.

## Konsequenzen

- Globale Änderungen sind gemeinsam sichtbar und revisionsfähig.
- Fachliche Formulare können Labels und aktive Optionen zur Laufzeit laden.
- Der Import benötigt vor der Bestätigung eine vollständige validierte Vorschau.
- Die reservierte Scope-ID darf nicht als Saison-ID verwendet werden.
- Ein Validierungs- oder Versionsfehler vor beziehungsweise im D1-Batch
  hinterlässt keinen Teilimport.
