const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');
// Replace \` with `
const fixed = content.replace(/\\`/g, '`');
fs.writeFileSync('server.js', fixed);
console.log('Fixed backticks');
