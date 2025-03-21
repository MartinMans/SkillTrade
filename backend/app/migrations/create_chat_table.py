from sqlalchemy import create_engine, text
from ..db import SQLALCHEMY_DATABASE_URL

def create_chat_table():
    """Create the chat table if it doesn't exist."""
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as connection:
        with connection.begin():
            # Check if the table exists
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS chats (
                    chat_id SERIAL PRIMARY KEY,
                    match_id INTEGER NOT NULL REFERENCES matches(match_id),
                    sender_id INTEGER NOT NULL REFERENCES users(user_id),
                    message TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
                );
            """))
            
            # Create indexes
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chats_match_id ON chats(match_id);
                CREATE INDEX IF NOT EXISTS idx_chats_sender_id ON chats(sender_id);
                CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp);
            """))
            
            print("Successfully created chat table and indexes")

if __name__ == "__main__":
    create_chat_table() 