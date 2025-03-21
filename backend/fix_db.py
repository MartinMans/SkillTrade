import sys
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).resolve().parent / 'app'
sys.path.append(str(app_dir))

from migrations.fix_trades_table import fix_trades_table

if __name__ == "__main__":
    print("Starting database fixes...")
    fix_trades_table()
    print("Database fixes completed!") 