const cors = require('cors');

/**
 * CORS configuration
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow localhost in development
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite
      'http://localhost:8000',
    ];

    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // In production, check whitelist
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
};

module.exports = cors(corsOptions);
