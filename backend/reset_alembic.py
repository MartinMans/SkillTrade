from sqlalchemy import create_engine, text

# Database connection URL
DATABASE_URL = "postgresql://neondb_owner:npg_DNWck1BXySh8@ep-small-butterfly-a8s0ryo1-pooler.eastus2.azure.neon.tech/neondb?sslmode=require"

def reset_alembic():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        # Drop the alembic_version table if it exists
        connection.execute(text("DROP TABLE IF EXISTS alembic_version;"))
        connection.commit()

if __name__ == "__main__":
    reset_alembic()
    print("Successfully reset alembic version.") 