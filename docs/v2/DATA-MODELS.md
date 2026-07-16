# Modelli dati Sprint 1

## Vehicle 2.0
```json
{
  "id": "uuid",
  "name": "Ambulanza 1",
  "vehicle_type": "ambulanza",
  "plate": "AB123CD",
  "status": "disponibile",
  "odometer_km": 125000,
  "insurance_expiry": "2027-02-10",
  "inspection_expiry": "2027-05-20",
  "notes": null,
  "current_mission_id": null,
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Stati consentiti:
- `disponibile`
- `assegnato`
- `in_servizio`
- `manutenzione`
- `fuori_servizio`

## Mission
```json
{
  "id": "uuid",
  "booking_id": "uuid|null",
  "date": "2026-07-17",
  "scheduled_time": "09:30",
  "status": "da_assegnare",
  "service_type": "trasporto_sanitario",
  "vehicle_id": null,
  "patient_name": "Nome Paziente",
  "address": "Indirizzo",
  "destination": null,
  "notes": null,
  "started_at": null,
  "arrived_patient_at": null,
  "arrived_destination_at": null,
  "completed_at": null,
  "created_by": "user-id",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

Stati consentiti:
- `da_assegnare`
- `assegnata`
- `in_partenza`
- `dal_paziente`
- `in_trasporto`
- `completata`
- `annullata`

## Crew
```json
{
  "id": "uuid",
  "mission_id": "uuid",
  "driver_user_id": "uuid|null",
  "member_user_ids": ["uuid"],
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```
