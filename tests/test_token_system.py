import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import SessionLocal
from backend.app import crud, schemas, models
from passlib.context import CryptContext

client = TestClient(app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TestTradeFlow(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.email1 = "testuser1@example.com"
        self.email2 = "testuser2@example.com"
        self.password = "password123"

        # Clean up users and matches before test
        self.db.query(models.Match).delete()
        self.db.query(models.User).filter(models.User.email.in_([self.email1, self.email2])).delete()
        self.db.commit()

        # Create users manually
        hashed_pw = pwd_context.hash(self.password)
        self.user1 = models.User(username="User1", email=self.email1, password_hash=hashed_pw)
        self.user2 = models.User(username="User2", email=self.email2, password_hash=hashed_pw)
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

        # Create a match between them
        self.match = models.Match(user1_id=self.user1.user_id, user2_id=self.user2.user_id, match_status="pending")
        self.db.add(self.match)
        self.db.commit()
        self.db.refresh(self.match)

    def tearDown(self):
        self.db.query(models.Match).delete()
        self.db.query(models.User).filter(models.User.email.in_([self.email1, self.email2])).delete()
        self.db.commit()
        self.db.close()

    def login(self, email):
        response = client.post("/login", data={"username": email, "password": self.password})
        self.assertEqual(response.status_code, 200)
        return response.json()["access_token"]

    def test_trade_flow_user1_starts_user2_accepts(self):
        # User1 starts trade
        token1 = self.login(self.email1)
        response = client.post(
            f"/matches/{self.match.match_id}/start-trade",
            headers={"Authorization": f"Bearer {token1}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["match_status"], "pending_trade")

        # User2 accepts trade (this will finalize it)
        token2 = self.login(self.email2)
        response = client.post(
            f"/matches/{self.match.match_id}/start-trade",
            headers={"Authorization": f"Bearer {token2}"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["match_status"], "in_trade")