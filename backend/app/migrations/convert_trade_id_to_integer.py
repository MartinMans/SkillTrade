from sqlalchemy import text
from ..db import engine

def convert_trade_id_to_integer():
    """Convert trade_id columns from VARCHAR to INTEGER."""
    with engine.connect() as connection:
        # First, drop foreign key constraints
        connection.execute(text("""
            ALTER TABLE IF EXISTS chats 
            DROP CONSTRAINT IF EXISTS chats_trade_id_fkey;
            
            ALTER TABLE IF EXISTS ratings 
            DROP CONSTRAINT IF EXISTS ratings_trade_id_fkey;
            
            ALTER TABLE IF EXISTS trade_history 
            DROP CONSTRAINT IF EXISTS trade_history_trade_id_fkey;
        """))
        
        # Convert trade_id in trades table to INTEGER first
        connection.execute(text("""
            ALTER TABLE trades 
            ALTER COLUMN trade_id TYPE INTEGER 
            USING trade_id::INTEGER
        """))
        
        # Ensure all trade_ids in related tables are valid integers
        connection.execute(text("""
            DELETE FROM chats 
            WHERE trade_id !~ '^[0-9]+$';
            
            DELETE FROM ratings 
            WHERE trade_id !~ '^[0-9]+$';
            
            DELETE FROM trade_history 
            WHERE trade_id !~ '^[0-9]+$';
        """))
        
        # Convert trade_id in related tables to INTEGER
        connection.execute(text("""
            ALTER TABLE chats 
            ALTER COLUMN trade_id TYPE INTEGER 
            USING trade_id::INTEGER;
            
            ALTER TABLE ratings 
            ALTER COLUMN trade_id TYPE INTEGER 
            USING trade_id::INTEGER;
            
            ALTER TABLE trade_history 
            ALTER COLUMN trade_id TYPE INTEGER 
            USING trade_id::INTEGER;
        """))
        
        # Recreate foreign key constraints
        connection.execute(text("""
            ALTER TABLE chats 
            ADD CONSTRAINT chats_trade_id_fkey 
            FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
            
            ALTER TABLE ratings 
            ADD CONSTRAINT ratings_trade_id_fkey 
            FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
            
            ALTER TABLE trade_history 
            ADD CONSTRAINT trade_history_trade_id_fkey 
            FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
        """))
        
        connection.commit()
        print("Successfully converted trade_id columns to INTEGER type!")

if __name__ == "__main__":
    convert_trade_id_to_integer() 