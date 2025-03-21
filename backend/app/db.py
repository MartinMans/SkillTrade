import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from sqlalchemy.ext.declarative import declarative_base

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
DATABASE_URL = os.getenv("DATABASE_URL", default_db_url)

if not DATABASE_URL:
    raise Exception("❌ DATABASE_URL environment variable is not set!")

try:
    # Handle special case for PostgreSQL URLs from Railway
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Create engine with echo=True for SQL logging
    engine = create_engine(DATABASE_URL, echo=True)
    
    # Test the connection
    with engine.connect() as conn:
        print(f"✅ Successfully connected to database")
except Exception as e:
    print(f"❌ Database connection failed: {str(e)}")
    raise e

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
