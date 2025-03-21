from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Chat, Trade

# Create database engine
DATABASE_URL = "postgresql://postgres:postgres@localhost/skilltrade"
engine = create_engine(DATABASE_URL)

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    # Delete all messages
    db.query(Chat).delete()
    
    # Delete all trades
    db.query(Trade).delete()
    
    # Commit the changes
    db.commit()
    print("Successfully cleaned up chat and trade tables!")

except Exception as e:
    print(f"An error occurred: {e}")
    db.rollback()

finally:
    db.close() 