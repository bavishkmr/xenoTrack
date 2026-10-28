function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err);

  // MySQL / PostgreSQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY' || err.code === '23505') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists' });
  }
  // MySQL / PostgreSQL foreign key constraint
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === '23503') {
    return res.status(409).json({ success: false, message: 'Referenced record not found or cannot be deleted' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}

module.exports = { errorHandler, notFound };
