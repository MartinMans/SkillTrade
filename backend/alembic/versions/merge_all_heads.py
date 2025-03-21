"""merge all heads

Revision ID: merge_all_heads
Revises: add_trade_request_time, merge_heads, update_chat_table
Create Date: 2024-03-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'merge_all_heads'
down_revision = ('add_trade_request_time', 'merge_heads', 'update_chat_table')
branch_labels = None
depends_on = None

def upgrade():
    pass

def downgrade():
    pass 