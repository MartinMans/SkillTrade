"""Update chat table to use match_id

Revision ID: update_chat_table
Depends on: remove_has_chat_column

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'update_chat_table'
down_revision = 'remove_has_chat_column'
branch_labels = None
depends_on = None

def upgrade():
    # Drop existing foreign key constraint and trade_id column
    op.drop_constraint('chats_trade_id_fkey', 'chats', type_='foreignkey')
    op.drop_column('chats', 'trade_id')
    
    # Add match_id column with foreign key constraint
    op.add_column('chats',
        sa.Column('match_id', sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        'chats_match_id_fkey',
        'chats', 'matches',
        ['match_id'], ['match_id']
    )

def downgrade():
    # Drop match_id foreign key and column
    op.drop_constraint('chats_match_id_fkey', 'chats', type_='foreignkey')
    op.drop_column('chats', 'match_id')
    
    # Add back trade_id column with foreign key constraint
    op.add_column('chats',
        sa.Column('trade_id', sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        'chats_trade_id_fkey',
        'chats', 'trades',
        ['trade_id'], ['trade_id']
    ) 