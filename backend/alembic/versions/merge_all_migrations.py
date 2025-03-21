"""merge all migrations

Revision ID: merge_all_migrations
Revises: create_trades_table, merge_all_heads, merge_migrations
Create Date: 2024-03-21 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_all_migrations'
down_revision = None
branch_labels = None
depends_on = ('create_trades_table', 'merge_all_heads', 'merge_migrations')

def upgrade():
    pass

def downgrade():
    pass 