# python -m unittest discover -s tests

import unittest
from unittest.mock import MagicMock
from backend.app.crud import find_potential_matches

class TestUserMatching(unittest.TestCase):
    def test_find_potential_matches_returns_empty_when_no_users(self):
        mock_db = MagicMock()
        mock_db.query().filter().all.return_value = []

        result = find_potential_matches(mock_db, user_id=1)
        self.assertEqual(result, [])