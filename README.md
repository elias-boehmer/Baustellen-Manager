# 🏗️ Baustellen-Tracker

Eine mobile-first Web-App zur Verwaltung von Bauprojekten, Aufgaben, To-Dos und Arbeitsstunden. Die App synchronisiert alle Daten in Echtzeit über Firebase und ist speziell für die Nutzung auf Android-Smartphones auf der Baustelle optimiert.

## Inhaltsverzeichnis

- [Funktionen](#funktionen)
- [Seitenübersicht](#seitenübersicht)
- [Technischer Aufbau](#technischer-aufbau)
- [Projektstruktur](#projektstruktur)
- [Installation](#installation)
- [Firebase-Konfiguration](#firebase-konfiguration)
- [Bedienung](#bedienung)
- [Branch-Strategie](#branch-strategie)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)

## Funktionen

### Authentifizierung
- Login per E-Mail und Passwort über Firebase Authentication
- Passwort vergessen (Reset-Link per E-Mail)
- Passwort ändern direkt in der App (mit Re-Authentifizierung)
- Persistente Anmeldung über `browserLocalPersistence`

### Aufgabenverwaltung (Übersicht)
- Haupt- und Unteraufgaben mit Eltern-Kind-Beziehung
- Status-Tracking: Start ausstehend, Blockiert, In Bearbeitung, Erledigt
- Start-/Enddatum, Budget, Verantwortlicher, Notizen, Link und Datei-Referenz je Aufgabe
- Datei-Anhänge (Fotos/PDF) direkt hochladen, gespeichert in Firebase Storage
- Volltextsuche über Titel, Notiz und Verantwortlichen
- Filter nach Status und Verantwortlichem
- Drag-and-Drop-Sortierung der Hauptaufgaben (nur aktiv, wenn kein Filter gesetzt ist)
- Live-Statistiken: offene Haupt-/Unteraufgaben, Gesamtbudget

### To-Dos (Aktuell)
- Persönliche Aufgabenliste, getrennt nach aktiv/erledigt
- Fälligkeitsdatum mit automatischer "Überfällig"-Kennzeichnung
- Erledigungsdatum wird automatisch dokumentiert

### Kalender / Zeitstrahl
- Gantt-ähnliche Darstellung aller Auf- und Unteraufgaben mit Datum
- Heutiges Datum wird als rote Linie im Zeitstrahl markiert
- Spalten "Aufgabe", "Status", "Start", "Ende" passen sich automatisch an den Inhalt an, der Zeitstrahl erhält dadurch maximalen Platz

### Arbeitsstunden
- Zeiterfassung pro Helfer mit Datum, Gesamtstunden und optionaler Aufgabenverknüpfung
- Gruppierte Anzeige nach Helfer mit Tagessummen
- Filter nach Helfer, Autovervollständigung über bereits erfasste Namen

### Bedienkomfort (mobil)
- ESC-Taste schließt jedes offene Modal
- Eingabefelder erhalten am Desktop automatisch den Fokus, am Handy öffnet sich die Tastatur erst nach aktivem Antippen
- Moderner Datumsauswahl-Dialog (Flatpickr) am Desktop, native Datumsauswahl am Handy
- Pull-to-Refresh: Seite am oberen Rand nach unten ziehen lädt die App komplett neu
- Hell-/Dunkelmodus umschaltbar, Einstellung wird lokal gespeichert
- Vollständig responsive mit ausklappbarer Sidebar-Navigation am Handy

## Seitenübersicht

| Seite | Zweck |
|---|---|
| Aktuell | Persönliche To-Do-Liste, Startseite nach dem Login |
| Übersicht | Alle Bauaufgaben mit Such- und Filterfunktion |
| Kalender | Zeitstrahl-Ansicht aller terminierten Aufgaben |
| Stunden | Arbeitszeiterfassung pro Helfer |

## Technischer Aufbau

- **Frontend:** Vanilla JavaScript (ES-Module), HTML5, CSS3 – keine Frameworks
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **Datumsauswahl:** Flatpickr (nur Desktop, via CDN eingebunden)
- **Hosting/Deployment:** wird bei jedem Merge in den Hauptbranch automatisch neu deployt

## Projektstruktur
