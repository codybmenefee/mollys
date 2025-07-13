require('dotenv').config({ path: '.env.local' });

console.log('🔍 Environment Variable Test');
console.log('');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.replace(/\/\/[^@]*@/, '//***:***@') : 
  'NOT FOUND');
console.log('');
console.log('Database from URI:', process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.split('/')[3]?.split('?')[0] || 'NO DATABASE' : 
  'NO URI');
console.log('');
console.log('Hostname from URI:', process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'NO HOSTNAME' : 
  'NO URI'); 