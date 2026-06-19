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
from pydantic import BaseModel, Field, EmailStr

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
    role: Literal["admin", "servizio_civile"]
    password: Optional[str] = None  # if None, auto-generate


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
            server.sendmail(SMTP_USER, [BOOKING_TO_EMAIL, BOOKING_CC_EMAIL], msg.as_string())
        logger.info(f"Booking email sent for booking_id={b['id']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send booking email: {e}")
        return False


# ===== Seed master account =====
async def seed_master():
    existing = await db.users.find_one({"role": "master"})
    if existing:
        # ensure master credentials match env
        await db.users.update_one(
            {"role": "master"},
            {"$set": {
                "username": MASTER_USERNAME,
                "password_hash": hash_password(MASTER_PASSWORD),
                "full_name": "Master Admin",
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
        ),
    )


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


# ----- Users management (master/admin) -----
@api_router.get("/users", response_model=List[UserPublic])
async def list_users(user: dict = Depends(require_role("master", "admin"))):
    docs = await db.users.find({"role": {"$ne": "master"}}, {"_id": 0, "password_hash": 0}).to_list(500)
    return [UserPublic(**d) for d in docs]


@api_router.post("/users", response_model=UserCreateResponse)
async def create_user(body: UserCreateRequest, user: dict = Depends(require_role("master", "admin"))):
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
    )
    return UserCreateResponse(user=public, generated_password=generated)


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_role("master", "admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["role"] == "master":
        raise HTTPException(status_code=403, detail="Impossibile eliminare il master")
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


# include router and middleware
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
