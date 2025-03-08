// Navbar component with a dropdown for "Features" and a Sign Up / Log In button.
const { useState, useEffect } = React;

function NavBar() {
  const [dropdownActive, setDropdownActive] = useState(false);
  const [dropdownHovered, setDropdownHovered] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
      // If user is logged in, redirect to profile page
      const root = document.getElementById('root');
      ReactDOM.render(React.createElement(ProfilePage), root);
    } else {
      // If user is not logged in, show auth modal
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
              if (window.location.pathname !== '/') {
                const root = document.getElementById('root');
                ReactDOM.render(React.createElement(HomePage), root);
                // After rendering HomePage, scroll to hero section
                setTimeout(() => {
                  handleSmoothScroll('.hero-section');
                }, 100);
              } else {
                handleSmoothScroll('.hero-section');
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            SkillTrade
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-toggle="collapse"
            data-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
            <ul className="navbar-nav align-items-center">
              <li className="nav-item px-2">
                <a 
                  className="nav-link py-2" 
                  href="#about"
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.location.pathname !== '/') {
                      const root = document.getElementById('root');
                      ReactDOM.render(React.createElement(HomePage), root);
                      // After rendering HomePage, scroll to about section
                      setTimeout(() => {
                        handleSmoothScroll('#about');
                      }, 100);
                    } else {
                      handleSmoothScroll('#about');
                    }
                  }}
                >
                  About
                </a>
              </li>
              <li className="nav-item dropdown px-2"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}>
                <a className="nav-link dropdown-toggle py-2" href="#" onClick={toggleDropdown}>
                  Features
                </a>
                {isDropdownVisible && (
                  <div className="dropdown-menu smooth-dropdown custom-dropdown show">
                    <p className="dropdown-item-custom text-center mb-0">AI-Powered Matching</p>
                    <p className="dropdown-item-custom text-center mb-0">Skill-Based Token Exchange</p>
                    <p className="dropdown-item-custom text-center mb-0">Fair Trade System</p>
                    <p className="dropdown-item-custom text-center mb-0">Rating System</p>
                  </div>
                )}
              </li>
              <li className="nav-item ms-2">
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

// Make the component available globally
window.NavBar = NavBar;
console.log('NavBar component loaded');
window.markComponentLoaded(); 