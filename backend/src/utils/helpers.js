/**
 * Build a WHERE clause + params array from a filter object.
 * filters: { column: value } — skips null/undefined values.
 */
function buildFilter(filters, alias = '') {
  const conditions = [];
  const params = [];
  const prefix = alias ? `${alias}.` : '';
  for (const [col, val] of Object.entries(filters)) {
    if (val === null || val === undefined || val === '') continue;
    conditions.push(`${prefix}${col} = ?`);
    params.push(val);
  }
  return { conditions, params };
}

function paginate(query, total, page, limit) {
  return {
    data: query,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
}

function generateCode(prefix, number, padLength = 4) {
  return `${prefix}-${String(number).padStart(padLength, '0')}`;
}

module.exports = { buildFilter, paginate, generateCode };
