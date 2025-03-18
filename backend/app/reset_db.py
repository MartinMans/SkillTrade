from sqlalchemy import text
from .db import engine
from .models import Base

def reset_database():
    """Reset the database by dropping all tables and recreating them."""
    # Drop all tables with CASCADE to handle foreign key constraints
    with engine.connect() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
        connection.commit()
    
    # Recreate all tables
    Base.metadata.create_all(bind=engine)
    print("Database has been reset successfully!")

if __name__ == "__main__":
    reset_database() 