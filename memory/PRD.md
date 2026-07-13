# La Provvidenza ODV — Marsala

## Sintesi
App mobile (Expo iOS/Android + web responsive) e backend FastAPI per "La Provvidenza ODV", associazione ANPAS di Marsala che fornisce trasporto sanitario in ambulanza (emodialisi) e furgone attrezzato per disabili.

## Funzionalità finali (Fase 1 + 2 + Foto)

### Per gli ospiti (no login)
- Splash con logo animato
- Home: hero "Prenota Ora", servizi, **galleria foto auto-scroll** caricata dagli admin, banner Instagram, "Chi Siamo"
- Pagina Prenota (3 step) con email di conferma anche al prenotante
- Pagine Servizio Civile e Volontari con **foto e profili caricati dagli admin**
- Toggle lingua IT/EN con bandierine

### Per il Servizio Civile
- Tab "Turni" (i propri turni assegnati con paziente, mezzo, note)
- Profilo editabile: **foto, nome completo, età, bio**
- Cambio password obbligatorio al primo accesso

### Per gli Admin
- Dashboard con quick actions (Utenti, Nuovo Slot, Nuovo Turno, Pz Dializzati, Foto)
- Gestione utenti (solo servizio civile; gli admin NON possono creare altri admin)
- Gestione slot prenotazioni
- Gestione turni servizio civile E turni admin
- **Pagina Pz Dializzati** (CRUD + pulsante "Apri in Google Maps")
- **Gestione Foto** (galleria home + foto profilo volontari + foto profilo servizio civile)

### Per il Master
- Tutte le funzioni admin
- Crea/elimina ADMIN
- Ripristina password di qualsiasi utente

## Stack
- Frontend: Expo Router (SDK 54), React Native, TypeScript, expo-image, expo-image-picker, expo-navigation-bar, expo-linear-gradient.
- Backend: FastAPI + Motor (MongoDB), bcrypt + PyJWT auth, smtplib per email Gmail SMTP.
- i18n: dizionario IT/EN custom (no librerie esterne) persistito su storage locale.
- Master seedato a startup da `MASTER_USERNAME` / `MASTER_PASSWORD` (definiti in `backend/.env`, escluso da git).

## Email Gmail SMTP
- Inviata in background a `figlioli.enrico@gmail.com`, CC `info@laprovvidenza.it`, e **anche al prenotante** (email inserita nel form).

## Multi-piattaforma
Codebase Expo unica: stessa app per iOS, Android e Web responsive (preview URL serve anche da "sito web"). Nav bar Android nascosta automaticamente.
