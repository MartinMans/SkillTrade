import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the backend directory path (one level up from this file)
BACKEND_DIR = Path(__file__).parent.parent

# Ensure data directory exists
DATA_DIR = BACKEND_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

# Get database URL from environment variable, with SQLite as default
default_db_path = DATA_DIR / "app.db"
default_db_url = f"sqlite:///{default_db_path}"
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)

# Create engine with proper configuration for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # These arguments are needed for SQLite to work properly with SQLAlchemy
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
