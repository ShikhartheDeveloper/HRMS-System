import Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  }),
  tenantId: Joi.string().hex().length(24).required().messages({
    'string.length': 'Invalid Tenant identifier format',
    'any.required': 'Tenant identifier is required'
  })
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  subdomain: Joi.string().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});
