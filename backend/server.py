"""La Provvidenza ODV - Backend API"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import binascii
import smtplib
import secrets
import string
import uuid
import json
import re
import urllib.request
import urllib.error
import asyncio
import unicodedata
from zoneinfo import ZoneInfo
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal, Any

import bcrypt
import jwt
from pydantic import BaseModel, Field, EmailStr, field_validator

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ----- Logging -----
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("provvidenza")

# ----- Mongo -----
mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# ----- Constants -----
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ.get("JWT_ALGO", "HS256")
JWT_EXPIRES_HOURS = int(os.environ.get("JWT_EXPIRES_HOURS", 24))
MASTER_USERNAME = os.environ["MASTER_USERNAME"]
MASTER_PASSWORD = os.environ["MASTER_PASSWORD"]

SMTP_HOST = os.environ["SMTP_HOST"]
SMTP_PORT = int(os.environ["SMTP_PORT"])
SMTP_SSL = os.environ.get("SMTP_SSL", "false").lower() in ("1", "true", "yes")
SMTP_USER = os.environ["SMTP_USER"]
SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]
BOOKING_TO_EMAIL = os.environ["BOOKING_TO_EMAIL"]
BOOKING_CC_EMAIL = os.environ["BOOKING_CC_EMAIL"]
BOOKING_SUBJECT = os.environ["BOOKING_SUBJECT"]

# ----- Daily booking quota configuration -----
# From Monday to Saturday (weekday 0=Mon ... 5=Sat, 6=Sun excluded).
DAILY_CAPACITY = {"ambulanza": 3, "furgone": 2}
OPEN_WEEKDAYS = {0, 1, 2, 3, 4, 5}  # Mon-Sat
BOOKING_CUTOFF_TIME = "16:00"  # last bookable time (office closes at 18:00)
# Statuses that still occupy a daily slot (everything except cancelled).
ACTIVE_STATUSES = ("pendente", "confermata", "completata")

MAX_LOGIN_FAILURES = 5
LOGIN_LOCK_MINUTES = 5

Role = Literal["master", "admin", "servizio_civile"]

PRODUCTION = os.environ.get("PRODUCTION", "false").lower() in ("1", "true", "yes")

app = FastAPI(
    title="La Provvidenza ODV API",
    docs_url=None if PRODUCTION else "/docs",
    redoc_url=None if PRODUCTION else "/redoc",
    openapi_url=None if PRODUCTION else "/openapi.json",
)
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# ===== Helpers =====
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def generate_random_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Token mancante")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token scaduto")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token non valido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    return user


def require_role(*roles: str):
    async def _checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Permessi insufficienti")
        return user

    return _checker

ALLOWED_IMAGE_PREFIXES = (
    "data:image/jpeg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
)

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def validate_image_b64(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return value

    if not value.startswith(ALLOWED_IMAGE_PREFIXES):
        raise ValueError("Formato immagine non consentito. Usa JPEG, PNG o WebP")

    encoded = value.split(",", 1)[1]

    try:
        raw = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error):
        raise ValueError("Immagine non valida")

    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("L'immagine non può superare 5 MB")

    return value


def get_client_ip(request: Request) -> str:
    """Return the original client IP when traffic arrives through Cloudflare/Nginx."""
    cloudflare_ip = request.headers.get("cf-connecting-ip")
    if cloudflare_ip:
        return cloudflare_ip.strip()

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()

    return request.client.host if request.client else "unknown"


async def check_login_lock(username: str, ip: str):
    now = datetime.now(timezone.utc)
    key = {"username": username.lower(), "ip": ip}
    record = await db.login_attempts.find_one(key)

    if not record:
        return

    locked_until = record.get("locked_until")
    if locked_until and locked_until > now:
        seconds = max(1, int((locked_until - now).total_seconds()))
        minutes = max(1, (seconds + 59) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi errati. Riprova tra circa {minutes} minuti",
            headers={"Retry-After": str(seconds)},
        )

    if locked_until and locked_until <= now:
        await db.login_attempts.delete_one(key)


async def register_failed_login(username: str, ip: str):
    now = datetime.now(timezone.utc)
    key = {"username": username.lower(), "ip": ip}

    await db.login_attempts.update_one(
        key,
        {
            "$inc": {"failures": 1},
            "$set": {"updated_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    record = await db.login_attempts.find_one(key) or {}
    failures = int(record.get("failures", 1))

    if failures >= MAX_LOGIN_FAILURES:
        locked_until = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
        await db.login_attempts.update_one(
            key,
            {
                "$set": {
                    "locked_until": locked_until,
                    "failures": 0,
                    "updated_at": now,
                }
            },
        )


async def clear_failed_logins(username: str, ip: str):
    await db.login_attempts.delete_one({
        "username": username.lower(),
        "ip": ip,
    })


# ===== Assistente IA (sola lettura) =====
ROME_TZ = ZoneInfo("Europe/Rome")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip()


def _assistant_normalize(text: str) -> str:
    value = unicodedata.normalize("NFKD", text.lower().strip())
    return "".join(ch for ch in value if not unicodedata.combining(ch))


def _assistant_parse_date(text: str) -> Optional[str]:
    normalized = _assistant_normalize(text)
    today = datetime.now(ROME_TZ).date()
    if "dopodomani" in normalized:
        return (today + timedelta(days=2)).isoformat()
    if "domani" in normalized:
        return (today + timedelta(days=1)).isoformat()
    if "oggi" in normalized:
        return today.isoformat()

    weekdays = {
        "lunedi": 0, "martedi": 1, "mercoledi": 2, "giovedi": 3,
        "venerdi": 4, "sabato": 5, "domenica": 6,
    }
    for name, weekday in weekdays.items():
        if name in normalized:
            delta = (weekday - today.weekday()) % 7
            if delta == 0 and any(word in normalized for word in ("prossimo", "prossima")):
                delta = 7
            return (today + timedelta(days=delta)).isoformat()

    match = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", normalized)
    if match:
        day, month, year = int(match.group(1)), int(match.group(2)), match.group(3)
        year_num = today.year if not year else int(year) + (2000 if len(year) == 2 else 0)
        try:
            candidate = datetime(year_num, month, day).date()
            if not year and candidate < today:
                candidate = candidate.replace(year=today.year + 1)
            return candidate.isoformat()
        except ValueError:
            return None
    iso = re.search(r"\b(20\d{2})-(\d{2})-(\d{2})\b", normalized)
    if iso:
        try:
            return datetime.strptime(iso.group(0), "%Y-%m-%d").date().isoformat()
        except ValueError:
            return None
    return None


def _assistant_target_date(text: str) -> str:
    return _assistant_parse_date(text) or datetime.now(ROME_TZ).date().isoformat()


def _assistant_parse_time(text: str) -> Optional[str]:
    normalized = _assistant_normalize(text).replace('.', ':')
    word_hours = {
        "mezzogiorno": 12, "mezzanotte": 0, "una": 1, "due": 2, "tre": 3,
        "quattro": 4, "cinque": 5, "sei": 6, "sette": 7, "otto": 8,
        "nove": 9, "dieci": 10, "undici": 11, "dodici": 12,
        "tredici": 13, "quattordici": 14, "quindici": 15, "sedici": 16,
        "diciassette": 17, "diciotto": 18, "diciannove": 19, "venti": 20,
    }
    explicit = re.search(r"(?:alle|ore|verso|per le)\s*(\d{1,2})(?::(\d{2}))?\b", normalized)
    candidates = [explicit] if explicit else list(re.finditer(r"\b(\d{1,2}):(\d{2})\b", normalized))
    for match in candidates:
        if match:
            hour, minute = int(match.group(1)), int(match.group(2) or 0)
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
    for word, hour in word_hours.items():
        if re.search(rf"(?:alle|ore|verso|per le)\s+{word}\b", normalized):
            if hour <= 7 and any(x in normalized for x in ("pomeriggio", "sera")):
                hour += 12
            return f"{hour:02d}:00"
    stripped = normalized.strip()
    if re.fullmatch(r"\d{1,2}", stripped):
        hour = int(stripped)
        if 0 <= hour <= 23:
            return f"{hour:02d}:00"
    return None


def _assistant_parse_vehicle(text: str) -> Optional[str]:
    normalized = _assistant_normalize(text)
    if any(word in normalized for word in ("ambulanza", "ambulance")):
        return "ambulanza"
    if any(word in normalized for word in ("auto", "macchina", "furgone", "pulmino", "vettura")):
        return "furgone"
    return None


def _assistant_local_intent(text: str) -> str:
    lower = _assistant_normalize(text)
    if _assistant_is_cancel_service(text):
        return "cancel_service"
    if _assistant_is_create(text):
        return "create_service"
    if any(k in lower for k in ("turno", "turni", "orario", "quando sono di turno", "quando lavoro")):
        return "my_shift"
    if any(k in lower for k in ("mezzo", "veicolo", "macchina assegnata", "auto assegnata", "ambulanza assegnata")):
        return "my_vehicle"
    if any(k in lower for k in ("paziente", "trasporto chi", "chi devo", "chi porto")):
        return "my_patient"
    if any(k in lower for k in ("prossimo servizio", "servizio prossimo", "prossimo trasporto")):
        return "next_service"
    if any(k in lower for k in ("quanti servizi", "numero servizi", "servizi oggi", "servizi domani")):
        return "service_count"
    return "help"


def _gemini_classify_sync(message: str, history: list[dict]) -> Optional[str]:
    if not GEMINI_API_KEY:
        return None
    history_text = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in history[-6:])
    prompt = (
        "Sei il classificatore dell'assistente del gestionale La Provvidenza. "
        "Comprendi sinonimi e frasi colloquiali italiane. Rispondi solo con JSON valido "
        "nel formato {\"intent\":\"...\"}. Intent: create_service, cancel_service, my_shift, "
        "my_vehicle, my_patient, next_service, service_count, help. "
        "Usa cancel_service quando l'utente vuole annullare o cancellare un servizio gia creato; "
        "usa create_service quando vuole aggiungere, prenotare o bloccare un servizio.\n"
        f"Cronologia:\n{history_text}\nRichiesta: {message}"
    )
    payload = {"contents": [{"role": "user", "parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}, method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
        intent = json.loads(data["candidates"][0]["content"]["parts"][0]["text"]).get("intent")
        allowed = {"create_service", "cancel_service", "my_shift", "my_vehicle", "my_patient", "next_service", "service_count", "help"}
        return intent if intent in allowed else None
    except Exception as exc:
        logger.warning("Gemini non disponibile, uso comprensione locale: %s", exc)
        return None


async def _assistant_my_shifts(user_id: str, date_from: Optional[str] = None) -> list[dict]:
    query: dict = {"assigned_user_id": user_id}
    if date_from:
        query["date"] = {"$gte": date_from}
    return await db.shifts.find(query, {"_id": 0}).sort([("date", 1), ("time_start", 1)]).to_list(50)


ASSISTANT_SESSION_MINUTES = 20


def _assistant_is_create(text: str) -> bool:
    normalized = _assistant_normalize(text)
    object_words = ("servizio", "slot", "trasporto", "ambulanza", "auto", "furgone", "prenotazione")
    action_words = ("aggiungi", "crea", "prenota", "blocca", "inserisci", "registra", "metti", "fissa", "organizza", "serve")
    return (any(word in normalized for word in action_words) and any(word in normalized for word in object_words)) or (
        any(word in normalized for word in ("servizio", "trasporto")) and (_assistant_parse_date(text) is not None or _assistant_parse_time(text) is not None)
    )


def _assistant_is_cancel_service(text: str) -> bool:
    normalized = _assistant_normalize(text)
    cancellation = any(word in normalized for word in ("annulla", "annullare", "cancella", "cancellare", "elimina", "rimuovi", "disdici"))
    target = any(word in normalized for word in ("servizio", "slot", "trasporto", "prenotazione", "quello", "appena creato", "ultimo"))
    return cancellation and target


def _assistant_is_confirm(text: str) -> bool:
    normalized = _assistant_normalize(text)
    return normalized in {"confermo", "conferma", "si", "ok", "procedi", "va bene", "esegui", "fallo", "certo"}


def _assistant_is_abort(text: str) -> bool:
    normalized = _assistant_normalize(text)
    return normalized in {"annulla", "annullo", "lascia perdere", "stop", "interrompi", "non importa", "no"}


async def _assistant_get_session(user_id: str) -> Optional[dict]:
    doc = await db.assistant_sessions.find_one({"user_id": user_id}, {"_id": 0})
    if not doc:
        return None
    expires_at = doc.get("expires_at")
    if expires_at:
        try:
            if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
                await db.assistant_sessions.delete_one({"user_id": user_id})
                return None
        except ValueError:
            pass
    return doc


async def _assistant_save_session(user_id: str, state: dict) -> None:
    now = datetime.now(timezone.utc)
    state.update({"user_id": user_id, "updated_at": now.isoformat(), "expires_at": (now + timedelta(minutes=ASSISTANT_SESSION_MINUTES)).isoformat()})
    await db.assistant_sessions.update_one({"user_id": user_id}, {"$set": state}, upsert=True)


async def _assistant_clear_session(user_id: str) -> None:
    await db.assistant_sessions.delete_one({"user_id": user_id})


def _assistant_summary(data: dict) -> str:
    vehicle = "Ambulanza" if data.get("vehicle_type") == "ambulanza" else "Auto/Furgone"
    patient = data.get("patient_name") or "Non indicato"
    address = data.get("address") or "Non indicata"
    return (f"Riepilogo del servizio:\n• Data: {data.get('date')}\n• Ora: {data.get('time')}\n"
            f"• Mezzo: {vehicle}\n• Paziente: {patient}\n• Destinazione/indirizzo: {address}\n\nConfermi?")


async def _assistant_create_manual_booking(data: dict, user: dict) -> dict:
    validate_booking_day_time(data["date"], data["time"])
    booked = await count_active_bookings(data["date"], data["vehicle_type"])
    capacity = DAILY_CAPACITY[data["vehicle_type"]]
    if booked >= capacity:
        raise HTTPException(status_code=409, detail="Nessuno slot disponibile per questo mezzo e giorno")
    now = datetime.now(timezone.utc).isoformat()
    booking_doc = {
        "id": str(uuid.uuid4()), "slot_date": data["date"], "slot_time": data["time"],
        "requester_name": user.get("full_name") or user.get("username") or "Operatore",
        "requester_surname": None, "patient_name": data.get("patient_name"), "patient_surname": None,
        "phone": None, "email": user.get("email"), "address": data.get("address"),
        "vehicle_type": data["vehicle_type"], "patient_weight_class": None, "has_elevator": None,
        "floor": None, "notes": "Creato tramite Assistente Provvidenza", "source": "assistant",
        "status": "pendente", "created_at": now, "created_by": user["id"],
    }
    await db.bookings.insert_one(booking_doc)
    return {k: v for k, v in booking_doc.items() if k != "_id"}


async def _assistant_find_bookings_to_cancel(text: str, user: dict) -> list[dict]:
    query: dict[str, Any] = {"status": {"$in": ACTIVE_STATUSES}}
    if user.get("role") not in ("master", "admin"):
        query["created_by"] = user["id"]
    target_date = _assistant_parse_date(text)
    target_time = _assistant_parse_time(text)
    if target_date:
        query["slot_date"] = target_date
    else:
        query["slot_date"] = {"$gte": datetime.now(ROME_TZ).date().isoformat()}
    if target_time:
        query["slot_time"] = target_time
    docs = await db.bookings.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(10)
    return docs


def _assistant_cancel_summary(booking: dict) -> str:
    vehicle = "Ambulanza" if booking.get("vehicle_type") == "ambulanza" else "Auto/Furgone"
    patient = booking.get("patient_name") or "paziente non indicato"
    return f"Vuoi annullare il servizio del {booking.get('slot_date')} alle {booking.get('slot_time')} · {vehicle} · {patient}?"


# ===== Models =====
class UserPublic(BaseModel):
    id: str
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    role: Role
    created_at: str
    must_change_password: bool = False
    bio: Optional[str] = None
    age: Optional[int] = None
    photo_b64: Optional[str] = None
    role_title: Optional[str] = None
    join_date: Optional[str] = None  # ISO date YYYY-MM-DD
    birth_date: Optional[str] = None  # ISO date YYYY-MM-DD
    notify_email: bool = True


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserPublic


class UserCreateRequest(BaseModel):
    username: str
    full_name: str
    email: Optional[EmailStr] = None
    role: Literal["admin", "servizio_civile", "master"]
    password: Optional[str] = None  # if None, auto-generate
    photo_b64: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, value):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @field_validator("photo_b64")
    @classmethod
    def validate_photo(cls, value):
        return validate_image_b64(value)


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    photo_b64: Optional[str] = None
    role_title: Optional[str] = None
    join_date: Optional[str] = None
    birth_date: Optional[str] = None
    notify_email: Optional[bool] = None
    @field_validator("photo_b64")
    @classmethod
    def validate_photo(cls, value):
        return validate_image_b64(value)


class AdminEditBioRequest(BaseModel):
    """Master can edit any user's bio; other roles can only edit their own via /profile."""
    bio: Optional[str] = None
    role_title: Optional[str] = None
    join_date: Optional[str] = None
    birth_date: Optional[str] = None


class AnnouncementRequest(BaseModel):
    title: str
    message: str
    level: Literal["info", "warning", "danger"] = "warning"
    expires_at: str  # ISO date YYYY-MM-DD (inclusive)


class AnnouncementPublic(BaseModel):
    id: str
    title: str
    message: str
    level: str
    expires_at: str
    created_at: str
    created_by: str
    author_name: Optional[str] = None


class PresenceStatusUpdate(BaseModel):
    mode: Literal["automatico", "disponibile", "impegnato", "non_disponibile"]
    duration_minutes: Optional[int] = Field(default=None, ge=1, le=1440)


class PresencePublic(BaseModel):
    user_id: str
    full_name: str
    role: str
    photo_b64: Optional[str] = None
    role_title: Optional[str] = None
    online: bool
    status: Literal["disponibile", "impegnato", "non_disponibile", "offline"]
    source: str
    last_seen_at: Optional[str] = None
    manual_until: Optional[str] = None


class AnnouncementReadPublic(BaseModel):
    announcement_id: str
    read_at: str


class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class AssistantChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: List[AssistantMessage] = Field(default_factory=list, max_length=12)


class AssistantChatResponse(BaseModel):
    reply: str
    intent: str
    source: Literal["local", "gemini"]
    suggestions: List[str] = Field(default_factory=list)
    phase: Optional[str] = None
    requires_confirmation: bool = False
    created_booking_id: Optional[str] = None


class ShiftCreateRequest(BaseModel):
    date: str
    time_start: str
    time_end: Optional[str] = None
    assigned_user_id: str
    target_role: Literal["servizio_civile", "admin"]
    vehicle: Optional[str] = None
    patient_name: Optional[str] = None
    notes: Optional[str] = None


class Shift(BaseModel):
    id: str
    date: str
    time_start: str
    time_end: Optional[str] = None
    assigned_user_id: str
    assigned_user_name: str
    target_role: str
    vehicle: Optional[str] = None
    patient_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class GalleryPhotoCreate(BaseModel):
    photo_b64: str
    caption: Optional[str] = None

    @field_validator("photo_b64")
    @classmethod
    def validate_photo(cls, value):
        return validate_image_b64(value)


class GalleryPhoto(BaseModel):
    id: str
    photo_b64: str
    caption: Optional[str] = None
    created_at: str


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    address: str
    dialysis_center: str
    dialysis_schedule: str  # e.g. "Lun-Mer-Ven 14:00"
    phone: Optional[str] = None
    notes: Optional[str] = None
    map_url: Optional[str] = None  # custom Google Maps link


class Patient(BaseModel):
    id: str
    first_name: str
    last_name: str
    address: str
    dialysis_center: str
    dialysis_schedule: str
    phone: Optional[str] = None
    notes: Optional[str] = None
    map_url: Optional[str] = None
    created_at: str


class TeamMember(BaseModel):
    id: str
    full_name: str
    role: str
    bio: Optional[str] = None
    age: Optional[int] = None
    photo_b64: Optional[str] = None


class VehicleInput(BaseModel):
    name: str  # e.g. "Ambulanza 1"
    vehicle_type: Literal["ambulanza", "furgone", "altro"]
    plate: Optional[str] = None
    notes: Optional[str] = None


class Vehicle(BaseModel):
    id: str
    name: str
    vehicle_type: str
    plate: Optional[str] = None
    notes: Optional[str] = None
    created_at: str


class UserCreateResponse(BaseModel):
    user: UserPublic
    generated_password: Optional[str] = None


class ResetPasswordResponse(BaseModel):
    new_password: str


class SlotCreateRequest(BaseModel):
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    vehicle_type: Literal["ambulanza", "furgone"]
    capacity: int = 1
    assigned_user_ids: List[str] = []
    notes: Optional[str] = None


class Slot(BaseModel):
    id: str
    date: str
    time: str
    vehicle_type: str
    capacity: int
    booked_count: int = 0
    assigned_user_ids: List[str] = []
    notes: Optional[str] = None
    created_at: str


class BookingCreateRequest(BaseModel):
    """Guest booking against automatic daily quota. Phone is mandatory."""
    date: str  # YYYY-MM-DD
    time: str  # HH:MM (guest-chosen, must be <= cutoff)
    requester_name: str
    requester_surname: str
    patient_name: str
    patient_surname: str
    phone: str
    email: Optional[EmailStr] = None
    address: str
    vehicle_type: Literal["ambulanza", "furgone"]
    patient_weight_class: Literal["normopeso", "sovrappeso"]
    has_elevator: bool
    floor: int
    notes: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def _phone_required(cls, v):
        if not v or not v.strip():
            raise ValueError("Il numero di telefono è obbligatorio")
        return v.strip()

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class ManualBookingRequest(BaseModel):
    """Volunteer/master records a phone/email booking (occupies a daily quota slot)."""
    date: str
    time: str
    vehicle_type: Literal["ambulanza", "furgone"]
    requester_name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    patient_name: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _empty_email_to_none(cls, v):
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


class CancelBookingRequest(BaseModel):
    reason: Optional[str] = None


class Booking(BaseModel):
    id: str
    slot_date: str
    slot_time: str
    requester_name: str
    requester_surname: Optional[str] = None
    patient_name: Optional[str] = None
    patient_surname: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    vehicle_type: str
    patient_weight_class: Optional[str] = None
    has_elevator: Optional[bool] = None
    floor: Optional[int] = None
    notes: Optional[str] = None
    source: str = "guest"  # "guest" | "manual"
    status: str = "pendente"
    cancel_reason: Optional[str] = None
    cancelled_at: Optional[str] = None
    created_at: str


class DayAvailability(BaseModel):
    date: str
    weekday: int
    open: bool
    ambulanza_capacity: int
    ambulanza_booked: int
    ambulanza_available: int
    furgone_capacity: int
    furgone_booked: int
    furgone_available: int


class NotificationPublic(BaseModel):
    id: str
    title: str
    message: str
    level: str = "info"
    read: bool = False
    created_at: str


# ===== Email =====
DISCLAIMER = (
    "Ci riserviamo, per ogni prenotazione ricevuta, di verificare l'effettiva "
    "disponibilità del mezzo ed eventualmente di richiamarLa per confermare o meno "
    "il servizio."
)


def _send_email(subject: str, recipients: List[str], text: str, html: str) -> bool:
    """Low-level sender that supports both SSL (465) and STARTTLS (587)."""
    recipients = [r for r in dict.fromkeys([r for r in recipients if r]) ]  # dedupe, drop empties
    if not recipients:
        logger.warning("No recipients for email; skipping")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"La Provvidenza ODV <{SMTP_USER}>"
        msg["To"] = ", ".join(recipients)
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        if SMTP_SSL:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, recipients, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASSWORD)
                server.sendmail(SMTP_USER, recipients, msg.as_string())
        logger.info(f"Email sent: '{subject}' -> {recipients}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email '{subject}': {e}")
        return False


def send_booking_email(b: dict) -> bool:
    recipients = [BOOKING_TO_EMAIL, BOOKING_CC_EMAIL]
    requester_email = (b.get("email") or "").strip()
    if requester_email:
        recipients.append(requester_email)

    vehicle_label = "Ambulanza" if b["vehicle_type"] == "ambulanza" else "Furgone Disabili"
    elevator = "Sì" if b.get("has_elevator") else "No"
    text = f"""Nuova prenotazione - La Provvidenza ODV

Data/Ora: {b['slot_date']} {b['slot_time']}
Mezzo: {vehicle_label}

PRENOTANTE
Nome: {b.get('requester_name','')} {b.get('requester_surname','') or ''}
Telefono: {b.get('phone','-')}
Email: {b.get('email') or '-'}

PAZIENTE
Nome: {b.get('patient_name','') or '-'} {b.get('patient_surname','') or ''}
Peso: {b.get('patient_weight_class') or '-'}
Indirizzo: {b.get('address') or '-'}
Ascensore: {elevator}
Piano: {b.get('floor') if b.get('floor') is not None else '-'}

Note: {b.get('notes') or '-'}
ID prenotazione: {b['id']}

{DISCLAIMER}
"""

    html = f"""<html><body style="font-family:Arial,sans-serif;color:#121A26;">
  <div style="background:#FF6B00;padding:16px;color:#fff;">
    <h2 style="margin:0;">Prenotazione Ricevuta</h2>
    <p style="margin:4px 0 0 0;">La Provvidenza ODV - Marsala</p>
  </div>
  <div style="padding:16px;">
    <p><b>Data/Ora:</b> {b['slot_date']} {b['slot_time']}<br/>
       <b>Mezzo:</b> {vehicle_label}</p>
    <h3 style="color:#1A2E46;border-bottom:1px solid #eee;padding-bottom:4px;">Prenotante</h3>
    <p><b>Nome:</b> {b.get('requester_name','')} {b.get('requester_surname','') or ''}<br/>
       <b>Telefono:</b> {b.get('phone','-')}<br/>
       <b>Email:</b> {b.get('email') or '-'}</p>
    <h3 style="color:#1A2E46;border-bottom:1px solid #eee;padding-bottom:4px;">Paziente</h3>
    <p><b>Nome:</b> {b.get('patient_name','') or '-'} {b.get('patient_surname','') or ''}<br/>
       <b>Peso:</b> {b.get('patient_weight_class') or '-'}<br/>
       <b>Indirizzo:</b> {b.get('address') or '-'}<br/>
       <b>Ascensore:</b> {elevator} - <b>Piano:</b> {b.get('floor') if b.get('floor') is not None else '-'}</p>
    <p><b>Note:</b> {b.get('notes') or '-'}</p>
    <p style="color:#888;font-size:12px;">ID prenotazione: {b['id']}</p>
    <div style="background:#FFF0E5;border-left:4px solid #FF6B00;padding:10px 14px;margin-top:12px;border-radius:6px;">
      <p style="margin:0;font-size:13px;color:#5B4636;">{DISCLAIMER}</p>
    </div>
  </div>
</body></html>"""
    return _send_email(BOOKING_SUBJECT, recipients, text, html)


def send_cancellation_email(b: dict, reason: Optional[str]) -> bool:
    requester_email = (b.get("email") or "").strip()
    recipients = [BOOKING_TO_EMAIL]
    if requester_email:
        recipients.append(requester_email)
    vehicle_label = "Ambulanza" if b["vehicle_type"] == "ambulanza" else "Furgone Disabili"
    reason_line = f"\nMotivo: {reason}" if reason else ""
    text = f"""Prenotazione ANNULLATA - La Provvidenza ODV

Gentile {b.get('requester_name','')},
la informiamo che la sua prenotazione del {b['slot_date']} alle {b['slot_time']} ({vehicle_label}) è stata ANNULLATA.{reason_line}

Per qualsiasi chiarimento può contattarci allo 0923 1234567 o rispondere a questa email.
ID prenotazione: {b['id']}

La Provvidenza ODV - Marsala
"""
    html = f"""<html><body style="font-family:Arial,sans-serif;color:#121A26;">
  <div style="background:#DC3545;padding:16px;color:#fff;">
    <h2 style="margin:0;">Prenotazione Annullata</h2>
    <p style="margin:4px 0 0 0;">La Provvidenza ODV - Marsala</p>
  </div>
  <div style="padding:16px;">
    <p>Gentile <b>{b.get('requester_name','')}</b>,</p>
    <p>la informiamo che la sua prenotazione è stata <b style="color:#DC3545;">ANNULLATA</b>.</p>
    <p><b>Data/Ora:</b> {b['slot_date']} {b['slot_time']}<br/>
       <b>Mezzo:</b> {vehicle_label}</p>
    {f'<p><b>Motivo:</b> {reason}</p>' if reason else ''}
    <p style="font-size:13px;color:#5B6776;">Per qualsiasi chiarimento può contattarci telefonicamente o rispondere a questa email.</p>
    <p style="color:#888;font-size:12px;">ID prenotazione: {b['id']}</p>
  </div>
</body></html>"""
    return _send_email("Prenotazione annullata - La Provvidenza ODV", recipients, text, html)


# ===== Notifications & quota helpers =====
async def create_notification(user_id: str, title: str, message: str, level: str = "info"):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "level": level,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(doc)


async def notify_staff(title: str, message: str, level: str = "info"):
    """Create an in-app notification for every master/admin (volunteers) user."""
    staff = await db.users.find({"role": {"$in": ["master", "admin"]}}, {"_id": 0, "id": 1}).to_list(500)
    for s in staff:
        await create_notification(s["id"], title, message, level)


def _parse_date(d: str) -> datetime:
    return datetime.strptime(d, "%Y-%m-%d")


def _add_months(day, months: int):
    """Add calendar months while preserving a valid day number."""
    month_index = day.month - 1 + months
    year = day.year + month_index // 12
    month = month_index % 12 + 1

    if month == 12:
        next_month = day.replace(year=year + 1, month=1, day=1)
    else:
        next_month = day.replace(year=year, month=month + 1, day=1)

    last_day = (next_month - timedelta(days=1)).day
    return day.replace(year=year, month=month, day=min(day.day, last_day))


def validate_booking_day_time(date_str: str, time_str: str):
    """Allow bookings from tomorrow through two calendar months from today."""
    try:
        day = _parse_date(date_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Data non valida")

    if day.weekday() not in OPEN_WEEKDAYS:
        raise HTTPException(status_code=400, detail="Le prenotazioni sono disponibili solo da lunedì a sabato")

    today = datetime.now().date()
    first_bookable = today + timedelta(days=1)
    last_bookable = _add_months(today, 2)

    if day.date() < first_bookable:
        raise HTTPException(
            status_code=400,
            detail="È possibile prenotare a partire dal giorno successivo a oggi",
        )

    if day.date() > last_bookable:
        raise HTTPException(
            status_code=400,
            detail=f"È possibile prenotare al massimo fino al {last_bookable.strftime('%d/%m/%Y')}",
        )

    if time_str > BOOKING_CUTOFF_TIME:
        raise HTTPException(status_code=400, detail=f"Le prenotazioni sono accettate fino alle {BOOKING_CUTOFF_TIME}")


async def count_active_bookings(date_str: str, vehicle_type: str) -> int:
    return await db.bookings.count_documents({
        "slot_date": date_str,
        "vehicle_type": vehicle_type,
        "status": {"$in": list(ACTIVE_STATUSES)},
    })


# ===== Seed master account =====
async def seed_master():
    existing = await db.users.find_one({"role": "master"})
    if existing:
        # keep username/full_name in sync with env but DO NOT reset password
        # (master may have changed their password via /auth/change-password)
        await db.users.update_one(
            {"role": "master"},
            {"$set": {
                "username": MASTER_USERNAME,
                "full_name": existing.get("full_name") or "Master Admin",
            }},
        )
        return
    user_doc = {
        "id": str(uuid.uuid4()),
        "username": MASTER_USERNAME,
        "email": None,
        "full_name": "Master Admin",
        "role": "master",
        "password_hash": hash_password(MASTER_PASSWORD),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)
    logger.info("Master user seeded")


@app.on_event("startup")
async def on_startup():
    await seed_master()
    await db.login_attempts.create_index(
        [("username", 1), ("ip", 1)],
        unique=True,
        name="login_attempts_user_ip",
    )
    await db.login_attempts.create_index(
        "updated_at",
        expireAfterSeconds=3600,
        name="login_attempts_expiry",
    )


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"app": "La Provvidenza ODV", "status": "ok"}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request):
    ip = get_client_ip(request)
    await check_login_lock(body.username, ip)

    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        await register_failed_login(body.username, ip)
        raise HTTPException(status_code=401, detail="Credenziali non valide")

    await clear_failed_logins(body.username, ip)
    token = create_token(user["id"], user["username"], user["role"])

    return LoginResponse(
        token=token,
        user=UserPublic(
            id=user["id"],
            username=user["username"],
            email=user.get("email"),
            full_name=user["full_name"],
            role=user["role"],
            created_at=user["created_at"],
            must_change_password=user.get("must_change_password", False),
            bio=user.get("bio"),
            age=user.get("age"),
            photo_b64=user.get("photo_b64"),
            role_title=user.get("role_title"),
            join_date=user.get("join_date"),
            birth_date=user.get("birth_date"),
            notify_email=user.get("notify_email", True),
        ),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


# ----- Users management (master/admin) -----
@api_router.get("/users", response_model=List[UserPublic])
async def list_users(user: dict = Depends(require_role("master", "admin"))):
    # master sees all (including other masters); admin doesn't see master accounts
    if user["role"] == "master":
        q = {}
    else:
        q = {"role": {"$ne": "master"}}
    docs = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(500)
    return [UserPublic(**d) for d in docs]


@api_router.post("/users", response_model=UserCreateResponse)
async def create_user(body: UserCreateRequest, user: dict = Depends(require_role("master", "admin"))):
    # Only master can create master accounts
    if body.role == "master" and user["role"] != "master":
        raise HTTPException(status_code=403, detail="Solo il master può creare altri master")
    # admin can create admin (volontari) and servizio_civile - allowed
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(status_code=400, detail="Username già esistente")
    generated = None
    pw = body.password
    if not pw:
        pw = generate_random_password()
        generated = pw
    new_user = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "email": body.email,
        "full_name": body.full_name,
        "role": body.role,
        "password_hash": hash_password(pw),
        "must_change_password": True,
        "bio": None,
        "age": None,
        "photo_b64": body.photo_b64,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(new_user)
    public = UserPublic(
        id=new_user["id"],
        username=new_user["username"],
        email=new_user["email"],
        full_name=new_user["full_name"],
        role=new_user["role"],
        created_at=new_user["created_at"],
        must_change_password=True,
        photo_b64=new_user["photo_b64"],
    )
    return UserCreateResponse(user=public, generated_password=generated)


@api_router.patch("/users/{user_id}", response_model=UserPublic)
async def update_user(user_id: str, body: UserUpdateRequest, user: dict = Depends(require_role("master", "admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["role"] == "master" and user["role"] != "master":
        raise HTTPException(status_code=403, detail="Solo il master può modificare un master")
    update: dict = {}
    if body.full_name is not None and body.full_name.strip():
        update["full_name"] = body.full_name.strip()
    if body.email is not None:
        update["email"] = body.email
    else:
        # explicit clear
        update["email"] = None
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserPublic(**doc)


@api_router.post("/auth/change-password")
async def change_password(body: ChangePasswordRequest, user: dict = Depends(get_current_user)):
    doc = await db.users.find_one({"id": user["id"]})
    if not doc or not verify_password(body.current_password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Password attuale errata")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nuova password deve avere almeno 6 caratteri")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password), "must_change_password": False}},
    )
    return {"ok": True}


@api_router.delete("/auth/me")
async def delete_own_account(user: dict = Depends(get_current_user)):
    """Any authenticated user can delete their own account (GDPR/Play Store requirement)."""
    if user["role"] == "master":
        # Prevent orphaning the app – must have another master alive
        others = await db.users.count_documents({"role": "master", "id": {"$ne": user["id"]}})
        if others == 0:
            raise HTTPException(status_code=400, detail="Impossibile eliminare l'unico account master")
    await db.users.delete_one({"id": user["id"]})
    # Remove personal references from slots (unassign)
    await db.slots.update_many({"assigned_user_ids": user["id"]}, {"$pull": {"assigned_user_ids": user["id"]}})
    return {"ok": True}


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("master", "admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["role"] == "master" and user["role"] != "master":
        raise HTTPException(status_code=403, detail="Solo il master può eliminare un master")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


@api_router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
async def reset_password(user_id: str, user: dict = Depends(require_role("master", "admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["role"] == "master":
        raise HTTPException(status_code=403, detail="Impossibile rigenerare la password del master")
    new_pw = generate_random_password()
    await db.users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(new_pw)}})
    return ResetPasswordResponse(new_password=new_pw)


# ----- Slots -----
@api_router.get("/slots", response_model=List[Slot])
async def list_slots(date_from: Optional[str] = None, date_to: Optional[str] = None, vehicle_type: Optional[str] = None):
    """Public endpoint: list available slots (guests see this for booking)."""
    q: dict = {}
    if date_from:
        q.setdefault("date", {})["$gte"] = date_from
    if date_to:
        q.setdefault("date", {})["$lte"] = date_to
    if vehicle_type:
        q["vehicle_type"] = vehicle_type
    docs = await db.slots.find(q, {"_id": 0}).sort([("date", 1), ("time", 1)]).to_list(2000)
    return [Slot(**d) for d in docs]


@api_router.post("/slots", response_model=Slot)
async def create_slot(body: SlotCreateRequest, user: dict = Depends(require_role("master", "admin"))):
    slot_doc = {
        "id": str(uuid.uuid4()),
        "date": body.date,
        "time": body.time,
        "vehicle_type": body.vehicle_type,
        "capacity": body.capacity,
        "booked_count": 0,
        "assigned_user_ids": body.assigned_user_ids,
        "notes": body.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.slots.insert_one(slot_doc)
    return Slot(**{k: v for k, v in slot_doc.items() if k != "_id"})


@api_router.patch("/slots/{slot_id}", response_model=Slot)
async def update_slot(slot_id: str, body: SlotCreateRequest, user: dict = Depends(require_role("master", "admin"))):
    update = {
        "date": body.date,
        "time": body.time,
        "vehicle_type": body.vehicle_type,
        "capacity": body.capacity,
        "assigned_user_ids": body.assigned_user_ids,
        "notes": body.notes,
    }
    res = await db.slots.update_one({"id": slot_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Slot non trovato")
    doc = await db.slots.find_one({"id": slot_id}, {"_id": 0})
    return Slot(**doc)


@api_router.delete("/slots/{slot_id}")
async def delete_slot(slot_id: str, user: dict = Depends(require_role("master", "admin"))):
    await db.slots.delete_one({"id": slot_id})
    return {"ok": True}


@api_router.get("/slots/mine", response_model=List[Slot])
async def my_slots(user: dict = Depends(require_role("servizio_civile", "admin", "master"))):
    """Slots assigned to current civil-service user."""
    docs = await db.slots.find({"assigned_user_ids": user["id"]}, {"_id": 0}).sort([("date", 1), ("time", 1)]).to_list(1000)
    return [Slot(**d) for d in docs]


# ----- Availability (public) -----
@api_router.get("/availability", response_model=List[DayAvailability])
async def availability(date_from: Optional[str] = None, days: int = 14):
    """Public: daily availability for the next `days` open days (Mon-Sat)."""
    today = datetime.now().date()
    start = (today + timedelta(days=1)) if not date_from else _parse_date(date_from).date()
    if start < today + timedelta(days=1):
        start = today + timedelta(days=1)
    last_bookable = _add_months(today, 2)

    result: List[DayAvailability] = []
    d = start
    checked = 0
    # Include only open weekdays and never go past two calendar months.
    while len(result) < days and d <= last_bookable and checked < 75:
        checked += 1
        wd = d.weekday()
        if wd in OPEN_WEEKDAYS:
            ds = d.isoformat()
            amb_booked = await count_active_bookings(ds, "ambulanza")
            fur_booked = await count_active_bookings(ds, "furgone")
            amb_cap = DAILY_CAPACITY["ambulanza"]
            fur_cap = DAILY_CAPACITY["furgone"]
            result.append(DayAvailability(
                date=ds,
                weekday=wd,
                open=True,
                ambulanza_capacity=amb_cap,
                ambulanza_booked=amb_booked,
                ambulanza_available=max(0, amb_cap - amb_booked),
                furgone_capacity=fur_cap,
                furgone_booked=fur_booked,
                furgone_available=max(0, fur_cap - fur_booked),
            ))
        d = d + timedelta(days=1)
    return result


# ----- Bookings -----
@api_router.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreateRequest, background: BackgroundTasks):
    """Public endpoint: guests book against the automatic daily quota (Mon-Sat, until 16:00)."""
    validate_booking_day_time(body.date, body.time)
    booked = await count_active_bookings(body.date, body.vehicle_type)
    capacity = DAILY_CAPACITY[body.vehicle_type]
    if booked >= capacity:
        raise HTTPException(status_code=400, detail="Nessuna disponibilità per questo giorno e mezzo. Scelga un'altra data.")

    booking_doc = {
        "id": str(uuid.uuid4()),
        "slot_date": body.date,
        "slot_time": body.time,
        "requester_name": body.requester_name,
        "requester_surname": body.requester_surname,
        "patient_name": body.patient_name,
        "patient_surname": body.patient_surname,
        "phone": body.phone,
        "email": body.email,
        "address": body.address,
        "vehicle_type": body.vehicle_type,
        "patient_weight_class": body.patient_weight_class,
        "has_elevator": body.has_elevator,
        "floor": body.floor,
        "notes": body.notes,
        "source": "guest",
        "status": "pendente",
        "cancel_reason": None,
        "cancelled_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking_doc)
    booking_clean = {k: v for k, v in booking_doc.items() if k != "_id"}

    vehicle_label = "Ambulanza" if body.vehicle_type == "ambulanza" else "Furgone Disabili"
    background.add_task(send_booking_email, booking_clean)
    await notify_staff(
        "Nuova prenotazione",
        f"{body.requester_name} {body.requester_surname} · {vehicle_label} · {body.date} {body.time} · Tel: {body.phone}",
        "info",
    )
    return Booking(**booking_clean)


@api_router.post("/bookings/manual", response_model=Booking)
async def create_manual_booking(body: ManualBookingRequest, user: dict = Depends(require_role("master", "admin"))):
    """Volunteer/master occupies a daily quota slot for a phone/email request."""
    validate_booking_day_time(body.date, body.time)
    booked = await count_active_bookings(body.date, body.vehicle_type)
    capacity = DAILY_CAPACITY[body.vehicle_type]
    if booked >= capacity:
        raise HTTPException(status_code=400, detail="Nessuna disponibilità per questo giorno e mezzo.")

    booking_doc = {
        "id": str(uuid.uuid4()),
        "slot_date": body.date,
        "slot_time": body.time,
        "requester_name": body.requester_name,
        "requester_surname": None,
        "patient_name": body.patient_name,
        "patient_surname": None,
        "phone": body.phone,
        "email": body.email,
        "address": body.address,
        "vehicle_type": body.vehicle_type,
        "patient_weight_class": None,
        "has_elevator": None,
        "floor": None,
        "notes": body.notes,
        "source": "manual",
        "status": "confermata",
        "cancel_reason": None,
        "cancelled_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking_doc)
    booking_clean = {k: v for k, v in booking_doc.items() if k != "_id"}
    return Booking(**booking_clean)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(
    date: Optional[str] = None,
    include_cancelled: bool = True,
    user: dict = Depends(require_role("master", "admin")),
):
    q: dict = {}
    if date:
        q["slot_date"] = date
    if not include_cancelled:
        q["status"] = {"$in": list(ACTIVE_STATUSES)}
    docs = await db.bookings.find(q, {"_id": 0}).sort([("slot_date", 1), ("slot_time", 1)]).to_list(2000)
    return [Booking(**d) for d in docs]


@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    body: CancelBookingRequest,
    background: BackgroundTasks,
    user: dict = Depends(require_role("master", "admin")),
):
    """Master/volunteers cancel a booking; frees the daily slot and notifies the requester by email."""
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    if booking.get("status") == "annullata":
        raise HTTPException(status_code=400, detail="Prenotazione già annullata")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": "annullata",
            "cancel_reason": body.reason,
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    booking["cancel_reason"] = body.reason
    # notify requester by email (background)
    if booking.get("email"):
        background.add_task(send_cancellation_email, booking, body.reason)
    # in-app notification for staff
    await notify_staff(
        "Prenotazione annullata",
        f"{booking.get('requester_name','')} · {booking['slot_date']} {booking['slot_time']} annullata da {user['full_name']}",
        "warning",
    )
    return {"ok": True, "status": "annullata", "email_sent": bool(booking.get("email"))}


@api_router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    status_value: str,
    user: dict = Depends(require_role("master", "admin")),
):
    if status_value not in ("pendente", "confermata", "annullata", "completata"):
        raise HTTPException(status_code=400, detail="Stato non valido")
    res = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": status_value}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    return {"ok": True, "status": status_value}


@api_router.delete("/bookings/{booking_id}")
async def delete_booking(booking_id: str, user: dict = Depends(require_role("master", "admin"))):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata")
    await db.bookings.delete_one({"id": booking_id})
    return {"ok": True}


# ----- Notifications (in-app, for logged-in staff) -----
@api_router.get("/notifications", response_model=List[NotificationPublic])
async def list_notifications(user: dict = Depends(get_current_user)):
    docs = await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return [NotificationPublic(**d) for d in docs]


@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"ok": True}




# ----- Test SMTP -----
@api_router.post("/email/test")
async def email_test(user: dict = Depends(require_role("master"))):
    sample = {
        "id": "TEST-" + str(uuid.uuid4())[:8],
        "slot_date": "2026-06-01",
        "slot_time": "10:00",
        "vehicle_type": "ambulanza",
        "requester_name": "Mario",
        "requester_surname": "Rossi",
        "patient_name": "Giovanni",
        "patient_surname": "Bianchi",
        "phone": "+39 333 1234567",
        "email": "test@example.com",
        "address": "Via Roma 1, Marsala",
        "patient_weight_class": "normopeso",
        "has_elevator": True,
        "floor": 2,
        "notes": "Email di test",
    }
    ok = send_booking_email(sample)
    return {"sent": ok}


# ----- Profile self-edit (all authenticated users) -----
@api_router.patch("/auth/profile", response_model=UserPublic)
async def update_profile(body: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    update: dict = {}
    if body.full_name is not None:
        update["full_name"] = body.full_name
    if body.bio is not None:
        update["bio"] = body.bio
    if body.age is not None:
        update["age"] = body.age
    if body.photo_b64 is not None:
        update["photo_b64"] = body.photo_b64
    if body.role_title is not None:
        update["role_title"] = body.role_title
    if body.join_date is not None:
        update["join_date"] = body.join_date or None
    if body.birth_date is not None:
        update["birth_date"] = body.birth_date or None
    if body.notify_email is not None:
        update["notify_email"] = body.notify_email
    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return UserPublic(**doc)


# ----- Admin/Master edit any user's bio ----
@api_router.patch("/users/{user_id}/bio", response_model=UserPublic)
async def admin_edit_bio(user_id: str, body: AdminEditBioRequest, user: dict = Depends(require_role("master"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    update: dict = {}
    if body.bio is not None:
        update["bio"] = body.bio
    if body.role_title is not None:
        update["role_title"] = body.role_title
    if body.join_date is not None:
        update["join_date"] = body.join_date or None
    if body.birth_date is not None:
        update["birth_date"] = body.birth_date or None
    if update:
        await db.users.update_one({"id": user_id}, {"$set": update})
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserPublic(**doc)


# ----- Announcements (avvisi) -----
def _now_iso_date():
    return datetime.now(timezone.utc).date().isoformat()


async def _send_announcement_emails(title: str, message: str, level: str, expires_at: str):
    """Send email to all users with notify_email=True and a valid email."""
    try:
        users = await db.users.find(
            {"email": {"$ne": None}, "notify_email": {"$ne": False}},
            {"email": 1, "full_name": 1, "_id": 0},
        ).to_list(1000)
        for u in users:
            if not u.get("email"):
                continue
            try:
                subject = f"[La Provvidenza] {title}"
                html = f"""
                <div style='font-family:sans-serif;max-width:600px;margin:auto'>
                  <div style='background:#EA5A0B;color:white;padding:16px;border-radius:8px 8px 0 0'>
                    <h2 style='margin:0'>{title}</h2>
                  </div>
                  <div style='padding:16px;border:1px solid #eee;border-radius:0 0 8px 8px'>
                    <p style='color:#333;line-height:1.5;white-space:pre-wrap'>{message}</p>
                    <p style='color:#888;font-size:12px;margin-top:20px'>
                      Avviso valido fino al {expires_at}<br/>
                      Puoi disattivare queste email dalle Impostazioni della tua app.
                    </p>
                  </div>
                </div>
                """
                _send_email(subject, [u["email"]], message, html)
            except Exception as ex:
                logger.warning(f"announcement email failed for {u.get('email')}: {ex}")
    except Exception as ex:
        logger.warning(f"announcement email broadcast failed: {ex}")


@api_router.post("/announcements", response_model=AnnouncementPublic)
async def create_announcement(
    body: AnnouncementRequest,
    background: BackgroundTasks,
    user: dict = Depends(require_role("master", "admin")),
):
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "message": body.message.strip(),
        "level": body.level,
        "expires_at": body.expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"],
        "author_name": user["full_name"],
    }
    await db.announcements.insert_one(doc)
    background.add_task(_send_announcement_emails, doc["title"], doc["message"], doc["level"], doc["expires_at"])
    return AnnouncementPublic(**{k: v for k, v in doc.items() if k != "_id"})


@api_router.get("/announcements", response_model=List[AnnouncementPublic])
async def list_announcements(user: dict = Depends(get_current_user)):
    """Only authenticated users get announcements."""
    today = _now_iso_date()
    docs = await db.announcements.find(
        {"expires_at": {"$gte": today}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [AnnouncementPublic(**d) for d in docs]


@api_router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, user: dict = Depends(require_role("master", "admin"))):
    res = await db.announcements.delete_one({"id": ann_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Avviso non trovato")
    return {"ok": True}


# ----- Shifts (turni) -----
@api_router.get("/shifts", response_model=List[Shift])
async def list_shifts(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    target_role: Optional[str] = None,
    user: dict = Depends(require_role("master", "admin")),
):
    q: dict = {}
    if date_from:
        q.setdefault("date", {})["$gte"] = date_from
    if date_to:
        q.setdefault("date", {})["$lte"] = date_to
    if target_role:
        q["target_role"] = target_role
    docs = await db.shifts.find(q, {"_id": 0}).sort([("date", 1), ("time_start", 1)]).to_list(2000)
    return [Shift(**d) for d in docs]


@api_router.get("/shifts/mine", response_model=List[Shift])
async def my_shifts(user: dict = Depends(get_current_user)):
    docs = await db.shifts.find({"assigned_user_id": user["id"]}, {"_id": 0}).sort([("date", 1), ("time_start", 1)]).to_list(1000)
    return [Shift(**d) for d in docs]


@api_router.post("/shifts", response_model=Shift)
async def create_shift(body: ShiftCreateRequest, user: dict = Depends(require_role("master", "admin"))):
    target = await db.users.find_one({"id": body.assigned_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utente assegnato non trovato")
    if target["role"] != body.target_role:
        raise HTTPException(status_code=400, detail="Ruolo utente non coincide con target_role")
    shift = {
        "id": str(uuid.uuid4()),
        "date": body.date,
        "time_start": body.time_start,
        "time_end": body.time_end,
        "assigned_user_id": body.assigned_user_id,
        "assigned_user_name": target["full_name"],
        "target_role": body.target_role,
        "vehicle": body.vehicle,
        "patient_name": body.patient_name,
        "notes": body.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.shifts.insert_one(shift)
    return Shift(**{k: v for k, v in shift.items() if k != "_id"})


@api_router.delete("/shifts/{shift_id}")
async def delete_shift(shift_id: str, user: dict = Depends(require_role("master", "admin"))):
    await db.shifts.delete_one({"id": shift_id})
    return {"ok": True}


# ----- Assistente Provvidenza: comprensione naturale, lettura, creazione e annullamento -----
@api_router.post("/assistant/chat", response_model=AssistantChatResponse)
async def assistant_chat(body: AssistantChatRequest, user: dict = Depends(get_current_user)):
    text = body.message.strip()
    session = await _assistant_get_session(user["id"])
    source = "local"
    suggestions = ["Aggiungi un servizio domani alle 15", "Annulla l'ultimo servizio", "Che turno faccio domani?"]
    phase = session.get("phase") if session else None
    created_booking_id = None

    if session and session.get("intent") == "create_service" and _assistant_is_abort(text):
        await _assistant_clear_session(user["id"])
        reply, intent, phase = "Operazione interrotta. Non è stato creato alcun servizio.", "create_service", "cancelled"

    elif session and session.get("intent") == "cancel_service":
        booking = session.get("data", {}).get("booking", {})
        if _assistant_is_confirm(text):
            result = await db.bookings.update_one(
                {"id": booking.get("id"), "status": {"$in": ACTIVE_STATUSES}},
                {"$set": {"status": "annullata", "cancel_reason": "Annullato tramite Assistente Provvidenza", "cancelled_at": datetime.now(timezone.utc).isoformat(), "cancelled_by": user["id"]}},
            )
            await _assistant_clear_session(user["id"])
            intent, phase = "cancel_service", "completed"
            reply = "Servizio annullato correttamente e slot liberato." if result.modified_count else "Il servizio risultava già annullato o non è più disponibile."
        elif _assistant_is_abort(text):
            await _assistant_clear_session(user["id"])
            reply, intent, phase = "Annullamento del servizio interrotto. Non ho modificato nulla.", "cancel_service", "cancelled"
        else:
            reply, intent, phase = "Rispondi ‘confermo’ per annullare il servizio oppure ‘no’ per lasciarlo invariato.", "cancel_service", "confirm_cancel"

    elif session and session.get("intent") == "create_service":
        if user.get("role") not in ("master", "admin"):
            await _assistant_clear_session(user["id"])
            raise HTTPException(status_code=403, detail="Solo master e volontari autorizzati possono creare Servizi")
        data = session.get("data", {})
        current = session.get("phase")
        # Accetta informazioni anticipate anche se l'utente risponde con una frase completa.
        parsed_date, parsed_time, parsed_vehicle = _assistant_parse_date(text), _assistant_parse_time(text), _assistant_parse_vehicle(text)
        if parsed_date: data["date"] = parsed_date
        if parsed_time: data["time"] = parsed_time
        if parsed_vehicle: data["vehicle_type"] = parsed_vehicle

        if current == "ask_date" and not data.get("date"):
            reply, intent, phase = "Per quale giorno? Puoi dire, per esempio, ‘domani’ o ‘venerdì’. ", "create_service", "ask_date"
        elif not data.get("date"):
            reply, intent, phase = "Per quale giorno devo creare il servizio?", "create_service", "ask_date"
        elif not data.get("time"):
            reply, intent, phase = "A che ora devo bloccare lo slot?", "create_service", "ask_time"
        elif not data.get("vehicle_type"):
            reply, intent, phase = "Serve un’ambulanza oppure un’auto/furgone?", "create_service", "ask_vehicle"
        elif current in {"ask_date", "ask_time", "ask_vehicle"}:
            phase, reply, intent = "ask_patient", "Qual è il nome del paziente? Puoi anche dire ‘salta’.", "create_service"
        elif current == "ask_patient":
            data["patient_name"] = None if _assistant_normalize(text) in {"salta", "nessuno", "non indicato", "non lo so"} else text
            phase, reply, intent = "ask_address", "Qual è la destinazione o l’indirizzo? Puoi anche dire ‘salta’.", "create_service"
        elif current == "ask_address":
            data["address"] = None if _assistant_normalize(text) in {"salta", "nessuno", "non indicata", "non lo so"} else text
            phase, reply, intent = "confirm", _assistant_summary(data), "create_service"
        elif current == "confirm":
            if _assistant_is_confirm(text):
                booking = await _assistant_create_manual_booking(data, user)
                created_booking_id = booking["id"]
                await _assistant_save_session(user["id"], {"intent": "completed_service", "phase": "completed", "data": {"booking": booking}})
                phase, intent = "completed", "create_service"
                reply = f"Servizio creato e slot bloccato per il {booking['slot_date']} alle {booking['slot_time']}. Puoi dire ‘annulla l’ultimo servizio’ per cancellarlo."
            elif _assistant_is_abort(text):
                await _assistant_clear_session(user["id"])
                reply, intent, phase = "Operazione interrotta. Non ho creato il servizio.", "create_service", "cancelled"
            else:
                reply, intent, phase = "Confermi la creazione? Rispondi ‘confermo’ oppure ‘annulla’.", "create_service", "confirm"
        else:
            phase, reply, intent = "ask_patient", "Qual è il nome del paziente? Puoi anche dire ‘salta’.", "create_service"
        if phase not in {"completed", "cancelled"}:
            await _assistant_save_session(user["id"], {"intent": "create_service", "phase": phase, "data": data})

    else:
        local_intent = _assistant_local_intent(text)
        gemini_intent = await asyncio.to_thread(_gemini_classify_sync, text, [m.model_dump() for m in body.history])
        intent = gemini_intent or local_intent
        source = "gemini" if gemini_intent else "local"

        if intent == "cancel_service":
            if user.get("role") not in ("master", "admin"):
                raise HTTPException(status_code=403, detail="Non sei autorizzato ad annullare Servizi")
            # Se la sessione conserva l'ultimo servizio creato, preferiscilo.
            recent = session.get("data", {}).get("booking") if session and session.get("intent") == "completed_service" else None
            matches = [recent] if recent and recent.get("status") != "annullata" and not _assistant_parse_date(text) and not _assistant_parse_time(text) else await _assistant_find_bookings_to_cancel(text, user)
            matches = [m for m in matches if m]
            if not matches:
                reply, phase = "Non ho trovato servizi attivi compatibili con la richiesta. Indica giorno e ora, per esempio: ‘annulla il servizio di domani alle 15’.", None
            elif len(matches) > 1 and not (_assistant_parse_date(text) and _assistant_parse_time(text)):
                options = "\n".join(f"• {b.get('slot_date')} alle {b.get('slot_time')} · {b.get('vehicle_type')} · {b.get('patient_name') or 'paziente non indicato'}" for b in matches[:5])
                reply, phase = f"Ho trovato più servizi:\n{options}\n\nIndicami anche l’orario del servizio da annullare.", None
            else:
                booking = matches[0]
                phase = "confirm_cancel"
                reply = _assistant_cancel_summary(booking)
                await _assistant_save_session(user["id"], {"intent": "cancel_service", "phase": phase, "data": {"booking": booking}})

        elif intent == "create_service":
            if user.get("role") not in ("master", "admin"):
                raise HTTPException(status_code=403, detail="Solo master e volontari autorizzati possono creare Servizi")
            data: dict[str, Any] = {}
            date_value, time_value, vehicle_value = _assistant_parse_date(text), _assistant_parse_time(text), _assistant_parse_vehicle(text)
            if date_value: data["date"] = date_value
            if time_value: data["time"] = time_value
            if vehicle_value: data["vehicle_type"] = vehicle_value
            if not data.get("date"): phase, reply = "ask_date", "Per quale giorno?"
            elif not data.get("time"): phase, reply = "ask_time", "A che ora devo bloccare lo slot?"
            elif not data.get("vehicle_type"): phase, reply = "ask_vehicle", "Serve un’ambulanza oppure un’auto/furgone?"
            else: phase, reply = "ask_patient", "Qual è il nome del paziente? Puoi anche dire ‘salta’."
            await _assistant_save_session(user["id"], {"intent": "create_service", "phase": phase, "data": data})

        else:
            target_date = _assistant_target_date(text)
            today = datetime.now(ROME_TZ).date().isoformat()
            if intent in {"my_shift", "my_vehicle", "my_patient"}:
                shifts = await _assistant_my_shifts(user["id"])
                day_shifts = [shift for shift in shifts if shift.get("date") == target_date]
                if not day_shifts:
                    reply = f"Non risultano turni assegnati per il {target_date}."
                else:
                    shift = day_shifts[0]
                    time_text = shift.get("time_start") or "orario non indicato"
                    if intent == "my_vehicle": reply = f"Per il turno del {target_date} alle {time_text} risulta: {shift.get('vehicle') or 'nessun mezzo ancora assegnato'}."
                    elif intent == "my_patient": reply = f"Per il turno del {target_date} alle {time_text} risulta: {shift.get('patient_name') or 'nessun paziente ancora indicato'}."
                    else: reply = f"Il tuo turno è il {target_date} dalle {time_text}{('–' + shift.get('time_end')) if shift.get('time_end') else ''}{(', mezzo ' + shift.get('vehicle')) if shift.get('vehicle') else ''}."
            elif intent == "next_service":
                shifts = await _assistant_my_shifts(user["id"], today)
                reply = "Non risultano prossimi Servizi assegnati." if not shifts else f"Il prossimo Servizio è il {shifts[0].get('date')} alle {shifts[0].get('time_start')}{(' con ' + shifts[0].get('vehicle')) if shifts[0].get('vehicle') else ''}."
            elif intent == "service_count":
                count = await db.bookings.count_documents({"slot_date": target_date, "status": {"$in": ACTIVE_STATUSES}})
                reply = f"Per il {target_date} risultano {count} Servizi registrati."
            else:
                reply = "Puoi parlarmi in modo naturale. Posso creare o annullare un servizio, leggere turni, mezzi, pazienti e prossimi servizi."

    await db.assistant_audit.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "intent": intent, "source": source, "message": text[:1000], "phase": phase, "created_at": datetime.now(timezone.utc).isoformat()})
    return AssistantChatResponse(
        reply=reply, intent=intent, source=source, suggestions=suggestions, phase=phase,
        requires_confirmation=phase in {"confirm", "confirm_cancel"}, created_booking_id=created_booking_id,
    )


# ----- Gallery (foto Home) -----
@api_router.get("/gallery", response_model=List[GalleryPhoto])
async def list_gallery():
    docs = await db.gallery.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(60)
    return [GalleryPhoto(**d) for d in docs]


@api_router.post("/gallery", response_model=GalleryPhoto)
async def add_photo(body: GalleryPhotoCreate, user: dict = Depends(require_role("master", "admin"))):
    p = {
        "id": str(uuid.uuid4()),
        "photo_b64": body.photo_b64,
        "caption": body.caption,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gallery.insert_one(p)
    return GalleryPhoto(**{k: v for k, v in p.items() if k != "_id"})


@api_router.delete("/gallery/{photo_id}")
async def delete_photo(photo_id: str, user: dict = Depends(require_role("master", "admin"))):
    await db.gallery.delete_one({"id": photo_id})
    return {"ok": True}


# ----- Patients (Pz Dializzati) -----
@api_router.get("/patients", response_model=List[Patient])
async def list_patients(user: dict = Depends(require_role("master", "admin"))):
    docs = await db.patients.find({}, {"_id": 0}).sort([("last_name", 1)]).to_list(500)
    return [Patient(**d) for d in docs]


@api_router.post("/patients", response_model=Patient)
async def create_patient(body: PatientCreate, user: dict = Depends(require_role("master", "admin"))):
    p = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.patients.insert_one(p)
    return Patient(**{k: v for k, v in p.items() if k != "_id"})


@api_router.patch("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, body: PatientCreate, user: dict = Depends(require_role("master", "admin"))):
    res = await db.patients.update_one({"id": patient_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Paziente non trovato")
    doc = await db.patients.find_one({"id": patient_id}, {"_id": 0})
    return Patient(**doc)


@api_router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, user: dict = Depends(require_role("master", "admin"))):
    await db.patients.delete_one({"id": patient_id})
    return {"ok": True}




# ----- V2: presenza online e stato operativo -----
PRESENCE_ONLINE_SECONDS = 90


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


async def _active_service_for_user(user_id: str) -> bool:
    active_states = {
        "assegnato", "in_partenza", "partenza", "dal_paziente",
        "arrivo_assistito", "in_trasporto", "a_destinazione", "in_servizio"
    }
    crew = await db.crews.find_one({
        "$or": [
            {"driver_user_id": user_id},
            {"member_user_ids": user_id},
        ]
    }, {"_id": 0, "mission_id": 1, "service_id": 1})
    if crew:
        entity_id = crew.get("service_id") or crew.get("mission_id")
        if entity_id:
            service = await db.services.find_one({"id": entity_id}, {"_id": 0, "status": 1})
            if not service:
                service = await db.missions.find_one({"id": entity_id}, {"_id": 0, "status": 1})
            if service and service.get("status") in active_states:
                return True
    direct = await db.services.find_one({
        "status": {"$in": list(active_states)},
        "$or": [
            {"driver_user_id": user_id},
            {"member_user_ids": user_id},
            {"crew_user_ids": user_id},
        ],
    }, {"_id": 0, "id": 1})
    return direct is not None


async def _active_shift_for_user(user_id: str, now: datetime) -> bool:
    today = now.date().isoformat()
    shifts = await db.shifts.find(
        {"assigned_user_id": user_id, "date": today},
        {"_id": 0, "time_start": 1, "time_end": 1},
    ).to_list(50)
    current_hm = now.astimezone().strftime("%H:%M")
    for shift in shifts:
        start = shift.get("time_start") or "00:00"
        end = shift.get("time_end") or start
        if start <= current_hm <= end:
            return True
    return False


async def _presence_for_user(user_doc: dict, now: datetime) -> dict:
    user_id = user_doc["id"]
    presence = await db.user_presence.find_one({"user_id": user_id}, {"_id": 0}) or {}
    last_seen = _parse_iso_datetime(presence.get("last_seen_at"))
    online = bool(last_seen and (now - last_seen).total_seconds() <= PRESENCE_ONLINE_SECONDS)

    if await _active_service_for_user(user_id):
        status, source = "impegnato", "servizio"
    elif await _active_shift_for_user(user_id, now):
        status, source = "impegnato", "turno"
    else:
        manual_mode = presence.get("manual_mode")
        manual_until = _parse_iso_datetime(presence.get("manual_until"))
        manual_valid = manual_mode and manual_mode != "automatico" and (manual_until is None or manual_until > now)
        if manual_valid:
            status, source = manual_mode, "manuale"
        else:
            status, source = "disponibile", "automatico"
            if manual_mode and manual_mode != "automatico":
                await db.user_presence.update_one(
                    {"user_id": user_id},
                    {"$set": {"manual_mode": "automatico", "manual_until": None}},
                )

    visible_status = status if online else "offline"
    return {
        "user_id": user_id,
        "full_name": user_doc.get("full_name", ""),
        "role": user_doc.get("role", ""),
        "photo_b64": user_doc.get("photo_b64"),
        "role_title": user_doc.get("role_title"),
        "online": online,
        "status": visible_status,
        "source": source,
        "last_seen_at": presence.get("last_seen_at"),
        "manual_until": presence.get("manual_until"),
    }


@api_router.post("/presence/heartbeat")
async def presence_heartbeat(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    await db.user_presence.update_one(
        {"user_id": user["id"]},
        {"$set": {"last_seen_at": now, "updated_at": now}, "$setOnInsert": {"manual_mode": "automatico"}},
        upsert=True,
    )
    return {"ok": True, "last_seen_at": now}


@api_router.get("/presence/me", response_model=PresencePublic)
async def my_presence(user: dict = Depends(get_current_user)):
    return PresencePublic(**(await _presence_for_user(user, datetime.now(timezone.utc))))


@api_router.patch("/presence/me", response_model=PresencePublic)
async def update_my_presence(body: PresenceStatusUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    manual_until = None
    if body.mode != "automatico" and body.duration_minutes:
        manual_until = (now + timedelta(minutes=body.duration_minutes)).isoformat()
    await db.user_presence.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "manual_mode": body.mode,
            "manual_until": manual_until,
            "updated_at": now.isoformat(),
            "last_seen_at": now.isoformat(),
        }},
        upsert=True,
    )
    return PresencePublic(**(await _presence_for_user(user, now)))


@api_router.get("/presence/team", response_model=List[PresencePublic])
async def team_presence(user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"role": {"$in": ["master", "admin", "servizio_civile"]}},
        {"_id": 0, "password_hash": 0},
    ).sort([("full_name", 1)]).to_list(500)
    now = datetime.now(timezone.utc)
    return [PresencePublic(**(await _presence_for_user(item, now))) for item in users]


@api_router.post("/announcements/{ann_id}/read", response_model=AnnouncementReadPublic)
async def mark_announcement_read(ann_id: str, user: dict = Depends(get_current_user)):
    exists = await db.announcements.find_one({"id": ann_id}, {"_id": 0, "id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Avviso non trovato")
    now = datetime.now(timezone.utc).isoformat()
    await db.announcement_reads.update_one(
        {"announcement_id": ann_id, "user_id": user["id"]},
        {"$set": {"read_at": now}},
        upsert=True,
    )
    return AnnouncementReadPublic(announcement_id=ann_id, read_at=now)


@api_router.get("/announcements/read-ids", response_model=List[str])
async def announcement_read_ids(user: dict = Depends(get_current_user)):
    docs = await db.announcement_reads.find(
        {"user_id": user["id"]}, {"_id": 0, "announcement_id": 1}
    ).to_list(1000)
    return [item["announcement_id"] for item in docs]


# ----- Team members (public read for Volontari / Servizio Civile pages) -----
class TeamMemberExt(BaseModel):
    id: str
    full_name: str
    role: str
    bio: Optional[str] = None
    age: Optional[int] = None
    photo_b64: Optional[str] = None
    role_title: Optional[str] = None
    join_date: Optional[str] = None
    birth_date: Optional[str] = None


@api_router.get("/team/{role}", response_model=List[TeamMemberExt])
async def list_team(role: str):
    if role not in ("admin", "servizio_civile"):
        raise HTTPException(status_code=400, detail="Ruolo non valido")
    docs = await db.users.find(
        {"role": role},
        {"_id": 0, "id": 1, "full_name": 1, "role": 1, "bio": 1, "age": 1,
         "photo_b64": 1, "role_title": 1, "join_date": 1, "birth_date": 1},
    ).sort([("full_name", 1)]).to_list(200)
    return [TeamMemberExt(**d) for d in docs]


# ----- Admin sets/updates photo for any user -----
@api_router.patch("/users/{user_id}/profile", response_model=UserPublic)
async def admin_update_user_profile(
    user_id: str,
    body: UpdateProfileRequest,
    user: dict = Depends(require_role("master", "admin")),
):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Nessuna modifica")
    res = await db.users.update_one({"id": user_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserPublic(**doc)


# ----- Garage / Vehicles -----


@api_router.get("/vehicles", response_model=List[Vehicle])
async def list_vehicles(user: dict = Depends(require_role("master", "admin"))):
    docs = await db.vehicles.find({}, {"_id": 0}).sort([("name", 1)]).to_list(200)
    return [Vehicle(**d) for d in docs]


@api_router.post("/vehicles", response_model=Vehicle)
async def create_vehicle(body: VehicleInput, user: dict = Depends(require_role("master", "admin"))):
    v = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.vehicles.insert_one(v)
    return Vehicle(**{k: vv for k, vv in v.items() if k != "_id"})


@api_router.patch("/vehicles/{vehicle_id}", response_model=Vehicle)
async def update_vehicle(vehicle_id: str, body: VehicleInput, user: dict = Depends(require_role("master", "admin"))):
    res = await db.vehicles.update_one({"id": vehicle_id}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mezzo non trovato")
    doc = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return Vehicle(**doc)


@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(require_role("master", "admin"))):
    await db.vehicles.delete_one({"id": vehicle_id})
    return {"ok": True}


# include router and middleware
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "https://app.laprovvidenza.it",
        "https://laprovvidenza.it",
        "https://www.laprovvidenza.it",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
