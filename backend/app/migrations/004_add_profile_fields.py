"""Add profile fields to users table

This migration adds photo, location, and bio fields to the users table.
"""

from yoyo import step

__depends__ = {'convert_trade_id_to_integer'}

steps = [
    step(
        """
        ALTER TABLE users
        ADD COLUMN photo TEXT,
        ADD COLUMN location VARCHAR(255),
        ADD COLUMN bio TEXT;
        """,
        """
        ALTER TABLE users
        DROP COLUMN photo,
        DROP COLUMN location,
        DROP COLUMN bio;
        """
    )
] 