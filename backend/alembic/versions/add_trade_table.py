"""add ready_at to matches

Revision ID: add_trade_table
Revises: remove_has_chat_column
Create Date: 2024-03-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_trade_table'
down_revision = 'remove_has_chat_column'
branch_labels = None
depends_on = None

def upgrade():
    # Add ready_at column to matches table
    op.add_column('matches', sa.Column('ready_at', sa.DateTime(), nullable=True))

def downgrade():
    # Remove ready_at column from matches table
    op.drop_column('matches', 'ready_at') 