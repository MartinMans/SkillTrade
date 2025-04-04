import sys
import logging
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Configure logging
logger = logging.getLogger(__name__)

def reset_database():
    """Reset the database by dropping all tables and recreating them."""
    try:
        # Import here to avoid circular imports
        from app.db import engine
        from app.models import Base
        
        logger.info("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        
        logger.info("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        
        logger.info("Database reset complete!")
        return True
        
    except SQLAlchemyError as e:
        logger.error(f"Database error occurred: {e}")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")
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

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Database management utilities")
    parser.add_argument("action", choices=["reset", "cleanup"], help="Action to perform")
    
    args = parser.parse_args()
    
    if args.action == "reset":
        logger.info("Starting database reset...")
        success = reset_database()
    else:
        logger.info("Starting database cleanup...")
        success = cleanup_database()
    
    sys.exit(0 if success else 1) 