import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OverlayTrigger, Tooltip, Image } from 'react-bootstrap';
import { Rating } from '@mui/material';
import AddSkillModal from './AddSkillModal';
import NoSkillsWarning from './NoSkillsWarning';
import LoadingSpinner from './LoadingSpinner';
import FullPageLoader from './FullPageLoader';
import ProfileNavBar from './ProfileNavBar';
import ChatList from './ChatList';
import TradeGuidelinesModal from './TradeGuidelinesModal';
import TradeInterface from './TradeInterface';
import ProfileCard from './ProfileCard';
import UserProfileModal from './UserProfileModal';
import { FaMapMarkerAlt } from 'react-icons/fa';

function Dashboard() {
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
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [showTradeGuidelines, setShowTradeGuidelines] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const navigate = useNavigate();

  // Fetch user profile data and available skills
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setProfileLoading(true);

        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No token found');
        }

        // Fetch all data in parallel for better performance
        const [userResponse, skillsResponse, availableSkillsResponse] = await Promise.all([
          // Fetch user profile
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          // Fetch user's skills
          fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/skills/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }),
          // Fetch available skills
          fetch(`${import.meta.env.VITE_API_BASE_URL}/skills/`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          })
        ]);

        if (!userResponse.ok || !skillsResponse.ok || !availableSkillsResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        const [userData, skillsData, availableSkillsData] = await Promise.all([
          userResponse.json(),
          skillsResponse.json(),
          availableSkillsResponse.json()
        ]);

        if (isMounted) {
          setUserProfile({
            ...userData,
            teachingSkills: skillsData.teaching || [],
            learningInterests: skillsData.learning || []
          });
          setAvailableSkills(availableSkillsData);
          
          // Update skill status
          const hasAnySkills = (skillsData.teaching?.length > 0 || skillsData.learning?.length > 0);
          const hasAllRequiredSkills = (skillsData.teaching?.length > 0 && skillsData.learning?.length > 0);
          setHasSkills(hasAnySkills);
          setHasRequiredSkills(hasAllRequiredSkills);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (isMounted) {
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle skill search
  useEffect(() => {
    const searchSkills = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/skills/search?query=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to search skills');
        }

        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error('Error searching skills:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchSkills, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle adding a new skill
  const handleAddSkill = async (skillId, newSkillName = null) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // Only create a new skill if we have a newSkillName and no skillId
      if (newSkillName && !skillId) {
        // Try to get or create the skill
        const createSkillResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/skills/get-or-create/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ skill_name: newSkillName })
        });

        if (!createSkillResponse.ok) {
          const errorData = await createSkillResponse.json();
          throw new Error(errorData.detail || 'Failed to create new skill');
        }

        const newSkill = await createSkillResponse.json();
        skillId = newSkill.skill_id;
      }

      // Add skill to user's profile
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/skills/`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          skill_id: skillId,
          type: newSkillType === 'teach' ? 'teach' : 'learn'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add skill to profile');
      }

      // Refresh the user's skills
      const skillsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/skills/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!skillsResponse.ok) {
        throw new Error('Failed to refresh skills');
      }

      const updatedSkills = await skillsResponse.json();
      
      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedSkills.teaching || [],
        learningInterests: updatedSkills.learning || []
      }));

      // Update skill status flags after adding a skill
      const hasAnySkills = (updatedSkills.teaching?.length > 0 || updatedSkills.learning?.length > 0);
      const hasAllRequiredSkills = (updatedSkills.teaching?.length > 0 && updatedSkills.learning?.length > 0);
      
      setHasSkills(hasAnySkills);
      setHasRequiredSkills(hasAllRequiredSkills);

      setShowAddSkillModal(false);
      setSearchQuery('');
      setSearchResults([]);
      setNewSkillType(null);
    } catch (error) {
      console.error('Error adding skill:', error);
      alert(error.message || 'Failed to add skill. Please try again.');
    }
  };

  // Handle removing a skill
  const handleRemoveSkill = async (skillId, skillType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/users/me/skills/${skillId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove skill');
      }

      // Refresh the user's skills after removal
      const skillsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/skills/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!skillsResponse.ok) {
        throw new Error('Failed to refresh skills');
      }

      const updatedSkills = await skillsResponse.json();

      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedSkills.teaching || [],
        learningInterests: updatedSkills.learning || []
      }));

      // Update the hasSkills and hasRequiredSkills states
      const hasAnySkills = (updatedSkills.teaching?.length > 0 || updatedSkills.learning?.length > 0);
      const hasAllRequiredSkills = (updatedSkills.teaching?.length > 0 && updatedSkills.learning?.length > 0);
      setHasSkills(hasAnySkills);
      setHasRequiredSkills(hasAllRequiredSkills);

    } catch (error) {
      console.error('Error removing skill:', error);
      alert(error.message || 'Failed to remove skill. Please try again.');
    }
  };

  // Add fetchMatches function
  const fetchMatches = async () => {
    if (!hasRequiredSkills) return;
    
    setMatchesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const matches = await response.json();
      setSkillMatches(matches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Add useEffect to fetch matches when tab changes or skills update
  useEffect(() => {
    if (activeSection === 'matches' && hasRequiredSkills) {
      fetchMatches();
    }
  }, [activeSection, hasRequiredSkills]);

  const goToChat = (match) => {
    setSelectedChat(match);
    setActiveSection('chats');
  };

  // Handle starting a trade
  const handleStartTrade = async (matchId) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${matchId}/start-trade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to start trade');
      }

      const updatedMatch = await response.json();

      // Fetch fresh matches to ensure correct state
      const freshMatchesResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!freshMatchesResponse.ok) {
        throw new Error('Failed to fetch updated matches');
      }

      const freshMatches = await freshMatchesResponse.json();
      
      // Update state with fresh data
      setSkillMatches(freshMatches);
      
      // Show appropriate message based on the action
      if (updatedMatch.match_status?.toLowerCase() === 'pending') {
        alert('Trade request cancelled successfully!');
      } else {
        alert('Trade initiated successfully!');
      }
      
      setShowTradeGuidelines(false);
      setSelectedMatch(null);
    } catch (error) {
      console.error('Error starting trade:', error);
      alert(error.message || 'Failed to start trade. Please try again.');
    }
  };

  // Add new function to check if user has any active trades
  const hasActiveTrade = () => {
    return skillMatches.some(match => match.match_status?.toUpperCase() === 'IN_TRADE');
  };

  const handleUpdateProfile = async (updatedProfile) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfile)
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedData = await response.json();
      setUserProfile(prev => ({
        ...prev,
        ...updatedData
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const handleUserClick = (user) => {
    setSelectedUserProfile(user);
    setShowUserProfile(true);
  };

  if (profileLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className="profile-page">
      <ProfileNavBar />
      <div className="container">
        <div className="row mb-4">
          <div className="col-12">
            <ul className="nav nav-tabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeSection === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveSection('profile')}
                  type="button"
                  role="tab"
                >
                  Profile
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeSection === 'matches' ? 'active' : ''}`}
                  onClick={() => setActiveSection('matches')}
                  type="button"
                  role="tab"
                >
                  Potential Matches
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button
                  className={`nav-link ${activeSection === 'chats' ? 'active' : ''}`}
                  onClick={() => setActiveSection('chats')}
                  type="button"
                  role="tab"
                >
                  Chats
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Tab Content */}
        <div className="row">
          {/* Profile Tab */}
          <div className={`col-12 ${activeSection === 'profile' ? '' : 'd-none'}`}>
            {/* Profile Card */}
            <div className="mb-4">
              <ProfileCard 
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            </div>
            
            {/* Skills Section */}
            <div className="row">
              <div className="col-md-6">
                <div className="card mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Teaching Skills</h5>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setNewSkillType('teach');
                        setShowAddSkillModal(true);
                      }}
                    >
                      Add Skill
                    </button>
                  </div>
                  <div className="card-body">
                    {userProfile.teachingSkills.length === 0 ? (
                      <p className="text-muted">No teaching skills added yet.</p>
                    ) : (
                      <div className="skill-list">
                        {userProfile.teachingSkills.map(skill => (
                          <div key={skill.skill_id} className="skill-item">
                            <span>{skill.skill_name}</span>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveSkill(skill.skill_id, 'teach')}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card mb-4">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Learning Interests</h5>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setNewSkillType('learn');
                        setShowAddSkillModal(true);
                      }}
                    >
                      Add Interest
                    </button>
                  </div>
                  <div className="card-body">
                    {userProfile.learningInterests.length === 0 ? (
                      <p className="text-muted">No learning interests added yet.</p>
                    ) : (
                      <div className="skill-list">
                        {userProfile.learningInterests.map(skill => (
                          <div key={skill.skill_id} className="skill-item">
                            <span>{skill.skill_name}</span>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveSkill(skill.skill_id, 'learn')}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matches Tab */}
          <div className={`col-12 ${activeSection === 'matches' ? '' : 'd-none'}`}>
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Potential Matches</h5>
              </div>
              <div className="card-body">
                {!hasSkills ? (
                  <NoSkillsWarning onNavigateToProfile={() => setActiveSection('profile')} />
                ) : !hasRequiredSkills ? (
                  <div className="alert alert-warning" role="alert">
                    <h4 className="alert-heading">Almost there!</h4>
                    <p>
                      {userProfile.teachingSkills.length === 0 
                        ? "You haven't added any teaching skills yet. Add skills you can teach to start matching!"
                        : "You haven't added any learning interests yet. Add skills you want to learn to start matching!"}
                    </p>
                    <hr />
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveSection('profile')}
                    >
                      Go to Profile
                    </button>
                  </div>
                ) : matchesLoading ? (
                  <LoadingSpinner />
                ) : skillMatches.length === 0 ? (
                  <div className="text-center">
                    <p className="text-muted">No matches found yet. Add more skills to increase your chances of finding matches!</p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveSection('profile')}
                    >
                      Add More Skills
                    </button>
                  </div>
                ) : (
                  <div className="matches-list">
                    {skillMatches.map((match) => (
                      <div key={match.match_id} className="card match-card">
                        <div className="card-body">
                          {match.match_status?.toUpperCase() === 'IN_TRADE' ? (
                            <TradeInterface match={match} userProfile={userProfile} />
                          ) : (
                            <>
                              <div className="d-flex">
                                {/* Left side - Photo and User Info */}
                                <div className="match-photo-container me-4 text-center" style={{ minWidth: '100px' }}>
                                  <Image
                                    src={match.photo || 'https://via.placeholder.com/150'}
                                    roundedCircle
                                    className="match-photo mb-2"
                                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                  />
                                  <h5 className="mb-2">
                                    <span 
                                      className="user-link"
                                      onClick={() => {
                                        setSelectedUserProfile(match);
                                        setShowUserProfile(true);
                                      }}
                                    >
                                      {match.username}
                                    </span>
                                  </h5>
                                  <div className="d-flex align-items-center justify-content-center">
                                    <Rating 
                                      value={match.rating || 5} 
                                      readOnly 
                                      size="small"
                                    />
                                    <span className="ms-1 text-muted">({match.rating || 5}/5)</span>
                                  </div>
                                  {match.location && (
                                    <p className="text-muted mb-2 mt-1">
                                      <FaMapMarkerAlt className="me-1" /> {match.location}
                                    </p>
                                  )}
                                </div>

                                {/* Right side - Info */}
                                <div className="match-info flex-grow-1">
                                  <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                      {/* Status Badges */}
                                      {match.match_status?.toUpperCase() === 'PENDING_TRADE' && (
                                        <div className={`badge ${match.initiator_id === userProfile?.user_id ? 'bg-warning' : 'bg-info'} text-dark d-flex align-items-center gap-2 mb-3`}>
                                          {match.initiator_id === userProfile?.user_id ? (
                                            <>
                                              <span className="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>
                                              Awaiting Response
                                            </>
                                          ) : (
                                            <>
                                              <span className="badge bg-success">New</span>
                                              This user wants to trade!
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Trade Actions */}
                                    {!hasActiveTrade() && match.match_status?.toUpperCase() !== 'IN_TRADE' && (
                                      <div className="trade-actions">
                                        <button
                                          className="btn btn-outline-primary"
                                          onClick={() => goToChat(match)}
                                        >
                                          <i className="bi bi-chat-dots me-2"></i>
                                          Chat
                                        </button>
                                        {match.match_status?.toUpperCase() === 'PENDING_TRADE' ? (
                                          <>
                                            {match.initiator_id === userProfile?.user_id ? (
                                              <button
                                                className="btn btn-outline-secondary"
                                                onClick={() => handleStartTrade(match.match_id)}
                                              >
                                                Cancel Request
                                              </button>
                                            ) : (
                                              <button
                                                className="btn btn-success"
                                                onClick={() => {
                                                  setSelectedMatch(match);
                                                  setShowTradeGuidelines(true);
                                                }}
                                              >
                                                Accept Trade
                                              </button>
                                            )}
                                          </>
                                        ) : (
                                          <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                              setSelectedMatch(match);
                                              setShowTradeGuidelines(true);
                                            }}
                                          >
                                            Start Trade
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Skills Section */}
                                  <div className="skills-section">
                                    <div className="row">
                                      <div className="col-6">
                                        <p className="mb-1"><strong>Teaching:</strong></p>
                                        <p className="mb-2">{match.teaching.join(', ')}</p>
                                      </div>
                                      <div className="col-6">
                                        <p className="mb-1"><strong>Learning:</strong></p>
                                        <p className="mb-2">{match.learning.join(', ')}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chats Tab */}
          <div className={`col-12 ${activeSection === 'chats' ? '' : 'd-none'}`}>
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Chats</h5>
              </div>
              <div className="card-body">
                <ChatList 
                  selectedChat={selectedChat}
                  onSelectChat={setSelectedChat}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Trade Guidelines Modal */}
      <TradeGuidelinesModal
        show={showTradeGuidelines}
        onClose={() => {
          setShowTradeGuidelines(false);
          setSelectedMatch(null);
        }}
        onConfirm={() => {
          if (selectedMatch) {
            handleStartTrade(selectedMatch.match_id);
          }
        }}
      />

      {/* Add Skill Modal */}
      <AddSkillModal
        show={showAddSkillModal}
        onClose={() => {
          setShowAddSkillModal(false);
          setNewSkillType(null);
        }}
        onAddSkill={handleAddSkill}
        skillType={newSkillType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={selectedUserProfile}
        show={showUserProfile}
        onHide={() => setShowUserProfile(false)}
      />
    </div>
  );
}

export default Dashboard; 