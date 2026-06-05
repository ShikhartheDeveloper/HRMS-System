import mongoose from 'mongoose';

/**
 * Generates an employee ID in the format: EMP-{year}-{4-digit-sequence}
 * @param {string} tenantId - Tenant ID context
 * @returns {Promise<string>} - Generated employee ID
 */
export const generateEmployeeId = async (tenantId) => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `EMP-${currentYear}-`;

  // Resolve Employee model dynamically to prevent circular dependencies
  const Employee = mongoose.model('Employee');

  // Find the employee with the highest ID for the current year
  const lastEmployee = await Employee.findOne({
    tenantId,
    employeeId: new RegExp(`^${yearPrefix}`)
  })
    .sort({ employeeId: -1 })
    .select('employeeId')
    .lean();

  let nextSequence = 1;
  if (lastEmployee && lastEmployee.employeeId) {
    const parts = lastEmployee.employeeId.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextSequence = lastNum + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${yearPrefix}${paddedSequence}`;
};
export default generateEmployeeId;
