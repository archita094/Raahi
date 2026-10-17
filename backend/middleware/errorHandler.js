
function errorHandler(err, req, res, next) {
  console.error('[API ERROR]', err);

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected server error occurred.';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
}

function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.originalUrl} was not found on this server.`
    }
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};

