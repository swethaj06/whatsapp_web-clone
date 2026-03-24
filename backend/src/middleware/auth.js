const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔐 [Auth] Checking token for path:', req.path);
    console.log('🔐 [Auth] Token present:', !!token);

    if (!token) {
      console.log('🔐 [Auth] No token found');
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('🔐 [Auth] Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('🔐 [Auth] User not found for userId:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'User account no longer exists. Please login again.',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('🔐 [Auth] User authenticated:', user.username);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔐 [Auth] Error:', error.message);
    
    // Check if it's a token expiration error
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this route',
      code: 'INVALID_TOKEN',
      error: error.message 
    });
  }
};
