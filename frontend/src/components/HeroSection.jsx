function HeroSection({ onStartTrading }) {
  return (
    <div className="hero-section">
      <div className="hero-content text-center">
        <h1 className="hero-title">
          SkillTrade
        </h1>
        <p className="hero-subtitle">
          Connect. Match. Trade.
        </p>
        <button className="btn btn-light hero-btn" onClick={onStartTrading}>
          Start Trading
        </button>
      </div>
    </div>
  );
}

export default HeroSection; 