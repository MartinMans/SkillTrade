from pydantic import BaseModel, EmailStr
from typing import List, Optional
from enum import Enum
from datetime import datetime
from .enums import SkillType, MatchStatus

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    user_id: int
    rating: float
    trade_token: int
    photo: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    photo: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None

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

class UserSkillBase(BaseModel):
    skill_id: int
    type: str

class UserSkillCreate(UserSkillBase):
    pass

class UserSkillOut(UserSkillBase):
    user_id: int
    skill_name: str

    class Config:
        from_attributes = True
        populate_by_name = True

# Response schemas
class UserSkillsResponse(BaseModel):
    teaching: List[SkillOut]
    learning: List[SkillOut]

class MatchResult(BaseModel):
    match_id: int
    user_id: int
    username: str
    photo: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    teaching: List[str]
    learning: List[str]
    rating: float
    match_status: MatchStatus
    trade_request_time: Optional[datetime]
    initiator_id: Optional[int] = None

    class Config:
        from_attributes = True

class ChatMessageCreate(BaseModel):
    message: str

class ChatMessage(BaseModel):
    chat_id: int
    match_id: int
    sender_id: int
    message: str
    timestamp: datetime

    class Config:
        from_attributes = True

class UserBasicInfo(BaseModel):
    user_id: int
    username: str

class LastMessage(BaseModel):
    message: str
    timestamp: datetime
    sender_id: int

class MatchWithMessages(BaseModel):
    match_id: int
    match_status: MatchStatus
    created_at: datetime
    other_user: UserBasicInfo
    last_message: Optional[LastMessage]

    class Config:
        from_attributes = True

class TradeStatus(BaseModel):
    user1_teaching_done: bool
    user1_learning_done: bool
    user2_teaching_done: bool
    user2_learning_done: bool
    user1_skill: str
    user2_skill: str
    status: str

class TradeUpdate(BaseModel):
    type: str  # 'teaching' or 'learning'
    user_position: str  # 'user1' or 'user2'
    completed: bool

class RatingCreate(BaseModel):
    score: int  # 1-5 stars
    feedback: Optional[str] = None

class RatingResponse(BaseModel):
    rating_id: int
    score: int
    feedback: Optional[str]
    rated_user_id: int
    reviewer_id: int

    class Config:
        from_attributes = True

class IssueReport(BaseModel):
    description: str
    trade_id: int

class IssueReportResponse(BaseModel):
    flag_id: int
    user_id: int
    trade_id: int
    description: str
    timestamp: datetime

    class Config:
        from_attributes = True
