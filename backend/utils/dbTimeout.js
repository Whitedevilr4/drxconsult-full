// Database timeout utility for Vercel serverless functions

/**
 * Wraps a database query with timeout protection
 * @param {Promise} query - The database query promise
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @param {string} operation - Description of the operation for error messages
 * @returns {Promise} - The query result or timeout error
 */
const withTimeout = async (query, timeout = 5000, operation = 'Database query') => {
  return Promise.race([
    query,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${operation} timeout`)), timeout)
    )
  ]);
};

/**
 * Handles database errors and returns appropriate HTTP responses
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {string} defaultMessage - Default error message
 */
const handleDbError = (error, res, defaultMessage = 'Server error') => {
  console.error('Database error:', error);
  
  // Check for timeout or connection errors
  if (error.message.includes('timeout') || 
      error.name === 'MongooseError' || 
      error.message.includes('buffering timed out')) {
    return res.status(503).json({ 
      message: 'Database connection timeout. Please try again.',
      retryable: true 
    });
  }
  
  // Check for validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      message: 'Validation error',
      errors: Object.values(error.errors).map(e => e.message)
    });
  }
  
  // Check for duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({ 
      message: 'Duplicate entry found',
      field: Object.keys(error.keyPattern)[0]
    });
  }
  
  // Generic server error
  return res.status(500).json({ message: defaultMessage });
};

/**
 * Wraps a route handler with database error handling
 * @param {Function} handler - The route handler function
 * @returns {Function} - Wrapped handler with error handling
 */
const withDbErrorHandling = (handler) => {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      handleDbError(error, res);
    }
  };
};

/**
 * Creates a database query with timeout and maxTimeMS
 * @param {Object} query - Mongoose query object
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} - Query with timeout protection
 */
const queryWithTimeout = (query, timeout = 5000) => {
  return withTimeout(
    query.maxTimeMS(timeout - 100), // Set maxTimeMS slightly less than timeout
    timeout,
    'Database query'
  );
};

module.exports = {
  withTimeout,
  handleDbError,
  withDbErrorHandling,
  queryWithTimeout
};