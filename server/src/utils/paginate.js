/**
 * Standard pagination helper for Mongoose queries
 * @param {mongoose.Model} model - Mongoose model
 * @param {Object} query - Filter criteria
 * @param {Object} options - Pagination options
 * @param {number} [options.page] - Page number (default: 1)
 * @param {number} [options.limit] - Limit per page (default: 10)
 * @param {Object|string} [options.sort] - Sort criteria
 * @param {string} [options.select] - Fields to select or exclude
 * @param {Array|string|Object} [options.populate] - Populate criteria
 * @returns {Promise<Object>} - Paginated object matching API schema
 */
export const paginate = async (model, query = {}, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, parseInt(options.limit, 10) || 10);
  const skip = (page - 1) * limit;

  const countPromise = model.countDocuments(query);
  let docsQuery = model.find(query).skip(skip).limit(limit);

  if (options.sort) {
    docsQuery = docsQuery.sort(options.sort);
  }
  if (options.select) {
    docsQuery = docsQuery.select(options.select);
  }
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => {
        docsQuery = docsQuery.populate(p);
      });
    } else {
      docsQuery = docsQuery.populate(options.populate);
    }
  }

  const [total, data] = await Promise.all([countPromise, docsQuery.lean()]);
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
};
export default paginate;
