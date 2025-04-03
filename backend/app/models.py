from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from .enums import SkillType, TradeStatus, MatchStatus
import enum

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rating = Column(Float, default=0)
    trade_token = Column(Integer, default=1)

    # Relationships
    skills_teaching = relationship("UserSkill", back_populates="user", foreign_keys="UserSkill.user_id")
    ratings_given = relationship("Rating", back_populates="reviewer", foreign_keys="Rating.reviewer_id")
    ratings_received = relationship("Rating", back_populates="rated_user", foreign_keys="Rating.rated_user_id")
    chat_messages = relationship("Chat", back_populates="sender")
    reported_issues = relationship("FraudFlag", back_populates="reporter", foreign_keys="FraudFlag.reporter_id")
    received_reports = relationship("FraudFlag", back_populates="reported_user", foreign_keys="FraudFlag.reported_user_id")
    trade_history = relationship("TradeHistory", back_populates="user", foreign_keys="TradeHistory.user_id")
    matches_as_user1 = relationship("Match", foreign_keys="Match.user1_id", back_populates="user1")
    matches_as_user2 = relationship("Match", foreign_keys="Match.user2_id", back_populates="user2")

class Skill(Base):
    __tablename__ = "skills"
    
    skill_id = Column(Integer, primary_key=True, index=True)
    skill_name = Column(String, unique=True, nullable=False)

    # Relationships
    user_skills = relationship("UserSkill", back_populates="skill")

class UserSkill(Base):
    __tablename__ = "user_skills"
    
    user_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    skill_id = Column(Integer, ForeignKey("skills.skill_id"), primary_key=True)
    type = Column(String, nullable=False)

    # Relationships
    user = relationship("User", back_populates="skills_teaching")
    skill = relationship("Skill", back_populates="user_skills")

class Trade(Base):
    __tablename__ = "trades"
    
    trade_id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default="active", nullable=False)
    user1_skill = Column(String, nullable=False)
    user2_skill = Column(String, nullable=False)
    user1_teaching_done = Column(Boolean, default=False, nullable=False)
    user1_learning_done = Column(Boolean, default=False, nullable=False)
    user2_teaching_done = Column(Boolean, default=False, nullable=False)
    user2_learning_done = Column(Boolean, default=False, nullable=False)

    # Relationships
    match = relationship("Match", back_populates="trade")
    ratings = relationship("Rating", back_populates="trade")
    trade_history = relationship("TradeHistory", back_populates="trade")

class Rating(Base):
    __tablename__ = "ratings"
    
    rating_id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.trade_id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    rated_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    score = Column(Float, nullable=False)
    feedback = Column(Text, nullable=True)

    # Relationships
    trade = relationship("Trade", back_populates="ratings")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="ratings_given")
    rated_user = relationship("User", foreign_keys=[rated_user_id], back_populates="ratings_received")

class Chat(Base):
    __tablename__ = "chats"
    
    chat_id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    match = relationship("Match", back_populates="chat_messages")
    sender = relationship("User", back_populates="chat_messages")

class FraudFlag(Base):
    __tablename__ = "fraud_flags"
    
    flag_id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    reported_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id], back_populates="reported_issues")
    reported_user = relationship("User", foreign_keys=[reported_user_id], back_populates="received_reports")
    match = relationship("Match", back_populates="fraud_flags")

class TradeHistory(Base):
    __tablename__ = "trade_history"
    
    history_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    trade_id = Column(Integer, ForeignKey("trades.trade_id"), nullable=False)
    completed_at = Column(DateTime, nullable=False)
    user1_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    user1_taught = Column(String, nullable=False)
    user2_taught = Column(String, nullable=False)

    # Relationships
    user = relationship("User", back_populates="trade_history", foreign_keys=[user_id])
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    trade = relationship("Trade", back_populates="trade_history")

class MatchStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PENDING_TRADE = "pending_trade"
    IN_TRADE = "in_trade"
    COMPLETED = "completed"

class Match(Base):
    __tablename__ = "matches"
    
    match_id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    match_status = Column(Enum("pending", "accepted", "rejected", "pending_trade", "in_trade", "completed", "cancelled", name="matchstatus"), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    trade_request_time = Column(DateTime, nullable=True)
    ready_at = Column(DateTime, nullable=True)
    initiator_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id], back_populates="matches_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], back_populates="matches_as_user2")
    chat_messages = relationship("Chat", back_populates="match")
    trade = relationship("Trade", back_populates="match", uselist=False)
    fraud_flags = relationship("FraudFlag", back_populates="match")

    # Ensure unique pairs
    __table_args__ = (
        UniqueConstraint('user1_id', 'user2_id', name='unique_user_pair'),
    )
