"""Remove has_chat column from matches table

Revision ID: remove_has_chat_column
Depends on: add_has_chat_to_matches

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_has_chat_column'
down_revision = 'add_has_chat_to_matches'
branch_labels = None
depends_on = None

def upgrade():
    # Remove the has_chat column
    op.drop_column('matches', 'has_chat')

def downgrade():
    # Add back the has_chat column if we need to downgrade
    op.add_column('matches',
        sa.Column('has_chat', sa.Boolean(), nullable=False, server_default='false')
    ) 