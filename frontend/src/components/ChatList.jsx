import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWindow from './ChatWindow';

const ChatList = ({ onSelectChat, selectedChat }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }

      const data = await response.json();
      setMatches(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleChatClick = (match) => {
    onSelectChat(match);
  };

  const handleDeleteChat = async (matchId) => {
    if (!window.confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${matchId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // Remove the deleted chat from state
      setMatches(matches.filter(m => m.match_id !== matchId));
      
      // If the deleted chat was selected, clear the selection
      if (selectedChat && selectedChat.match_id === matchId) {
        onSelectChat(null);
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      alert('Failed to delete chat');
    }
  };

  if (loading) return <div className="loading">Loading chats...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (matches.length === 0) return <div className="no-chats">No matches found</div>;

  return (
    <div className="chat-container">
      <div className="chat-list">
        {matches.map((match) => (
          <div
            key={match.match_id}
            className={`chat-item ${selectedChat?.match_id === match.match_id ? 'selected' : ''}`}
            onClick={() => handleChatClick(match)}
          >
            <div className="chat-item-header">
              <span className="username">{match.username}</span>
              <button
                className="delete-chat-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(match.match_id);
                }}
              >
                ×
              </button>
            </div>
            <div className="skills-info">
              <div className="teaching">Teaching: {match.teaching.join(', ')}</div>
              <div className="learning">Learning: {match.learning.join(', ')}</div>
            </div>
            <div className="rating">Rating: {match.rating.toFixed(1)}</div>
          </div>
        ))}
      </div>
      {selectedChat && (
        <ChatWindow
          matchId={selectedChat.match_id}
          otherUser={{
            user_id: selectedChat.user_id,
            username: selectedChat.username
          }}
          onClose={() => onSelectChat(null)}
          matchStatus={selectedChat.match_status}
        />
      )}
    </div>
  );
};

export default ChatList; 