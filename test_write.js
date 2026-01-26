const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'next-dashboard', 'test_permissions.txt');

try {
    fs.writeFileSync(target, 'Hello from Trae Agent');
    console.log('Success');
} catch (err) {
    console.error('Failed:', err.message);
}
