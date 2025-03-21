from enum import Enum

class SkillType(str, Enum):
    TEACH = "teach"
    LEARN = "learn"

class MatchStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"
    COMMITTED = "committed"
    FLAGGED = "flagged"

class TradeStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    COMPLETED = "completed"
    CANCELLED = "cancelled" 