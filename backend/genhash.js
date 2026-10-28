const bcrypt = require('bcryptjs');
async function main() {
  const adminHash = await bcrypt.hash('Admin@1234', 10);
  const staffHash = await bcrypt.hash('Staff@1234', 10);
  console.log('ADMIN_HASH=' + adminHash);
  console.log('STAFF_HASH=' + staffHash);
}
main();
