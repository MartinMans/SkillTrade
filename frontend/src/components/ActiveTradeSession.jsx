import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import ReportIssueModal from './ReportIssueModal';

const ActiveTradeSession = ({ match, currentUser, onEndSession }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [error, setError] = useState('');

  const handleEndSession = async () => {
    try {
      await onEndSession(match.match_id);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while ending the session.');
    }
  };

  const getOtherUserId = () => {
    return match.user1_id === currentUser.user_id ? match.user2_id : match.user1_id;
  };

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Active Trade Session</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <p className="mb-1">Match ID: {match.match_id}</p>
            <p className="mb-1">Status: {match.match_status}</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="danger" onClick={() => setShowReportModal(true)}>
              Report Issue
            </Button>
            <Button variant="primary" onClick={handleEndSession}>
              End Session
            </Button>
          </div>
        </div>
      </Card.Body>

      <ReportIssueModal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        matchId={match.match_id}
        reportedUserId={getOtherUserId()}
      />
    </Card>
  );
};

export default ActiveTradeSession; 