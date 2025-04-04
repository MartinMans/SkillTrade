from sqlalchemy import text
from .db import engine

def reset_all_tables():
    """Reset all tables in the database."""
    try:
        with engine.connect() as connection:
            print("Connected to database, starting full reset...")
            # Drop all foreign key constraints first
            connection.execute(text("""
                ALTER TABLE IF EXISTS ratings 
                DROP CONSTRAINT IF EXISTS ratings_trade_id_fkey;
                
                ALTER TABLE IF EXISTS ratings 
                DROP CONSTRAINT IF EXISTS ratings_reviewer_id_fkey;
                
                ALTER TABLE IF EXISTS ratings 
                DROP CONSTRAINT IF EXISTS ratings_rated_user_id_fkey;
                
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
                
                ALTER TABLE IF EXISTS matches 
                DROP CONSTRAINT IF EXISTS matches_initiator_id_fkey;
                
                ALTER TABLE IF EXISTS user_skills 
                DROP CONSTRAINT IF EXISTS user_skills_user_id_fkey;
                
                ALTER TABLE IF EXISTS user_skills 
                DROP CONSTRAINT IF EXISTS user_skills_skill_id_fkey;
                
                ALTER TABLE IF EXISTS fraud_flags 
                DROP CONSTRAINT IF EXISTS fraud_flags_user_id_fkey;
                
                ALTER TABLE IF EXISTS fraud_flags 
                DROP CONSTRAINT IF EXISTS fraud_flags_trade_id_fkey;
                
                ALTER TABLE IF EXISTS banned_users 
                DROP CONSTRAINT IF EXISTS banned_users_banned_by_fkey;
            """))
            print("Dropped all foreign key constraints...")
            
            # Clear all tables
            connection.execute(text("""
                TRUNCATE TABLE ratings CASCADE;
                TRUNCATE TABLE trade_history CASCADE;
                TRUNCATE TABLE trades CASCADE;
                TRUNCATE TABLE chats CASCADE;
                TRUNCATE TABLE matches CASCADE;
                TRUNCATE TABLE user_skills CASCADE;
                TRUNCATE TABLE fraud_flags CASCADE;
                TRUNCATE TABLE banned_users CASCADE;
                TRUNCATE TABLE skills CASCADE;
                TRUNCATE TABLE users CASCADE;
            """))
            print("Cleared all tables...")
            
            # Recreate all foreign key constraints
            connection.execute(text("""
                ALTER TABLE ratings 
                ADD CONSTRAINT ratings_trade_id_fkey 
                FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
                
                ALTER TABLE ratings 
                ADD CONSTRAINT ratings_reviewer_id_fkey 
                FOREIGN KEY (reviewer_id) REFERENCES users(user_id);
                
                ALTER TABLE ratings 
                ADD CONSTRAINT ratings_rated_user_id_fkey 
                FOREIGN KEY (rated_user_id) REFERENCES users(user_id);
                
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
                
                ALTER TABLE matches 
                ADD CONSTRAINT matches_initiator_id_fkey 
                FOREIGN KEY (initiator_id) REFERENCES users(user_id);
                
                ALTER TABLE user_skills 
                ADD CONSTRAINT user_skills_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(user_id);
                
                ALTER TABLE user_skills 
                ADD CONSTRAINT user_skills_skill_id_fkey 
                FOREIGN KEY (skill_id) REFERENCES skills(skill_id);
                
                ALTER TABLE fraud_flags 
                ADD CONSTRAINT fraud_flags_user_id_fkey 
                FOREIGN KEY (user_id) REFERENCES users(user_id);
                
                ALTER TABLE fraud_flags 
                ADD CONSTRAINT fraud_flags_trade_id_fkey 
                FOREIGN KEY (trade_id) REFERENCES trades(trade_id);
                
                ALTER TABLE banned_users 
                ADD CONSTRAINT banned_users_banned_by_fkey 
                FOREIGN KEY (banned_by) REFERENCES users(user_id);
            """))
            print("Recreated all foreign key constraints...")
            
            connection.commit()
            print("Successfully reset all tables!")
    except Exception as e:
        print(f"Error during reset: {str(e)}")
        raise e

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
    reset_all_tables()  # Change this to reset_trades() if you only want to reset trade-related tables 