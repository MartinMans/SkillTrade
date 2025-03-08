// Component for the full-screen hero section with a background image, title, description, and button.
function HeroSection({ onStartTrading }) {
  return (
    <div className="hero-section">
      <div className="hero-content text-center">
        <h1 className="hero-title">
          SkillTrade<br />
          Connect. Match. Trade.
        </h1>
        <p className="mini-about">
          SkillTrade is a platform that allows you to both teach and learn skills simultaneously, creating a truly reciprocal learning experience.
        </p>
        <button className="btn btn-light hero-btn" onClick={onStartTrading}>
          Start Trading
        </button>
      </div>
    </div>
  );
}

// Make the component available globally
window.HeroSection = HeroSection;
console.log('HeroSection component loaded');
window.markComponentLoaded();
