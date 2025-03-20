import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupModal from './SignupModal';

function NavBar() {
  const [dropdownActive, setDropdownActive] = useState(false);
  const [dropdownHovered, setDropdownHovered] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const isDropdownVisible = dropdownActive || dropdownHovered;

  // Check authentication status on component mount and listen for changes
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);

    // Listen for login state changes
    const handleLoginStateChange = (event) => {
      setIsAuthenticated(event.detail.isLoggedIn);
    };

    window.addEventListener('loginStateChanged', handleLoginStateChange);

    return () => {
      window.removeEventListener('loginStateChanged', handleLoginStateChange);
    };
  }, []);

  const toggleDropdown = (e) => {
    e.preventDefault();
    setDropdownActive(!dropdownActive);
  };

  const handleMouseEnter = () => {
    setDropdownHovered(true);
  };

  const handleMouseLeave = () => {
    setDropdownHovered(false);
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      navigate('/profile');
    } else {
      setShowAuthModal(true);
    }
  };

  const handleSmoothScroll = (sectionSelector) => {
    const section = document.querySelector(sectionSelector);
    if (section) {
      const navbarHeight = document.querySelector('.navbar').offsetHeight;
      const sectionPosition = section.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
      window.scrollTo({
        top: sectionPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <a 
            className="navbar-brand" 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
              setTimeout(() => {
                handleSmoothScroll('.hero-section');
              }, 100);
            }}
            style={{ cursor: 'pointer' }}
          >
            SkillTrade
          </a>
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setDropdownActive(!dropdownActive)}
            aria-expanded={dropdownActive}
            aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className={`navbar-collapse ${dropdownActive ? 'show' : ''}`}>
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a 
                  className="nav-link" 
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/');
                    setTimeout(() => {
                      handleSmoothScroll('#about');
                    }, 100);
                  }}
                >
                  About
                </a>
              </li>
              <li className="nav-item dropdown"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                <a className="nav-link dropdown-toggle" href="#" onClick={toggleDropdown}>
                  Features
                </a>
                {isDropdownVisible && (
                  <div className="custom-dropdown show">
                    <p className="dropdown-item-custom">AI-Powered Matching</p>
                    <p className="dropdown-item-custom">Skill-Based Token Exchange</p>
                    <p className="dropdown-item-custom">Fair Trade System</p>
                    <p className="dropdown-item-custom">Rating System</p>
                  </div>
                )}
              </li>
              <li className="nav-item">
                <button 
                  className="btn btn-primary"
                  onClick={handleAuthClick}
                >
                  {isAuthenticated ? 'My Profile' : 'Sign Up / Log In'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>
      <SignupModal show={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

export default NavBar; 