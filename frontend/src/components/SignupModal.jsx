import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';

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
  const navigate = useNavigate();

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

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: loginBody,
      });

      // Check if response is empty
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        // Handle specific error messages from the backend
        const errorMessage = data?.detail || 'Authentication failed';
        throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
      }

      if (isLogin) {
        // Store the token in localStorage
        localStorage.setItem('token', data.access_token);
        setSuccess('Login successful!');
        
        // Emit a custom event to notify that login was successful
        window.dispatchEvent(new CustomEvent('loginStateChanged', { detail: { isLoggedIn: true } }));
        
        // Close modal and redirect to dashboard page
        setTimeout(() => {
          onClose();
          navigate('/dashboard');
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
          <div className="modal-header border-0">
            <h5 className="modal-title fw-bold">{isLogin ? 'Log In' : 'Sign Up'}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body px-5">
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLogin && (
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your username"
                  />
                </div>
              )}
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control form-control-lg"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div className="mb-3">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  className="form-control form-control-lg"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your password"
                />
              </div>
              {!isLogin && (
                <div className="mb-3">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    placeholder="Confirm your password"
                  />
                </div>
              )}
              {error && <div className="alert alert-danger mt-3">{error}</div>}
              {success && <div className="alert alert-success mt-3">{success}</div>}
              <button type="submit" className="btn btn-primary w-100 mt-3">
                {isLogin ? 'Log In' : 'Sign Up'}
              </button>
            </form>
            <div className="text-center mt-4">
              <button
                type="button"
                className="btn btn-link text-decoration-none"
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

export default SignupModal; 