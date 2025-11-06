require('dotenv').config();
const bcrypt = require('bcryptjs');
const { ensureDatabaseAndTables, getPool } = require('./db');

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node reset-password.js <email> <newPassword>');
    process.exit(1);
  }
  const [email, newPassword] = args;

  try {
    await ensureDatabaseAndTables();
    const pool = getPool();
    const hash = await bcrypt.hash(newPassword, 10);
    const [result] = await pool.execute('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);
    if (result.affectedRows === 0) {
      console.error('User not found:', email);
      process.exit(2);
    }
    console.log(`Password updated for ${email}`);
    process.exit(0);
  } catch (err) {
    console.error('Error resetting password:', err);
    process.exit(3);
  }
}

run();
