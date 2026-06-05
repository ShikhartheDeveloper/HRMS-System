export const errorHandler = (err, req, res, next) => {
  console.error('Error details:', err);

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';

  // Handle Joi validation errors
  if (err.isJoi) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.details ? err.details.map(d => d.message).join(', ') : err.message;
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'BAD_REQUEST';
    message = `Invalid format for field ${err.path}`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_ERROR';
    message = 'Resource already exists';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
};
