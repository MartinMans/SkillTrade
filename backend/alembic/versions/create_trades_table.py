"""create trades table

Revision ID: create_trades_table
Revises: add_trade_table
Create Date: 2024-03-21 15:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'create_trades_table'
down_revision = 'add_trade_table'
branch_labels = None
depends_on = None

def upgrade():
    # Create trades table
    op.create_table('trades',
        sa.Column('trade_id', sa.Integer(), nullable=False),
        sa.Column('match_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
        sa.PrimaryKeyConstraint('trade_id'),
        sa.ForeignKeyConstraint(['match_id'], ['matches.match_id'], ),
    )
    
    # Create indexes
    op.create_index(op.f('ix_trades_trade_id'), 'trades', ['trade_id'], unique=False)
    op.create_index(op.f('ix_trades_match_id'), 'trades', ['match_id'], unique=False)

def downgrade():
    # Drop indexes first
    op.drop_index(op.f('ix_trades_match_id'), table_name='trades')
    op.drop_index(op.f('ix_trades_trade_id'), table_name='trades')
    
    # Drop the table
    op.drop_table('trades') 