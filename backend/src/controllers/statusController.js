const Status = require('../models/Status');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Create a new status
exports.createStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      console.error('❌ [createStatus] User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get content from body or use default
    let content = req.body.content || '';
    const mediaType = req.body.mediaType || 'text';
    const textColor = req.body.textColor || '#000000';
    const backgroundColor = req.body.backgroundColor || '#ffffff';

    console.log('📝 [createStatus] Received status creation request:', {
      userId,
      mediaType,
      contentLength: content.length,
      hasFile: !!req.file
    });

    // Validation
    if (!content || content.trim() === '') {
      if (!req.file) {
        console.error('❌ [createStatus] No content and no file');
        return res.status(400).json({ message: 'Status content or media file is required' });
      }
      content = 'Media status';
    }

    const statusData = {
      userId,
      content: content.trim(),
      mediaType,
      textColor,
      backgroundColor
    };

    // Handle media upload if present - Store in database as base64
    if (req.file) {
      try {
        // Convert file buffer to base64
        const mediaData = req.file.buffer.toString('base64');
        statusData.mediaData = mediaData;
        statusData.mimeType = req.file.mimetype;
        
        // Determine media type from MIME type
        if (req.file.mimetype.startsWith('image/')) {
          statusData.mediaType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
          statusData.mediaType = 'video';
        }
        
        console.log(`📤 [createStatus] Storing media - User: ${userId}, Type: ${statusData.mediaType}, Size: ${mediaData.length} bytes`);
      } catch (fileError) {
        console.error('❌ [createStatus] Error processing file:', fileError);
        return res.status(500).json({ message: 'Failed to process media file' });
      }
    }

    const status = new Status(statusData);
    const savedStatus = await status.save();
    console.log('💾 [createStatus] Status saved to DB:', savedStatus._id);

    await savedStatus.populate('userId', 'username profilePicture');
    console.log('✅ [createStatus] Status populated with user:', savedStatus.userId?.username);

    // Broadcast to all connected users via socket
    if (req.io) {
      console.log('📡 [createStatus] Emitting status_created event to all users');
      req.io.emit('status_created', { status: savedStatus });
    } else {
      console.warn('⚠️ [createStatus] req.io not available for socket broadcast');
    }

    res.status(201).json({ 
      message: 'Status created successfully', 
      data: savedStatus,
      success: true 
    });
  } catch (error) {
    console.error('❌ [createStatus] Error creating status:', error);
    res.status(500).json({ 
      message: 'Error creating status', 
      error: error.message,
      success: false 
    });
  }
};

// Get all statuses from all users (visible to everyone)
exports.getStatuses = async (req, res) => {
  try {
    console.log('📸 [getStatuses] Fetching all statuses for user:', req.user._id);

    // Get ALL statuses from ALL users (no filtering - visible to everyone)
    const allStatuses = await Status.find()
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    console.log('📸 [getStatuses] Found total statuses:', allStatuses.length);
    if (allStatuses.length > 0) {
      console.log('📸 [getStatuses] Sample status:', JSON.stringify(allStatuses[0], null, 2));
    }

    // Group statuses by user and convert media to data URLs
    const statusesByUser = {};
    allStatuses.forEach(status => {
      if (!status.userId) {
        console.warn('⚠️ [getStatuses] Status has no userId:', status._id);
        return; // Skip if no user
      }
      
      // Convert base64 media to data URL
      if (status.mediaData && status.mimeType) {
        status.mediaUrl = `data:${status.mimeType};base64,${status.mediaData}`;
        console.log('📸 [getStatuses] Converted media to URL for status:', status._id);
      }
      
      const userIdStr = status.userId._id.toString();
      if (!statusesByUser[userIdStr]) {
        statusesByUser[userIdStr] = {
          user: status.userId,
          statuses: []
        };
      }
      statusesByUser[userIdStr].statuses.push(status);
    });

    const result = Object.values(statusesByUser);
    console.log('📸 [getStatuses] Grouped by users:', result.length);
    console.log('📸 [getStatuses] Final result:', JSON.stringify(result.slice(0, 2), null, 2));
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching statuses:', error);
    res.status(500).json({ message: 'Error fetching statuses', error: error.message });
  }
};

// Get single status with media data
exports.getStatusWithMedia = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('userId', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    // If status has media, return it as data URL
    if (status.mediaData && status.mimeType) {
      status.mediaUrl = `data:${status.mimeType};base64,${status.mediaData}`;
    }

    res.json(status);
  } catch (error) {
    console.error('Error fetching status with media:', error);
    res.status(500).json({ message: 'Error fetching status', error: error.message });
  }
};

// Get statuses for a specific user
exports.getUserStatuses = async (req, res) => {
  try {
    const { userId } = req.params;

    const statuses = await Status.find({ userId })
      .populate('userId', 'username profilePicture')
      .sort({ createdAt: -1 });

    res.json(statuses);
  } catch (error) {
    console.error('Error fetching user statuses:', error);
    res.status(500).json({ message: 'Error fetching user statuses', error: error.message });
  }
};

// Mark status as viewed
exports.markStatusAsViewed = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const status = await Status.findByIdAndUpdate(
      statusId,
      {
        $push: {
          viewers: {
            userId,
            viewedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    res.json({ message: 'Status marked as viewed', status });
  } catch (error) {
    console.error('Error marking status as viewed:', error);
    res.status(500).json({ message: 'Error marking status as viewed', error: error.message });
  }
};

// Delete a status
exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(statusId);

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    if (status.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this status' });
    }

    // Delete media file if exists
    if (status.mediaUrl) {
      const filePath = path.join(__dirname, '../../' + status.mediaUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Status.findByIdAndDelete(statusId);

    // Broadcast deletion to all users
    req.io.emit('status_deleted', { statusId });

    res.json({ message: 'Status deleted successfully' });
  } catch (error) {
    console.error('Error deleting status:', error);
    res.status(500).json({ message: 'Error deleting status', error: error.message });
  }
};

// Get status viewers
exports.getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;

    const status = await Status.findById(statusId)
      .populate('viewers.userId', 'username profilePicture');

    if (!status) {
      return res.status(404).json({ message: 'Status not found' });
    }

    res.json(status.viewers);
  } catch (error) {
    console.error('Error fetching status viewers:', error);
    res.status(500).json({ message: 'Error fetching status viewers', error: error.message });
  }
};
