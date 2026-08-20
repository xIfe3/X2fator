export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  port: process.env.PORT ?? 4000,

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,

    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },

  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL,
  },
});
