# DealFlow CRM

A deal pipeline management application built with Python/FastAPI and React. Designed as a QA automation test target — the codebase contains intentional bugs, design flaws, and edge cases across security, logic, data integrity, and UI layers.

## Architecture

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React 18 + Vite + React Router

## Features

- **Authentication** — JWT-based login/registration with role-based access (Admin, Manager, Rep)
- **Deal Pipeline** — Kanban board with drag-and-drop stage management, stage history tracking
- **Contacts** — CRUD with search, pagination, and deal associations
- **Activities** — Activity feed with infinite scroll, filtering by type
- **Dashboard** — Pipeline analytics, conversion funnel, team performance metrics
- **User Management** — Admin panel for role changes, activation/deactivation

## Getting Started

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The database is auto-created and seeded on first startup.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000` with API proxy to port 8000.

### Demo Accounts

| Email | Password | Role |
|---|---|---|
| admin@acme.com | admin123 | Admin |
| manager@acme.com | manager123 | Manager |
| rep1@acme.com | rep123 | Rep |
| rep2@acme.com | rep123 | Rep |
| inactive@acme.com | inactive123 | Rep (inactive) |
| admin@globex.com | admin123 | Admin (Org 2) |
| rep@globex.com | rep123 | Rep (Org 2) |

## API Endpoints

| Group | Prefix | Key Routes |
|---|---|---|
| Auth | `/api/users` | `POST /login`, `POST /register`, `GET /me` |
| Users | `/api/users` | `GET /`, `PUT /:id`, `DELETE /:id` |
| Deals | `/api/deals` | `GET /`, `POST /`, `PUT /:id`, `PUT /:id/move`, `DELETE /:id` |
| Contacts | `/api/contacts` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| Activities | `/api/activities` | `GET /`, `POST /`, `GET /feed`, `DELETE /:id` |
| Dashboard | `/api/dashboard` | `GET /summary`, `GET /pipeline`, `GET /performance`, `GET /conversion` |
