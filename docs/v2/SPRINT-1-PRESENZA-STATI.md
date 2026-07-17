# Sprint 1 — Presenza online, stati e bacheca

Implementato:

- heartbeat autenticato ogni 30 secondi;
- utente online entro 90 secondi dall'ultimo heartbeat;
- stato automatico con precedenza a Servizio e turno in corso;
- stato manuale temporaneo: disponibile, impegnato, non disponibile;
- ritorno automatico alla modalità automatica alla scadenza;
- cerchio animato verde, arancione, rosso o grigio;
- aggiornamento elenco volontari ogni 30 secondi;
- API di conferma lettura degli avvisi.

Colori:

- verde: disponibile;
- arancione: impegnato in un Servizio o turno;
- rosso: non disponibile;
- grigio: offline.
