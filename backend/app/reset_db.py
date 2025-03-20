import sys
from sqlalchemy.exc import SQLAlchemyError

def reset_database():
    """Reset the database by dropping all tables and recreating them."""
    try:
        # Import here to avoid circular imports
        from app.db import engine
        from app.models import Base
        
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        print("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        print("Database reset complete!")
        return True
        
    except SQLAlchemyError as e:
        print(f"Database error occurred: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return False

if __name__ == "__main__":
    print("Starting database reset...")
    success = reset_database()
    sys.exit(0 if success else 1) 