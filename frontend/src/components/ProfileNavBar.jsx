import { useNavigate } from 'react-router-dom';
import { Rating } from '@mui/material';

function ProfileNavBar({ userProfile }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <a className="navbar-brand" href="/">
          SkillTrade
        </a>
        <div className="d-flex align-items-center">
          {userProfile && (
            <div className="d-flex align-items-center me-4">
              <div className="text-white me-2">{userProfile.username}</div>
              <div className="d-flex align-items-center">
                <Rating value={userProfile.rating || 5} readOnly size="small" />
                <span className="text-white ms-1">({userProfile.rating || 5}/5)</span>
              </div>
            </div>
          )}
          <button 
            className="btn btn-danger"
            onClick={handleLogout}
          >
            LOG OUT
          </button>
        </div>
      </div>
    </nav>
  );
}

export default ProfileNavBar; 