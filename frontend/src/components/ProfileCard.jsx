import React, { useState } from 'react';
import { Card, Image, Button, Form } from 'react-bootstrap';
import { FaEdit, FaCheck, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';

const ProfileCard = ({ userProfile, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    photo: userProfile.photo || 'https://via.placeholder.com/150',
    location: userProfile.location || '',
    bio: userProfile.bio || ''
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile({
      photo: userProfile.photo || 'https://via.placeholder.com/150',
      location: userProfile.location || '',
      bio: userProfile.bio || ''
    });
  };

  const handleSave = async () => {
    try {
      await onUpdateProfile({
        photo: editedProfile.photo,
        location: editedProfile.location,
        bio: editedProfile.bio
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedProfile({ ...editedProfile, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="profile-card">
      <Card.Body>
        <div className="d-flex align-items-start">
          {/* Left side - Photo */}
          <div className="profile-photo-container me-4">
            <Image
              src={editedProfile.photo}
              roundedCircle
              className="profile-photo"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
            {isEditing && (
              <div className="photo-upload-overlay">
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="d-none"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload" className="btn btn-light btn-sm">
                  Change Photo
                </label>
              </div>
            )}
          </div>

          {/* Right side - Info */}
          <div className="profile-info flex-grow-1">
            {isEditing ? (
              <Form>
                {/* Username - Read Only */}
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    value={userProfile.username}
                    disabled
                    readOnly
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Username cannot be changed
                  </Form.Text>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    type="text"
                    value={editedProfile.location}
                    onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                    placeholder="Your location"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Bio</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself"
                  />
                </Form.Group>
                <div className="d-flex gap-2">
                  <Button variant="success" size="sm" onClick={handleSave}>
                    <FaCheck className="me-1" /> Save
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCancel}>
                    <FaTimes className="me-1" /> Cancel
                  </Button>
                </div>
              </Form>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <h2 className="mb-1">{userProfile.username}</h2>
                    {editedProfile.location && (
                      <p className="text-muted mb-2">
                        <FaMapMarkerAlt className="me-1" /> {editedProfile.location}
                      </p>
                    )}
                  </div>
                  <Button variant="outline-primary" size="sm" onClick={handleEdit}>
                    <FaEdit className="me-1" /> Edit Profile
                  </Button>
                </div>
                {editedProfile.bio ? (
                  <p className="mt-2 mb-0">{editedProfile.bio}</p>
                ) : (
                  <p className="text-muted mt-2 mb-0">No bio added yet.</p>
                )}
              </>
            )}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProfileCard; 