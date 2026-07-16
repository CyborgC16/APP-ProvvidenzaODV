from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable, List, Literal, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

VehicleStatus = Literal[
    "disponibile",
    "assegnato",
    "in_servizio",
    "manutenzione",
    "fuori_servizio",
]

MissionStatus = Literal[
    "da_assegnare",
    "assegnata",
    "in_partenza",
    "dal_paziente",
    "in_trasporto",
    "completata",
    "annullata",
]

ACTIVE_MISSION_STATUSES = {
    "da_assegnare",
    "assegnata",
    "in_partenza",
    "dal_paziente",
    "in_trasporto",
}


class VehicleV2Create(BaseModel):
    name: str
    vehicle_type: Literal["ambulanza", "furgone", "altro"]
    plate: Optional[str] = None
    status: VehicleStatus = "disponibile"
    odometer_km: int = Field(default=0, ge=0)
    insurance_expiry: Optional[str] = None
    inspection_expiry: Optional[str] = None
    notes: Optional[str] = None


class VehicleV2Update(BaseModel):
    name: Optional[str] = None
    vehicle_type: Optional[Literal["ambulanza", "furgone", "altro"]] = None
    plate: Optional[str] = None
    odometer_km: Optional[int] = Field(default=None, ge=0)
    insurance_expiry: Optional[str] = None
    inspection_expiry: Optional[str] = None
    notes: Optional[str] = None


class VehicleStatusUpdate(BaseModel):
    status: VehicleStatus
    reason: Optional[str] = None


class VehicleV2(VehicleV2Create):
    id: str
    current_mission_id: Optional[str] = None
    created_at: str
    updated_at: str


class MissionCreate(BaseModel):
    date: str
    scheduled_time: str
    service_type: str = "trasporto_sanitario"
    booking_id: Optional[str] = None
    patient_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    destination: Optional[str] = None
    notes: Optional[str] = None


class MissionUpdate(BaseModel):
    date: Optional[str] = None
    scheduled_time: Optional[str] = None
    service_type: Optional[str] = None
    patient_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    destination: Optional[str] = None
    notes: Optional[str] = None


class MissionStatusUpdate(BaseModel):
    status: MissionStatus
    note: Optional[str] = None


class AssignVehicleRequest(BaseModel):
    vehicle_id: str


class AssignCrewRequest(BaseModel):
    driver_user_id: Optional[str] = None
    member_user_ids: List[str] = []


class Mission(BaseModel):
    id: str
    booking_id: Optional[str] = None
    date: str
    scheduled_time: str
    status: MissionStatus
    service_type: str
    vehicle_id: Optional[str] = None
    patient_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    destination: Optional[str] = None
    notes: Optional[str] = None
    started_at: Optional[str] = None
    arrived_patient_at: Optional[str] = None
    arrived_destination_at: Optional[str] = None
    completed_at: Optional[str] = None
    created_by: str
    created_at: str
    updated_at: str


class Crew(BaseModel):
    id: str
    mission_id: str
    driver_user_id: Optional[str] = None
    member_user_ids: List[str] = []
    created_at: str
    updated_at: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_v2_router(
    *,
    db,
    require_role: Callable,
    get_current_user: Callable,
    notify_staff: Callable,
) -> APIRouter:
    router = APIRouter(prefix="/api/v2", tags=["Versione 2"])

    async def audit(user: dict, action: str, entity_type: str, entity_id: str, details: Optional[dict] = None):
        await db.audit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_name": user.get("full_name") or user.get("username"),
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details or {},
            "created_at": _now(),
        })

    async def vehicle_or_404(vehicle_id: str) -> dict:
        doc = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Mezzo non trovato")
        return doc

    async def mission_or_404(mission_id: str) -> dict:
        doc = await db.missions.find_one({"id": mission_id}, {"_id": 0})
        if not doc:
            raise HTTPException(status_code=404, detail="Missione non trovata")
        return doc

    async def add_vehicle_history(vehicle_id: str, old_status: Optional[str], new_status: str, user: dict, reason: Optional[str] = None):
        await db.vehicle_status_history.insert_one({
            "id": str(uuid.uuid4()),
            "vehicle_id": vehicle_id,
            "old_status": old_status,
            "new_status": new_status,
            "reason": reason,
            "changed_by": user["id"],
            "changed_by_name": user.get("full_name"),
            "created_at": _now(),
        })

    @router.get("/health")
    async def health():
        return {"ok": True, "module": "v2"}

    @router.get("/vehicles", response_model=List[VehicleV2])
    async def list_vehicles_v2(user: dict = Depends(require_role("master", "admin"))):
        docs = await db.vehicles.find({}, {"_id": 0}).sort([("name", 1)]).to_list(500)
        now = _now()
        normalized = []
        for doc in docs:
            doc.setdefault("status", "disponibile")
            doc.setdefault("odometer_km", 0)
            doc.setdefault("insurance_expiry", None)
            doc.setdefault("inspection_expiry", None)
            doc.setdefault("current_mission_id", None)
            doc.setdefault("updated_at", doc.get("created_at", now))
            normalized.append(VehicleV2(**doc))
        return normalized

    @router.post("/vehicles", response_model=VehicleV2)
    async def create_vehicle_v2(body: VehicleV2Create, user: dict = Depends(require_role("master", "admin"))):
        now = _now()
        doc = {
            "id": str(uuid.uuid4()),
            **body.model_dump(),
            "current_mission_id": None,
            "created_at": now,
            "updated_at": now,
        }
        await db.vehicles.insert_one(doc)
        await add_vehicle_history(doc["id"], None, doc["status"], user, "Creazione mezzo")
        await audit(user, "create", "vehicle", doc["id"])
        return VehicleV2(**{k: v for k, v in doc.items() if k != "_id"})

    @router.patch("/vehicles/{vehicle_id}", response_model=VehicleV2)
    async def update_vehicle_v2(vehicle_id: str, body: VehicleV2Update, user: dict = Depends(require_role("master", "admin"))):
        await vehicle_or_404(vehicle_id)
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if not update:
            raise HTTPException(status_code=400, detail="Nessuna modifica")
        update["updated_at"] = _now()
        await db.vehicles.update_one({"id": vehicle_id}, {"$set": update})
        await audit(user, "update", "vehicle", vehicle_id, update)
        doc = await vehicle_or_404(vehicle_id)
        doc.setdefault("status", "disponibile")
        doc.setdefault("odometer_km", 0)
        doc.setdefault("current_mission_id", None)
        doc.setdefault("updated_at", doc.get("created_at", _now()))
        return VehicleV2(**doc)

    @router.post("/vehicles/{vehicle_id}/status", response_model=VehicleV2)
    async def update_vehicle_status(vehicle_id: str, body: VehicleStatusUpdate, user: dict = Depends(require_role("master", "admin"))):
        vehicle = await vehicle_or_404(vehicle_id)
        current_mission_id = vehicle.get("current_mission_id")
        if current_mission_id and body.status in {"disponibile", "manutenzione", "fuori_servizio"}:
            mission = await db.missions.find_one({"id": current_mission_id}, {"_id": 0})
            if mission and mission.get("status") in ACTIVE_MISSION_STATUSES:
                raise HTTPException(status_code=409, detail="Il mezzo è collegato a una missione attiva")
        old_status = vehicle.get("status", "disponibile")
        await db.vehicles.update_one(
            {"id": vehicle_id},
            {"$set": {"status": body.status, "updated_at": _now()}},
        )
        await add_vehicle_history(vehicle_id, old_status, body.status, user, body.reason)
        await audit(user, "status_change", "vehicle", vehicle_id, {"old": old_status, "new": body.status})
        doc = await vehicle_or_404(vehicle_id)
        doc.setdefault("odometer_km", 0)
        doc.setdefault("current_mission_id", None)
        doc.setdefault("updated_at", doc.get("created_at", _now()))
        return VehicleV2(**doc)

    @router.get("/vehicles/{vehicle_id}/history")
    async def vehicle_history(vehicle_id: str, user: dict = Depends(require_role("master", "admin"))):
        await vehicle_or_404(vehicle_id)
        return await db.vehicle_status_history.find(
            {"vehicle_id": vehicle_id}, {"_id": 0}
        ).sort([("created_at", -1)]).to_list(500)

    @router.get("/missions", response_model=List[Mission])
    async def list_missions(
        date: Optional[str] = None,
        status_value: Optional[str] = None,
        mine: bool = False,
        user: dict = Depends(get_current_user),
    ):
        query: dict = {}
        if date:
            query["date"] = date
        if status_value:
            query["status"] = status_value
        if mine:
            crew_missions = await db.crews.find(
                {
                    "$or": [
                        {"driver_user_id": user["id"]},
                        {"member_user_ids": user["id"]},
                    ]
                },
                {"_id": 0, "mission_id": 1},
            ).to_list(1000)
            query["id"] = {"$in": [x["mission_id"] for x in crew_missions]}
        elif user["role"] == "servizio_civile":
            raise HTTPException(status_code=403, detail="Usa il filtro mine=true")
        docs = await db.missions.find(query, {"_id": 0}).sort([("date", 1), ("scheduled_time", 1)]).to_list(2000)
        return [Mission(**d) for d in docs]

    @router.get("/missions/{mission_id}", response_model=Mission)
    async def get_mission(mission_id: str, user: dict = Depends(get_current_user)):
        mission = await mission_or_404(mission_id)
        if user["role"] == "servizio_civile":
            crew = await db.crews.find_one({
                "mission_id": mission_id,
                "$or": [
                    {"driver_user_id": user["id"]},
                    {"member_user_ids": user["id"]},
                ],
            })
            if not crew:
                raise HTTPException(status_code=403, detail="Missione non assegnata all'utente")
        return Mission(**mission)

    @router.post("/missions", response_model=Mission)
    async def create_mission(body: MissionCreate, user: dict = Depends(require_role("master", "admin"))):
        if body.booking_id and await db.missions.find_one({"booking_id": body.booking_id}):
            raise HTTPException(status_code=409, detail="Esiste già una missione per questa prenotazione")
        now = _now()
        doc = {
            "id": str(uuid.uuid4()),
            **body.model_dump(),
            "status": "da_assegnare",
            "vehicle_id": None,
            "started_at": None,
            "arrived_patient_at": None,
            "arrived_destination_at": None,
            "completed_at": None,
            "created_by": user["id"],
            "created_at": now,
            "updated_at": now,
        }
        await db.missions.insert_one(doc)
        await audit(user, "create", "mission", doc["id"])
        await notify_staff("Nuova missione", f"{doc.get('patient_name') or 'Missione'} · {doc['date']} {doc['scheduled_time']}", "info")
        return Mission(**{k: v for k, v in doc.items() if k != "_id"})

    @router.post("/missions/from-booking/{booking_id}", response_model=Mission)
    async def mission_from_booking(booking_id: str, user: dict = Depends(require_role("master", "admin"))):
        booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
        if not booking:
            raise HTTPException(status_code=404, detail="Prenotazione non trovata")
        if booking.get("status") == "annullata":
            raise HTTPException(status_code=400, detail="La prenotazione è annullata")
        if await db.missions.find_one({"booking_id": booking_id}):
            raise HTTPException(status_code=409, detail="Missione già esistente")
        now = _now()
        patient_name = " ".join(
            x for x in [booking.get("patient_name"), booking.get("patient_surname")] if x
        ) or None
        doc = {
            "id": str(uuid.uuid4()),
            "booking_id": booking_id,
            "date": booking["slot_date"],
            "scheduled_time": booking["slot_time"],
            "status": "da_assegnare",
            "service_type": "trasporto_sanitario",
            "vehicle_id": None,
            "patient_name": patient_name,
            "phone": booking.get("phone"),
            "address": booking.get("address"),
            "destination": None,
            "notes": booking.get("notes"),
            "started_at": None,
            "arrived_patient_at": None,
            "arrived_destination_at": None,
            "completed_at": None,
            "created_by": user["id"],
            "created_at": now,
            "updated_at": now,
        }
        await db.missions.insert_one(doc)
        await db.bookings.update_one({"id": booking_id}, {"$set": {"mission_id": doc["id"]}})
        await audit(user, "create_from_booking", "mission", doc["id"], {"booking_id": booking_id})
        return Mission(**{k: v for k, v in doc.items() if k != "_id"})

    @router.patch("/missions/{mission_id}", response_model=Mission)
    async def update_mission(mission_id: str, body: MissionUpdate, user: dict = Depends(require_role("master", "admin"))):
        await mission_or_404(mission_id)
        update = {k: v for k, v in body.model_dump().items() if v is not None}
        if not update:
            raise HTTPException(status_code=400, detail="Nessuna modifica")
        update["updated_at"] = _now()
        await db.missions.update_one({"id": mission_id}, {"$set": update})
        await audit(user, "update", "mission", mission_id, update)
        return Mission(**await mission_or_404(mission_id))

    @router.post("/missions/{mission_id}/assign-vehicle", response_model=Mission)
    async def assign_vehicle(mission_id: str, body: AssignVehicleRequest, user: dict = Depends(require_role("master", "admin"))):
        mission = await mission_or_404(mission_id)
        vehicle = await vehicle_or_404(body.vehicle_id)
        if vehicle.get("status", "disponibile") != "disponibile":
            raise HTTPException(status_code=409, detail="Il mezzo non è disponibile")
        old_vehicle_id = mission.get("vehicle_id")
        if old_vehicle_id and old_vehicle_id != body.vehicle_id:
            await db.vehicles.update_one(
                {"id": old_vehicle_id},
                {"$set": {"status": "disponibile", "current_mission_id": None, "updated_at": _now()}},
            )
        await db.vehicles.update_one(
            {"id": body.vehicle_id},
            {"$set": {"status": "assegnato", "current_mission_id": mission_id, "updated_at": _now()}},
        )
        await db.missions.update_one(
            {"id": mission_id},
            {"$set": {"vehicle_id": body.vehicle_id, "status": "assegnata", "updated_at": _now()}},
        )
        await add_vehicle_history(body.vehicle_id, vehicle.get("status", "disponibile"), "assegnato", user, f"Missione {mission_id}")
        await audit(user, "assign_vehicle", "mission", mission_id, {"vehicle_id": body.vehicle_id})
        return Mission(**await mission_or_404(mission_id))

    @router.post("/missions/{mission_id}/assign-crew", response_model=Crew)
    async def assign_crew(mission_id: str, body: AssignCrewRequest, user: dict = Depends(require_role("master", "admin"))):
        await mission_or_404(mission_id)
        ids = [x for x in [body.driver_user_id, *body.member_user_ids] if x]
        if ids:
            users = await db.users.find({"id": {"$in": ids}}, {"_id": 0, "id": 1}).to_list(500)
            if len({u["id"] for u in users}) != len(set(ids)):
                raise HTTPException(status_code=400, detail="Uno o più utenti non esistono")
        now = _now()
        existing = await db.crews.find_one({"mission_id": mission_id}, {"_id": 0})
        if existing:
            await db.crews.update_one(
                {"mission_id": mission_id},
                {"$set": {
                    "driver_user_id": body.driver_user_id,
                    "member_user_ids": body.member_user_ids,
                    "updated_at": now,
                }},
            )
        else:
            existing = {
                "id": str(uuid.uuid4()),
                "mission_id": mission_id,
                "driver_user_id": body.driver_user_id,
                "member_user_ids": body.member_user_ids,
                "created_at": now,
                "updated_at": now,
            }
            await db.crews.insert_one(existing)
        await audit(user, "assign_crew", "mission", mission_id, body.model_dump())
        doc = await db.crews.find_one({"mission_id": mission_id}, {"_id": 0})
        return Crew(**doc)

    @router.post("/missions/{mission_id}/status", response_model=Mission)
    async def update_mission_status(mission_id: str, body: MissionStatusUpdate, user: dict = Depends(get_current_user)):
        mission = await mission_or_404(mission_id)
        if user["role"] == "servizio_civile":
            crew = await db.crews.find_one({
                "mission_id": mission_id,
                "$or": [
                    {"driver_user_id": user["id"]},
                    {"member_user_ids": user["id"]},
                ],
            })
            if not crew:
                raise HTTPException(status_code=403, detail="Missione non assegnata all'utente")

        now = _now()
        update = {"status": body.status, "updated_at": now}
        timestamp_fields = {
            "in_partenza": "started_at",
            "dal_paziente": "arrived_patient_at",
            "in_trasporto": "arrived_destination_at",
            "completata": "completed_at",
        }
        field = timestamp_fields.get(body.status)
        if field:
            update[field] = now

        vehicle_id = mission.get("vehicle_id")
        if body.status in {"in_partenza", "dal_paziente", "in_trasporto"}:
            if not vehicle_id:
                raise HTTPException(status_code=409, detail="Assegna un mezzo prima di avviare la missione")
            vehicle = await vehicle_or_404(vehicle_id)
            old = vehicle.get("status", "assegnato")
            await db.vehicles.update_one(
                {"id": vehicle_id},
                {"$set": {"status": "in_servizio", "updated_at": now}},
            )
            if old != "in_servizio":
                await add_vehicle_history(vehicle_id, old, "in_servizio", user, f"Missione {mission_id}")

        if body.status in {"completata", "annullata"} and vehicle_id:
            vehicle = await vehicle_or_404(vehicle_id)
            old = vehicle.get("status", "in_servizio")
            await db.vehicles.update_one(
                {"id": vehicle_id},
                {"$set": {"status": "disponibile", "current_mission_id": None, "updated_at": now}},
            )
            await add_vehicle_history(vehicle_id, old, "disponibile", user, f"Chiusura missione {mission_id}")

        await db.missions.update_one({"id": mission_id}, {"$set": update})
        await db.mission_timeline.insert_one({
            "id": str(uuid.uuid4()),
            "mission_id": mission_id,
            "event": "status_change",
            "old_status": mission["status"],
            "new_status": body.status,
            "note": body.note,
            "user_id": user["id"],
            "user_name": user.get("full_name"),
            "created_at": now,
        })
        await audit(user, "status_change", "mission", mission_id, {"old": mission["status"], "new": body.status})
        return Mission(**await mission_or_404(mission_id))

    @router.get("/missions/{mission_id}/crew", response_model=Optional[Crew])
    async def get_crew(mission_id: str, user: dict = Depends(get_current_user)):
        await mission_or_404(mission_id)
        doc = await db.crews.find_one({"mission_id": mission_id}, {"_id": 0})
        return Crew(**doc) if doc else None

    @router.get("/missions/{mission_id}/timeline")
    async def get_timeline(mission_id: str, user: dict = Depends(get_current_user)):
        await mission_or_404(mission_id)
        return await db.mission_timeline.find(
            {"mission_id": mission_id}, {"_id": 0}
        ).sort([("created_at", 1)]).to_list(1000)

    return router


async def ensure_v2_indexes(db) -> None:
    await db.vehicles.create_index("id", unique=True)
    await db.vehicles.create_index([("status", 1), ("vehicle_type", 1)])
    await db.missions.create_index("id", unique=True)
    await db.missions.create_index([("date", 1), ("status", 1)])
    await db.missions.create_index("booking_id", unique=True, sparse=True)
    await db.crews.create_index("id", unique=True)
    await db.crews.create_index("mission_id", unique=True)
    await db.vehicle_status_history.create_index([("vehicle_id", 1), ("created_at", -1)])
    await db.mission_timeline.create_index([("mission_id", 1), ("created_at", 1)])
    await db.audit_logs.create_index([("created_at", -1)])
