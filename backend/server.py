"""La Provvidenza ODV - Backend API"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import smtplib
import secrets
import string
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

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
SMTP_USER = os.environ["SMTP_USER"]
SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]
BOOKING_TO_EMAIL = os.environ["BOOKING_TO_EMAIL"]
BOOKING_CC_EMAIL = os.environ["BOOKING_CC_EMAIL"]
BOOKING_SUBJECT = os.environ["BOOKING_SUBJECT"]

Role = Literal["master", "admin", "servizio_civile"]

app = FastAPI(title="La Provvidenza ODV API")
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
    def _empty_email_to_none(cls, v):
        # Accept "" from frontend forms as null
        if isinstance(v, str) and v.strip() == "":
            return None
        return v


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
    slot_id: str
    requester_name: str
    requester_surname: str
    patient_name: str
    patient_surname: str
    phone: str
    email: EmailStr
    address: str
    vehicle_type: Literal["ambulanza", "furgone"]
    patient_weight_class: Literal["normopeso", "obeso"]
    has_elevator: bool
    floor: int
    notes: Optional[str] = None


class Booking(BaseModel):
    id: str
    slot_id: str
    slot_date: str
    slot_time: str
    requester_name: str
    requester_surname: str
    patient_name: str
    patient_surname: str
    phone: str
    email: EmailStr
    address: str
    vehicle_type: str
    patient_weight_class: str
    has_elevator: bool
    floor: int
    notes: Optional[str] = None
    status: str = "pendente"
    created_at: str


# ===== Email =====
def send_booking_email(b: dict) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = BOOKING_SUBJECT
        msg["From"] = f"La Provvidenza ODV <{SMTP_USER}>"
        msg["To"] = BOOKING_TO_EMAIL
        msg["Cc"] = BOOKING_CC_EMAIL
        # also send a copy to the requester
        recipients = [BOOKING_TO_EMAIL, BOOKING_CC_EMAIL]
        requester_email = (b.get("email") or "").strip()
        if requester_email and requester_email not in recipients:
            recipients.append(requester_email)

        vehicle_label = "Ambulanza" if b["vehicle_type"] == "ambulanza" else "Furgone Disabili"
        elevator = "Sì" if b["has_elevator"] else "No"
        text = f"""Nuova prenotazione - La Provvidenza ODV

Data/Ora: {b['slot_date']} {b['slot_time']}
Mezzo: {vehicle_label}

PRENOTANTE
Nome: {b['requester_name']} {b['requester_surname']}
Telefono: {b['phone']}
Email: {b['email']}

PAZIENTE
Nome: {b['patient_name']} {b['patient_surname']}
Peso: {b['patient_weight_class']}
Indirizzo: {b['address']}
Ascensore: {elevator}
Piano: {b['floor']}

Note: {b.get('notes') or '-'}
ID prenotazione: {b['id']}
"""

        html = f"""<html><body style="font-family:Arial,sans-serif;color:#121A26;">
  <div style="background:#FF6B00;padding:16px;color:#fff;">
    <h2 style="margin:0;">Nuova Prenotazione Servizio</h2>
    <p style="margin:4px 0 0 0;">La Provvidenza ODV - Marsala</p>
  </div>
  <div style="padding:16px;">
    <p><b>Data/Ora:</b> {b['slot_date']} {b['slot_time']}<br/>
       <b>Mezzo:</b> {vehicle_label}</p>
    <h3 style="color:#1A2E46;border-bottom:1px solid #eee;padding-bottom:4px;">Prenotante</h3>
    <p><b>Nome:</b> {b['requester_name']} {b['requester_surname']}<br/>
       <b>Telefono:</b> {b['phone']}<br/>
       <b>Email:</b> {b['email']}</p>
    <h3 style="color:#1A2E46;border-bottom:1px solid #eee;padding-bottom:4px;">Paziente</h3>
    <p><b>Nome:</b> {b['patient_name']} {b['patient_surname']}<br/>
       <b>Peso:</b> {b['patient_weight_class']}<br/>
       <b>Indirizzo:</b> {b['address']}<br/>
       <b>Ascensore:</b> {elevator} - <b>Piano:</b> {b['floor']}</p>
    <p><b>Note:</b> {b.get('notes') or '-'}</p>
    <p style="color:#888;font-size:12px;">ID prenotazione: {b['id']}</p>
  </div>
</body></html>"""

        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, recipients, msg.as_string())
        logger.info(f"Booking email sent for booking_id={b['id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking email: {e}")
        return False


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


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ===== Routes =====
@api_router.get("/")
async def root():
    return {"app": "La Provvidenza ODV", "status": "ok"}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = await db.users.find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
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


# ----- Bookings -----
@api_router.post("/bookings", response_model=Booking)
async def create_booking(body: BookingCreateRequest, background: BackgroundTasks):
    """Public endpoint: guests can book without authentication."""
    slot = await db.slots.find_one({"id": body.slot_id}, {"_id": 0})
    if not slot:
        raise HTTPException(status_code=404, detail="Slot non disponibile")
    if slot["booked_count"] >= slot["capacity"]:
        raise HTTPException(status_code=400, detail="Slot esaurito")
    if slot["vehicle_type"] != body.vehicle_type:
        raise HTTPException(status_code=400, detail="Tipo di mezzo non coincide con lo slot")

    booking_doc = {
        "id": str(uuid.uuid4()),
        "slot_id": body.slot_id,
        "slot_date": slot["date"],
        "slot_time": slot["time"],
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
        "status": "pendente",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one(booking_doc)
    await db.slots.update_one({"id": body.slot_id}, {"$inc": {"booked_count": 1}})

    # send email in background so booking creation isn't blocked
    booking_clean = {k: v for k, v in booking_doc.items() if k != "_id"}
    background.add_task(send_booking_email, booking_clean)
    return Booking(**booking_clean)


@api_router.get("/bookings", response_model=List[Booking])
async def list_bookings(
    date: Optional[str] = None,
    user: dict = Depends(require_role("master", "admin")),
):
    q: dict = {}
    if date:
        q["slot_date"] = date
    docs = await db.bookings.find(q, {"_id": 0}).sort([("slot_date", 1), ("slot_time", 1)]).to_list(2000)
    return [Booking(**d) for d in docs]


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
    await db.slots.update_one({"id": booking["slot_id"]}, {"$inc": {"booked_count": -1}})
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
                send_email(u["email"], subject, html)
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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
