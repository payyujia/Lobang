# Lobang 

A bartering platform that prizes use value over exchange value.

## Tech Stack

**Backend:** Node.js, Express, MongoDB, Mongoose, Socket.io
**Frontend:** React, Vite, React Router
**Auth:** Express-session, bcrypt

## Features

- Session-based authentication
- Create and manage listings with multi-image upload
- Make, accept, decline, reopen and complete trade offers
- Real-time chat between trade partners via WebSockets
- Live push notifications via Socket.io
- MongoDB aggregation pipeline for recommendations based on tags, recency and popularity
- Review and rating system with karma scoring
- Text search with category filtering

## Installation

1. Clone the repository
```bash
git clone https://github.com/payyujia/Lobang.git
cd lobang
```

2. Install dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd ../frontend
npm install
```

3. Configure environment variables

Create a `config.env` file in `lobang/backend/`:
```env
PORT=8000
DB=<your-mongodb-connection-string>
SECRET=<your-session-secret>
CLIENT_URL=http://localhost:5173
```

4. Seed the database

```bash
cd lobang/backend
node seed.js
```
5. Open two terminals:

Terminal 1 — Backend (port 8000)
```bash
cd lobang/backend
node server.js
```

Terminal 2 — Frontend (port 5173)
```bash
cd lobang/frontend
npm run dev
```

Visit `http://localhost:5173` in your browser.
