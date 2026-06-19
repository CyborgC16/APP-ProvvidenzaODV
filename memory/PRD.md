# La Provvidenza ODV — Marsala

## Sintesi
App mobile (Expo iOS/Android + web responsive) e backend FastAPI per "La Provvidenza ODV", associazione ANPAS di Marsala che fornisce trasporto sanitario in ambulanza (emodialisi) e furgone attrezzato per disabili.

## Funzionalità chiave
- **Splash** con logo dell'associazione e animazione pulse → entra nei tabs.
- **Home** con presentazione servizi, CTA "Prenota Ora", quick-link a Servizio Civile e Volontari.
- **Pagina Prenota (ospite, senza login)**: flusso a 3 step (mezzo → slot disponibile → dati prenotante+paziente). Invia email automatica a `figlioli.enrico@gmail.com` con CC `info@laprovvidenza.it`, oggetto "Prenotazione Servizio".
- **Pagina Servizio Civile**: testo informativo bando 2026 + griglia 10 foto placeholder.
- **Pagina Volontari**: griglia 10 foto placeholder con ruoli.
- **Login** (email/password, solo credenziali fornite dagli admin) per admin e servizio civile.
- **Dashboard Admin**: strip data, lista slot + prenotazioni del giorno, FAB per creare slot, accesso a gestione utenti.
- **Gestione Utenti** (admin/master): crea/elimina admin o servizio civile, rigenera password.
- **Dashboard Servizio Civile**: visualizzazione read-only dei propri turni.

## Stack
- Frontend: Expo Router (SDK 54), React Native, TypeScript, expo-image, expo-linear-gradient.
- Backend: FastAPI + Motor (MongoDB), bcrypt + PyJWT auth, smtplib per email Gmail.
- Master seedato a startup: `CyborgC17 / Benito99.`

## Configurazione Email
- Gmail SMTP con app password configurata in `backend/.env`
- Email inviata in background task → la creazione della prenotazione resta veloce.

## Multi-piattaforma
Codebase Expo unica: stessa app per iOS, Android e Web responsive (preview URL serve anche da "sito web").
