# Assistente Provvidenza — Fase A

Prima versione in sola lettura.

## Endpoint

`POST /api/assistant/chat` (JWT obbligatorio).

## Variabili opzionali

- `GEMINI_API_KEY`: chiave server, mai nel frontend o nell’AAB.
- `GEMINI_MODEL`: predefinito `gemini-3.5-flash`.

Senza chiave Gemini l’assistente continua a funzionare tramite classificazione locale.

## Funzioni abilitate

- turno personale di oggi/domani;
- mezzo assegnato;
- paziente assegnato al proprio turno;
- prossimo Servizio;
- conteggio Servizi (globale solo per admin/master).

Le operazioni di scrittura sono intenzionalmente disabilitate in questa fase.
