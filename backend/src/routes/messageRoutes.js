const express = require('express');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.post('/send', messageController.sendMessage);
router.post('/send-attachment', messageController.uploadAttachment, messageController.sendMessage);
router.get('/', messageController.getMessages);
router.delete('/', messageController.deleteMessage); // For bulk deletion via query params
router.delete('/:id', messageController.deleteMessage); // For single message deletion

module.exports = router;
