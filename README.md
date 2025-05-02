# Automated Itinerary Management System

A full-featured itinerary planning and scheduling system for institutions and offices, allowing efficient management of tasks, events, and appointments.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Event Management**: Create, edit, delete events with scheduling details
- **Calendar View**: Visual calendar to display and manage events
- **Notifications**: Real-time notifications for upcoming events with sound alerts
- **Reports**: Generate and export reports on past and upcoming events
- **Mobile Responsive**: Works on all devices

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)

## Getting Started

### Prerequisites

- Node.js (v14+)
- Python (v3.8+)
- MongoDB

### Installation

#### Clone the repository

```bash
git clone https://github.com/yourusername/itinerary-management-system.git
cd itinerary-management-system
```

#### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory with the following:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="itinerary_management"
```

5. Start the backend server:

```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd ../frontend
```

2. Install dependencies:

```bash
yarn install
```

3. Create a `.env` file in the frontend directory with:

```
REACT_APP_BACKEND_URL="http://localhost:8001"
```

4. Start the frontend server:

```bash
yarn start
```

5. Open your browser and navigate to `http://localhost:3000`

## Docker Deployment

For a containerized setup:

1. Make sure Docker and Docker Compose are installed on your system
2. Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    
  backend:
    build: ./backend
    ports:
      - "8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=itinerary_management
    depends_on:
      - mongodb
    
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_BACKEND_URL=http://localhost:8001
    depends_on:
      - backend

volumes:
  mongodb_data:
```

3. Run the application using Docker Compose:

```bash
docker-compose up -d
```

4. Access the application at `http://localhost:3000`

## Usage

1. **Register an Account**: Create a new user account with appropriate role
2. **Login**: Use your credentials to log in
3. **Create Events**: Add new events with details including title, time, venue, priority
4. **Manage Events**: View, edit, and delete events
5. **View Calendar**: Check your schedule in a visual calendar interface
6. **Check Notifications**: Receive alerts for upcoming events
7. **Generate Reports**: Create reports on event data

## Administrator Setup

To create the first admin user:

1. Register a normal user
2. Access the MongoDB database:

```bash
mongo
use itinerary_management
db.users.updateOne({username: "your_username"}, {$set: {role: "admin"}})
```

Alternatively, use the debug endpoint (in development only):
```
curl -X POST http://localhost:8001/api/debug/create-test-user
```

This will create a test user with username: testuser and password: password123

## License

This project is licensed under the MIT License.
