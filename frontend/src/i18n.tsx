import React, { createContext, useContext, useEffect, useState } from "react";
import { storage } from "@/src/utils/storage";

type Lang = "it" | "en";

type Dict = Record<string, string>;

const IT: Dict = {
  app_subtitle: "Pubblica Assistenza · Marsala",
  // tabs
  tab_home: "Home",
  tab_prenota: "Prenota",
  tab_turni: "Turni",
  tab_servizio_civile: "Servizio Civile",
  tab_volontari: "Volontari",
  tab_account: "Account",
  // home
  hero_eyebrow: "SERVIZIO 24/7 · MARSALA",
  hero_title: "Prenota un\nTrasporto Sanitario",
  hero_sub: "Ambulanza · Trasporto Disabili · Emodialisi",
  hero_cta: "Prenota Ora",
  section_services: "I Nostri Servizi",
  service_dialysis: "Emodialisi",
  service_dialysis_desc: "Trasporto pazienti in ambulanza per terapie dialitiche.",
  service_disability: "Disabili",
  service_disability_desc: "Furgone attrezzato per trasporto carrozzine.",
  section_know_us: "Conoscici",
  section_gallery: "Dal Nostro Profilo",
  section_about: "Chi Siamo",
  about_body:
    "La Provvidenza ODV è un'associazione di volontariato di pubblica assistenza con sede a Marsala, affiliata ANPAS. Offriamo servizi di trasporto sanitario per pazienti emodializzati e trasporto disabili in carrozzina con ambulanze e furgoni attrezzati.\n\nGrazie alla nostra rete di volontari e ragazzi del Servizio Civile garantiamo un servizio puntuale, gratuito e di qualità a tutta la comunità.",
  follow_instagram: "Seguici su Instagram",
  // booking
  book_title: "Prenota Trasporto",
  book_step_vehicle: "Tipo di Mezzo",
  book_step_vehicle_desc: "Seleziona il servizio richiesto.",
  book_ambulance: "Ambulanza",
  book_ambulance_desc: "Trasporto sanitario, emodialisi e barellati.",
  book_van: "Trasporto Disabili",
  book_van_desc: "Pedana per carrozzine, trasporto disabili.",
  book_step_slot: "Data e Orario",
  book_step_slot_desc: "Seleziona uno degli slot disponibili impostati dagli amministratori.",
  book_no_slots: "Nessuno slot disponibile al momento.",
  book_no_slots_sub: "Riprova più tardi o contattaci telefonicamente.",
  book_step_data: "Dati Prenotante",
  book_patient_data: "Dati Paziente",
  book_name: "Nome*",
  book_surname: "Cognome*",
  book_phone: "Telefono*",
  book_email: "Email*",
  book_address: "Indirizzo*",
  book_weight: "Peso paziente",
  book_normo: "Normopeso",
  book_obeso: "Obeso",
  book_elevator: "Ascensore in casa",
  book_yes: "Sì",
  book_no: "No",
  book_floor: "Piano",
  book_notes: "Note (opzionale)",
  book_continue: "Continua",
  book_confirm: "Conferma Prenotazione",
  book_success_title: "Prenotazione Inviata!",
  book_success_body: "Grazie per averci scelto. La sua richiesta è stata inviata ai nostri volontari che la contatteranno al più presto per la conferma.",
  book_success_id: "ID Prenotazione:",
  book_new: "Nuova Prenotazione",
  // login
  login_title: "Area Riservata",
  login_subtitle: "Accesso volontari e servizio civile",
  login_username: "Username",
  login_password: "Password",
  login_submit: "Accedi",
  login_note: "Le credenziali sono fornite dagli amministratori. La registrazione autonoma non è consentita.",
  // change password
  cp_title: "Cambio Password Obbligatorio",
  cp_body: "Al primo accesso devi impostare una nuova password personale.",
  cp_current: "Password attuale",
  cp_new: "Nuova password (min. 6 caratteri)",
  cp_confirm: "Conferma nuova password",
  cp_submit: "Imposta Password",
  cp_mismatch: "Le password non coincidono",
  cp_short: "Minimo 6 caratteri",
  // dashboard
  dash_role: "Ruolo:",
  dash_slots: "Slot",
  dash_bookings: "Prenotazioni",
  dash_shifts: "Turni",
  dash_empty_slots: "Nessuno slot per questa data. Aggiungine uno dal pulsante \"+\".",
  dash_empty_bookings: "Nessuna prenotazione per questa data.",
  dash_empty_shifts: "Nessun turno assegnato.",
  dash_logout: "Esci",
  // shifts
  shift_title: "I Miei Turni",
  shift_patient: "Paziente:",
  shift_vehicle: "Mezzo:",
  shift_notes: "Note:",
  // misc
  loading: "Caricamento...",
  error_generic: "Errore",
  cancel: "Annulla",
  save: "Salva",
  // civil service / volunteers
  cs_eyebrow: "BANDO 2026 · ISCRIZIONI APERTE",
  cs_title: "Servizio Civile\nUniversale",
  vol_eyebrow: "LA NOSTRA SQUADRA",
  vol_title: "I Nostri\nVolontari",
};

const EN: Dict = {
  app_subtitle: "Public Assistance · Marsala",
  tab_home: "Home",
  tab_prenota: "Book",
  tab_turni: "Shifts",
  tab_servizio_civile: "Civil Service",
  tab_volontari: "Volunteers",
  tab_account: "Account",
  hero_eyebrow: "24/7 SERVICE · MARSALA",
  hero_title: "Book a\nMedical Transport",
  hero_sub: "Ambulance · Wheelchair Van · Dialysis",
  hero_cta: "Book Now",
  section_services: "Our Services",
  service_dialysis: "Dialysis",
  service_dialysis_desc: "Ambulance transport for dialysis patients.",
  service_disability: "Disability",
  service_disability_desc: "Van equipped for wheelchair transport.",
  section_know_us: "About Us",
  section_gallery: "From Our Profile",
  section_about: "Who We Are",
  about_body:
    "La Provvidenza ODV is a volunteer-based public assistance association based in Marsala, affiliated with ANPAS. We provide medical transport services for dialysis patients and disability transport with ambulances and wheelchair-equipped vans.\n\nThanks to our network of volunteers and Civil Service youth, we guarantee a punctual, free, high-quality service to the entire community.",
  follow_instagram: "Follow us on Instagram",
  book_title: "Book Transport",
  book_step_vehicle: "Vehicle Type",
  book_step_vehicle_desc: "Select the requested service.",
  book_ambulance: "Ambulance",
  book_ambulance_desc: "Medical transport, dialysis, stretcher service.",
  book_van: "Wheelchair Van",
  book_van_desc: "Lift platform for wheelchairs, disability transport.",
  book_step_slot: "Date & Time",
  book_step_slot_desc: "Select one of the slots set by the administrators.",
  book_no_slots: "No slots available at the moment.",
  book_no_slots_sub: "Please try again later or contact us by phone.",
  book_step_data: "Requester Info",
  book_patient_data: "Patient Info",
  book_name: "Name*",
  book_surname: "Surname*",
  book_phone: "Phone*",
  book_email: "Email*",
  book_address: "Address*",
  book_weight: "Patient weight",
  book_normo: "Normal",
  book_obeso: "Obese",
  book_elevator: "Elevator at home",
  book_yes: "Yes",
  book_no: "No",
  book_floor: "Floor",
  book_notes: "Notes (optional)",
  book_continue: "Continue",
  book_confirm: "Confirm Booking",
  book_success_title: "Booking Sent!",
  book_success_body: "Thank you for choosing us. Your request has been sent to our volunteers who will contact you shortly to confirm.",
  book_success_id: "Booking ID:",
  book_new: "New Booking",
  login_title: "Members Area",
  login_subtitle: "Volunteers and civil service access",
  login_username: "Username",
  login_password: "Password",
  login_submit: "Sign In",
  login_note: "Credentials are provided by administrators. Self-registration is not allowed.",
  cp_title: "Password Change Required",
  cp_body: "On first login you must set a new personal password.",
  cp_current: "Current password",
  cp_new: "New password (min. 6 chars)",
  cp_confirm: "Confirm new password",
  cp_submit: "Set Password",
  cp_mismatch: "Passwords do not match",
  cp_short: "Minimum 6 characters",
  dash_role: "Role:",
  dash_slots: "Slots",
  dash_bookings: "Bookings",
  dash_shifts: "Shifts",
  dash_empty_slots: "No slots for this date. Add one with the \"+\" button.",
  dash_empty_bookings: "No bookings for this date.",
  dash_empty_shifts: "No shifts assigned.",
  dash_logout: "Logout",
  shift_title: "My Shifts",
  shift_patient: "Patient:",
  shift_vehicle: "Vehicle:",
  shift_notes: "Notes:",
  loading: "Loading...",
  error_generic: "Error",
  cancel: "Cancel",
  save: "Save",
  cs_eyebrow: "2026 CALL · OPEN APPLICATIONS",
  cs_title: "Universal\nCivil Service",
  vol_eyebrow: "OUR TEAM",
  vol_title: "Our\nVolunteers",
};

const DICTS: Record<Lang, Dict> = { it: IT, en: EN };
const STORAGE_KEY = "app_lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof IT) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    storage.getItem<string>(STORAGE_KEY, "it").then((v) => {
      if (v === "it" || v === "en") setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    storage.setItem(STORAGE_KEY, l);
  };

  const t = (k: keyof typeof IT) => DICTS[lang][k] || k;
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n must be used inside I18nProvider");
  return c;
}
