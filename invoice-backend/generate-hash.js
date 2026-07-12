/**
 * Password Hash Generator
 * Run: node generate-hash.js <your-password>
 *
 * Generates a bcrypt hash for storing in the .env file.
 * Never store plain-text passwords — only store the hash.
 */
const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.log('Usage: node generate-hash.js <your-password>');
  console.log('Example: node generate-hash.js MySecurePass123');
  process.exit(1);
}

const saltRounds = 12;
bcrypt.hash(password, saltRounds).then((hash) => {
  console.log('\n========================================');
  console.log('  Copy this hash into your .env file:');
  console.log('========================================');
  console.log(`\nADMIN_PASSWORD_HASH=${hash}\n`);
  console.log('========================================');
}).catch((err) => {
  console.error('Error generating hash:', err.message);
  process.exit(1);
});
