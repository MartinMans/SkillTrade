from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    user_id: int
    rating: float
    trade_token: int

    class Config:
        orm_mode = True

# Token schema for JWT responses
class Token(BaseModel):
    access_token: str
    token_type: str
