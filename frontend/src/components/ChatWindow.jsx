import { useState, useEffect, useRef } from 'react';

function ChatWindow({ matchId, otherUser, onClose, matchStatus }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(matchStatus);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${matchId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/matches/${matchId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const updateTradeStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/trades/${tradeId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update trade status');
      }

      const data = await response.json();
      setCurrentStatus(data.status);
    } catch (error) {
      console.error('Error updating trade status:', error);
      alert('Failed to update trade status. Please try again.');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'ACCEPTED':
        return 'accepted';
      case 'COMPLETED':
        return 'completed';
      case 'CANCELLED':
        return 'cancelled';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="chat-window">
        <div className="loading-state">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <h5>Chat with {otherUser.username}</h5>
          <span className={`status-badge ${currentStatus?.toLowerCase()}`}>
            {currentStatus?.toLowerCase()}
          </span>
        </div>
        <button className="btn-close" onClick={onClose} aria-label="Close"></button>
      </div>
      
      {currentStatus !== 'CANCELLED' && (
        <div className="chat-controls">
          <div className="trade-actions">
            {currentStatus === 'PENDING' && (
              <>
                <button
                  className="btn btn-success"
                  onClick={() => updateTradeStatus('ACCEPTED')}
                >
                  Accept Trade
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => updateTradeStatus('CANCELLED')}
                >
                  Decline Trade
                </button>
              </>
            )}
            {currentStatus === 'ACCEPTED' && (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => updateTradeStatus('COMPLETED')}
                >
                  Complete Trade
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => updateTradeStatus('CANCELLED')}
                >
                  Cancel Trade
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.chat_id}
              className={`message ${message.sender_id === otherUser.user_id ? 'received' : 'sent'}`}
            >
              <div className="message-content">
                <p>{message.message}</p>
                <small className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </small>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {currentStatus !== 'CANCELLED' && currentStatus !== 'COMPLETED' && (
        <form onSubmit={sendMessage} className="chat-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="form-control"
          />
          <button type="submit" className="btn btn-primary">Send</button>
        </form>
      )}
    </div>
  );
}

export default ChatWindow; 