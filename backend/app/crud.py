from sqlalchemy.orm import Session, aliased
from sqlalchemy import or_, and_
from . import models
from . import schemas
from .enums import SkillType, TradeStatus
from passlib.context import CryptContext
from typing import List, Optional, Tuple, Dict, Any

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# User CRUD operations
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_email(db: Session, email: str):
    # Use select_from and join to ensure we get the latest user data
    return db.query(models.User).filter(models.User.email == email).first()

def update_user_profile(db: Session, user_id: int, profile_data: schemas.UserProfileUpdate) -> models.User:
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        return None
    
    # Update only provided fields (excluding username)
    for field, value in profile_data.dict(exclude_unset=True).items():
        setattr(user, field, value)
    
    try:
        db.commit()
        # Explicitly refresh the user object to ensure we have the latest data
        db.refresh(user)
        # Also update the user in any active sessions
        db.expire_all()
        return user
    except Exception as e:
        db.rollback()
        raise e

# Skill CRUD operations
def create_skill(db: Session, skill: schemas.SkillCreate) -> models.Skill:
    db_skill = models.Skill(**skill.dict())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill

def get_skill_by_name(db: Session, skill_name: str) -> Optional[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.skill_name == skill_name).first()

def get_skill_by_id(db: Session, skill_id: int) -> Optional[models.Skill]:
    return db.query(models.Skill).filter(models.Skill.skill_id == skill_id).first()

def get_all_skills(db: Session, skip: int = 0, limit: int = 100) -> List[models.Skill]:
    return db.query(models.Skill).offset(skip).limit(limit).all()

def search_skills(db: Session, query: str, limit: int = 10) -> List[models.Skill]:
    """Search skills by name, case-insensitive partial match."""
    return db.query(models.Skill)\
        .filter(models.Skill.skill_name.ilike(f"%{query}%"))\
        .order_by(models.Skill.skill_name)\
        .limit(limit)\
        .all()

def get_or_create_skill(db: Session, skill_name: str) -> Tuple[models.Skill, bool]:
    """
    Get an existing skill or create a new one.
    Returns tuple of (skill, is_new) where is_new indicates if the skill was just created.
    """
    # First try to find an existing skill (case-insensitive)
    existing_skill = db.query(models.Skill)\
        .filter(models.Skill.skill_name.ilike(skill_name))\
        .first()
    
    if existing_skill:
        return existing_skill, False
    
    # Create new skill if it doesn't exist
    new_skill = models.Skill(skill_name=skill_name.strip())
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    return new_skill, True

def get_skill_by_exact_name(db: Session, skill_name: str) -> Optional[models.Skill]:
    """Get a skill by exact name match (case-insensitive)."""
    return db.query(models.Skill)\
        .filter(models.Skill.skill_name.ilike(skill_name))\
        .first()

# UserSkill CRUD operations
def add_user_skill(db: Session, user_id: int, skill_id: int, skill_type: schemas.SkillType) -> dict:
    # Get the skill first to include its name in the response
    skill = db.query(models.Skill).filter(models.Skill.skill_id == skill_id).first()
    if not skill:
        raise ValueError("Skill not found")

    db_user_skill = models.UserSkill(
        user_id=user_id,
        skill_id=skill_id,
        type=skill_type
    )
    db.add(db_user_skill)
    db.commit()
    db.refresh(db_user_skill)
    
    # Return a dictionary with all required fields
    return {
        "user_id": user_id,
        "skill_id": skill_id,
        "type": skill_type,
        "skill_name": skill.skill_name
    }

def get_user_skills(db: Session, user_id: int) -> tuple[List[models.Skill], List[models.Skill]]:
    teaching_skills = db.query(models.Skill).join(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.type == SkillType.TEACH
    ).all()
    
    learning_skills = db.query(models.Skill).join(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.type == SkillType.LEARN
    ).all()
    
    return teaching_skills, learning_skills

def remove_user_skill(db: Session, user_id: int, skill_id: int) -> bool:
    user_skill = db.query(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.skill_id == skill_id
    ).first()
    
    if user_skill:
        db.delete(user_skill)
        db.commit()
        return True
    return False

def get_user_skill(db: Session, user_id: int, skill_id: int) -> Optional[models.UserSkill]:
    return db.query(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.skill_id == skill_id
    ).first()

def find_potential_matches(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Find potential skill trade matches for a user based on strict skill swapping."""
    # Get the user's teaching and learning skills
    user_teaching, user_learning = get_user_skills(db, user_id)
    
    # Convert skills to sets of names for easier matching
    user_teaching_names = {skill.skill_name for skill in user_teaching}
    user_learning_names = {skill.skill_name for skill in user_learning}
    
    # Get all users except the current user
    potential_matches = db.query(models.User).filter(
        models.User.user_id != user_id
    ).all()
    
    matches = []
    
    for match_user in potential_matches:
        # Get match's teaching and learning skills
        match_teaching, match_learning = get_user_skills(db, match_user.user_id)
        
        # Convert match's skills to sets of names
        match_teaching_names = {skill.skill_name for skill in match_teaching}
        match_learning_names = {skill.skill_name for skill in match_learning}
        
        # Check if there's at least one skill match in BOTH directions:
        # User can teach something the match wants to learn AND
        # Match can teach something the user wants to learn
        user_can_teach = bool(user_teaching_names & match_learning_names)
        match_can_teach = bool(match_teaching_names & user_learning_names)
        
        if user_can_teach and match_can_teach:
            # Create or get existing match record
            db_match = db.query(models.Match).filter(
                or_(
                    and_(
                        models.Match.user1_id == user_id,
                        models.Match.user2_id == match_user.user_id
                    ),
                    and_(
                        models.Match.user1_id == match_user.user_id,
                        models.Match.user2_id == user_id
                    )
                )
            ).first()

            if not db_match:
                db_match = models.Match(
                    user1_id=user_id,
                    user2_id=match_user.user_id,
                    match_status="pending"
                )
                db.add(db_match)
                db.commit()
                db.refresh(db_match)
            
            matches.append({
                "match_id": db_match.match_id,
                "user_id": match_user.user_id,
                "username": match_user.username,
                "teaching": [skill.skill_name for skill in match_teaching],
                "learning": [skill.skill_name for skill in match_learning],
                "rating": match_user.rating,
                "match_status": db_match.match_status,
                "trade_request_time": db_match.trade_request_time,
                "initiator_id": db_match.initiator_id
            })

    return matches

def cleanup_self_trades(db: Session):
    """Remove any trades where user1_id equals user2_id."""
    self_trades = db.query(models.Trade).filter(
        models.Trade.user1_id == models.Trade.user2_id
    ).all()
    
    for trade in self_trades:
        # Delete associated messages first
        db.query(models.Chat).filter(models.Chat.trade_id == trade.trade_id).delete()
        db.delete(trade)
    
    db.commit()
    return len(self_trades)
