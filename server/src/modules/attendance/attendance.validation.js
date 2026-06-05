import Joi from 'joi';

const gpsSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

export const punchInSchema = Joi.object({
  gps: gpsSchema.optional() // GPS validation can be bypassed in dev if coordinates omitted
});

export const punchOutSchema = Joi.object({
  gps: gpsSchema.optional()
});

export const requestRegularizationSchema = Joi.object({
  date: Joi.date().required(),
  reason: Joi.string().min(5).required(),
  requestedPunchIn: Joi.date().optional(),
  requestedPunchOut: Joi.date().optional()
});

export const reviewRegularizationSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Rejected').required(),
  comments: Joi.string().allow('').optional()
});
