// Simple test function for Vercel with env check
export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Vercel function working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    env_check: {
      DB_HOST: process.env.DB_HOST || 'NOT SET',
      DB_USER: process.env.DB_USER || 'NOT SET',
      DB_NAME: process.env.DB_NAME || 'NOT SET',
      DB_PORT: process.env.DB_PORT || 'NOT SET',
      DB_SSL_ENABLED: process.env.DB_SSL_ENABLED || 'NOT SET',
      hasPassword: !!process.env.DB_PASSWORD,
      hasJWT: !!process.env.JWT_SECRET
    }
  });
}