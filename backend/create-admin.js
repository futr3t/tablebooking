const bcrypt = require('bcryptjs');

// Change this to your desired password
const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL Command:');
  console.log(`
INSERT INTO users (email, password, first_name, last_name, role, is_active) 
VALUES (
  'admin@restaurant.com',
  '${hash}',
  'Admin',
  'User',
  'owner',
  true
);
  `);
});