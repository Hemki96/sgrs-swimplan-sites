# Seed Data

Dimensions: Strength, Aerobic, Anaerobic, Speed, Tactical, Technical.
Focus examples: Aerobic Base, Aerobic Capacity, Aerobic Power, Anaerobic Capacity, Anaerobic Power, Lactate Production, Lactate Tolerance, Race Pace, Sprint, Recovery, Starts, Turns, Underwater, Stroke Efficiency.
Equipment: Wettkampfanzug, Kurzflossen, Paddles, Schnorchel, Pullkick, Brett, Fallschirm, Pulssensor, Trinkflasche.

Beim ersten Start mit leerem Storage wird automatisch eine vollständige
Demo-Saison 2026/27 angelegt. Sie enthält zwei Eventspuren, drei Wettkämpfe,
zwei Kalenderrestriktionen, zwei Makrozyklen, vier Mesozyklen, zwölf
Mikrozyklen mit Segmenten, parallele Fokussegmente sowie vier Trainingstage
mit fünf Sessions und Ausrüstungszuordnungen. Alle Schreibvorgänge laufen über
den `StorageAdapter` und erzeugen Revisionen. Bereits vorhandene Saisons werden
nicht verändert.
