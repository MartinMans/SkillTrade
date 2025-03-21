from sqlalchemy import create_engine, text
from ..db import SQLALCHEMY_DATABASE_URL

def convert_match_status_to_string():
    """Convert match_status column from enum to varchar."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        with connection.begin():
            # First, create a temporary column
            connection.execute(text("""
                ALTER TABLE matches 
                ADD COLUMN match_status_new VARCHAR;
            """))
            
            # Copy data to the new column, converting to lowercase
            connection.execute(text("""
                UPDATE matches 
                SET match_status_new = LOWER(match_status::text);
            """))
            
            # Drop the old column
            connection.execute(text("""
                ALTER TABLE matches 
                DROP COLUMN match_status;
            """))
            
            # Rename the new column
            connection.execute(text("""
                ALTER TABLE matches 
                RENAME COLUMN match_status_new TO match_status;
            """))
            
            # Set the default value
            connection.execute(text("""
                ALTER TABLE matches 
                ALTER COLUMN match_status SET DEFAULT 'pending';
            """))
            
            # Drop the enum type if it exists
            connection.execute(text("""
                DROP TYPE IF EXISTS matchstatus;
            """))
            
            print("Successfully converted match_status column to varchar")

if __name__ == "__main__":
    convert_match_status_to_string() 