# .\venv\Scripts\activate
# uvicorn app.main:app --reload
# http://127.0.0.1:8000/docs

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session

from . import models, schemas, crud
from .db import SessionLocal, engine
from .auth import create_access_token, pwd_context, ACCESS_TOKEN_EXPIRE_MINUTES

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],  # Allow requests from the frontend
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
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
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
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
