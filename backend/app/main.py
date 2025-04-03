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
import os

from . import models, schemas, crud
from .db import SessionLocal, engine
from .auth import create_access_token, pwd_context, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from .reset_trades import reset_trades
from .routers import users, skills, matches, ratings, reports

app = FastAPI()

print("DATABASE_URL:", os.getenv("DATABASE_URL"))


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
async def get_matches(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all potential skill matches for the current user."""
    try:
        # Get the user's teaching and learning skills
        user_skills = db.query(models.UserSkill).filter(
            models.UserSkill.user_id == current_user.user_id
        ).all()

        teaching_skills = [skill.skill_id for skill in user_skills if skill.type == 'teach']
        learning_skills = [skill.skill_id for skill in user_skills if skill.type == 'learn']

        # Get completed trades for the current user
        completed_trades = db.query(models.TradeHistory).filter(
            or_(
                models.TradeHistory.user1_id == current_user.user_id,
                models.TradeHistory.user2_id == current_user.user_id
            )
        ).all()

        # Create a set of (user_id, taught_skill, learned_skill) tuples for completed trades
        completed_trade_combinations = set()
        for trade in completed_trades:
            if trade.user1_id == current_user.user_id:
                completed_trade_combinations.add((trade.user2_id, trade.user1_taught, trade.user2_taught))
            else:
                completed_trade_combinations.add((trade.user1_id, trade.user2_taught, trade.user1_taught))

        # Get skill names for all skills
        skill_id_to_name = {}
        all_skill_ids = set()
        for skill in user_skills:
            all_skill_ids.add(skill.skill_id)
        for skill in teaching_skills:
            all_skill_ids.add(skill)
        
        if all_skill_ids:
            skill_records = db.query(models.Skill).filter(
                models.Skill.skill_id.in_(all_skill_ids)
            ).all()
            skill_id_to_name = {skill.skill_id: skill.skill_name for skill in skill_records}

        # Find potential matches excluding already completed combinations
        potential_matches = []
        
        # Get all users who have matching skills
        matching_users = db.query(models.UserSkill).filter(
            and_(
                models.UserSkill.user_id != current_user.user_id,
                or_(
                    and_(
                        models.UserSkill.skill_id.in_(learning_skills),
                        models.UserSkill.type == 'teach'
                    ),
                    and_(
                        models.UserSkill.skill_id.in_(teaching_skills),
                        models.UserSkill.type == 'learn'
                    )
                )
            )
        ).all()

        # Group users by their user_id
        user_skill_map = {}
        for skill in matching_users:
            if skill.user_id not in user_skill_map:
                user_skill_map[skill.user_id] = {'teach': [], 'learn': []}
            user_skill_map[skill.user_id][skill.type].append(skill.skill_id)

        # Process each potential match
        for user_id, skills in user_skill_map.items():
            # Find matching skill combinations
            matching_teach = set(teaching_skills) & set(skills['learn'])
            matching_learn = set(learning_skills) & set(skills['teach'])

            if matching_teach and matching_learn:  # Only proceed if there are both teaching and learning matches
                # Get the other user's details
                other_user = db.query(models.User).filter(
                    models.User.user_id == user_id
                ).first()

                if other_user:
                    # Check if any valid skill combinations exist that haven't been traded before
                    valid_combinations_exist = False
                    for teach_id in matching_teach:
                        for learn_id in matching_learn:
                            teach_skill = skill_id_to_name.get(teach_id)
                            learn_skill = skill_id_to_name.get(learn_id)
                            if teach_skill and learn_skill:
                                combination = (user_id, teach_skill, learn_skill)
                                if combination not in completed_trade_combinations:
                                    valid_combinations_exist = True
                                    break
                        if valid_combinations_exist:
                            break

                    if valid_combinations_exist:
                        # Get skill names for display
                        teaching_skill_names = [skill_id_to_name[skill_id] for skill_id in matching_teach]
                        learning_skill_names = [skill_id_to_name[skill_id] for skill_id in matching_learn]

                        # Check for existing match
                        existing_match = db.query(models.Match).filter(
                            or_(
                                and_(
                                    models.Match.user1_id == current_user.user_id,
                                    models.Match.user2_id == user_id
                                ),
                                and_(
                                    models.Match.user1_id == user_id,
                                    models.Match.user2_id == current_user.user_id
                                )
                            )
                        ).first()

                        if existing_match:
                            match_dict = {
                                "match_id": existing_match.match_id,
                                "username": other_user.username,
                                "user_id": other_user.user_id,
                                "teaching": teaching_skill_names,
                                "learning": learning_skill_names,
                                "match_status": existing_match.match_status,
                                "initiator_id": existing_match.initiator_id,
                                "rating": other_user.rating,
                                "trade_request_time": existing_match.trade_request_time
                            }
                        else:
                            # Create new match
                            new_match = models.Match(
                                user1_id=min(current_user.user_id, user_id),
                                user2_id=max(current_user.user_id, user_id),
                                match_status="pending",
                                trade_request_time=None
                            )
                            db.add(new_match)
                            db.commit()
                            db.refresh(new_match)

                            match_dict = {
                                "match_id": new_match.match_id,
                                "username": other_user.username,
                                "user_id": other_user.user_id,
                                "teaching": teaching_skill_names,
                                "learning": learning_skill_names,
                                "match_status": new_match.match_status,
                                "initiator_id": None,
                                "rating": other_user.rating,
                                "trade_request_time": new_match.trade_request_time
                            }

                        potential_matches.append(match_dict)

        return potential_matches
    except Exception as e:
        print(f"Error in get_matches: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
    print(f"Fetching messages for match {match_id}")
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        print(f"Match {match_id} not found")
        raise HTTPException(status_code=404, detail="Match not found")
    
    print(f"Match found. User1: {match.user1_id}, User2: {match.user2_id}, Current user: {current_user.user_id}")
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        print(f"User {current_user.user_id} not authorized to view messages for match {match_id}")
        raise HTTPException(status_code=403, detail="Not authorized to view these messages")

    messages = db.query(models.Chat).filter(
        models.Chat.match_id == match_id
    ).order_by(models.Chat.timestamp.asc()).all()
    
    print(f"Found {len(messages)} messages")
    for msg in messages:
        print(f"Message: {msg.message} from user {msg.sender_id} at {msg.timestamp}")

    return messages

@app.post("/matches/{match_id}/messages", response_model=schemas.ChatMessage, tags=["Matching"])
async def create_message(
    match_id: int,
    message: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new message in a match."""
    print(f"Creating new message for match {match_id}")
    # Verify user is part of the match
    match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
    if not match:
        print(f"Match {match_id} not found")
        raise HTTPException(status_code=404, detail="Match not found")
    
    print(f"Match found. User1: {match.user1_id}, User2: {match.user2_id}, Current user: {current_user.user_id}")
    if match.user1_id != current_user.user_id and match.user2_id != current_user.user_id:
        print(f"User {current_user.user_id} not authorized to send messages in match {match_id}")
        raise HTTPException(status_code=403, detail="Not authorized to send messages in this match")

    print(f"Creating message: {message.message}")
    db_message = models.Chat(
        match_id=match_id,
        sender_id=current_user.user_id,
        message=message.message
    )
    db.add(db_message)
    try:
        db.commit()
        db.refresh(db_message)
        print(f"Successfully created message with ID {db_message.chat_id}")
        return db_message
    except Exception as e:
        print(f"Error creating message: {str(e)}")
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
        print(f"Starting trade for match {match_id}")
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
        
        print(f"User1 teaching skills: {[skill.skill_name for skill in user1_teaching_skills]}")
        print(f"User2 teaching skills: {[skill.skill_name for skill in user2_teaching_skills]}")
        
        # Get the first teaching skill for each user
        user1_teaching = user1_teaching_skills[0].skill_name if user1_teaching_skills else ""
        user2_teaching = user2_teaching_skills[0].skill_name if user2_teaching_skills else ""
        
        print(f"User1 teaching skill: {user1_teaching}")
        print(f"User2 teaching skill: {user2_teaching}")

        # If there's a pending trade request that's over 24 hours old, clear it
        if (match.match_status == "pending_trade" and match.trade_request_time and 
            (datetime.utcnow() - match.trade_request_time).total_seconds() > 24 * 3600):
            match.match_status = "pending"
            match.trade_request_time = None
            match.initiator_id = None
            db.commit()

        print(f"Current match status: {match.match_status}")

        # Handle initial trade request (from PENDING state)
        if match.match_status == "pending":
            print("Handling initial trade request")
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
                print("Canceling trade request")
                match.match_status = "pending"
                match.trade_request_time = None
                match.initiator_id = None
                db.commit()

        # Handle second user accepting trade
        if match.match_status == "pending_trade":
            # Check if this is the other user accepting
            if current_user.user_id != match.initiator_id:
                print("Second user accepting trade")
                print(f"Creating trade with user1_skill={user1_teaching}, user2_skill={user2_teaching}")
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
                    print("Successfully created trade")
                except Exception as e:
                    print(f"Error creating trade: {str(e)}")
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
        print(f"Error in start_trade: {str(e)}")
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

        print(f"Trade object: user1_skill={trade.user1_skill}, user2_skill={trade.user2_skill}")
        
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
        print(f"Updating trade status for match {match_id}")
        print(f"Update data: {update}")
        
        # Get the trade record
        trade = db.query(models.Trade).filter(models.Trade.match_id == match_id).first()
        if not trade:
            print(f"Trade not found for match {match_id}")
            raise HTTPException(status_code=404, detail="Trade not found")

        # Get the match to verify user is part of it
        match = db.query(models.Match).filter(models.Match.match_id == match_id).first()
        if not match:
            print(f"Match not found: {match_id}")
            raise HTTPException(status_code=404, detail="Match not found")
            
        if current_user.user_id not in [match.user1_id, match.user2_id]:
            print(f"User {current_user.user_id} not authorized for match {match_id}")
            raise HTTPException(status_code=403, detail="Not authorized to update this trade")

        print(f"Current user: {current_user.user_id}")
        print(f"Match user1: {match.user1_id}, user2: {match.user2_id}")
        print(f"Update position: {update.user_position}, type: {update.type}")

        # Update the appropriate field based on user position and type
        if update.user_position == "user1":
            if update.type == "teaching":
                trade.user1_teaching_done = update.completed
                print("Updated user1 teaching status")
            else:
                trade.user1_learning_done = update.completed
                print("Updated user1 learning status")
        else:
            if update.type == "teaching":
                trade.user2_teaching_done = update.completed
                print("Updated user2 teaching status")
            else:
                trade.user2_learning_done = update.completed
                print("Updated user2 learning status")

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
        print(f"Updated trade status: {result}")
        return result
    except Exception as e:
        db.rollback()
        print(f"Error updating trade status: {str(e)}")
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

        print(f"Trade object: user1_skill={trade.user1_skill}, user2_skill={trade.user2_skill}")
        
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
            print(f"Adding automatic 5-star rating for user {current_user.user_id}")
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

app.include_router(users.router)
app.include_router(skills.router)
app.include_router(matches.router)
app.include_router(ratings.router)
app.include_router(reports.router)
