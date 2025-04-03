from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..dependencies import get_db, get_current_user

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

@router.post("/", response_model=schemas.ReportIssueResponse)
def create_report(
    report: schemas.ReportIssueCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify the match exists and current user is part of it
    match = db.query(models.Match).filter(
        models.Match.match_id == report.match_id,
        (models.Match.user1_id == current_user.user_id) | 
        (models.Match.user2_id == current_user.user_id)
    ).first()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found or you are not part of this match")
    
    # Verify the reported user is part of the match
    if report.reported_user_id not in [match.user1_id, match.user2_id]:
        raise HTTPException(status_code=400, detail="Reported user must be part of the match")
    
    # Create the report
    db_report = models.FraudFlag(
        reporter_id=current_user.user_id,
        reported_user_id=report.reported_user_id,
        match_id=report.match_id,
        message=report.message
    )
    
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    
    return db_report

@router.get("/", response_model=List[schemas.ReportIssueResponse])
def get_reports(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only return reports where the current user is either the reporter or reported user
    reports = db.query(models.FraudFlag).filter(
        (models.FraudFlag.reporter_id == current_user.user_id) |
        (models.FraudFlag.reported_user_id == current_user.user_id)
    ).all()
    
    return reports 