from sqlalchemy import create_engine, text
from ..db import SQLALCHEMY_DATABASE_URL

def fix_match_status():
    """Fix match_status enum in the database."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        with connection.begin():
            # First, create a temporary column as varchar
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
            
            # Drop the existing enum type
            connection.execute(text("""
                DROP TYPE IF EXISTS matchstatus CASCADE;
            """))
            
            # Create the new enum type with correct values
            connection.execute(text("""
                CREATE TYPE matchstatus AS ENUM (
                    'pending',
                    'accepted',
                    'rejected',
                    'pending_trade',
                    'in_trade',
                    'completed'
                );
            """))
            
            # Add the new column with the enum type
            connection.execute(text("""
                ALTER TABLE matches 
                ADD COLUMN match_status matchstatus DEFAULT 'pending';
            """))
            
            # Copy data from temporary column to new enum column
            connection.execute(text("""
                UPDATE matches 
                SET match_status = match_status_new::matchstatus;
            """))
            
            # Drop the temporary column
            connection.execute(text("""
                ALTER TABLE matches 
                DROP COLUMN match_status_new;
            """))
            
            print("Successfully fixed match_status enum")

if __name__ == "__main__":
    fix_match_status() 