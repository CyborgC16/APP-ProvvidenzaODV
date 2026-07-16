// MongoDB indexes — eseguire solo quando il backend V2 sarà installato
db.vehicles.createIndex({ id: 1 }, { unique: true });
db.vehicles.createIndex({ status: 1, vehicle_type: 1 });
db.missions.createIndex({ id: 1 }, { unique: true });
db.missions.createIndex({ date: 1, status: 1 });
db.missions.createIndex({ booking_id: 1 }, { unique: true, sparse: true });
db.missions.createIndex({ vehicle_id: 1, status: 1 });
db.crews.createIndex({ id: 1 }, { unique: true });
db.crews.createIndex({ mission_id: 1 }, { unique: true });
db.vehicle_status_history.createIndex({ vehicle_id: 1, created_at: -1 });
db.audit_logs.createIndex({ created_at: -1 });
