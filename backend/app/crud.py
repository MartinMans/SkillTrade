from sqlalchemy.orm import Session, aliased
from sqlalchemy import or_, and_
from . import models, schemas
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
    return db.query(models.User).filter(models.User.email == email).first()

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
def add_user_skill(db: Session, user_id: int, skill_id: int, skill_type: schemas.SkillType) -> models.UserSkill:
    db_user_skill = models.UserSkill(
        user_id=user_id,
        skill_id=skill_id,
        type=skill_type
    )
    db.add(db_user_skill)
    db.commit()
    db.refresh(db_user_skill)
    return db_user_skill

def get_user_skills(db: Session, user_id: int) -> tuple[List[models.Skill], List[models.Skill]]:
    teaching_skills = db.query(models.Skill).join(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.type == schemas.SkillType.TEACH
    ).all()
    
    learning_skills = db.query(models.Skill).join(models.UserSkill).filter(
        models.UserSkill.user_id == user_id,
        models.UserSkill.type == schemas.SkillType.LEARN
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
    
    # Get the user's teaching & learning skills
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        return []

    # Get user's teaching and learning skills
    teaching_skills, learning_skills = get_user_skills(db, user_id)
    teaching_skill_ids = [skill.skill_id for skill in teaching_skills]
    learning_skill_ids = [skill.skill_id for skill in learning_skills]

    # Create aliases for UserSkill to avoid join conflicts
    teach_alias = aliased(models.UserSkill)
    learn_alias = aliased(models.UserSkill)

    # Find potential matches with proper table aliasing
    potential_matches = (
        db.query(models.User)
        .join(teach_alias, teach_alias.user_id == models.User.user_id)
        .filter(
            teach_alias.skill_id.in_(learning_skill_ids),
            teach_alias.type == schemas.SkillType.TEACH
        )
        .join(learn_alias, learn_alias.user_id == models.User.user_id)
        .filter(
            learn_alias.skill_id.in_(teaching_skill_ids),
            learn_alias.type == schemas.SkillType.LEARN
        )
        .filter(models.User.user_id != user_id)
        .distinct()
        .all()
    )

    matches = []
    for match in potential_matches:
        # Ensure the match does not already exist
        existing_match = db.query(models.Match).filter(
            or_(
                and_(models.Match.user1_id == user_id, models.Match.user2_id == match.user_id),
                and_(models.Match.user1_id == match.user_id, models.Match.user2_id == user_id)
            )
        ).first()

        if not existing_match:
            new_match = models.Match(
                user1_id=user_id,
                user2_id=match.user_id,
                match_status=models.MatchStatus.PENDING
            )
            db.add(new_match)
            db.commit()
            db.refresh(new_match)
        else:
            new_match = existing_match

        # Get match's teaching and learning skills
        match_teaching, match_learning = get_user_skills(db, match.user_id)
        
        matches.append({
            "match_id": new_match.match_id,
            "user_id": match.user_id,
            "username": match.username,
            "teaching": [skill.skill_name for skill in match_teaching],
            "learning": [skill.skill_name for skill in match_learning],
            "rating": match.rating,
            "match_status": new_match.match_status
        })

    return matches
