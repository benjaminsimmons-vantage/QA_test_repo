from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# BUG: SQLite with check_same_thread=False can cause issues under concurrent access
# but no WAL mode enabled, leading to "database is locked" under load
DATABASE_URL = "sqlite:///./dealflow.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
