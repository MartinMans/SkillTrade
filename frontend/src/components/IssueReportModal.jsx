import React, { useState } from 'react';

function IssueReportModal({ show, onClose, onSubmit, matchId }) {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(description);
      onClose();
    } catch (error) {
      console.error('Error submitting issue report:', error);
      alert('Failed to submit issue report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div 
        className="modal fade show" 
        style={{ 
          display: 'block',
          zIndex: 1050 
        }} 
        tabIndex="-1"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Report an Issue</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="issueDescription" className="form-label">Describe the Issue</label>
                  <textarea
                    className="form-control"
                    id="issueDescription"
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe what went wrong during the trade session..."
                    required
                  />
                </div>
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  By submitting this report, you will be removed from the current trade session.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  disabled={isSubmitting || !description.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-flag me-2"></i>
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
      ></div>
    </>
  );
}

export default IssueReportModal; 