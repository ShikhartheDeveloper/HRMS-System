import Joi from 'joi';

export const createEmployeeSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).default('Welcome123'), // Default temporary password
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phone: Joi.string().allow('').optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  department: Joi.string().required(),
  designation: Joi.string().required(),
  role: Joi.string().valid('EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP').default('EMPLOYEE'),
  dateOfJoining: Joi.date().optional(),
  managerId: Joi.string().hex().length(24).allow(null, '').optional(),
  salary: Joi.number().min(0).optional()
});

export const updateEmployeeSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  phone: Joi.string().allow('').optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid('Male', 'Female', 'Other').optional(),
  department: Joi.string().optional(),
  designation: Joi.string().optional(),
  role: Joi.string().valid('EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'LEADERSHIP').optional(),
  dateOfJoining: Joi.date().optional(),
  managerId: Joi.string().hex().length(24).allow(null, '').optional(),
  salary: Joi.number().min(0).optional(),
  status: Joi.string().valid('Active', 'Terminated', 'On Leave', 'Suspended').optional()
});
