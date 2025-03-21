import React from 'react';

function TradeGuidelinesModal({ show, onClose, onConfirm }) {
  if (!show) return null;

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
        <div className="modal-dialog modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Trade Guidelines</h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <div className="modal-body">
              <h6 className="mb-3">Please review these guidelines for a safe and fair trade:</h6>
              
              <div className="guidelines-section mb-4">
                <h6 className="text-primary">🤝 Fair Exchange</h6>
                <ul>
                  <li>Clearly communicate what skills you will teach and learn</li>
                  <li>Agree on the scope and expectations of the skill exchange</li>
                  <li>Be respectful of each other's time and learning pace</li>
                </ul>
              </div>

              <div className="guidelines-section mb-4">
                <h6 className="text-warning">⚠️ Safety First</h6>
                <ul>
                  <li>Keep all communications within the platform</li>
                  <li>Do not share personal contact information until you feel comfortable</li>
                  <li>Report any inappropriate behavior to platform administrators</li>
                </ul>
              </div>

              <div className="guidelines-section mb-4">
                <h6 className="text-success">✅ Best Practices</h6>
                <ul>
                  <li>Set clear goals and milestones for the skill exchange</li>
                  <li>Provide constructive feedback</li>
                  <li>Be patient and understanding with your trading partner</li>
                  <li>Schedule sessions at mutually convenient times</li>
                </ul>
              </div>

              <div className="alert alert-info">
                <strong>Remember:</strong> By proceeding with this trade, you agree to follow these guidelines and maintain a respectful learning environment.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="button" className="btn btn-success" onClick={onConfirm}>Confirm Trade</button>
            </div>
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

export default TradeGuidelinesModal; 