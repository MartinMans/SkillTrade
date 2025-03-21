"""merge migrations

Revision ID: merge_migrations
Revises: add_trade_table, remove_has_chat_column
Create Date: 2024-03-20 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_migrations'
down_revision = ('add_trade_table', 'remove_has_chat_column')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass 