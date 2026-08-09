# ChatGPT Sites Runtime

## Verifizierte Produktannahmen
ChatGPT Sites kann interaktive Websites und lightweight Apps erstellen/hosten. Sites kann Code, Storage und Logs umfassen; OpenAI-Hinweise nennen auch D1/R2-Daten bzw. Dateispeicher.

## Einschränkungen
Public Beta; Funktionen/Limits variabel; Verfügbarkeit plan-, region- und workspaceabhängig; einige Frameworks/Datenbanken/Hintergrunddienste können unsupported sein; keine Daten-/Inferenzresidenz zum Start.

## Implementierungsregel
`SitesStorageAdapter` erst implementieren, wenn Codex in der realen Runtime Binding, Lese-/Schreib-API, Migration/Schema, Preview/Publish-Verhalten und Limits verifiziert und per ADR dokumentiert hat.
