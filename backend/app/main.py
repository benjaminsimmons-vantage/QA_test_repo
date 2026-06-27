from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import users, deals, contacts, activities, dashboard
from app.seed import seed_database


@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield


app = FastAPI(title="DealFlow CRM", version="1.0.0", lifespan=lifespan)

# BUG: CORS allows all origins with credentials — security misconfiguration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(deals.router)
app.include_router(contacts.router)
app.include_router(activities.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
