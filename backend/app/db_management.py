import sys
import logging
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import create_engine, text, Column, String, Text
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from .models import Base, User
from .db import DATABASE_URL, engine
import argparse
import os

# Configure logging
logger = logging.getLogger(__name__)

# Get the database URL from environment variable or use default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///data/app.db")

def reset_database():
    """Reset the database by dropping all tables and recreating them."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Create a connection
        with engine.connect() as connection:
            # Drop all tables
            connection.execute(text("DROP TABLE IF EXISTS ratings"))
            connection.execute(text("DROP TABLE IF EXISTS trade_history"))
            connection.execute(text("DROP TABLE IF EXISTS trades"))
            connection.execute(text("DROP TABLE IF EXISTS chats"))
            connection.execute(text("DROP TABLE IF EXISTS matches"))
            connection.execute(text("DROP TABLE IF EXISTS user_skills"))
            connection.execute(text("DROP TABLE IF EXISTS fraud_flags"))
            connection.execute(text("DROP TABLE IF EXISTS banned_users"))
            connection.execute(text("DROP TABLE IF EXISTS skills"))
            connection.execute(text("DROP TABLE IF EXISTS users"))
            connection.execute(text("DROP TABLE IF EXISTS _yoyo_log"))
            connection.execute(text("DROP TABLE IF EXISTS _yoyo_migration"))
            connection.execute(text("DROP TABLE IF EXISTS yoyo_lock"))
            
            connection.commit()
            logger.info("Successfully dropped all tables")
            return True
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        return False

def cleanup_database():
    """Clean up chat messages and inactive trades."""
    try:
        from app.db import SessionLocal
        from app.models import Chat, Trade, Match
        
        db = SessionLocal()
        try:
            # Delete old messages (older than 30 days)
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            deleted_messages = db.query(Chat).filter(Chat.timestamp < cutoff_date).delete()
            logger.info(f"Deleted {deleted_messages} old chat messages")
            
            # Delete inactive trades (no activity for 7 days)
            cutoff_date = datetime.utcnow() - timedelta(days=7)
            inactive_trades = db.query(Trade).filter(
                Trade.status == "active",
                Trade.updated_at < cutoff_date
            ).all()
            
            for trade in inactive_trades:
                # Update associated match status
                match = db.query(Match).filter(Match.match_id == trade.match_id).first()
                if match:
                    match.match_status = "expired"
                trade.status = "expired"
            
            logger.info(f"Marked {len(inactive_trades)} inactive trades as expired")
            
            db.commit()
            logger.info("Database cleanup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
            db.rollback()
            return False
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Failed to initialize database session: {e}")
        return False

def add_profile_fields():
    """Add profile fields to the users table if they don't exist."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        # Create a connection
        with engine.connect() as connection:
            # Check if columns exist
            result = connection.execute(text("PRAGMA table_info(users)"))
            columns = {row[1] for row in result.fetchall()}
            
            # Add columns if they don't exist
            if 'photo' not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN photo TEXT"))
                logger.info("Added photo column")
            
            if 'location' not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN location TEXT"))
                logger.info("Added location column")
            
            if 'bio' not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
                logger.info("Added bio column")
            
            connection.commit()
            logger.info("Successfully added profile fields")
            return True
    except Exception as e:
        logger.error(f"Error adding profile fields: {str(e)}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database management utility")
    parser.add_argument("action", choices=["add_profile_fields", "reset_database", "cleanup"], help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "add_profile_fields":
        logger.info("Starting profile fields addition...")
        success = add_profile_fields()
        if success:
            logger.info("Successfully added profile fields")
        else:
            logger.error("Failed to add profile fields")
            exit(1)
    elif args.action == "reset_database":
        logger.info("Starting database reset...")
        success = reset_database()
        if success:
            logger.info("Successfully reset database")
        else:
            logger.error("Failed to reset database")
            exit(1)
    elif args.action == "cleanup":
        logger.info("Starting database cleanup...")
        success = cleanup_database()
    else:
        logger.error("Invalid action specified")
        success = False
    
    sys.exit(0 if success else 1) 