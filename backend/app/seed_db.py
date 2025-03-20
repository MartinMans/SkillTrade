import sys
import datetime

def seed_database():
    """Populate the database with sample data."""
    # Import here to avoid circular imports
    from app.db import SessionLocal
    from app.models import User, Skill, Trade
    from app.auth import get_password_hash
    
    db = SessionLocal()
    try:
        # Create sample users
        users = [
            User(
                username="john_doe",
                email="john@example.com",
                hashed_password=get_password_hash("password123"),
                full_name="John Doe",
                bio="Software developer with 5 years of experience"
            ),
            User(
                username="jane_smith",
                email="jane@example.com",
                hashed_password=get_password_hash("password123"),
                full_name="Jane Smith",
                bio="Graphic designer and UI/UX expert"
            )
        ]
        db.add_all(users)
        db.commit()

        # Create sample skills
        skills = [
            Skill(name="Python Programming", description="Python development including FastAPI and Django"),
            Skill(name="UI/UX Design", description="User interface and experience design"),
            Skill(name="Graphic Design", description="Adobe Creative Suite, Figma, and more")
        ]
        db.add_all(skills)
        db.commit()

        # Create sample trades
        trades = [
            Trade(
                title="Python Tutoring",
                description="1-hour Python programming tutoring session",
                provider_id=users[0].id,
                skill_id=skills[0].id,
                status="available",
                created_at=datetime.datetime.utcnow()
            ),
            Trade(
                title="Logo Design",
                description="Professional logo design service",
                provider_id=users[1].id,
                skill_id=skills[2].id,
                status="available",
                created_at=datetime.datetime.utcnow()
            )
        ]
        db.add_all(trades)
        db.commit()

        print("Sample data has been added to the database!")
        return True

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding database with sample data...")
    success = seed_database()
    sys.exit(0 if success else 1) 