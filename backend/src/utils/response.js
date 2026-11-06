export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res, message = 'An error occurred', statusCode = 500, details = null) => {
  const payload = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV !== 'production') {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};
