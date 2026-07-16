# API Sprint 1

## Mezzi
- `GET /api/v2/vehicles`
- `POST /api/v2/vehicles`
- `PATCH /api/v2/vehicles/{vehicle_id}`
- `POST /api/v2/vehicles/{vehicle_id}/status`
- `GET /api/v2/vehicles/{vehicle_id}/history`

## Missioni
- `GET /api/v2/missions`
- `GET /api/v2/missions/{mission_id}`
- `POST /api/v2/missions`
- `POST /api/v2/missions/from-booking/{booking_id}`
- `PATCH /api/v2/missions/{mission_id}`
- `POST /api/v2/missions/{mission_id}/assign-vehicle`
- `POST /api/v2/missions/{mission_id}/assign-crew`
- `POST /api/v2/missions/{mission_id}/status`

## Permessi iniziali
- `master`: accesso completo
- `admin`: gestione missioni, mezzi ed equipaggi
- `servizio_civile`: sola lettura delle missioni assegnate

## Regole
- Un mezzo `manutenzione` o `fuori_servizio` non può essere assegnato.
- Un mezzo già collegato a una missione attiva non può essere assegnato a un'altra.
- Il passaggio a `in_servizio` aggiorna automaticamente il mezzo.
- Il passaggio missione a `completata` libera automaticamente il mezzo.
- Ogni cambio di stato viene registrato nello storico.
