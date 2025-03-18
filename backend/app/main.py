# pip install -r requirements.txt
# .\venv\Scripts\activate
# uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import timedelta
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, crud
from .db import SessionLocal, engine
from .auth import create_access_token, pwd_context, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (or restrict to ["http://127.0.0.1:5500"])
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, DELETE, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Create the database tables (for development)
models.Base.metadata.create_all(bind=engine)

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
    """
    matches = crud.find_potential_matches(db, current_user.user_id)
    return matches
