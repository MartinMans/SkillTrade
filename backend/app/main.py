# pip install -r requirements.txt
# .\venv\Scripts\activate
# $env:DEVELOPMENT_MODE = "true"
# uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs

# Deployment configuration for Railway
# Environment variables are managed through Railway dashboard

import logging
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import timedelta, datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, and_
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv
import os

from . import models, schemas, crud
from .db import SessionLocal, engine
from .auth import create_access_token, pwd_context, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from .reset_trades import reset_trades, reset_all_tables

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# Disable SQLAlchemy logging completely
logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)

# Default to .env.production if no override
env_file = os.getenv("ENV_FILE", ".env.production")
load_dotenv(env_file)

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
API_V1_STR = os.getenv("API_V1_STR", "/api/v1")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")

app = FastAPI(
    title="SkillTrade API",
    description="API for the SkillTrade application",
    version="1.0.0",
    root_path=API_V1_STR
)

# Configure CORS with more specific settings
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # React dev server
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://skill-trade-steel.vercel.app",  # Production frontend
]

def get_allowed_origins():
    allowed_origins = origins.copy()
    # Allow all Vercel preview URLs for your project
    if os.getenv('ALLOW_VERCEL_PREVIEWS', 'true').lower() == 'true':
        allowed_origins.append("https://skill-trade-steel.vercel.app")  # Production
        # Add pattern matching for Vercel preview URLs
        from fastapi.middleware.cors import CORSMiddleware
        class VercelURLPattern:
            def __eq__(self, other):
                return isinstance(other, str) and (
                    other.startswith("https://skill-trade-") and 
                    other.endswith(".vercel.app")
                )
        allowed_origins.append(VercelURLPattern())
    return allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create the database tables (for development)
models.Base.metadata.create_all(bind=engine)

# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

# Dependency to provide a database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper function to resolve user_id
async def resolve_user_id(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> int:
    if user_id == "me":
        return current_user.user_id
    try:
        return int(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

@app.get("/")
def read_root():
    return {"message": "Hello SkillTrade!"}

# Endpoint to create a new user
@app.post("/users/", response_model=schemas.UserOut, tags=["Users"])
def create_new_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email is banned
    banned_user = db.query(models.BannedUser).filter(models.BannedUser.email == user.email).first()
    if banned_user:
        raise HTTPException(
            status_code=403,
            detail="This email address has been banned from the platform"
        )
    
    return crud.create_user(db, user)

# GET endpoint to retrieve a user by their ID
@app.get("/users/{user_id}", response_model=schemas.UserOut, tags=["Users"])
async def read_user(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    resolved_user_id = await resolve_user_id(user_id, current_user, db)
    user = db.query(models.User).filter(models.User.user_id == resolved_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Login endpoint using OAuth2PasswordRequestForm for clarity
@app.post(
    "/login",
    response_model=schemas.Token,
    tags=["Authentication"],
    summary="Log in and retrieve a JWT token"
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Here, form_data.username is assumed to be the user's email.
    user = crud.get_user_by_email(db, email=form_data.username)
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Skill endpoints
@app.post("/skills/", response_model=schemas.SkillOut, tags=["Skills"])
def create_skill(skill: schemas.SkillCreate, db: Session = Depends(get_db)):
    db_skill = crud.get_skill_by_name(db, skill_name=skill.skill_name)
    if db_skill:
        raise HTTPException(status_code=400, detail="Skill already exists")
    return crud.create_skill(db, skill)

@app.get("/skills/", response_model=List[schemas.SkillOut], tags=["Skills"])
def read_skills(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    skills = crud.get_all_skills(db, skip=skip, limit=limit)
    return skills

@app.get("/skills/search/", response_model=List[schemas.SkillOut], tags=["Skills"])
def search_skills_endpoint(query: str, limit: int = 10, db: Session = Depends(get_db)):
    """Search for skills by name."""
    return crud.search_skills(db, query=query, limit=limit)

@app.post("/skills/get-or-create/", response_model=schemas.SkillOut, tags=["Skills"])
def get_or_create_skill_endpoint(skill: schemas.SkillCreate, db: Session = Depends(get_db)):
    """Get an existing skill or create a new one."""
    skill, is_new = crud.get_or_create_skill(db, skill_name=skill.skill_name)
    return skill

# User Skills endpoints
@app.get("/users/{user_id}/skills/", response_model=schemas.UserSkillsResponse, tags=["User Skills"])
async def read_user_skills(user_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    resolved_user_id = await resolve_user_id(user_id, current_user, db)
    teaching_skills, learning_skills = crud.get_user_skills(db, resolved_user_id)
    return {
        "teaching": teaching_skills,
        "learning": learning_skills
    }

@app.post("/users/{user_id}/skills/", response_model=schemas.UserSkillOut, tags=["User Skills"])
async def add_user_skill(
    user_id: str,
    user_skill: schemas.UserSkillCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resolved_user_id = await resolve_user_id(user_id, current_user, db)
    # Verify the user is modifying their own skills
    if current_user.user_id != resolved_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify other user's skills")
    
    # Check if skill exists
    skill = crud.get_skill_by_id(db, skill_id=user_skill.skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    # Check if user already has this skill
    existing_user_skill = crud.get_user_skill(db, user_id=resolved_user_id, skill_id=user_skill.skill_id)
    if existing_user_skill:
        raise HTTPException(status_code=400, detail="User already has this skill")
    
    return crud.add_user_skill(db, user_id=resolved_user_id, skill_id=user_skill.skill_id, skill_type=user_skill.type)

@app.delete("/users/{user_id}/skills/{skill_id}", tags=["User Skills"])
async def remove_user_skill(
    user_id: str,
    skill_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resolved_user_id = await resolve_user_id(user_id, current_user, db)
    # Verify the user is modifying their own skills
    if current_user.user_id != resolved_user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify other user's skills")
    
    success = crud.remove_user_skill(db, user_id=resolved_user_id, skill_id=skill_id)
    if not success:
        raise HTTPException(status_code=404, detail="User skill not found")
    return {"message": "Skill removed successfully"}

@app.get("/users/me", response_model=schemas.UserOut, tags=["Users"])
async def read_current_user(current_user: models.User = Depends(get_current_user)):
    """Get the current user's profile."""
    return current_user

@app.put("/users/me/profile", response_model=schemas.UserOut, tags=["Users"])
async def update_current_user_profile(
    profile_data: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current user's profile information."""
    try:
        updated_user = crud.update_user_profile(db, current_user.user_id, profile_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        return updated_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/matches/", response_model=List[schemas.MatchResult], tags=["Matching"])
async def get_matches(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all potential skill matches for the current user."""
    try:
        # First, find and create potential matches based on complementary skills
        potential_matches = crud.find_potential_matches(db, current_user.user_id)
        
        # Then get all matches for the current user
        matches = db.query(models.Match).filter(
            or_(
                models.Match.user1_id == current_user.user_id,
                models.Match.user2_id == current_user.user_id
            )
        ).all()

        # Get completed or reported trades
        completed_trades = db.query(models.Trade).filter(
            models.Trade.status.in_(['completed', 'reported'])
        ).all()

        # Create a set of match_ids that have completed or reported trades
        completed_match_ids = {trade.match_id for trade in completed_trades}

        # Filter out matches that have completed or reported trades
        active_matches = [
            match for match in matches 
            if match.match_id not in completed_match_ids 
            and match.match_status not in ["completed", "reported"]
        ]

        # Format matches for response
        formatted_matches = []
        for match in active_matches:
            # Determine if current user is user1 or user2
            is_user1 = match.user1_id == current_user.user_id
            other_user_id = match.user2_id if is_user1 else match.user1_id
            
            # Get the other user's profile
            other_user = db.query(models.User).filter(models.User.user_id == other_user_id).first()
            if not other_user:
                continue

            # Get the other user's skills
            other_user_teaching_skills, other_user_learning_skills = crud.get_user_skills(db, other_user_id)

            formatted_matches.append({
                "match_id": match.match_id,
                "user_id": other_user.user_id,
                "username": other_user.username,
                "photo": other_user.photo,
                "location": other_user.location,
                "bio": other_user.bio,
                "teaching": [skill.skill_name for skill in other_user_teaching_skills],
                "learning": [skill.skill_name for skill in other_user_learning_skills],
                "rating": other_user.rating,
                "match_status": match.match_status,
                "trade_request_time": match.trade_request_time,
                "initiator_id": match.initiator_id
            })

        return formatted_matches
    except Exception as e:
        logger.error(f"Error getting matches: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get matches")

@app.get("/matches/active", response_model=List[schemas.MatchWithMessages], tags=["Matching"])
async def get_active_matches(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all active matches for the current user."""
    matches = db.query(models.Match).filter(
        or_(
            models.Match.user1_id == current_user.user_id,
            models.Match.user2_id == current_user.user_id
        )
    ).all()

    result = []
    for match in matches:
        # Get the other user in the match
        other_user = match.user2 if match.user1_id == current_user.user_id else match.user1
        
        # Get the last message in the match
        last_message = db.query(models.Chat).filter(
            models.Chat.match_id == match.match_id
        ).order_by(models.Chat.timestamp.desc()).first()

        result.append({
            "match_id": match.match_id,
            "match_status": match.match_status,
            "created_at": match.created_at,
            "other_user": {
                "user_id": other_user.user_id,
                "username": other_user.username
            },
            "last_message": {
                "message": last_message.message,
                "timestamp": last_message.timestamp,
                "sender_id": last_message.sender_id
            } if last_message else None
        })

    return result

@app.post("/matches/{match_id}/start-chat", response_model=schemas.MatchResult, tags=["Matching"])
async def start_chat(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a chat for a match. This marks the match as having an active chat.
    """
    match = db.query(models.Match).filter(
        models.Match.match_id == match_id,
        or_(
            models.Match.user1_id == current_user.user_id,
            models.Match.user2_id == current_user.user_id
        )
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    match.has_chat = True
    db.commit()
    db.refresh(match)

    # Get the other user in the match
    other_user = match.user2 if match.user1_id == current_user.user_id else match.user1
    
    # Get other user's teaching and learning skills
    teaching_skills, learning_skills = crud.get_user_skills(db, other_user.user_id)
    
    return {
        "match_id": match.match_id,
        "user_id": other_user.user_id,
        "username": other_user.username,
        "teaching": [skill.skill_name for skill in teaching_skills],
        "learning": [skill.skill_name for skill in learning_skills],
        "rating": other_user.rating,
        "match_status": match.match_status
    }

@app.get("/matches/{match_id}/messages", response_model=List[schemas.ChatMessage], tags=["Matching"])
async def get_match_messages(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages for a match."""
    logger.info(f"Fetching messages for match {match_id}")
    
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        logger.warning(f"Match {match_id} not found")
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        logger.warning(f"User {current_user.user_id} not authorized to view messages for match {match_id}")
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")

    messages = db.query(models.Chat).filter(
        models.Chat.match_id == match_id
    ).order_by(models.Chat.timestamp.asc()).all()
    
    logger.info(f"Found {len(messages)} messages for match {match_id}")
    return messages

@app.post("/matches/{match_id}/messages", response_model=schemas.ChatMessage, tags=["Matching"])
async def create_message(
    match_id: int,
    message: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message in a match."""
    logger.info(f"Creating new message for match {match_id}")
    
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        logger.warning(f"Match {match_id} not found")
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        logger.warning(f"User {current_user.user_id} not authorized to send messages in match {match_id}")
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this match")

    db_message = models.Chat(
        match_id=match_id,
        sender_id=current_user.user_id,
        message=message.message
    )
    db.add(db_message)
    try:
        db.commit()
        db.refresh(db_message)
        logger.info(f"Successfully created message with ID {db_message.chat_id}")
        return db_message
    except Exception as e:
        logger.error(f"Error creating message: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/matches/{match_id}", tags=["Matching"])
async def delete_match(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a match and its associated messages."""
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this match")

    # Delete associated messages first
    db.query(models.Chat).filter(models.Chat.match_id == match_id).delete()
    
    # Delete the match
    db.delete(match)
    db.commit()
    
    return {"message": "Match deleted successfully"}

@app.delete("/matches/cleanup", tags=["Development"])
async def cleanup_matches(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Development endpoint to clean up all matches."""
    # Delete all chat messages first
    db.query(models.Chat).delete()
    # Then delete all matches
    db.query(models.Match).delete()
    db.commit()
    return {"message": "All matches and associated messages have been deleted"}

@app.post("/matches/{match_id}/start-trade", response_model=schemas.MatchResult, tags=["Matching"])
async def start_trade(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.info(f"Starting trade for match {match_id}")
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        # Verify user is part of the match
        if current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to start trade for this match")

        # Get the other user in the match
        other_user = match.user2 if match.user1_id == current_user.user_id else match.user1
        
        # Get both users' teaching and learning skills
        user1_teaching_skills, user1_learning_skills = crud.get_user_skills(db, match.user1_id)
        user2_teaching_skills, user2_learning_skills = crud.get_user_skills(db, match.user2_id)
        
        logger.info(f"User1 teaching skills: {[skill.skill_name for skill in user1_teaching_skills]}")
        logger.info(f"User2 teaching skills: {[skill.skill_name for skill in user2_teaching_skills]}")
        
        # Get the first teaching skill for each user
        user1_teaching = user1_teaching_skills[0].skill_name if user1_teaching_skills else ""
        user2_teaching = user2_teaching_skills[0].skill_name if user2_teaching_skills else ""
        
        logger.info(f"User1 teaching skill: {user1_teaching}")
        logger.info(f"User2 teaching skill: {user2_teaching}")

        # If there's a pending trade request that's over 24 hours old, clear it
        if (match.match_status == "pending_trade" and match.trade_request_time and 
            (datetime.utcnow() - match.trade_request_time).total_seconds() > 24 * 3600):
            match.match_status = "pending"
            match.trade_request_time = None
            match.initiator_id = None
            db.commit()

        logger.info(f"Current match status: {match.match_status}")

        # Handle initial trade request (from PENDING state)
        if match.match_status == "pending":
            logger.info("Handling initial trade request")
            match.match_status = "pending_trade"
            match.trade_request_time = datetime.utcnow()
            match.initiator_id = current_user.user_id
            db.commit()
            db.refresh(match)
            return {
                "match_id": match.match_id,
                "user_id": other_user.user_id,
                "username": other_user.username,
                "teaching": [skill.skill_name for skill in user2_teaching_skills],
                "learning": [skill.skill_name for skill in user2_learning_skills],
                "rating": other_user.rating,
                "match_status": match.match_status,
                "trade_request_time": match.trade_request_time,
                "initiator_id": match.initiator_id
            }

        # If user is canceling their trade request
        if match.match_status == "pending_trade":
            if current_user.user_id == match.initiator_id:
                logger.info("Canceling trade request")
                match.match_status = "pending"
                match.trade_request_time = None
                match.initiator_id = None
                db.commit()

        # Handle second user accepting trade
        if match.match_status == "pending_trade":
            # Check if this is the other user accepting
            if current_user.user_id != match.initiator_id:
                logger.info("Second user accepting trade")
                logger.info(f"Creating trade with user1_skill={user1_teaching}, user2_skill={user2_teaching}")
                # Create new trade with the skills being traded
                trade = models.Trade(
                    match_id=match.match_id,
                    status="active",
                    user1_skill=user1_teaching,
                    user2_skill=user2_teaching
                )
                db.add(trade)
                match.match_status = "in_trade"
                match.trade_request_time = None
                match.initiator_id = None
                try:
                    db.commit()
                    logger.info("Successfully created trade")
                except Exception as e:
                    logger.error(f"Error creating trade: {str(e)}")
                    db.rollback()
                    raise

        db.refresh(match)

        # Return the match result with updated status
        return {
            "match_id": match.match_id,
            "user_id": other_user.user_id,
            "username": other_user.username,
            "teaching": [skill.skill_name for skill in user2_teaching_skills],
            "learning": [skill.skill_name for skill in user2_learning_skills],
            "rating": other_user.rating,
            "match_status": match.match_status,
            "trade_request_time": match.trade_request_time,
            "initiator_id": match.initiator_id
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error in start_trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/matches/{match_id}/trade-status", tags=["Matching"])
async def get_trade_status(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current trade status for a match.
    Also checks for timeout of ready status.
    """
    match = db.query(models.Match).filter(
        models.Match.match_id == match_id,
        or_(
            models.Match.user1_id == current_user.user_id,
            models.Match.user2_id == current_user.user_id
        )
    ).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Check for timeout if status is ready
    if match.match_status == models.MatchStatus.READY and match.ready_at:
        if datetime.utcnow() - match.ready_at > timedelta(hours=24):
            match.match_status = models.MatchStatus.ACCEPTED
            match.ready_at = None
            db.commit()
            db.refresh(match)

    return {
        "match_status": match.match_status,
        "ready_at": match.ready_at,
        "trade": match.trade.status if match.trade else None
    }

@app.get("/trades/{match_id}/status", response_model=schemas.TradeStatus, tags=["Trading"])
async def get_trade_status(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current status of a trade, including completion status for both users."""
    try:
        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        logger.info(f"Trade object: user1_skill={trade.user1_skill}, user2_skill={trade.user2_skill}")
        
        # Get the match to verify user is part of it
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match or current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to view this trade")

        return {
            "user1_teaching_done": trade.user1_teaching_done,
            "user1_learning_done": trade.user1_learning_done,
            "user2_teaching_done": trade.user2_teaching_done,
            "user2_learning_done": trade.user2_learning_done,
            "user1_skill": trade.user1_skill,
            "user2_skill": trade.user2_skill,
            "status": trade.status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trades/{match_id}/update", response_model=schemas.TradeStatus, tags=["Trading"])
async def update_trade_status(
    match_id: int,
    update: schemas.TradeUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the completion status of teaching or learning for a user in a trade."""
    try:
        logger.info(f"Updating trade status for match {match_id}")
        logger.info(f"Update data: {update}")
        
        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            logger.warning(f"Trade not found for match {match_id}")
            raise HTTPException(status_code=404, detail="Trade not found")

        # Get the match to verify user is part of it
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match:
            logger.warning(f"Match not found: {match_id}")
            raise HTTPException(status_code=404, detail="Match not found")
            
        if current_user.user_id not in [match.user1_id, match.user2_id]:
            logger.warning(f"User {current_user.user_id} not authorized for match {match_id}")
            raise HTTPException(status_code=403, detail="Not authorized to update this trade")

        logger.info(f"Current user: {current_user.user_id}")
        logger.info(f"Match user1: {match.user1_id}, user2: {match.user2_id}")
        logger.info(f"Update position: {update.user_position}, type: {update.type}")

        # Update the appropriate field based on user position and type
        if update.user_position == "user1":
            if update.type == "teaching":
                trade.user1_teaching_done = update.completed
                logger.info("Updated user1 teaching status")
            else:
                trade.user1_learning_done = update.completed
                logger.info("Updated user1 learning status")
        else:
            if update.type == "teaching":
                trade.user2_teaching_done = update.completed
                logger.info("Updated user2 teaching status")
            else:
                trade.user2_learning_done = update.completed
                logger.info("Updated user2 learning status")

        db.commit()
        db.refresh(trade)

        result = {
            "user1_teaching_done": trade.user1_teaching_done,
            "user1_learning_done": trade.user1_learning_done,
            "user2_teaching_done": trade.user2_teaching_done,
            "user2_learning_done": trade.user2_learning_done,
            "user1_skill": trade.user1_skill,
            "user2_skill": trade.user2_skill,
            "status": trade.status
        }
        logger.info(f"Updated trade status: {result}")
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating trade status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trades/{match_id}/complete", response_model=schemas.TradeStatus, tags=["Trading"])
async def complete_trade(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Complete a trade and move it to trade history."""
    try:
        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        logger.info(f"Trade object: user1_skill={trade.user1_skill}, user2_skill={trade.user2_skill}")
        
        # Get the match to verify user is part of it
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match or current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to complete this trade")

        # Verify all parts are complete
        if not (trade.user1_teaching_done and trade.user1_learning_done and 
                trade.user2_teaching_done and trade.user2_learning_done):
            raise HTTPException(status_code=400, detail="Cannot complete trade until all parts are marked complete")

        # Get the other user's ID
        other_user_id = match.user2_id if current_user.user_id == match.user1_id else match.user1_id

        # Check if the other user has already rated
        other_user_rating = db.query(models.Rating).filter(
            models.Rating.trade_id == trade.trade_id,
            models.Rating.reviewer_id == other_user_id
        ).first()

        # If the other user has completed but not rated, automatically add a 5-star rating
        if trade.status == "completed" and not other_user_rating:
            logger.info(f"Adding automatic 5-star rating for user {current_user.user_id}")
            new_rating = models.Rating(
                trade_id=trade.trade_id,
                reviewer_id=current_user.user_id,
                rated_user_id=other_user_id,
                score=5,
                feedback="Auto-generated 5-star rating"
            )
            db.add(new_rating)

            # Update rated user's average rating
            rated_user = db.query(models.User).filter(models.User.user_id == other_user_id).first()
            all_ratings = db.query(models.Rating).filter(models.Rating.rated_user_id == other_user_id).all()
            total_score = sum(r.score for r in all_ratings) + 5
            new_average = round(total_score / (len(all_ratings) + 1))
            rated_user.rating = new_average

        # Update trade status and completion time
        trade.status = "completed"
        trade.completed_at = datetime.utcnow()

        # Create trade history record
        trade_history = models.TradeHistory(
            trade_id=trade.trade_id,
            user_id=current_user.user_id,
            user1_id=match.user1_id,
            user2_id=match.user2_id,
            completed_at=trade.completed_at,
            user1_taught=trade.user1_skill,
            user2_taught=trade.user2_skill
        )
        db.add(trade_history)

        # Update match status
        match.match_status = "completed"

        db.commit()

        return {
            "user1_teaching_done": trade.user1_teaching_done,
            "user1_learning_done": trade.user1_learning_done,
            "user2_teaching_done": trade.user2_teaching_done,
            "user2_learning_done": trade.user2_learning_done,
            "user1_skill": trade.user1_skill,
            "user2_skill": trade.user2_skill,
            "status": trade.status
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trades/{match_id}/rate", response_model=schemas.RatingResponse, tags=["Trading"])
async def submit_rating(
    match_id: int,
    rating: schemas.RatingCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a rating for a trade."""
    try:
        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        # Verify trade is either completed or ready to be completed
        if trade.status != "completed" and not (
            trade.user1_teaching_done and trade.user1_learning_done and 
            trade.user2_teaching_done and trade.user2_learning_done
        ):
            raise HTTPException(status_code=400, detail="Can only rate completed trades or trades ready to be completed")

        # Get the match to verify user is part of it and get other user
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match or current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to rate this trade")

        # Get the other user's ID
        rated_user_id = match.user2_id if current_user.user_id == match.user1_id else match.user1_id

        # Check if user has already submitted a rating for this trade
        existing_rating = db.query(models.Rating).filter(
            models.Rating.trade_id == trade.trade_id,
            models.Rating.reviewer_id == current_user.user_id
        ).first()
        if existing_rating:
            raise HTTPException(status_code=400, detail="You have already rated this trade")

        # Validate rating score
        if rating.score < 1 or rating.score > 5:
            raise HTTPException(status_code=400, detail="Rating score must be between 1 and 5")

        # Create new rating
        new_rating = models.Rating(
            trade_id=trade.trade_id,
            reviewer_id=current_user.user_id,
            rated_user_id=rated_user_id,
            score=rating.score,
            feedback=rating.feedback
        )
        db.add(new_rating)

        # Update user's average rating
        rated_user = db.query(models.User).filter(models.User.user_id == rated_user_id).first()
        all_ratings = db.query(models.Rating).filter(models.Rating.rated_user_id == rated_user_id).all()
        total_score = sum(r.score for r in all_ratings) + rating.score
        new_average = round(total_score / (len(all_ratings) + 1))
        rated_user.rating = new_average

        db.commit()
        db.refresh(new_rating)

        return new_rating
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trades/{match_id}/report-issue", response_model=schemas.IssueReportResponse, tags=["Trading"])
async def report_issue(
    match_id: int,
    issue: schemas.IssueReport,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Report an issue with a trade."""
    try:
        # Get the trade associated with this match
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")
        
        # Get the match to verify user is part of this trade
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match or current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to report issues for this trade")
        
        # Check if trade is already reported
        if trade.status == "reported":
            raise HTTPException(status_code=400, detail="Trade has already been reported")
        
        # Create the fraud flag
        fraud_flag = models.FraudFlag(
            user_id=current_user.user_id,
            trade_id=trade.trade_id,
            description=issue.description
        )
        db.add(fraud_flag)
        
        # Update trade status and completion time
        trade.status = "reported"
        trade.completed_at = datetime.utcnow()
        
        # Update match status to completed
        match.match_status = "completed"
        
        try:
            db.commit()
            db.refresh(fraud_flag)
            return fraud_flag
        except Exception as e:
            db.rollback()
            logger.error(f"Database error in report_issue: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to save issue report")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in report_issue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/matches/{match_id}/trade", tags=["Trading"])
async def get_trade_for_match(
    match_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the trade ID for a match."""
    try:
        # Get the match to verify user is part of it
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match or current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to view this trade")

        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail="Trade not found")

        return {
            "trade_id": trade.trade_id,
            "status": trade.status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/reset-trades", tags=["Admin"])
async def reset_all_trades(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset all trades, trade history, matches, ratings, and chats. Only available in development."""
    # Check if we're in development mode
    if not os.getenv('DEVELOPMENT_MODE'):
        raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
    
    try:
        reset_trades()
        return {"message": "Successfully reset all trades and related data"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/admin/reset-all", tags=["Admin"])
async def reset_all_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reset all tables in the database, including users. Only available in development."""
    # Check if we're in development mode
    if not os.getenv('DEVELOPMENT_MODE'):
        raise HTTPException(status_code=403, detail="This endpoint is only available in development mode")
    
    try:
        reset_all_tables()
        return {"message": "Successfully reset all tables"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/matches/potential")
def get_potential_matches(current_user: models.User = Depends(get_current_user)):
    try:
        # Get all matches for the current user
        matches = db.query(models.Match).filter(
            or_(
                models.Match.user1_id == current_user.user_id,
                models.Match.user2_id == current_user.user_id
            )
        ).all()

        # Get all trades for the current user
        user_trades = db.query(models.Trade).filter(
            or_(
                models.Trade.user1_id == current_user.user_id,
                models.Trade.user2_id == current_user.user_id
            )
        ).all()

        # Create a set of match_ids that have completed or reported trades
        completed_match_ids = {
            trade.match_id for trade in user_trades 
            if trade.status in ['completed', 'reported']
        }

        # Filter out matches that have completed or reported trades
        # Also filter out matches with completed status or reported trades
        active_matches = [
            match for match in matches 
            if match.match_id not in completed_match_ids 
            and match.match_status not in ["completed", "reported"]
            and not any(trade.status in ['completed', 'reported'] for trade in match.trades)
        ]

        # Get potential matches (users with matching skills)
        potential_matches = []
        for match in active_matches:
            # Determine if current user is user1 or user2
            is_user1 = match.user1_id == current_user.user_id
            current_user_teaching = match.user1_teaching if is_user1 else match.user2_teaching
            current_user_learning = match.user1_learning if is_user1 else match.user2_learning
            other_user_teaching = match.user2_teaching if is_user1 else match.user1_teaching
            other_user_learning = match.user2_learning if is_user1 else match.user1_learning

            # Check if skills match
            if (current_user_teaching == other_user_learning and 
                current_user_learning == other_user_teaching):
                # Get the other user's profile
                other_user_id = match.user2_id if is_user1 else match.user1_id
                other_user = db.query(models.User).filter(models.User.user_id == other_user_id).first()
                
                if other_user:
                    potential_matches.append({
                        "match_id": match.match_id,
                        "user_id": other_user.user_id,
                        "username": other_user.username,
                        "teaching": other_user_teaching,
                        "learning": other_user_learning,
                        "rating": other_user.rating
                    })

        return potential_matches
    except Exception as e:
        logger.error(f"Error getting potential matches: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get potential matches")
