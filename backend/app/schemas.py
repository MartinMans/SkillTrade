from pydantic import BaseModel, EmailStr
from typing import List, Optional
from enum import Enum
from .models import MatchStatus

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
        from_attributes = True

# Token schema for JWT responses
class Token(BaseModel):
    access_token: str
    token_type: str

# Skill schemas
class SkillBase(BaseModel):
    skill_name: str

class SkillCreate(SkillBase):
    pass

class SkillOut(SkillBase):
    skill_id: int

    class Config:
        from_attributes = True

class SkillType(str, Enum):
    TEACH = "teach"
    LEARN = "learn"

class UserSkillBase(BaseModel):
    skill_id: int
    type: SkillType

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillOut(UserSkillBase):
    user_id: int
    skill: SkillOut

    class Config:
        from_attributes = True

# Response schemas
class UserSkillsResponse(BaseModel):
    teaching: List[SkillOut]
    learning: List[SkillOut]

class MatchResult(BaseModel):
    match_id: int
    user_id: int
    username: str
    teaching: List[str]
    learning: List[str]
    rating: float
    match_status: MatchStatus

    class Config:
        from_attributes = True
