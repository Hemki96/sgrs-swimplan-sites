# Import Pipeline

Datei wählen -> Parser -> Schema -> syntaktisch -> fachlich -> Vorschau -> Diff -> Bestätigung -> atomare Mutation -> Revision -> Bericht. Nie ohne Vorschau importieren.

Schema-Version `1.0` exportiert globale Konfigurationswerte und alle fachlichen
Collections. Beim Import wird genau eine Saison ausgewählt, vollständig auf neue
IDs abgebildet und erst nach Bestätigung atomar gespeichert. Die älteren
numerischen Versionen `1` und `2` bleiben importierbar; Version `1` wird in der
Vorschau als Migration gekennzeichnet. Bestehende Saisons werden nie
überschrieben; verwendete globale Codes bleiben mindestens deaktiviert erhalten.
