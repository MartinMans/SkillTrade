import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.migrations.add_initiator_id import add_initiator_id_column

def run_migrations():
    """Run all database migrations in sequence."""
    try:
        print("Starting database migrations...")
        
        # Run migrations in sequence
        add_initiator_id_column()
        
        print("All migrations completed successfully!")
    except Exception as e:
        print(f"Error during migrations: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_migrations() 