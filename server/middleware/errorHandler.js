export function errorHandler(err, req, res, next) {
  console.error('[ServerError]', err);

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 422 : 500);
  const message =
    err.message ||
    'Something went wrong while processing your request. Please try again or contact support.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

export default errorHandler;
