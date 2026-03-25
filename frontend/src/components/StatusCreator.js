import React, { useState } from 'react';
import { statusAPI } from '../services/api';
import './StatusCreator.css';
import { MdClose, MdAttachFile, MdSend } from 'react-icons/md';
import toast from 'react-hot-toast';

const StatusCreator = ({ currentUser, onStatusCreated, onClose, isInDrawer = false, onBack }) => {
  const [statusType, setStatusType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Determine type based on MIME type
      const type = file.type.startsWith('image/') ? 'image' : 'video';
      
      setSelectedFile(file);
      setStatusType(type);
      setImageCaption(''); // Reset caption when file changes

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
      } else if (selectedFile) {
        formData.append('content', imageCaption || selectedFile.name || 'Media status');
        formData.append('media', selectedFile);
        formData.append('mediaType', statusType);
      }

      console.log('📝 [StatusCreator] Submitting status:', {
        type: statusType,
        hasFile: !!selectedFile,
        contentLength: statusType === 'text' ? textContent.length : selectedFile?.size
      });

      try {
        const response = await statusAPI.createStatus(formData);
        
        console.log('📝 [StatusCreator] API Response:', response);

        if (!response || !response.data) {
          throw new Error('Invalid response from server');
        }

        console.log('✅ [StatusCreator] Status created successfully:', response.data);
        toast.success('Status posted successfully!');
        
        // Reset form
        setTextContent('');
        setImageCaption('');
        setSelectedFile(null);
        setPreview(null);
        setStatusType('text');
        
        onStatusCreated();
        onClose();
      } catch (apiError) {
        console.error('❌ [StatusCreator] API Error:', apiError);
        
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
      console.error('❌ Error creating status:', error);
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
                >
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="What's on your mind?"
                    className="text-input"
                    style={{
                      backgroundColor: 'transparent'
                    }}
                  />
                </div>

              </div>
            ) : preview ? (
              <div className="media-preview">
                {statusType === 'image' ? (
                  <img src={preview} alt="Preview" />
                ) : (
                  <video src={preview} controls />
                )}
                <div className="text-input-container" style={{ marginTop: '16px' }}>
                  <label>Add Caption (Optional)</label>
                  <textarea
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Add a caption to your media..."
                    className="text-input"
                    maxLength={280}
                  />
                  <small style={{ color: '#909699', fontSize: '12px', marginTop: '4px' }}>
                    {imageCaption.length}/280 characters
                  </small>
                </div>
              </div>
            ) : null}
          </div>

          <div className="creator-actions">
            <label className="upload-btn-single">
              <MdAttachFile /> File
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                hidden
              />
            </label>
            <button
              className="post-btn-round"
              onClick={handleSubmit}
              disabled={isLoading}
              title="Post Status"
            >
              <MdSend />
            </button>
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
                  >
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="What's on your mind?"
                      className="text-input"
                      style={{
                        backgroundColor: 'transparent'
                      }}
                    />
                  </div>
                </div>
              ) : preview ? (
                <div className="media-preview">
                  {statusType === 'image' ? (
                    <img src={preview} alt="Preview" />
                  ) : (
                    <video src={preview} controls />
                  )}
                  <div className="text-input-container" style={{ marginTop: '16px' }}>
                    <label>Add Caption (Optional)</label>
                    <textarea
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="Add a caption to your media..."
                      className="text-input"
                      maxLength={280}
                    />
                    <small style={{ color: '#909699', fontSize: '12px', marginTop: '4px' }}>
                      {imageCaption.length}/280 characters
                    </small>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="creator-actions">
              <label className="upload-btn-single">
                <MdAttachFile /> File
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  hidden
                />
              </label>
              <button
                className="post-btn-round"
                onClick={handleSubmit}
                disabled={isLoading}
                title="Post Status"
              >
                <MdSend />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusCreator;
