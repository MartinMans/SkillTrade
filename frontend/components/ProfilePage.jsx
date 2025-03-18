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

// Add NoSkillsWarning component before ProfilePage function
const NoSkillsWarning = ({ onNavigateToProfile }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="alert alert-warning alert-dismissible fade show" role="alert">
      <strong>No skills added yet!</strong> You haven't added any skills yet. Go to your profile to add skills and start matching!
      <div className="mt-2">
        <button 
          className="btn btn-primary me-2" 
          onClick={onNavigateToProfile}
        >
          Go to Profile
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
      <button 
        type="button" 
        className="btn-close" 
        onClick={() => setDismissed(true)} 
        aria-label="Close"
      ></button>
    </div>
  );
};

// Add LoadingSpinner component before ProfilePage
const LoadingSpinner = ({ text = "Loading..." }) => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <span className="loading-text">{text}</span>
  </div>
);

// Update FullPageLoader component
const FullPageLoader = () => (
  <div className="full-page-loader">
    <div className="loader-content">
      <div className="loading-spinner"></div>
      <h2 className="loading-title">Loading Your Profile!</h2>
      <p className="loading-subtitle">This may take a moment.</p>
    </div>
  </div>
);

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
  const [hasSkills, setHasSkills] = useState(false);
  const [hasRequiredSkills, setHasRequiredSkills] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile data and available skills
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setProfileLoading(true); // Show loading screen immediately

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No token found');
        }

        // Fetch all data in parallel for better performance
        const [userResponse, skillsResponse, availableSkillsResponse] = await Promise.all([
          // Fetch user profile
          fetch('http://127.0.0.1:8000/users/me', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          // Fetch user's skills
          fetch(`http://127.0.0.1:8000/users/me/skills/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          // Fetch available skills
          fetch('http://127.0.0.1:8000/skills/', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        ]);

        // Handle unauthorized access
        if (userResponse.status === 401) {
          localStorage.removeItem('token');
          window.dispatchEvent(new CustomEvent('loginStateChanged', { detail: { isLoggedIn: false } }));
          const root = document.getElementById('root');
          ReactDOM.render(React.createElement(HomePage), root);
          return;
        }

        // Check if any request failed
        if (!userResponse.ok || !skillsResponse.ok || !availableSkillsResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        // Parse all responses
        const [userData, skillsData, availableSkillsData] = await Promise.all([
          userResponse.json(),
          skillsResponse.json(),
          availableSkillsResponse.json()
        ]);

        if (isMounted) {
          const teachingSkills = skillsData.teaching.map(skill => skill.skill_name);
          const learningSkills = skillsData.learning.map(skill => skill.skill_name);
          
          setUserProfile({
            ...userData,
            teachingSkills,
            learningInterests: learningSkills
          });

          setAvailableSkills(availableSkillsData);
          
          // Update skill states
          const hasTeachingSkills = teachingSkills.length > 0;
          const hasLearningSkills = learningSkills.length > 0;
          setHasSkills(hasTeachingSkills || hasLearningSkills);
          setHasRequiredSkills(hasTeachingSkills && hasLearningSkills);

          // Add a small delay before hiding the loader for smoother transition
          setTimeout(() => {
            if (isMounted) {
              setProfileLoading(false);
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setUserProfile(prev => ({
            ...prev,
            error: error.message
          }));
          setProfileLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  // Update the useEffect that checks for skills
  useEffect(() => {
    const hasTeachingSkills = userProfile.teachingSkills.length > 0;
    const hasLearningSkills = userProfile.learningInterests.length > 0;
    setHasSkills(hasTeachingSkills || hasLearningSkills); // For general UI warnings
    setHasRequiredSkills(hasTeachingSkills && hasLearningSkills); // For matches specifically
  }, [userProfile.teachingSkills, userProfile.learningInterests]);

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
      const updatedTeachingSkills = newSkillType === 'teach' 
        ? [...userProfile.teachingSkills, skillName]
        : userProfile.teachingSkills;
      const updatedLearningSkills = newSkillType === 'learn'
        ? [...userProfile.learningInterests, skillName]
        : userProfile.learningInterests;

      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedTeachingSkills,
        learningInterests: updatedLearningSkills
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
            teachingSkills: updatedTeachingSkills.filter(s => s !== skillName),
            learningInterests: updatedLearningSkills.filter(s => s !== skillName)
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
          teachingSkills: updatedTeachingSkills.filter(s => s !== skillName),
          learningInterests: updatedLearningSkills.filter(s => s !== skillName)
        }));
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add skill');
      }

      // Reset search state
      setSearchQuery('');
      setSearchResults([]);

      // Skills state will be automatically updated by the useEffect above
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
      const updatedTeachingSkills = type === 'teach'
        ? userProfile.teachingSkills.filter(s => s !== skillName)
        : userProfile.teachingSkills;
      const updatedLearningSkills = type === 'learn'
        ? userProfile.learningInterests.filter(s => s !== skillName)
        : userProfile.learningInterests;

      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedTeachingSkills,
        learningInterests: updatedLearningSkills
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
          teachingSkills: updatedTeachingSkills,
          learningInterests: updatedLearningSkills
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
          teachingSkills: updatedTeachingSkills,
          learningInterests: updatedLearningSkills
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
          teachingSkills: updatedTeachingSkills,
          learningInterests: updatedLearningSkills
        }));
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove skill');
      }

      // Skills state will be automatically updated by the useEffect above
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
        <h2 className="section-title text-center mb-4">My Profile</h2>
      </div>
      <div className="profile-details">
        <div className="user-info">
          <h3>{userProfile.username}</h3>
          <p>{userProfile.email}</p>
        </div>
        <div className="profile-skills-container">
          <div className="skills-section">
            <h4>Skills I Can Teach</h4>
            <div className="skills-list">
              {userProfile.teachingSkills.map((skill, index) => (
                <div key={index} className="skill-tag">
                  {skill}
                  <button 
                    className="btn-remove"
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
                    className="btn-remove"
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [matches, setMatches] = useState([]);
    const [cachedMatches, setCachedMatches] = useState(() => {
      const savedMatches = localStorage.getItem("cachedMatches");
      return savedMatches ? JSON.parse(savedMatches) : null;
    });
    const [lastSkills, setLastSkills] = useState(() => localStorage.getItem("lastSkills") || null);
    const [skillsValidated, setSkillsValidated] = useState(false);

    // First useEffect to validate skills
    useEffect(() => {
      let isMounted = true;

      const validateSkills = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No token found');
          }

          // Fetch user's skills to validate
          const skillsResponse = await fetch(`http://127.0.0.1:8000/users/${userProfile.user_id}/skills/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!skillsResponse.ok) {
            throw new Error('Failed to validate skills');
          }

          const skillsData = await skillsResponse.json();
          const currentSkills = JSON.stringify(skillsData); // Convert to string for comparison
          
          if (isMounted) {
            // Update the hasRequiredSkills state based on the fresh data
            const hasTeachingSkills = skillsData.teaching.length > 0;
            const hasLearningSkills = skillsData.learning.length > 0;
            setHasRequiredSkills(hasTeachingSkills && hasLearningSkills);
            setSkillsValidated(true);
            
            // If skills haven't changed and we have cached matches, use them
            if (lastSkills === currentSkills && cachedMatches) {
              setMatches(cachedMatches);
              setIsLoading(false);
              return;
            }

            // Update last known skills state
            setLastSkills(currentSkills);
            localStorage.setItem("lastSkills", currentSkills);
            
            // Only stop loading if we're not going to fetch matches
            if (!(hasTeachingSkills && hasLearningSkills)) {
              setIsLoading(false);
            }
          }
        } catch (error) {
          if (isMounted) {
            setError(error.message);
            setHasRequiredSkills(false);
            setSkillsValidated(true);
            setIsLoading(false);
          }
        }
      };

      validateSkills();

      return () => {
        isMounted = false;
      };
    }, [userProfile.user_id, lastSkills, cachedMatches]);

    // Second useEffect to fetch matches only after skills are validated
    useEffect(() => {
      let isMounted = true;

      const fetchMatches = async () => {
        // Only proceed if skills are validated, required, and either no cache or skills changed
        if (!skillsValidated || !hasRequiredSkills || (lastSkills && cachedMatches)) {
          if (skillsValidated) {
            setIsLoading(false);
          }
          return;
        }

        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('No token found');
          }

          const response = await fetch('http://127.0.0.1:8000/matches/', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch matches');
          }

          const data = await response.json();
          if (isMounted) {
            setMatches(data || []);
            setCachedMatches(data || []); // Cache the matches
            localStorage.setItem("cachedMatches", JSON.stringify(data || []));
          }
        } catch (error) {
          if (isMounted) {
            setError(error.message);
            setMatches([]);
            setCachedMatches(null);
            localStorage.removeItem("cachedMatches");
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchMatches();

      return () => {
        isMounted = false;
      };
    }, [skillsValidated, hasRequiredSkills, lastSkills]);

    // Show loading state while validating skills or fetching matches
    if (isLoading) {
      return (
        <div className="section matches-section">
          <h2 className="section-title text-center mb-4">Potential Matches</h2>
          <div className="matches-loading-wrapper">
            <div className="matches-loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">Loading Matches...</span>
            </div>
          </div>
        </div>
      );
    }

    // Only show the warning after skills have been validated
    if (skillsValidated && !hasRequiredSkills) {
      return (
        <div className="section matches-section">
          <h2 className="section-title text-center mb-4">Potential Matches</h2>
          <div className="alert alert-warning text-center">
            <p className="mb-3">
              {!userProfile.teachingSkills.length && !userProfile.learningInterests.length
                ? "You haven't added any skills yet."
                : !userProfile.teachingSkills.length
                ? "Please add at least one skill you can teach."
                : "Please add at least one skill you want to learn."}
            </p>
            <p className="mb-3">You need both teaching and learning skills to find matches!</p>
            <button 
              className="btn btn-primary" 
              onClick={() => setActiveSection('profile')}
            >
              Go to Profile
            </button>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="section matches-section">
          <h2 className="section-title text-center mb-4">Potential Matches</h2>
          <div className="alert alert-danger text-center">
            Error loading matches: {error}
          </div>
        </div>
      );
    }

    // Rest of the existing return statement for showing matches...
    return (
      <div className="section matches-section">
        <h2 className="section-title text-center mb-4">Potential Matches</h2>
        {Array.isArray(matches) && matches.length > 0 ? (
          <div className="matches-grid">
            {matches.map((match, index) => (
              <div key={match.user_id || index} className="match-card">
                <div className="match-header">
                  <h3>{match.username}</h3>
                  <div className="rating">
                    <span className="rating-number">{(match.rating || 0).toFixed(1)}</span>
                    <span className="star gold-star">⭐</span>
                  </div>
                </div>
                <div className="match-skills">
                  <div className="skill-section">
                    <p className="skill-label">Can Teach:</p>
                    <div className="skill-box">
                      {Array.isArray(match.teaching) && match.teaching.length > 0 ? (
                        match.teaching.map((skill, idx) => (
                          <span key={`${match.user_id}-teach-${idx}`} className="skill-tag">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">No teaching skills listed</span>
                      )}
                    </div>
                  </div>
                  <div className="skill-section">
                    <p className="skill-label">Wants to Learn:</p>
                    <div className="skill-box">
                      {Array.isArray(match.learning) && match.learning.length > 0 ? (
                        match.learning.map((skill, idx) => (
                          <span key={`${match.user_id}-learn-${idx}`} className="skill-tag">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">No learning interests listed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="match-actions">
                  <button className="btn btn-primary">Start Chat</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-info text-center">
            No matches found yet. Try adding more skills to increase your chances of finding a match!
          </div>
        )}
      </div>
    );
  };

  // Chats Section
  const ChatsSection = () => (
    <div className="section chats-section">
      {!hasSkills && <NoSkillsWarning onNavigateToProfile={() => setActiveSection('profile')} />}
      <h2>Chats</h2>
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

  // Show loading screen while fetching initial data
  if (profileLoading) {
    return <FullPageLoader />;
  }

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
            className="logout-btn"
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
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .match-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .match-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e9ecef;
  }

  .match-header h3 {
    margin: 0;
    color: #212529;
  }

  .rating {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .star {
    font-size: 1rem;
  }

  .rating-number {
    color: #6c757d;
    font-size: 0.9rem;
    margin-left: 4px;
  }

  .match-card .skills-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .match-card .teaching-skills,
  .match-card .learning-interests {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
  }

  .match-card h4 {
    color: #495057;
    margin-bottom: 0.75rem;
    font-size: 1rem;
  }

  .match-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .match-card .skill-item {
    background: white;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #495057;
    border: 1px solid #dee2e6;
  }

  .match-card .match-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }

  .matches-grid {
    display: grid;
    gap: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
  }

  @media (max-width: 768px) {
    .match-card .skills-section {
      grid-template-columns: 1fr;
    }
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 2rem;
  }

  .loading-spinner {
    width: 30px;
    height: 30px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    font-size: 1.2rem;
    font-weight: 500;
    color: #6c757d;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

  .section-title {
    text-align: center;
    font-weight: bold;
    font-size: 1.8rem;
    margin-bottom: 20px;
    color: #2c3e50;
  }

  .gold-star {
    color: #ffd700;
    font-size: 1.2rem;
    margin-left: 5px;
  }

  .rating {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .rating-number {
    font-size: 1.1rem;
    font-weight: 500;
    color: #2c3e50;
  }

  .match-skills {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin: 1rem 0;
  }

  .skill-section {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
  }

  .skill-label {
    font-weight: bold;
    margin-bottom: 8px;
    color: #2c3e50;
  }

  .skill-box {
    background: white;
    padding: 10px;
    border-radius: 6px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .skill-tag {
    background: #e9ecef;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.9rem;
    color: #495057;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .btn-remove {
    background: none;
    border: none;
    color: #dc3545;
    font-size: 1.2rem;
    padding: 0 4px;
    cursor: pointer;
    line-height: 1;
  }

  .btn-remove:hover {
    color: #c82333;
  }

  .profile-skills-container {
    display: flex;
    gap: 2rem;
    margin-top: 2rem;
  }

  .profile-skills-container .skills-section {
    flex: 1;
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .profile-skills-container h4 {
    color: #2c3e50;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  .logout-btn {
    background: #dc3545;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .logout-btn:hover {
    background: #c82333;
  }

  @media (max-width: 768px) {
    .profile-skills-container {
      flex-direction: column;
    }

    .profile-skills-container .skills-section {
      width: 100%;
    }
  }

  .full-page-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
  }

  .loader-content {
    text-align: center;
    padding: 2rem;
  }

  .loading-title {
    color: #2c3e50;
    font-size: 2rem;
    margin: 1.5rem 0 1rem;
    font-weight: bold;
  }

  .loading-subtitle {
    color: #6c757d;
    font-size: 1.1rem;
    margin-top: 0.5rem;
    font-weight: normal;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  .matches-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    padding: 2rem;
  }

  .matches-loading-container .loading-spinner {
    margin-bottom: 1rem;
  }

  .matches-loading-container .loading-text {
    font-size: 1.2rem;
    font-weight: 500;
    color: #6c757d;
    text-align: center;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .matches-loading-wrapper {
    min-height: 60vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .matches-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
  }

  .matches-loading-container .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1.5rem;
  }

  .matches-loading-container .loading-text {
    font-size: 1.2rem;
    font-weight: 500;
    color: #6c757d;
    display: block;
    text-align: center;
  }
`;
document.head.appendChild(style);

// Make the component available globally
window.ProfilePage = ProfilePage;
console.log('ProfilePage component loaded');
window.markComponentLoaded(); 