# ADR 0017: Endgültiges Löschen von Saisons

## Status

Accepted

## Datum

2026-08-10

## Kontext

Weich gelöschte Saisons (ADR 0008) bleiben zusammen mit ihren Revisionen
unbegrenzt im Speicher. Es gibt keine Möglichkeit, Saisons samt aller
zugehörigen Planungsdaten und ihrer Historie endgültig zu entfernen. Trainer
benötigen eine bewusste Datenbereinigung für die gemeinsame, öffentliche
Planung.

## Entscheidung

1. Weich gelöschte Saisons können in den Einstellungen endgültig gelöscht
   werden. Datensätze, die nicht weich gelöscht sind, sind davon
   ausgeschlossen.
2. Das endgültige Löschen ist eine atomare Speicheroperation über den
   `StorageAdapter` (`purgeSeason`). Sie entfernt die Saison, alle Objekte in
   ihrem Saison-Scope (inklusive über Eltern-Ketten erreichbare Objekte) und
   alle Revisionen dieser Saison.
3. Die Löschung wird nur nach ausdrücklicher, mehrstufiger Bestätigung
   ausgelöst: Das PHP-Modal zeigt den Löschumfang (Planungsobjekte und
   Revisionen) und verlangt das Eintippen des Saisonnamens.
4. Vor dem Löschen wird auf den JSON-Gesamtexport als Backup hingewiesen.
5. ADR 0007 (Revision pro Mutation) und ADR 0008 (Soft Delete) gelten für alle
   regulären Mutationen weiter. Das endgültige Löschen ist die einzige
   dokumentierte Ausnahme und zerstört bewusst auch die Revisionshistorie.

## Alternativen

- Verwerfen per Rückspiel des JSON-Exports wurde verworfen, da nicht atomar
  und fehleranfällig.
- Ein hartes Löschen direkt aus der Saison-Navigation wurde verworfen, um
  versehentlichen, nicht wiederherstellbaren Datenverlust zu verhindern.
- Eine reine D1-Abfrage aus der UI wurde wegen ADR 0005 verworfen.

## Konsequenzen

- Endgültig gelöschte Saisons sind und bleiben vollständig entfernt und im
  Exkurs nicht mehr exportiert.
- Der D1-Speicher nutzt Spalte `season_id`, um den Saison-Scope zu bestimmen;
  alle Schreib- und Importpfade setzen diese Spalte bereits zuverlässig.
- Die Bestätigungsschwelle verhindert versehentliche Datenbereinigung.
- Weich gelöschte, nicht bereinigte Saisons bleiben wie bisher wiederherstellbar.