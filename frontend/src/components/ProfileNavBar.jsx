import { useNavigate } from 'react-router-dom';

function ProfileNavBar() {
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
        <div className="ms-auto">
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