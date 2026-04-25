const jwt = require('jsonwebtoken');
const User = require('../models/User');

const extractToken = (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  if (typeof req.query?.token === 'string' && req.query.token.trim()) {
    return req.query.token.trim();
  }

  return null;
};

// -------------------------------------------
// protect  — verifies the JWT and attaches the
//            authenticated user to req.user
// -------------------------------------------
exports.protect = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — no token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'This account has been deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorised — token invalid.',
    });
  }
};

// -------------------------------------------
// optionalAuth  — attaches req.user when a
// token exists, but allows anonymous access.
// -------------------------------------------
exports.optionalAuth = async (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    }
  } catch (error) {
    // Ignore invalid tokens for public routes.
  }

  next();
};

// -------------------------------------------
// authorize  — restricts access to given roles
// Usage: authorize('admin')
// -------------------------------------------
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not allowed to perform this action.`,
      });
    }
    next();
  };
};
