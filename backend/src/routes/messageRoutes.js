const express = require('express');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Log group message requests
router.post('/send-group', (req, res, next) => {
  console.log('🔔 [POST /api/messages/send-group] Request received');
  console.log('   Headers:', req.headers);
  console.log('   Body:', req.body);
  next();
}, messageController.sendGroupMessage);

// Apply protect middleware to all other routes
router.use(protect);

router.post('/send', messageController.sendMessage);
router.post('/send-attachment', messageController.uploadAttachment, messageController.sendMessage);
router.put('/read', messageController.markConversationAsRead);
router.get('/conversations/:userId', messageController.getConversationSummaries);
router.get('/', messageController.getMessages);
router.delete('/', messageController.deleteMessage); // For bulk deletion via query params
router.delete('/:id', messageController.deleteMessage); // For single message deletion

module.exports = router;
