# La Provvidenza ODV 2.0 — Architettura Sprint 1

## Obiettivo
Costruire il primo nucleo operativo della versione 2.0 senza modificare la release stabile 1.x.

## Moduli Sprint 1
1. Stato mezzi
2. Missioni operative
3. Equipaggi
4. Storico cambi di stato
5. Audit minimo

## Flusso principale
Prenotazione confermata → Missione creata → Mezzo assegnato → Equipaggio assegnato → In servizio → Completata

## Raccolte MongoDB
- `vehicles`: anagrafica e stato corrente del mezzo
- `vehicle_status_history`: storico cambi di stato
- `missions`: missioni operative
- `crews`: equipaggi associati alle missioni
- `audit_logs`: operazioni amministrative rilevanti

## Compatibilità
Le collezioni esistenti `bookings`, `slots`, `users`, `patients` e `shifts` non vengono alterate.
Una missione può nascere da una prenotazione, ma la prenotazione originale resta invariata.
