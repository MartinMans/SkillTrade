// Profile page component with three main sections
const { useState, useEffect } = React;

function ProfilePage() {
  const [userProfile, setUserProfile] = useState({
    username: "John Doe",
    email: "john.doe@example.com",
    teachingSkills: [
      "Web Development",
      "JavaScript",
      "React"
    ],
    learningInterests: [
      "Spanish Language",
      "Digital Marketing",
      "UI/UX Design"
    ]
  });
  const [skillMatches, setSkillMatches] = useState([
    // Temporary mock data for testing
    {
      id: 1,
      username: "Sarah Chen",
      rating: 4.8,
      wantsToLearn: "Python Programming",
      canTeach: "Digital Marketing",
      matchScore: 95
    },
    {
      id: 2,
      username: "Michael Brown",
      rating: 4.6,
      wantsToLearn: "Spanish Language",
      canTeach: "Web Development",
      matchScore: 88
    },
    {
      id: 3,
      username: "Emma Wilson",
      rating: 4.9,
      wantsToLearn: "Guitar",
      canTeach: "French Language",
      matchScore: 85
    }
  ]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeSection, setActiveSection] = useState('matches');

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://127.0.0.1:8000/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new CustomEvent('loginStateChanged', { detail: { isLoggedIn: false } }));
    const root = document.getElementById('root');
    ReactDOM.render(React.createElement(HomePage), root);
  };

  const handleHomeClick = () => {
    const root = document.getElementById('root');
    ReactDOM.render(React.createElement(HomePage), root);
  };

  // Profile Section
  const ProfileSection = () => (
    <div className="profile-content">
      <div className="profile-header">
        <h2>My Profile</h2>
      </div>
      <div className="profile-details">
        <div className="user-info">
          <h3>{userProfile.username}</h3>
          <p>{userProfile.email}</p>
        </div>
        <div className="skills-container">
          <div className="skills-section">
            <h4>Skills I Can Teach</h4>
            <div className="skills-list">
              {userProfile.teachingSkills.map((skill, index) => (
                <div key={index} className="skill-tag">
                  {skill}
                  <button className="btn btn-sm btn-outline-danger ml-2">×</button>
                </div>
              ))}
              <button className="btn btn-outline-primary btn-sm mt-2">
                + Add Teaching Skills
              </button>
            </div>
          </div>
          <div className="skills-section">
            <h4>Skills I Want to Learn</h4>
            <div className="skills-list">
              {userProfile.learningInterests.map((skill, index) => (
                <div key={index} className="skill-tag">
                  {skill}
                  <button className="btn btn-sm btn-outline-danger ml-2">×</button>
                </div>
              ))}
              <button className="btn btn-outline-primary btn-sm mt-2">
                + Add Learning Interests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Matches Section
  const MatchesSection = () => (
    <div className="matches-content">
      <div className="matches-header">
        <h2>Potential Matches</h2>
        <p className="text-muted">People who match your learning interests</p>
      </div>
      <div className="matches-list">
        {skillMatches.map(match => (
          <div key={match.id} className="match-card">
            <div className="match-info">
              <div className="match-header">
                <h4>{match.username}</h4>
                <div className="rating">
                  <span className="stars">{'★'.repeat(Math.floor(match.rating))}</span>
                  <span className="rating-number">{match.rating}</span>
                </div>
              </div>
              <div className="skills-exchange">
                <div className="skill-item">
                  <span className="skill-label">Can teach you:</span>
                  <span className="skill-value">{match.canTeach}</span>
                </div>
                <div className="skill-item">
                  <span className="skill-label">Wants to learn:</span>
                  <span className="skill-value">{match.wantsToLearn}</span>
                </div>
              </div>
            </div>
            <div className="match-actions">
              <div className="match-score">
                <span className="score-label">Match</span>
                <span className="score-value">{match.matchScore}%</span>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  setSelectedChat(match);
                  setActiveSection('chats');
                }}
              >
                Start Chat
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Chats Section
  const ChatsSection = () => (
    <div className="chats-content">
      <div className="chats-header">
        <h2>Messages</h2>
      </div>
      {selectedChat ? (
        <div className="chat-container">
          <div className="chat-header">
            <h4>{selectedChat.username}</h4>
            <div className="chat-skills">
              <small>Teaching: {selectedChat.canTeach}</small>
              <small>Learning: {selectedChat.wantsToLearn}</small>
            </div>
          </div>
          <div className="chat-messages">
            <p className="text-center text-muted">Start your conversation!</p>
          </div>
          <div className="chat-input">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder="Type your message..."
              />
              <div className="input-group-append">
                <button className="btn btn-primary">Send</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-chat-selected">
          <p>Select a match to start chatting</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-nav">
        <div className="nav-left">
          <a 
            className="navbar-brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              const root = document.getElementById('root');
              ReactDOM.render(React.createElement(HomePage), root);
            }}
            style={{ 
              color: '#007bff',
              textDecoration: 'none',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            SkillTrade
          </a>
        </div>
        <div className="nav-center">
          <div 
            className={`nav-item ${activeSection === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            Profile
          </div>
          <div 
            className={`nav-item ${activeSection === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveSection('matches')}
          >
            Potential Matches
          </div>
          <div 
            className={`nav-item ${activeSection === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveSection('chats')}
          >
            Chats
          </div>
        </div>
        <div className="nav-right">
          <button 
            className="btn btn-outline-danger"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      </div>
      <div className="main-content">
        {activeSection === 'profile' && <ProfileSection />}
        {activeSection === 'matches' && <MatchesSection />}
        {activeSection === 'chats' && <ChatsSection />}
      </div>
    </div>
  );
}

// Update styles for the profile page
const style = document.createElement('style');
style.textContent = `
  body {
    padding-top: 0 !important;
    margin: 0;
  }

  .profile-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f8f9fa;
  }

  .profile-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: white;
    padding: 1rem 2rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    position: sticky;
    top: 0;
    z-index: 1000;
  }

  .nav-left {
    flex: 1;
  }

  .nav-center {
    flex: 2;
    display: flex;
    justify-content: center;
    gap: 2rem;
  }

  .nav-right {
    flex: 1;
    display: flex;
    justify-content: flex-end;
  }

  .nav-item {
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-weight: 500;
    color: #6c757d;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .nav-item:hover {
    color: #007bff;
  }

  .nav-item.active {
    color: #007bff;
    border-bottom-color: #007bff;
  }

  .main-content {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
  }

  .matches-content,
  .profile-content,
  .chats-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .matches-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .match-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .match-info {
    flex: 1;
  }

  .match-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }

  .match-header h4 {
    margin: 0;
    margin-right: 1rem;
  }

  .rating {
    display: flex;
    align-items: center;
    color: #ffc107;
  }

  .rating-number {
    margin-left: 0.5rem;
    color: #6c757d;
  }

  .skills-exchange {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .skill-item {
    display: flex;
    align-items: center;
  }

  .skill-label {
    color: #6c757d;
    width: 120px;
    font-size: 0.9rem;
  }

  .skill-value {
    font-weight: 500;
  }

  .match-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1rem;
  }

  .match-score {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .score-label {
    font-size: 0.8rem;
    color: #6c757d;
  }

  .score-value {
    font-size: 1.2rem;
    font-weight: bold;
    color: #28a745;
  }

  .skills-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 2rem;
  }

  .chat-container {
    background: white;
    border-radius: 8px;
    height: calc(100vh - 200px);
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    padding: 1rem;
    border-bottom: 1px solid #dee2e6;
  }

  .chat-messages {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
  }

  .chat-input {
    padding: 1rem;
    border-top: 1px solid #dee2e6;
  }

  .no-chat-selected {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6c757d;
  }

  .skill-tag {
    display: inline-flex;
    align-items: center;
    background-color: #e9ecef;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    margin: 0.25rem;
    font-size: 0.9rem;
  }

  .skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .skills-section {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .skills-section h4 {
    color: #495057;
    margin-bottom: 1rem;
  }

  .user-info {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    margin-bottom: 2rem;
  }

  .user-info h3 {
    margin: 0;
    color: #212529;
  }

  .user-info p {
    margin: 0.5rem 0 0;
    color: #6c757d;
  }
`;
document.head.appendChild(style);

// Make the component available globally
window.ProfilePage = ProfilePage;
console.log('ProfilePage component loaded');
window.markComponentLoaded(); 