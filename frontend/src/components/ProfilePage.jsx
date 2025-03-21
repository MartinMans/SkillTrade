import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AddSkillModal from './AddSkillModal';
import NoSkillsWarning from './NoSkillsWarning';
import LoadingSpinner from './LoadingSpinner';
import FullPageLoader from './FullPageLoader';
import ProfileNavBar from './ProfileNavBar';
import ChatList from './ChatList';

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

  if (profileLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className="profile-page">
      <ProfileNavBar />
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
                    {skillMatches.map(match => (
                      <div key={match.user_id} className="match-item card mb-3">
                        <div className="card-body">
                          <h5 className="card-title">{match.username}</h5>
                          <div className="row">
                            <div className="col-md-6">
                              <h6>They can teach you:</h6>
                              <ul className="list-unstyled">
                                {match.teaching?.map((skillName, index) => (
                                  <li key={index} className="badge bg-primary me-2 mb-2">
                                    {skillName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="col-md-6">
                              <h6>You can teach them:</h6>
                              <ul className="list-unstyled">
                                {match.learning?.map((skillName, index) => (
                                  <li key={index} className="badge bg-success me-2 mb-2">
                                    {skillName}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="d-flex gap-2 mt-3">
                            <button 
                              className="btn btn-success"
                              disabled
                              title="Trading feature coming soon!"
                            >
                              Start Trade
                            </button>
                            <button 
                              className="btn btn-primary"
                              onClick={() => goToChat(match)}
                            >
                              Go to Chat
                            </button>
                          </div>
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