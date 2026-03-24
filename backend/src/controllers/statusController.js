const Status = require('../models/Status');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// Create a new status
exports.createStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Get content from body or use default
    let content = req.body.content || '';
    const mediaType = req.body.mediaType || 'text';
    const textColor = req.body.textColor || '#000000';
    const backgroundColor = req.body.backgroundColor || '#ffffff';

    // Validation
    if (!content || content.trim() === '') {
      if (!req.file) {
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

    // Handle media upload if present
    if (req.file) {
      const uploadsDir = require('path').join(__dirname, '../../uploads/status');
      const fs = require('fs');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `status_${userId}_${Date.now()}${require('path').extname(req.file.originalname)}`;
      const filePath = require('path').join(uploadsDir, fileName);

      try {
        fs.writeFileSync(filePath, req.file.buffer);
        statusData.mediaUrl = `/uploads/status/${fileName}`;
        
        // Determine media type from file extension
        const fileExtension = require('path').extname(req.file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension)) {
          statusData.mediaType = 'image';
        } else if (['.mp4', '.mov', '.avi', '.webm'].includes(fileExtension)) {
          statusData.mediaType = 'video';
        }
      } catch (fileError) {
        console.error('Error saving file:', fileError);
        return res.status(500).json({ message: 'Failed to save media file' });
      }
    }

    const status = new Status(statusData);
    await status.save();
    await status.populate('userId', 'username profilePicture');

    // Broadcast to all connected users via socket
    if (req.io) {
      req.io.emit('status_created', { status });
    }

    res.status(201).json({ 
      message: 'Status created successfully', 
      status,
      success: true 
    });
  } catch (error) {
    console.error('Error creating status:', error);
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

    // Group statuses by user
    const statusesByUser = {};
    allStatuses.forEach(status => {
      if (!status.userId) return; // Skip if no user
      
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
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching statuses:', error);
    res.status(500).json({ message: 'Error fetching statuses', error: error.message });
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
