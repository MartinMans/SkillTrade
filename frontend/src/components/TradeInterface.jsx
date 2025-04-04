import React, { useState, useEffect } from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Rating } from '@mui/material';
import IssueReportModal from './IssueReportModal';

const TradeInterface = ({ match, userProfile }) => {
  const [tradeStatus, setTradeStatus] = useState({
    user1_teaching_done: false,
    user1_learning_done: false,
    user2_teaching_done: false,
    user2_learning_done: false,
    user1_skill: '',
    user2_skill: '',
    status: 'active'
  });

  const [isCompleting, setIsCompleting] = useState(false);
  const [rating, setRating] = useState(5);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserTeachingSkill = userProfile.teachingSkills[0]?.skill_name;
  const isUser1 = tradeStatus.user1_skill === currentUserTeachingSkill;
  const partner = match.username;

  // Fetch trade status
  useEffect(() => {
    const fetchTradeStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${match.match_id}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch trade status');
        }

        const data = await response.json();
        setTradeStatus(data);
      } catch (error) {
        console.error('Error fetching trade status:', error);
      }
    };

    // Fetch immediately and then every 5 seconds
    fetchTradeStatus();
    const interval = setInterval(fetchTradeStatus, 5000);

    return () => clearInterval(interval);
  }, [match.match_id]);

  const handleMarkComplete = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const userPosition = isUser1 ? 'user1' : 'user2';
      
      // When marking learning as complete, we need to consider the perspective
      // If user1 is learning, they're confirming user2's teaching
      // If user2 is learning, they're confirming user1's teaching
      const learningPosition = type === 'learning' ? 
        (isUser1 ? 'user2' : 'user1') : 
        userPosition;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${match.match_id}/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          user_position: learningPosition,
          completed: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update trade status');
      }

      const data = await response.json();
      setTradeStatus(data);
    } catch (error) {
      console.error('Error updating trade status:', error);
      alert(error.message || 'Failed to update trade status. Please try again.');
    }
  };

  const handleCompleteTrade = async () => {
    if (!window.confirm(`Are you sure you want to complete this trade with a ${rating}-star rating? This action cannot be undone.`)) {
        return;
    }

    try {
        setIsCompleting(true);
        const token = localStorage.getItem('token');

        // First submit the rating
        const ratingResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${match.match_id}/rate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                score: rating
            })
        });

        if (!ratingResponse.ok) {
            const error = await ratingResponse.json();
            throw new Error(error.detail || 'Failed to submit rating');
        }

        // Then complete the trade
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${match.match_id}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to complete trade');
        }

        alert('Trade completed successfully! The page will now refresh.');
        window.location.href = '/dashboard';
    } catch (error) {
        console.error('Error completing trade:', error);
        alert(error.message || 'Failed to complete trade. Please try again.');
    } finally {
        setIsCompleting(false);
    }
  };

  const handleReportIssue = async (description) => {
    try {
        setIsSubmitting(true);
        const token = localStorage.getItem('token');
        
        // First get the trade_id for this match
        const tradeResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${match.match_id}/trade`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!tradeResponse.ok) {
            const error = await tradeResponse.json();
            throw new Error(error.detail || 'Failed to get trade information');
        }

        const tradeData = await tradeResponse.json();
        
        // Submit the issue report
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${match.match_id}/report-issue`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description,
                trade_id: tradeData.trade_id
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit issue report');
        }

        // Show success message
        alert('Issue reported successfully. You will be redirected to your dashboard.');
        
        // Clear any local storage or state related to the current trade
        localStorage.removeItem('currentTrade');
        localStorage.removeItem('currentMatch');
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
    } catch (error) {
        console.error('Error reporting issue:', error);
        alert(error.message || 'Failed to submit issue report. Please try again.');
    } finally {
        setIsSubmitting(false);
    }
  };

  // Get the current user's teaching and learning skills based on their position
  const userTeachingSkill = isUser1 ? tradeStatus.user1_skill : tradeStatus.user2_skill;
  const userLearningSkill = isUser1 ? tradeStatus.user2_skill : tradeStatus.user1_skill;
  
  // Get completion status for the current user's perspective
  const userTeachingDone = isUser1 ? tradeStatus.user1_teaching_done : tradeStatus.user2_teaching_done;
  const userLearningDone = isUser1 ? tradeStatus.user2_learning_done : tradeStatus.user1_learning_done;
  const partnerTeachingDone = isUser1 ? tradeStatus.user2_teaching_done : tradeStatus.user1_teaching_done;
  const partnerLearningDone = isUser1 ? tradeStatus.user1_learning_done : tradeStatus.user2_learning_done;

  const allTasksComplete = 
    tradeStatus.user1_teaching_done && 
    tradeStatus.user1_learning_done && 
    tradeStatus.user2_teaching_done && 
    tradeStatus.user2_learning_done;

  return (
    <Card className="trade-interface">
      <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Active Trade Session</h5>
        <Badge bg="light" text="dark">{tradeStatus.status}</Badge>
      </Card.Header>
      <Card.Body>
        <div className="trade-participants mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div className="participant">
              <h6 className="mb-1">You ({userProfile.username})</h6>
              <div className="d-flex align-items-center mb-2">
                <Rating value={userProfile.rating || 5} readOnly size="small" />
                <span className="ms-1 text-muted">({userProfile.rating || 5}/5)</span>
              </div>
              <Badge bg="info">Teaching: {userTeachingSkill}</Badge>
              <Badge bg="secondary" className="ms-2">Learning: {userLearningSkill}</Badge>
            </div>
            <div className="trade-arrow">
              <i className="bi bi-arrow-left-right fs-4"></i>
            </div>
            <div className="participant">
              <h6 className="mb-1">{partner}</h6>
              <div className="d-flex align-items-center mb-2">
                <Rating value={match.rating || 5} readOnly size="small" />
                <span className="ms-1 text-muted">({match.rating || 5}/5)</span>
              </div>
              <Badge bg="info">Teaching: {userLearningSkill}</Badge>
              <Badge bg="secondary" className="ms-2">Learning: {userTeachingSkill}</Badge>
            </div>
          </div>
        </div>

        <div className="trade-progress">
          <h6 className="mb-3">Trade Progress</h6>
          <div className="progress-grid">
            <div className="progress-item">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Teaching {userTeachingSkill}</span>
                {userTeachingDone ? (
                  <Badge bg="success">
                    <i className="bi bi-check-circle me-1"></i>
                    Complete
                  </Badge>
                ) : (
                  <button 
                    className="btn btn-outline-success btn-sm"
                    onClick={() => handleMarkComplete('teaching')}
                  >
                    Mark as Complete
                  </button>
                )}
              </div>
              <div className="progress">
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: userTeachingDone ? '100%' : '0%' }}
                ></div>
              </div>
            </div>

            <div className="progress-item">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Learning {userLearningSkill}</span>
                <div className="d-flex align-items-center gap-2">
                  {partnerTeachingDone && (
                    <Badge bg="info" className="me-2">Partner Ready</Badge>
                  )}
                  {userLearningDone ? (
                    <Badge bg="success">
                      <i className="bi bi-check-circle me-1"></i>
                      Complete
                    </Badge>
                  ) : (
                    <button 
                      className="btn btn-outline-success btn-sm"
                      onClick={() => handleMarkComplete('learning')}
                      disabled={!partnerTeachingDone}
                      title={!partnerTeachingDone ? "Wait for your partner to complete teaching" : ""}
                    >
                      Mark as Complete
                    </button>
                  )}
                </div>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar bg-success" 
                  style={{ width: userLearningDone ? '100%' : '0%' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="trade-actions mt-4">
          <button 
            className="btn btn-outline-danger"
            onClick={() => setShowIssueModal(true)}
          >
            <i className="bi bi-flag me-2"></i>
            Report Issue
          </button>
          {allTasksComplete && (
            <div className="d-flex align-items-center gap-3">
              <Rating
                value={rating}
                onChange={(event, newValue) => {
                  setRating(newValue);
                }}
                size="large"
              />
              <button 
                className="btn btn-success"
                onClick={handleCompleteTrade}
                disabled={isCompleting}
              >
                <i className={`bi ${isCompleting ? 'bi-hourglass-split' : 'bi-check-circle'} me-2`}></i>
                {isCompleting ? 'Completing...' : 'Complete Trade'}
              </button>
            </div>
          )}
        </div>
      </Card.Body>

      <IssueReportModal
        show={showIssueModal}
        onClose={() => setShowIssueModal(false)}
        onSubmit={handleReportIssue}
        matchId={match.match_id}
      />
    </Card>
  );
};

export default TradeInterface; 