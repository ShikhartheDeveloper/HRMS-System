import Joi from 'joi';

export const applyLeaveSchema = Joi.object({
  leaveType: Joi.string().valid('Casual', 'Sick', 'Earned', 'Unpaid').required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required().messages({
    'date.min': 'End date must be on or after start date'
  }),
  reason: Joi.string().min(5).required()
});

export const reviewLeaveSchema = Joi.object({
  status: Joi.string().valid('Approved', 'Rejected').required(),
  comments: Joi.string().allow('').optional()
});
