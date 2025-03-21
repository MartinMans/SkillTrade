"""merge heads

Revision ID: merge_heads
Revises: add_trade_table, remove_has_chat_column
Create Date: 2024-03-20 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_heads'
down_revision = ('add_trade_table', 'remove_has_chat_column')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass 