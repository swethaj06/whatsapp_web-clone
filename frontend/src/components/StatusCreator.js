import React, { useState } from 'react';
import { statusAPI } from '../services/api';
import './StatusCreator.css';
import { MdClose, MdAddAPhoto, MdVideocam } from 'react-icons/md';
import toast from 'react-hot-toast';

const StatusCreator = ({ currentUser, onStatusCreated, onClose, isInDrawer = false, onBack }) => {
  const [statusType, setStatusType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');

  const handleFileSelect = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setStatusType(type);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      // Validation for text status
      if (statusType === 'text') {
        if (!textContent.trim()) {
          toast.error('Please enter some text for your status');
          setIsLoading(false);
          return;
        }
      }

      // Validation for media status
      if (statusType !== 'text' && !selectedFile) {
        toast.error(`Please select a ${statusType} file for your status`);
        setIsLoading(false);
        return;
      }

      const formData = new FormData();

      if (statusType === 'text') {
        formData.append('content', textContent);
        formData.append('mediaType', 'text');
        formData.append('textColor', textColor);
        formData.append('backgroundColor', backgroundColor);
      } else if (selectedFile) {
        formData.append('content', selectedFile.name || 'Media status');
        formData.append('media', selectedFile);
        formData.append('mediaType', statusType);
      }

      try {
        const response = await statusAPI.createStatus(formData);
        
        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }

        toast.success('Status posted successfully!');
        onStatusCreated();
        onClose();
      } catch (apiError) {
        // Check if it's an authentication error
        if (apiError.response?.status === 401) {
          toast.error('Session expired. Please log in again.');
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        
        const errorMessage = apiError?.response?.data?.message || apiError?.message || 'Failed to create status';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error creating status:', error);
      const errorMessage = error?.message || 'Failed to create status';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {isInDrawer ? (
        <div className="status-creator-container-drawer">
          <div className="creator-content">
            {statusType === 'text' ? (
              <div className="text-editor">
                <div
                  className="text-preview"
                  style={{
                    backgroundColor: backgroundColor,
                    color: textColor
                  }}
                >
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="text-input"
                    style={{
                      color: textColor,
                      backgroundColor: 'transparent'
                    }}
                  />
                </div>

                <div className="text-controls">
                  <div className="control-group">
                    <label>Text Color:</label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="color-picker"
                    />
                  </div>

                  <div className="control-group">
                    <label>Background Color:</label>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="color-picker"
                    />
                  </div>
                </div>
              </div>
            ) : preview ? (
              <div className="media-preview">
                {statusType === 'image' ? (
                  <img src={preview} alt="Preview" />
                ) : (
                  <video src={preview} controls />
                )}
              </div>
            ) : null}
          </div>

          <div className="creator-actions">
            <div className="upload-buttons">
              <label className="upload-btn image">
                <MdAddAPhoto /> Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e, 'image')}
                  hidden
                />
              </label>
              <label className="upload-btn video">
                <MdVideocam /> Video
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileSelect(e, 'video')}
                  hidden
                />
              </label>
              {statusType !== 'text' && (
                <button
                  className="upload-btn text"
                  onClick={() => {
                    setStatusType('text');
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                >
                  Text
                </button>
              )}
            </div>

            <div className="submit-actions">
              <button className="btn-cancel" onClick={onBack}>
                Back
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Posting...' : 'Post Status'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="status-creator-overlay">
          <div className="status-creator-container">
            <div className="creator-header">
              <h2>Create Status</h2>
              <button className="close-btn" onClick={onClose}>
                <MdClose />
              </button>
            </div>

            <div className="creator-content">
              {statusType === 'text' ? (
                <div className="text-editor">
                  <div
                    className="text-preview"
                    style={{
                      backgroundColor: backgroundColor,
                      color: textColor
                    }}
                  >
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="What's on your mind?"
                      className="text-input"
                      style={{
                        color: textColor,
                        backgroundColor: 'transparent'
                      }}
                    />
                  </div>

                  <div className="text-controls">
                    <div className="control-group">
                      <label>Text Color:</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="color-picker"
                      />
                    </div>

                    <div className="control-group">
                      <label>Background Color:</label>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="color-picker"
                      />
                    </div>
                  </div>
                </div>
              ) : preview ? (
                <div className="media-preview">
                  {statusType === 'image' ? (
                    <img src={preview} alt="Preview" />
                  ) : (
                    <video src={preview} controls />
                  )}
                </div>
              ) : null}
            </div>

            <div className="creator-actions">
              <div className="upload-buttons">
                <label className="upload-btn image">
                  <MdAddAPhoto /> Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e, 'image')}
                    hidden
                  />
                </label>
                <label className="upload-btn video">
                  <MdVideocam /> Video
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileSelect(e, 'video')}
                    hidden
                  />
                </label>
                {statusType !== 'text' && (
                  <button
                    className="upload-btn text"
                    onClick={() => {
                      setStatusType('text');
                      setSelectedFile(null);
                      setPreview(null);
                    }}
                  >
                    Text
                  </button>
                )}
              </div>

              <div className="submit-actions">
                <button className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? 'Posting...' : 'Post Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusCreator;
