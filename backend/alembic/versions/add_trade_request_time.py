"""add trade request time and pending trade status

Revision ID: add_trade_request_time
Revises: previous_revision
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_trade_request_time'
down_revision = None  # Update this with your previous migration
branch_labels = None
depends_on = None

def upgrade():
    # Add new enum value
    op.execute("ALTER TYPE matchstatus ADD VALUE IF NOT EXISTS 'pending_trade'")
    
    # Add trade_request_time column
    op.add_column('matches', sa.Column('trade_request_time', sa.DateTime(), nullable=True))

def downgrade():
    # Remove trade_request_time column
    op.drop_column('matches', 'trade_request_time')
    
    # We cannot remove enum values in PostgreSQL, so we skip that in downgrade 