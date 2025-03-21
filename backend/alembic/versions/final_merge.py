"""final merge of all migrations

Revision ID: final_merge
Revises: fix_trades_table, merge_all_migrations, create_trades_table, merge_all_heads, merge_migrations
Create Date: 2024-03-21 16:20:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'final_merge'
down_revision = None
branch_labels = None
depends_on = ('fix_trades_table', 'merge_all_migrations', 'create_trades_table', 'merge_all_heads', 'merge_migrations')

def upgrade():
    pass

def downgrade():
    pass 