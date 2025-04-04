import React from 'react';
import { Modal, Card, Image } from 'react-bootstrap';
import { FaMapMarkerAlt } from 'react-icons/fa';

const UserProfileModal = ({ user, show, onHide }) => {
  if (!user) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered dialogClassName="user-profile-modal">
      <Modal.Header closeButton>
        <Modal.Title>User Profile</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Card className="border-0">
          <Card.Body>
            {/* Top section - Photo and Basic Info */}
            <div className="d-flex align-items-start mb-4">
              {/* Left side - Photo */}
              <div className="profile-photo-container me-4">
                <Image
                  src={user.photo || 'https://via.placeholder.com/150'}
                  roundedCircle
                  className="profile-photo"
                  style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                />
              </div>

              {/* Right side - Basic Info */}
              <div className="basic-info flex-grow-1">
                <h2 className="mb-2">{user.username}</h2>
                {user.location && (
                  <p className="text-muted mb-3">
                    <FaMapMarkerAlt className="me-2" /> {user.location}
                  </p>
                )}
                {/* About Section */}
                <div className="bio-section">
                  <h5 className="mb-2">About</h5>
                  {user.bio ? (
                    <p className="mb-0">{user.bio}</p>
                  ) : (
                    <p className="text-muted mb-0">No bio added.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom section - Skills */}
            <div className="skills-container">
              <div className="d-flex gap-4">
                {/* Teaching Skills */}
                <div className="skill-category flex-grow-1">
                  <h5 className="mb-3">Teaching Skills</h5>
                  {user.teaching && user.teaching.length > 0 ? (
                    <div className="skill-list">
                      {user.teaching.map((skill, index) => (
                        <span key={index} className="skill-item">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No teaching skills added.</p>
                  )}
                </div>

                {/* Learning Interests */}
                <div className="skill-category flex-grow-1">
                  <h5 className="mb-3">Learning Interests</h5>
                  {user.learning && user.learning.length > 0 ? (
                    <div className="skill-list">
                      {user.learning.map((skill, index) => (
                        <span key={index} className="skill-item">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No learning interests added.</p>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Modal.Body>
    </Modal>
  );
};

export default UserProfileModal; 