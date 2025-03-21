# pip install -r requirements.txt
# .\venv\Scripts\activate
# uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs

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

from . import models, schemas, crud
from .db import SessionLocal, engine
from .auth import create_access_token, pwd_context, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

app = FastAPI()

# Configure CORS with more specific settings
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # React dev server
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
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
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
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

@app.get("/matches/", response_model=List[schemas.MatchResult], tags=["Matching"])
async def get_potential_matches(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve potential skill trade matches for the current user.
    Returns a list of users who have matching skills for trading.
    Each match includes chat functionality by default.
    """
    matches = crud.find_potential_matches(db, current_user.user_id)
    return matches

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
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")

    messages = db.query(models.Chat).filter(
        models.Chat.match_id == match_id
    ).order_by(models.Chat.timestamp.asc()).all()

    return messages

@app.post("/matches/{match_id}/messages", response_model=schemas.ChatMessage, tags=["Matching"])
async def create_message(
    match_id: int,
    message: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message in a match."""
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this match")

    db_message = models.Chat(
        match_id=match_id,
        sender_id=current_user.user_id,
        message=message.message
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

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
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")

        # Verify user is part of the match
        if current_user.user_id not in [match.user1_id, match.user2_id]:
            raise HTTPException(status_code=403, detail="Not authorized to start trade for this match")

        # Get the other user in the match
        other_user = match.user2 if match.user1_id == current_user.user_id else match.user1
        
        # Get other user's teaching and learning skills
        teaching_skills, learning_skills = crud.get_user_skills(db, other_user.user_id)

        # If there's a pending trade request that's over 24 hours old, clear it
        if (match.match_status == "pending_trade" and match.trade_request_time and 
            (datetime.utcnow() - match.trade_request_time).total_seconds() > 24 * 3600):
            match.match_status = "pending"
            match.trade_request_time = None
            match.initiator_id = None
            db.commit()

        # Handle initial trade request (from PENDING state)
        if match.match_status == "pending":
            match.match_status = "pending_trade"
            match.trade_request_time = datetime.utcnow()
            match.initiator_id = current_user.user_id
            db.commit()
            db.refresh(match)
            return {
                "match_id": match.match_id,
                "user_id": other_user.user_id,
                "username": other_user.username,
                "teaching": [skill.skill_name for skill in teaching_skills],
                "learning": [skill.skill_name for skill in learning_skills],
                "rating": other_user.rating,
                "match_status": match.match_status,
                "trade_request_time": match.trade_request_time,
                "initiator_id": match.initiator_id
            }

        # If user is canceling their trade request
        if match.match_status == "pending_trade":
            if current_user.user_id == match.initiator_id:
                match.match_status = "pending"
                match.trade_request_time = None
                match.initiator_id = None
                db.commit()

        # Handle second user accepting trade
        if match.match_status == "pending_trade":
            # Check if this is the other user accepting
            if current_user.user_id != match.initiator_id:
                # Create new trade
                trade = models.Trade(
                    match_id=match.match_id,
                    status="in_progress"
                )
                db.add(trade)
                match.match_status = "in_trade"
                match.trade_request_time = None
                match.initiator_id = None
                db.commit()

        db.refresh(match)  # Refresh to ensure we have the latest state

        # Return the match result with updated status
        return {
            "match_id": match.match_id,
            "user_id": other_user.user_id,
            "username": other_user.username,
            "teaching": [skill.skill_name for skill in teaching_skills],
            "learning": [skill.skill_name for skill in learning_skills],
            "rating": other_user.rating,
            "match_status": match.match_status,
            "trade_request_time": match.trade_request_time,
            "initiator_id": match.initiator_id
        }
    except Exception as e:
        db.rollback()
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
