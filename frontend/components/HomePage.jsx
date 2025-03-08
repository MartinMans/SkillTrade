// Main HomePage component that renders the Navbar, HeroSection, About section, and SignupModal.
const { useState, useEffect } = React;

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
        <section id="about">
          <div className="container">
            <h2 className="text-center">About</h2>
            <div className="card about-card">
              <div className="card-body">
                <p className="card-text text-center">
                  SkillTrade is a platform that allows you to both teach and learn skills simultaneously, creating a truly reciprocal learning experience.
                  Our AI-powered matching system connects you with the perfect trade partner based on your skills and learning interests, ensuring every exchange is valuable.
                  With our unique Trade Token system, users commit their full attention to a single trade at a time, fostering high-quality, focused learning sessions.
                  Whether you want to share your expertise or gain new knowledge, SkillTrade provides a structured, trustworthy, and engaging way to grow—for free.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SignupModal show={showModal} onClose={handleCloseModal} />
    </div>
  );
}

// Make the component available globally
window.HomePage = HomePage;
console.log('HomePage component loaded');
window.markComponentLoaded();
