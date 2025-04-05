import React from 'react';

function Features() {
  return (
    <section id="features" className="features-section">
      <div className="container">
        <div className="section-title">
          <h2>FEATURES</h2>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-people-fill"></i>
            </div>
            <h3>Skill Matching</h3>
            <p>Advanced algorithm matches you with perfect skill exchange partners based on your expertise and learning goals.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-chat-dots-fill"></i>
            </div>
            <h3>Real-time Chat</h3>
            <p>Integrated messaging system for seamless communication with your skill exchange partners.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-shield-check"></i>
            </div>
            <h3>Secure Trading</h3>
            <p>Built-in verification and rating system ensures safe and reliable skill exchanges.</p>
          </div>
          
          <div className="feature-card">
            <div className="feature-icon">
              <i className="bi bi-graph-up"></i>
            </div>
            <h3>Progress Tracking</h3>
            <p>Monitor your learning progress and skill development through our intuitive dashboard.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Features; 