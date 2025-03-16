from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Replace the placeholder values with your actual Neon PostgreSQL connection details.
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_DNWck1BXySh8@ep-small-butterfly-a8s0ryo1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
