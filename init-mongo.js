// MongoDB initialization script for Docker
db = db.getSiblingDB('itinerary_management');

// Create collections
db.createCollection('users');
db.createCollection('events');
db.createCollection('notifications');

// Create indexes for better performance
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true });

db.events.createIndex({ "created_by": 1 });
db.events.createIndex({ "start_time": 1 });
db.events.createIndex({ "created_by": 1, "start_time": 1 });

db.notifications.createIndex({ "user_id": 1 });
db.notifications.createIndex({ "user_id": 1, "status": 1 });

print('Database initialized successfully');