from sqlalchemy import text
from .db import engine

def reset_trades():
    """Reset only trades, trade history, matches, ratings, and chats."""
    try:
        with engine.connect() as connection:
            print("Connected to database, starting reset...")
            # Drop foreign key constraints first
            connection.execute(text("""
                ALTER TABLE IF EXISTS ratings 
                DROP CONSTRAINT IF EXISTS ratings_trade_id_fkey;
                
                ALTER TABLE IF EXISTS trade_history 
                DROP CONSTRAINT IF EXISTS trade_history_trade_id_fkey;
                
                ALTER TABLE IF EXISTS trade_history 
                DROP CONSTRAINT IF EXISTS trade_history_user_id_fkey;
                
                ALTER TABLE IF EXISTS trade_history 
                DROP CONSTRAINT IF EXISTS trade_history_user1_id_fkey;
                
                ALTER TABLE IF EXISTS trade_history 
                DROP CONSTRAINT IF EXISTS trade_history_user2_id_fkey;
                
                ALTER TABLE IF EXISTS trades 
                DROP CONSTRAINT IF EXISTS trades_match_id_fkey;
                
                ALTER TABLE IF EXISTS chats 
                DROP CONSTRAINT IF EXISTS chats_match_id_fkey;
                
                ALTER TABLE IF EXISTS chats 
                DROP CONSTRAINT IF EXISTS chats_sender_id_fkey;
                
                ALTER TABLE IF EXISTS matches 
                DROP CONSTRAINT IF EXISTS matches_user1_id_fkey;
                
                ALTER TABLE IF EXISTS matches 
                DROP CONSTRAINT IF EXISTS matches_user2_id_fkey;
            """))
            print("Dropped foreign key constraints...")
            
            # Clear the tables
            connection.execute(text("""
                TRUNCATE TABLE ratings CASCADE;
                TRUNCATE TABLE trade_history CASCADE;
                TRUNCATE TABLE trades CASCADE;
                TRUNCATE TABLE chats CASCADE;
                TRUNCATE TABLE matches CASCADE;
            """))
            print("Cleared tables...")
            
            # Recreate foreign key constraints
            connection.execute(text("""
                ALTER TABLE ratings 
                ADD CONSTRAINT ratings_trade_id_fkey 
                FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
                
                ALTER TABLE trade_history 
                ADD CONSTRAINT trade_history_trade_id_fkey 
                FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
                
                ALTER TABLE trade_history 
                ADD CONSTRAINT trade_history_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(user_id);
                
                ALTER TABLE trade_history 
                ADD CONSTRAINT trade_history_user1_id_fkey 
                FOREIGN KEY (user1_id) REFERENCES users(user_id);
                
                ALTER TABLE trade_history 
                ADD CONSTRAINT trade_history_user2_id_fkey 
                FOREIGN KEY (user2_id) REFERENCES users(user_id);
                
                ALTER TABLE trades 
                ADD CONSTRAINT trades_match_id_fkey 
                FOREIGN KEY (match_id) REFERENCES matches(match_id);
                
                ALTER TABLE chats 
                ADD CONSTRAINT chats_match_id_fkey 
                FOREIGN KEY (match_id) REFERENCES matches(match_id);
                
                ALTER TABLE chats 
                ADD CONSTRAINT chats_sender_id_fkey 
                FOREIGN KEY (sender_id) REFERENCES users(user_id);
                
                ALTER TABLE matches 
                ADD CONSTRAINT matches_user1_id_fkey 
                FOREIGN KEY (user1_id) REFERENCES users(user_id);
                
                ALTER TABLE matches 
                ADD CONSTRAINT matches_user2_id_fkey 
                FOREIGN KEY (user2_id) REFERENCES users(user_id);
            """))
            print("Recreated foreign key constraints...")
            
            connection.commit()
            print("Successfully reset trades, trade history, matches, ratings, and chats!")
    except Exception as e:
        print(f"Error during reset: {str(e)}")
        raise e

if __name__ == "__main__":
    reset_trades() 