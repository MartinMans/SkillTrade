import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(backend_dir))

from sqlalchemy import text
from app.db import engine

def add_initiator_id_column():
    """Add initiator_id column to matches table."""
    try:
        with engine.connect() as connection:
            # First, check if the column already exists
            connection.execute(text("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 
                        FROM information_schema.columns 
                        WHERE table_name = 'matches' 
                        AND column_name = 'initiator_id'
                    ) THEN
                        ALTER TABLE matches 
                        ADD COLUMN initiator_id INTEGER;
                        
                        ALTER TABLE matches 
                        ADD CONSTRAINT matches_initiator_id_fkey 
                        FOREIGN KEY (initiator_id) 
                        REFERENCES users(user_id);
                    END IF;
                END
                $$;
            """))
            
            connection.commit()
            print("Successfully added initiator_id column to matches table!")
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise

if __name__ == "__main__":
    add_initiator_id_column() 