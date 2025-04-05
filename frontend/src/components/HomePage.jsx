import { useState, useEffect } from 'react';
import NavBar from './NavBar';
import HeroSection from './HeroSection';
import SignupModal from './SignupModal';
import Features from './Features';

function HomePage() {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Ensure the page starts at the top when mounted
    window.scrollTo(0, 0);
  }, []);

  const handleAuthClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="app-container">
      <NavBar />
      <HeroSection onStartTrading={handleAuthClick} />
      <div className="unified-section">
        <section id="about" className="unified-section">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <p className="text-center" style={{ color: '#000', fontSize: '1.4rem', lineHeight: '2' }}>
                  SkillTrade is a revolutionary platform that connects individuals based on their unique skills and learning goals. 
                  Our mission is to create a community where knowledge sharing becomes a two-way street, enabling everyone to 
                  both teach and learn. Whether you're looking to master a new language, develop technical skills, or explore 
                  creative arts, SkillTrade provides the perfect environment for meaningful skill exchanges.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Features />
      <SignupModal show={showModal} onClose={handleCloseModal} />
    </div>
  );
}

export default HomePage; 