import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import axios from 'axios';

const ReportIssueModal = ({ show, onHide, matchId, reportedUserId }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/reports/`, {
        reported_user_id: reportedUserId,
        match_id: matchId,
        message: message
      });

      setSuccess(true);
      setMessage('');
      setTimeout(() => {
        onHide();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred while submitting the report.');
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Report Issue</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">Report submitted successfully!</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Please describe the issue:</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              placeholder="Provide details about the issue..."
            />
          </Form.Group>
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={success}>
              Submit Report
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default ReportIssueModal; 