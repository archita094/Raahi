const { validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstErr = errors.array()[0];
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: `${firstErr.param || firstErr.path}: ${firstErr.msg}`
      }
    });
  }
  next();
}

module.exports = {
  handleValidationErrors
};

