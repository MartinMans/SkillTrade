from enum import Enum

class SkillType(str, Enum):
    TEACH = "teach"
    LEARN = "learn"

class MatchStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    PENDING_TRADE = "pending_trade"
    IN_TRADE = "in_trade"
    COMPLETED = "completed"

class TradeStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled" 