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
  FROM_EMAIL: Joi.string().email({ tlds: { allow: false } }).default('no-reply@hrms.local'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_S3_BUCKET: Joi.string().default('hrms-uploads')
}).unknown();

const { value: envVars, error } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const env = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
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
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS
      }
    },
    from: envVars.FROM_EMAIL
  },
  aws: {
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    region: envVars.AWS_REGION,
    s3Bucket: envVars.AWS_S3_BUCKET
  }
};
