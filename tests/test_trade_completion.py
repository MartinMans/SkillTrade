import unittest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db import SessionLocal
from backend.app import crud, schemas, models
from passlib.context import CryptContext

client = TestClient(app)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TestTradeCompletion(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

        # Clean full DB before setting up test data
        self.db.query(models.Rating).delete()
        self.db.query(models.TradeHistory).delete()
        self.db.query(models.Trade).delete()
        self.db.query(models.Match).delete()
        self.db.query(models.User).filter(models.User.email.in_([
            "user1@example.com", "user2@example.com"
        ])).delete()
        self.db.commit()

        self.email1 = "user1@example.com"
        self.email2 = "user2@example.com"
        self.password = "password123"

        hashed_pw = pwd_context.hash(self.password)

        # Create two users
        self.user1 = models.User(username="User1", email=self.email1, password_hash=hashed_pw)
        self.user2 = models.User(username="User2", email=self.email2, password_hash=hashed_pw)
        self.db.add_all([self.user1, self.user2])
        self.db.commit()
        self.db.refresh(self.user1)
        self.db.refresh(self.user2)

        # Create match
        self.match = models.Match(
            user1_id=self.user1.user_id,
            user2_id=self.user2.user_id,
            match_status="pending"
        )
        self.db.add(self.match)
        self.db.commit()
        self.db.refresh(self.match)

    def tearDown(self):
        self.db.query(models.Rating).delete()  # Optional, in case we test ratings later
        self.db.query(models.TradeHistory).delete()
        self.db.query(models.Trade).delete()
        self.db.query(models.Match).delete()
        self.db.query(models.User).filter(models.User.email.in_([self.email1, self.email2])).delete()
        self.db.commit()
        self.db.close()

    def login(self, email):
        response = client.post("/login", data={"username": email, "password": self.password})
        self.assertEqual(response.status_code, 200)
        return response.json()["access_token"]

    def test_complete_trade_flow(self):
        token1 = self.login(self.email1)
        token2 = self.login(self.email2)

        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        # User1 starts trade
        response = client.post(f"/matches/{self.match.match_id}/start-trade", headers=headers1)
        self.assertEqual(response.status_code, 200)

        # User2 accepts trade
        response = client.post(f"/matches/{self.match.match_id}/start-trade", headers=headers2)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["match_status"], "in_trade")

        # Manually get Trade ID from DB
        trade = self.db.query(models.Trade).filter(models.Trade.match_id == self.match.match_id).first()
        self.assertIsNotNone(trade)

        # User1 marks teaching and learning done
        for user_position in ["user1", "user2"]:
            for skill_type in ["teaching", "learning"]:
                response = client.post(
                    f"/trades/{self.match.match_id}/update",
                    headers=headers1,
                    json={"user_position": user_position, "type": skill_type, "completed": True}
                )
                self.assertEqual(response.status_code, 200)

        # User1 completes the trade
        response = client.post(f"/trades/{self.match.match_id}/complete", headers=headers1)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "completed")