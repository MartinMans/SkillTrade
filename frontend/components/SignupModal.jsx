// Modal component for Sign Up / Log In functionality.
const { useState } = React;

function SignupModal({ show, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!show) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const endpoint = isLogin ? '/login' : '/users/';
      
      // For login, use application/x-www-form-urlencoded format
      const loginBody = isLogin 
        ? new URLSearchParams({
            username: formData.email, // Using email for login
            password: formData.password,
          })
        : JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
          });

      const headers = isLogin 
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: loginBody,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error messages from the backend
        const errorMessage = data.detail || 'Authentication failed';
        throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      }

      if (isLogin) {
        // Store the token in localStorage
        localStorage.setItem('token', data.access_token);
        setSuccess('Login successful!');
        
        // Emit a custom event to notify that login was successful
        window.dispatchEvent(new CustomEvent('loginStateChanged', { detail: { isLoggedIn: true } }));
        
        // Close modal and redirect to profile page
        setTimeout(() => {
          onClose();
          // Replace the current view with the profile page
          const root = document.getElementById('root');
          ReactDOM.render(React.createElement(ProfilePage), root);
        }, 1500);
      } else {
        setSuccess('Account created successfully! Please log in.');
        setTimeout(() => {
          setIsLogin(true);
          resetForm();
        }, 1500);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{isLogin ? 'Log In' : 'Sign Up'}</h5>
            <button type="button" className="close" onClick={onClose} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  className="form-control"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <button type="submit" className="btn btn-primary btn-block">
                {isLogin ? 'Log In' : 'Sign Up'}
              </button>
            </form>
            <div className="text-center mt-3">
              <button
                type="button"
                className="btn btn-link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Make the component available globally
window.SignupModal = SignupModal;
console.log('SignupModal component loaded');
window.markComponentLoaded(); 