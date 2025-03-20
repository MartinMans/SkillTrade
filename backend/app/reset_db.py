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
    
    # Verify column types and constraints
    with engine.connect() as connection:
        # Check trades table
        result = connection.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trades' AND column_name = 'trade_id'
        """))
        trade_id_type = result.scalar()
        print(f"trades.trade_id type: {trade_id_type}")
        
        # Check chats table
        result = connection.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chats' AND column_name = 'trade_id'
        """))
        chat_trade_id_type = result.scalar()
        print(f"chats.trade_id type: {chat_trade_id_type}")
        
        # Verify foreign key constraints
        result = connection.execute(text("""
            SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name,
                   ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name IN ('chats', 'ratings', 'trade_history')
        """))
        constraints = result.fetchall()
        print("\nForeign Key Constraints:")
        for constraint in constraints:
            print(f"{constraint[0]}.{constraint[1]} -> {constraint[2]}.{constraint[3]}")
        
        connection.commit()
    
    print("\nDatabase has been reset successfully!")

if __name__ == "__main__":
    reset_database() 