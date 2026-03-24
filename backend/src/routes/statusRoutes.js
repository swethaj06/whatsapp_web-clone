const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');
const { protect } = require('../middleware/auth');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create a new status
router.post('/', protect, upload.single('media'), statusController.createStatus);

// Get all statuses from contacts
router.get('/', protect, statusController.getStatuses);

// Get statuses for a specific user
router.get('/user/:userId', protect, statusController.getUserStatuses);

// Mark status as viewed
router.patch('/:statusId/view', protect, statusController.markStatusAsViewed);

// Get status viewers
router.get('/:statusId/viewers', protect, statusController.getStatusViewers);

// Delete a status
router.delete('/:statusId', protect, statusController.deleteStatus);

module.exports = router;

module.exports = router;
