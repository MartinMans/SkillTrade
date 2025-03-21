"""fix trades table structure

Revision ID: fix_trades_table
Revises: merge_all_migrations
Create Date: 2024-03-21 16:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'fix_trades_table'
down_revision = 'merge_all_migrations'
branch_labels = None
depends_on = None

def upgrade():
    # First, check if trades table exists and drop it
    op.execute(text("""
        DROP TABLE IF EXISTS trades CASCADE;
    """))
    
    # Create trades table with correct structure
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