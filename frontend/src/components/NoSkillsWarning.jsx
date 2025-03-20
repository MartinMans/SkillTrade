import { useState } from 'react';

function NoSkillsWarning({ onNavigateToProfile }) {
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
}

export default NoSkillsWarning; 