const db = require('../config/database');

async function log(instituteId, userId, action, entityType, entityId, oldValues, newValues, ipAddress) {
  try {
    await db.query(
      `INSERT INTO activity_logs (institute_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        instituteId, userId, action, entityType, entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null
      ]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

module.exports = { log };
