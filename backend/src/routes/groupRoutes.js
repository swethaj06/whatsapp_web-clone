const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

// Apply protect middleware to all routes
router.use(protect);

// Create group
router.post('/create', groupController.createGroup);

// Get all user groups
router.get('/', groupController.getUserGroups);

// Get single group
router.get('/:groupId', groupController.getGroup);

// Update group
router.put('/:groupId', groupController.updateGroup);

// Add member to group
router.post('/:groupId/add-member', groupController.addMember);

// Remove member from group
router.post('/:groupId/remove-member', groupController.removeMember);

// Leave group
router.post('/:groupId/leave', groupController.leaveGroup);

// Delete group
router.delete('/:groupId', groupController.deleteGroup);

// Get group messages
router.get('/:groupId/messages', groupController.getGroupMessages);

module.exports = router;
