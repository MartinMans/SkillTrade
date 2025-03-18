// Profile page component with three main sections
const { useState, useEffect, useRef } = React;

// Move AddSkillModal outside of ProfilePage
const AddSkillModal = ({ 
  show, 
  onClose, 
  onAddSkill, 
  skillType, 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  isSearching 
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (show) {
      setLocalSearchQuery(searchQuery);
      setSelectedIndex(-1);
      // Focus input when modal opens
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [show, searchQuery]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    setSearchQuery(value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' && selectedIndex < searchResults.length - 1) {
      e.preventDefault();
      setSelectedIndex(prev => prev + 1);
    } else if (e.key === 'ArrowUp' && selectedIndex > -1) {
      e.preventDefault();
      setSelectedIndex(prev => prev - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        onAddSkill(searchResults[selectedIndex].skill_id);
        onClose();
      } else if (localSearchQuery.trim()) {
        // Create new skill
        onAddSkill(null, localSearchQuery.trim());
        onClose();
      }
    }
  };

  const handleCreateNewSkill = () => {
    if (localSearchQuery.trim()) {
      onAddSkill(null, localSearchQuery.trim());
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="modal" style={{ display: 'block' }}>
      <div className="modal-content">
        <h3>Add {skillType === 'teach' ? 'Teaching' : 'Learning'} Skill</h3>
        <div className="skill-search">
          <input
            ref={inputRef}
            type="text"
            className="form-control"
            placeholder="Search or type a new skill..."
            value={localSearchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="skill-list">
          {isSearching ? (
            <div className="loading">Searching...</div>
          ) : (
            <>
              {searchResults.map((skill, index) => (
                <div 
                  key={skill.skill_id} 
                  className={`skill-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedIndex(index);
                    onAddSkill(skill.skill_id);
                    onClose();
                  }}
                >
                  {skill.skill_name}
                </div>
              ))}
              {localSearchQuery.trim() && searchResults.length === 0 && (
                <div 
                  className="create-new-skill"
                  onClick={handleCreateNewSkill}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-plus"></i>
                    </span>
                    <span className="form-control">
                      Create "{localSearchQuery.trim()}" as a new skill
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

function ProfilePage() {
  const [userProfile, setUserProfile] = useState({
    username: "",
    email: "",
    user_id: null,
    teachingSkills: [],
    learningInterests: []
  });
  const [availableSkills, setAvailableSkills] = useState([]);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [newSkillType, setNewSkillType] = useState(null); // 'teach' or 'learn'
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillMatches, setSkillMatches] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeSection, setActiveSection] = useState('matches');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [inputRef, setInputRef] = useState(null);

  // Fetch user profile data and available skills
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        // Fetch user profile
        const userResponse = await fetch('http://127.0.0.1:8000/users/me', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!userResponse.ok) {
          if (userResponse.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            window.dispatchEvent(new CustomEvent('loginStateChanged', { detail: { isLoggedIn: false } }));
            const root = document.getElementById('root');
            ReactDOM.render(React.createElement(HomePage), root);
            return;
          }
          const errorData = await userResponse.json();
          throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        }

        const userData = await userResponse.json();
        
        // Fetch user's skills
        const skillsResponse = await fetch(`http://127.0.0.1:8000/users/${userData.user_id}/skills/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!skillsResponse.ok) {
          const errorData = await skillsResponse.json();
          throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        }
        const skillsData = await skillsResponse.json();

        // Only update state if component is still mounted
        if (isMounted) {
          setUserProfile({
            ...userData,
            teachingSkills: skillsData.teaching.map(skill => skill.skill_name),
            learningInterests: skillsData.learning.map(skill => skill.skill_name)
          });
        }

        // Fetch available skills
        const availableSkillsResponse = await fetch('http://127.0.0.1:8000/skills/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        if (!availableSkillsResponse.ok) {
          const errorData = await availableSkillsResponse.json();
          throw new Error(typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
        }
        const availableSkillsData = await availableSkillsResponse.json();
        
        if (isMounted) {
          setAvailableSkills(availableSkillsData);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          // Handle error state
          setUserProfile(prev => ({
            ...prev,
            error: error.message
          }));
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array since we only want to fetch once on mount

  // Add debounced search function
  useEffect(() => {
    const searchSkills = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSelectedIndex(-1);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/skills/search/?query=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Failed to search skills');
        const data = await response.json();
        setSearchResults(data);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching skills:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchSkills, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]); // Only depend on searchQuery

  // Optimize handleAddSkill to handle both existing and new skills with optimistic updates
  const handleAddSkill = async (skillId, newSkillName = null) => {
    try {
      const token = localStorage.getItem('token');
      let finalSkillId = skillId;
      let skillName = '';

      // Optimistically update the UI
      if (skillId) {
        // For existing skills, find the skill name from availableSkills
        const existingSkill = availableSkills.find(s => s.skill_id === skillId);
        if (existingSkill) {
          skillName = existingSkill.skill_name;
        }
      } else if (newSkillName) {
        // For new skills, use the provided name
        skillName = newSkillName.trim();
      }

      // Optimistically update the UI
      setUserProfile(prev => ({
        ...prev,
        teachingSkills: newSkillType === 'teach' 
          ? [...prev.teachingSkills, skillName]
          : prev.teachingSkills,
        learningInterests: newSkillType === 'learn'
          ? [...prev.learningInterests, skillName]
          : prev.learningInterests
      }));

      // If no skillId is provided, create a new skill
      if (!skillId && newSkillName) {
        const createResponse = await fetch('http://127.0.0.1:8000/skills/get-or-create/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ skill_name: newSkillName.trim() })
        });

        if (!createResponse.ok) {
          // Revert the optimistic update
          setUserProfile(prev => ({
            ...prev,
            teachingSkills: newSkillType === 'teach'
              ? prev.teachingSkills.filter(s => s !== skillName)
              : prev.teachingSkills,
            learningInterests: newSkillType === 'learn'
              ? prev.learningInterests.filter(s => s !== skillName)
              : prev.learningInterests
          }));
          const errorData = await createResponse.json();
          throw new Error(errorData.detail || 'Failed to create skill');
        }
        const newSkill = await createResponse.json();
        finalSkillId = newSkill.skill_id;
      }

      // Add the skill to the user
      const response = await fetch(`http://127.0.0.1:8000/users/${userProfile.user_id}/skills/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skill_id: finalSkillId,
          type: newSkillType
        })
      });

      if (!response.ok) {
        // Revert the optimistic update
        setUserProfile(prev => ({
          ...prev,
          teachingSkills: newSkillType === 'teach'
            ? prev.teachingSkills.filter(s => s !== skillName)
            : prev.teachingSkills,
          learningInterests: newSkillType === 'learn'
            ? prev.learningInterests.filter(s => s !== skillName)
            : prev.learningInterests
        }));
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add skill');
      }

      // Reset search state
      setSearchQuery('');
      setSearchResults([]);

    } catch (error) {
      console.error('Error adding skill:', error);
      // Show error message to user
      alert(error.message || 'Failed to add skill. Please try again.');
    }
  };

  const handleRemoveSkill = async (skillName, type) => {
    try {
      const token = localStorage.getItem('token');

      // Optimistically update the UI
      setUserProfile(prev => ({
        ...prev,
        teachingSkills: type === 'teach'
          ? prev.teachingSkills.filter(s => s !== skillName)
          : prev.teachingSkills,
        learningInterests: type === 'learn'
          ? prev.learningInterests.filter(s => s !== skillName)
          : prev.learningInterests
      }));

      // First, get the user's skills to find the correct user_skill entry
      const skillsResponse = await fetch(`http://127.0.0.1:8000/users/${userProfile.user_id}/skills/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!skillsResponse.ok) {
        // Revert the optimistic update
        setUserProfile(prev => ({
          ...prev,
          teachingSkills: type === 'teach'
            ? [...prev.teachingSkills, skillName]
            : prev.teachingSkills,
          learningInterests: type === 'learn'
            ? [...prev.learningInterests, skillName]
            : prev.learningInterests
        }));
        const errorData = await skillsResponse.json();
        throw new Error(errorData.detail || 'Failed to fetch user skills');
      }

      const skillsData = await skillsResponse.json();
      
      // Find the skill in the correct category (teaching or learning)
      const skillList = type === 'teach' ? skillsData.teaching : skillsData.learning;
      const targetSkill = skillList.find(s => s.skill_name === skillName);
      
      if (!targetSkill) {
        // Revert the optimistic update
        setUserProfile(prev => ({
          ...prev,
          teachingSkills: type === 'teach'
            ? [...prev.teachingSkills, skillName]
            : prev.teachingSkills,
          learningInterests: type === 'learn'
            ? [...prev.learningInterests, skillName]
            : prev.learningInterests
        }));
        throw new Error('Skill not found in user skills');
      }

      // Delete the skill
      const response = await fetch(
        `http://127.0.0.1:8000/users/${userProfile.user_id}/skills/${targetSkill.skill_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        // Revert the optimistic update
        setUserProfile(prev => ({
          ...prev,
          teachingSkills: type === 'teach'
            ? [...prev.teachingSkills, skillName]
            : prev.teachingSkills,
          learningInterests: type === 'learn'
            ? [...prev.learningInterests, skillName]
            : prev.learningInterests
        }));
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove skill');
      }

    } catch (error) {
      console.error('Error removing skill:', error);
      // Show error message to user
      alert(error.message || 'Failed to remove skill. Please try again.');
    }
  };

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

  const handleCreateNewSkill = async () => {
    if (!newSkillName.trim()) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/skills/get-or-create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ skill_name: newSkillName.trim() })
      });

      if (!response.ok) throw new Error('Failed to create skill');
      const newSkill = await response.json();
      await handleAddSkill(newSkill.skill_id, newSkillType);
      setNewSkillName('');
      setShowCreateNew(false);
    } catch (error) {
      console.error('Error creating new skill:', error);
    }
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
                  <button 
                    className="btn btn-sm btn-outline-danger ml-2"
                    onClick={() => handleRemoveSkill(skill, 'teach')}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button 
                className="btn btn-outline-primary btn-sm mt-2"
                onClick={() => {
                  setNewSkillType('teach');
                  setShowAddSkillModal(true);
                }}
              >
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
                  <button 
                    className="btn btn-sm btn-outline-danger ml-2"
                    onClick={() => handleRemoveSkill(skill, 'learn')}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button 
                className="btn btn-outline-primary btn-sm mt-2"
                onClick={() => {
                  setNewSkillType('learn');
                  setShowAddSkillModal(true);
                }}
              >
                + Add Learning Interests
              </button>
            </div>
          </div>
        </div>
      </div>
      <AddSkillModal 
        show={showAddSkillModal}
        onClose={() => {
          setShowAddSkillModal(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        onAddSkill={handleAddSkill}
        skillType={newSkillType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
      />
    </div>
  );

  // Matches Section
  const MatchesSection = () => {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      const fetchMatches = async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch("http://127.0.0.1:8000/matches/", {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to fetch matches");
          }

          const data = await response.json();
          setMatches(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      fetchMatches();
    }, []);

    if (loading) return <div className="loading">Loading matches...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (matches.length === 0) return <div className="no-matches">No matches found.</div>;

    return (
      <div className="matches-content">
        <h2>Potential Matches</h2>
        <div className="matches-grid">
          {matches.map((match) => (
            <div key={match.match_id} className="match-card">
              <div className="match-info">
                <h3>{match.username}</h3>
                <div className="skills-section">
                  <div className="teaching-skills">
                    <h4>Teaches:</h4>
                    <ul>
                      {match.teaching.map((skill, index) => (
                        <li key={index}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="learning-skills">
                    <h4>Wants to Learn:</h4>
                    <ul>
                      {match.learning.map((skill, index) => (
                        <li key={index}>{skill}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rating">
                  <span>Rating: {match.rating.toFixed(1)} ⭐</span>
                </div>
              </div>
              <div className="match-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={() => startChat(match)}
                >
                  Start Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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