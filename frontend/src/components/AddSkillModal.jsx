import { useState, useEffect, useRef } from 'react';

function AddSkillModal({ 
  show, 
  onClose, 
  onAddSkill, 
  skillType, 
  searchQuery, 
  setSearchQuery, 
  searchResults, 
  isSearching 
}) {
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
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Add {skillType === 'teach' ? 'Teaching' : 'Learning'} Skill</h3>
          </div>
          <div className="modal-body">
            <div className="skill-search">
              <input
                type="text"
                className="form-control"
                placeholder={`Search for ${skillType === 'teach' ? 'teaching' : 'learning'} skills...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                ref={inputRef}
                onKeyDown={handleKeyDown}
              />
            </div>
            {isSearching ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <div className="loading-text">Searching skills...</div>
              </div>
            ) : (
              <div className="skill-list">
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
                {searchQuery && searchResults.length === 0 && (
                  <div className="create-new-skill">
                    <div className="input-group">
                      <span className="input-group-text">+</span>
                      <input
                        type="text"
                        className="form-control"
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        placeholder="Create new skill"
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                  </div>
                )}
              </div>
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
    </div>
  );
}

export default AddSkillModal; 