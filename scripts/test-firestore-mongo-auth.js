const { MongoClient } = require('mongodb');
const fs = require('fs');

const line = fs.readFileSync('.env', 'utf8')
  .split(/\r?\n/)
  .find(x => x.startsWith('MONGODB_URI='));

if (!line) {
  throw new Error('MONGODB_URI not found in .env');
}

const uri = line
  .slice('MONGODB_URI='.length)
  .trim()
  .replace(/^['"]|['"]$/g, '');

const parsed = new URL(uri);

console.log('');
console.log('============================================================');
console.log(' TSM FIRESTORE MONGODB AUTH ISOLATION TEST');
console.log('============================================================');
console.log('');
console.log('Node     :', process.version);
console.log('Driver   :', require('mongodb/package.json').version);
console.log('Username :', decodeURIComponent(parsed.username));
console.log('Password : [REDACTED]');
console.log('Host     :', parsed.hostname);
console.log('Port     :', parsed.port || '[default]');
console.log('Database :', parsed.pathname);
console.log('Query    :', parsed.search);
console.log('Password length:', decodeURIComponent(parsed.password).length);
console.log('');
console.log('Connecting using EXACT MONGODB_URI...');
console.log('');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

(async () => {
  try {
    await client.connect();

    console.log('AUTHENTICATION: SUCCESS');
    console.log('');

    const result = await client.db().command({ ping: 1 });

    console.log('PING:', JSON.stringify(result));
    console.log('');
    console.log('============================================================');
    console.log(' RESULT: FIRESTORE AUTHENTICATION WORKS');
    console.log('============================================================');
  } catch (err) {
    console.log('AUTHENTICATION: FAILED');
    console.log('');
    console.log('name    :', err.name);
    console.log('code    :', err.code ?? '[none]');
    console.log('codeName:', err.codeName ?? '[none]');
    console.log('message :', err.message);

    if (err.cause) {
      console.log('');
      console.log('CAUSE');
      console.log('name    :', err.cause.name);
      console.log('code    :', err.cause.code ?? '[none]');
      console.log('codeName:', err.cause.codeName ?? '[none]');
      console.log('message :', err.cause.message);
    }

    process.exitCode = 1;
  } finally {
    await client.close().catch(() => {});
  }

  console.log('');
  console.log('============================================================');
  console.log(' TEST COMPLETE');
  console.log('============================================================');
})();
