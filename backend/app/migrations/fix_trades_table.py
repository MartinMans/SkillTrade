import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from app.db import SQLALCHEMY_DATABASE_URL

# Create engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def fix_trades_table():
    """Fix trades table structure in the database."""
    try:
        with engine.connect() as connection:
            with connection.begin():
                # Drop existing trades table if it exists
                connection.execute(text("""
                    DROP TABLE IF EXISTS trades CASCADE;
                    DROP TABLE IF EXISTS trade_history CASCADE;
                """))
                
                # Create trades table with all required columns
                connection.execute(text("""
                    CREATE TABLE trades (
                        trade_id SERIAL PRIMARY KEY,
                        match_id INTEGER NOT NULL REFERENCES matches(match_id),
                        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        completed_at TIMESTAMP WITHOUT TIME ZONE,
                        status VARCHAR NOT NULL DEFAULT 'active',
                        user1_skill VARCHAR NOT NULL,
                        user2_skill VARCHAR NOT NULL,
                        user1_teaching_done BOOLEAN NOT NULL DEFAULT FALSE,
                        user1_learning_done BOOLEAN NOT NULL DEFAULT FALSE,
                        user2_teaching_done BOOLEAN NOT NULL DEFAULT FALSE,
                        user2_learning_done BOOLEAN NOT NULL DEFAULT FALSE
                    );
                """))

                # Create trade_history table with all required columns
                connection.execute(text("""
                    CREATE TABLE trade_history (
                        history_id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(user_id),
                        trade_id INTEGER NOT NULL REFERENCES trades(trade_id),
                        completed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                        user1_id INTEGER NOT NULL REFERENCES users(user_id),
                        user2_id INTEGER NOT NULL REFERENCES users(user_id),
                        user1_taught VARCHAR NOT NULL,
                        user2_taught VARCHAR NOT NULL
                    );
                """))

                # Create indexes
                connection.execute(text("""
                    CREATE INDEX ix_trades_trade_id ON trades (trade_id);
                    CREATE INDEX ix_trades_match_id ON trades (match_id);
                    CREATE INDEX ix_trade_history_history_id ON trade_history (history_id);
                    CREATE INDEX ix_trade_history_trade_id ON trade_history (trade_id);
                    CREATE INDEX ix_trade_history_user_id ON trade_history (user_id);
                """))
                
                print("Successfully fixed trades and trade_history table structure")
    except Exception as e:
        print(f"Error fixing tables: {str(e)}")
        raise

if __name__ == "__main__":
    fix_trades_table() 