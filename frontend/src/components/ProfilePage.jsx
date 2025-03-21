import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import AddSkillModal from './AddSkillModal';
import NoSkillsWarning from './NoSkillsWarning';
import LoadingSpinner from './LoadingSpinner';
import FullPageLoader from './FullPageLoader';
import ProfileNavBar from './ProfileNavBar';
import ChatList from './ChatList';
import TradeGuidelinesModal from './TradeGuidelinesModal';
import TradeInterface from './TradeInterface';

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
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [showTradeGuidelines, setShowTradeGuidelines] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const navigate = useNavigate();

  // Fetch user profile data and available skills
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setProfileLoading(true); // Show loading screen immediately
        console.log('Starting to fetch profile data...');

        const token = localStorage.getItem('token');
        console.log('Token from localStorage:', token ? 'Present' : 'Missing');
        
        if (!token) {
          throw new Error('No token found');
        }

        // Fetch all data in parallel for better performance
        console.log('Making API requests...');
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

        console.log('API responses received:', {
          user: userResponse.status,
          skills: skillsResponse.status,
          availableSkills: availableSkillsResponse.status
        });

        if (!userResponse.ok || !skillsResponse.ok || !availableSkillsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [userData, skillsData, availableSkillsData] = await Promise.all([
          userResponse.json(),
          skillsResponse.json(),
          availableSkillsResponse.json()
        ]);

        console.log('Data parsed successfully:', {
          user: userData,
          skills: skillsData,
          availableSkills: availableSkillsData.length
        });

        if (isMounted) {
          setUserProfile({
            ...userData,
            teachingSkills: skillsData.teaching || [],
            learningInterests: skillsData.learning || []
          });
          setAvailableSkills(availableSkillsData);
          setHasSkills(
            (skillsData.teaching?.length > 0 || skillsData.learning?.length > 0)
          );
          setHasRequiredSkills(
            skillsData.teaching?.length > 0 && skillsData.learning?.length > 0
          );
          setProfileLoading(false);
          console.log('Profile data set successfully');
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        if (error.message === 'No token found') {
          navigate('/');
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
          console.log('Loading state set to false');
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
      
      console.log('Updated skills from server:', {
        teaching: updatedSkills.teaching,
        learning: updatedSkills.learning
      });

      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedSkills.teaching || [],
        learningInterests: updatedSkills.learning || []
      }));

      // Update skill status flags after adding a skill
      const hasAnySkills = (updatedSkills.teaching?.length > 0 || updatedSkills.learning?.length > 0);
      const hasAllRequiredSkills = (updatedSkills.teaching?.length > 0 && updatedSkills.learning?.length > 0);
      
      console.log('Updating skill status:', {
        hasAnySkills,
        hasAllRequiredSkills,
        teachingCount: updatedSkills.teaching?.length,
        learningCount: updatedSkills.learning?.length
      });
      
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
      console.log('Removing skill:', { skillId, skillType });
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
      
      console.log('Skills after removal:', {
        teaching: updatedSkills.teaching,
        learning: updatedSkills.learning
      });

      setUserProfile(prev => ({
        ...prev,
        teachingSkills: updatedSkills.teaching || [],
        learningInterests: updatedSkills.learning || []
      }));

      // Update the hasSkills and hasRequiredSkills states
      const hasAnySkills = (updatedSkills.teaching?.length > 0 || updatedSkills.learning?.length > 0);
      const hasAllRequiredSkills = (updatedSkills.teaching?.length > 0 && updatedSkills.learning?.length > 0);
      
      console.log('Updating skill status after removal:', {
        hasAnySkills,
        hasAllRequiredSkills,
        teachingCount: updatedSkills.teaching?.length,
        learningCount: updatedSkills.learning?.length
      });
      
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
      console.log('Fetching matches...');
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
      console.log('Received matches:', JSON.stringify(matches, null, 2));
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

  // Add new function to handle trade initiation
  const handleStartTrade = async (matchId) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Starting trade for match:', matchId);
      console.log('Current user profile:', userProfile);
      console.log('Selected match before API call:', skillMatches.find(m => m.match_id === matchId));
      
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
      console.log('Trade request response:', {
        updatedMatch,
        currentUserId: userProfile.user_id,
        isInitiator: updatedMatch.initiator_id === userProfile.user_id,
        matchStatus: updatedMatch.match_status
      });

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
      console.log('Fresh matches after trade request:', {
        matches: freshMatches,
        currentUserId: userProfile.user_id,
        relevantMatch: freshMatches.find(m => m.match_id === matchId)
      });
      
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

  if (profileLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className="profile-page">
      <ProfileNavBar userProfile={userProfile} />
      <div className="container">
        {/* Profile Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1>Welcome, {userProfile.username}!</h1>
            <p className="text-muted">{userProfile.email}</p>
          </div>
        </div>

        {/* Tab Navigation */}
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
            <div className="profile-tab-content">
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
                <div className="card">
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
                  // When user has no skills at all
                  <NoSkillsWarning onNavigateToProfile={() => setActiveSection('profile')} />
                ) : !hasRequiredSkills ? (
                  // When user is missing either teaching or learning skills
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
                      <div key={match.match_id} className="card">
                        <div className="card-body">
                          {match.match_status?.toUpperCase() === 'IN_TRADE' ? (
                            <TradeInterface match={match} userProfile={userProfile} />
                          ) : (
                            <>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h5 className="card-title mb-0">{match.username}</h5>
                                {match.match_status?.toUpperCase() === 'PENDING_TRADE' && (
                                  <div className={`badge ${match.initiator_id === userProfile?.user_id ? 'bg-warning' : 'bg-info'} text-dark d-flex align-items-center gap-2`}>
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
                              <div className="skills-section">
                                <p className="mb-2">
                                  <strong>Teaching:</strong> {match.teaching.join(', ')}
                                </p>
                                <p className="mb-3">
                                  <strong>Learning:</strong> {match.learning.join(', ')}
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                {match.match_status?.toUpperCase() === 'PENDING_TRADE' ? (
                                  <>
                                    {match.initiator_id === userProfile?.user_id ? (
                                      <button 
                                        className="btn btn-outline-danger d-flex align-items-center gap-2"
                                        onClick={() => handleStartTrade(match.match_id)}
                                      >
                                        <i className="bi bi-x-circle"></i>
                                        Cancel Trade Request
                                      </button>
                                    ) : (
                                      <OverlayTrigger
                                        placement="top"
                                        overlay={
                                          <Tooltip id={`tooltip-accept-${match.match_id}`}>
                                            {hasActiveTrade() ? "You cannot accept a new trade while you have an active trade" : ""}
                                          </Tooltip>
                                        }
                                      >
                                        <span className="d-inline-block">
                                          <button 
                                            className="btn btn-success d-flex align-items-center gap-2"
                                            onClick={() => {
                                              setSelectedMatch(match);
                                              setShowTradeGuidelines(true);
                                            }}
                                            disabled={hasActiveTrade()}
                                          >
                                            <i className="bi bi-check-circle"></i>
                                            Accept Trade Request
                                          </button>
                                        </span>
                                      </OverlayTrigger>
                                    )}
                                  </>
                                ) : (
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <Tooltip id={`tooltip-start-${match.match_id}`}>
                                        {hasActiveTrade() ? "You cannot start a new trade while you have an active trade" : ""}
                                      </Tooltip>
                                    }
                                  >
                                    <span className="d-inline-block">
                                      <button 
                                        className="btn btn-primary d-flex align-items-center gap-2"
                                        onClick={() => {
                                          setSelectedMatch(match);
                                          setShowTradeGuidelines(true);
                                        }}
                                        disabled={hasActiveTrade()}
                                      >
                                        <i className="bi bi-arrow-right-circle"></i>
                                        Start Trade
                                      </button>
                                    </span>
                                  </OverlayTrigger>
                                )}
                                <button 
                                  className="btn btn-outline-primary d-flex align-items-center gap-2"
                                  onClick={() => goToChat(match)}
                                >
                                  <i className="bi bi-chat-dots"></i>
                                  Go to Chat
                                </button>
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
    </div>
  );
}

export default ProfilePage; 