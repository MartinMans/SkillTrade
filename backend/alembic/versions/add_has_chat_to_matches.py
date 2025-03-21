"""add has_chat to matches

Revision ID: add_has_chat_to_matches
Revises: 
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_has_chat_to_matches'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Add has_chat column with default value False
    op.add_column('matches', sa.Column('has_chat', sa.Boolean(), nullable=False, server_default='false'))

def downgrade():
    # Remove has_chat column
    op.drop_column('matches', 'has_chat') 