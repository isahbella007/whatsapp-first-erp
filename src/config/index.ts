import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load environment variables from .env file
dotenv.config({
  path:
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'staging' ? `.env-local` : `.env`,
});
// Environment variable check 
const envsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'staging', 'test').default('development').required(),
    PORT: Joi.number().default(5000),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    REDIS_URL: Joi.string().description('redis url').required(),
    MONGODB_URI: Joi.string().description('mongodb uri').required(),
    TWILIO_ACCOUNT_SID: Joi.string().description('twilio account sid').required(),
    TWILIO_AUTH_TOKEN: Joi.string().description('twilio auth token').required(),
    TWILIO_PHONE_NUMBER: Joi.string().description('twilio phone number').required(),
    WASENDER_API_KEY: Joi.string().description('wasender api key').optional(),
    WASENDER_API_URL: Joi.string().description('wasender api url').optional(),
    WASENDER_WEBHOOK_SECRET: Joi.string().description('wasender webhook secret').optional(),
    OPAY_PUBLIC_KEY: Joi.string().description('opay public key').optional(),
    OPAY_MERCHANT_ID: Joi.string().description('opay merchant id').optional(),
    OPAY_MERCHANT_NAME: Joi.string().description('opay merchant name').optional(),
    OPAY_ENVIRONMENT: Joi.string().description('opay environment').default('sandbox').optional(),
    DEFAULT_MESSAGING_PROVIDER: Joi.string().description('default messaging provider').default('twilio').optional(),
    LOG_LEVEL: Joi.string().description('log level').default('info').optional(),
    LOG_FORMAT: Joi.string().description('log format').default('combined').optional(),
    GEMINI_API_KEY: Joi.string().description('gemini api key').required(),
  })
  .unknown();

  const { value: envs, error } = envsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

  if (error) {
    throw new Error(`Config validation error: ${error.message}`);
  }

/**
 * Environment configuration object
 */
const config = {
  // Server settings
  server: {
    port: envs.PORT,
    env: envs.NODE_ENV,
  },
  
  // Database settings
  database: {
    uri: envs.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  
  // Redis settings
  redis: {
    uri: envs.REDIS_URI,
    options: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    },
    cooldownTime: 10 * 60, // 10 minutes in seconds
  },
  
  // JWT settings
  jwt: {
    secret: envs.JWT_SECRET,
    expiresIn: envs.JWT_EXPIRATION
  },
  
  // Wasender API configuration
  wasender: {
    apiKey: envs.WASENDER_API_KEY,
    apiUrl: envs.WASENDER_API_URL,
    webhookSecret: envs.WASENDER_WEBHOOK_SECRET,
  },
  
  // Twilio API configuration
  twilio: {
    accountSid: envs.TWILIO_ACCOUNT_SID,
    authToken: envs.TWILIO_AUTH_TOKEN,
    phoneNumber: envs.TWILIO_PHONE_NUMBER
  },
  
  // OPay Checkout configuration
  opay: {
    publicKey: envs.OPAY_PUBLIC_KEY,
    merchantId: envs.OPAY_MERCHANT_ID,
    merchantName: envs.OPAY_MERCHANT_NAME,
    environment: envs.OPAY_ENVIRONMENT,
  },
  
  // Messaging service configuration
  messaging: {
    defaultProvider: envs.DEFAULT_MESSAGING_PROVIDER, // 'wasender' or 'twilio'
  },
  
  // Logging configuration
  logging: {
    level: envs.LOG_LEVEL,
    format: envs.LOG_FORMAT,
  },

  // Gemini API configuration
  gemini: {
    apiKey: envs.GEMINI_API_KEY,
  },
};

export default config; 