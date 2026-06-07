import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

// Load env variables
dotenv.config();

const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string().valid('production', 'development', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().allow('').default('memory'),
  JWT_SECRET: Joi.string().required().description('JWT access token secret'),
  JWT_REFRESH_SECRET: Joi.string().required().description('JWT refresh token secret'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
  SMTP_HOST: Joi.string().description('SMTP server host'),
  SMTP_PORT: Joi.number().description('SMTP server port'),
  SMTP_USER: Joi.string().description('SMTP server username'),
  SMTP_PASS: Joi.string().description('SMTP server password'),
  EMAIL_USER: Joi.string().description('Fallback SMTP username (Render compat)'),
  EMAIL_PASS: Joi.string().description('Fallback SMTP password (Render compat)'),
  FROM_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('no-reply@hrms.local'),
  RESEND_API_KEY: Joi.string().allow('').default(''),
  RESEND_FROM_EMAIL: Joi.string().allow('').default('HRMS System <onboarding@resend.dev>'),
  BREVO_API_KEY: Joi.string().allow('').default(''),
  BREVO_FROM_EMAIL: Joi.string().allow('').default(''),
  BREVO_FROM_NAME: Joi.string().allow('').default('HRMS System'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_S3_BUCKET: Joi.string().default('hrms-uploads'),
  CLIENT_URL: Joi.string().uri().default('https://hrms-system-qkyv.onrender.com'),
  SERVER_BASE_URL: Joi.string().uri().default('https://hrms-system-qkyv.onrender.com')
}).unknown();

const { value: envVars, error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Populate process.env with Joi defaults
process.env.CLIENT_URL = envVars.CLIENT_URL;
process.env.SERVER_BASE_URL = envVars.SERVER_BASE_URL;

export const env = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  clientUrl: envVars.CLIENT_URL,
  serverBaseUrl: envVars.SERVER_BASE_URL,
  mongoose: {
    uri: envVars.MONGODB_URI,
    options: {}
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiration: envVars.JWT_ACCESS_EXPIRY,
    refreshExpiration: envVars.JWT_REFRESH_EXPIRY
  },
  email: {
    resendApiKey: envVars.RESEND_API_KEY || '',
    resendFrom: envVars.RESEND_FROM_EMAIL || 'HRMS System <onboarding@resend.dev>',
    brevo: {
      apiKey: envVars.BREVO_API_KEY || '',
      fromEmail: envVars.BREVO_FROM_EMAIL || '',
      fromName: envVars.BREVO_FROM_NAME || 'HRMS System'
    },
    smtp: {
      host: envVars.SMTP_HOST || 'smtp.gmail.com',
      port: envVars.SMTP_PORT || 587,
      auth: {
        user: envVars.SMTP_USER || envVars.EMAIL_USER,
        pass: envVars.SMTP_PASS || envVars.EMAIL_PASS
      }
    },
    from: envVars.FROM_EMAIL || envVars.SMTP_USER || envVars.EMAIL_USER || 'no-reply@hrms.local'
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3Bucket: envVars.AWS_S3_BUCKET
  }
};
