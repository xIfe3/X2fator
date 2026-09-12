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

  flutterwave: {
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY,
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY,
    secretHash: process.env.FLUTTERWAVE_SECRET_HASH,
    callbackUrl: process.env.FLUTTERWAVE_CALLBACK_URL,
    baseUrl: process.env.FLUTTERWAVE_BASE_URL ?? 'https://api.flutterwave.com/v3',
  },
});
