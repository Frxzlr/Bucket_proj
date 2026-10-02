const assert = require('node:assert');
const test = require('node:test');
const http = require('node:http');
const fs = require('fs/promises');
const path = require('path');

// Set simulated DB delay to 50ms for tests to run quickly
process.env.DB_DELAY_MS = '50';

const app = require('./server');
const cacheService = require('./services/cache.service');

const dbBackupPath = path.join(__dirname, 'db.test-backup.json');
const dbPath = path.join(__dirname, 'db.json');

let server;
let baseUrl;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {}
    };

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

test.before(async () => {
  // Backup db.json before running tests
  const originalDb = await fs.readFile(dbPath, 'utf-8');
  await fs.writeFile(dbBackupPath, originalDb, 'utf-8');

  // Start server on a random port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Restore original db.json
  try {
    const originalDb = await fs.readFile(dbBackupPath, 'utf-8');
    await fs.writeFile(dbPath, originalDb, 'utf-8');
    await fs.unlink(dbBackupPath);
  } catch (e) {
    console.error('Error cleaning up test db backup:', e);
  }
});

test('Folder Structure exists according to requirements', async () => {
  const folders = ['routes', 'controllers', 'services', 'database', 'middleware'];
  for (const folder of folders) {
    const stat = await fs.stat(path.join(__dirname, folder));
    assert.strictEqual(stat.isDirectory(), true, `Folder ${folder} must exist`);
  }
});

test('GET /products initially returns X-Cache: MISS', async () => {
  cacheService.invalidateAll();

  const start = Date.now();
  const res = await request('GET', '/products');
  const elapsed = Date.now() - start;

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['x-cache'], 'MISS');
  assert.strictEqual(Array.isArray(res.data), true);
  assert.ok(elapsed >= 40, 'Should have waited for database delay on MISS');
});

test('GET /products subsequent call returns X-Cache: HIT and is fast', async () => {
  const start = Date.now();
  const res = await request('GET', '/products');
  const elapsed = Date.now() - start;

  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['x-cache'], 'HIT');
  assert.strictEqual(Array.isArray(res.data), true);
  assert.ok(elapsed < 30, 'Cached HIT should return immediately without DB delay');
});

test('GET /products/:id returns X-Cache: MISS on first call and HIT on second call', async () => {
  cacheService.invalidateAll();

  // First call: MISS
  const res1 = await request('GET', '/products/1');
  assert.strictEqual(res1.statusCode, 200);
  assert.strictEqual(res1.headers['x-cache'], 'MISS');
  assert.strictEqual(res1.data.id, 1);

  // Second call: HIT
  const res2 = await request('GET', '/products/1');
  assert.strictEqual(res2.statusCode, 200);
  assert.strictEqual(res2.headers['x-cache'], 'HIT');
  assert.strictEqual(res2.data.id, 1);
});

test('POST /products invalidates all cached entries', async () => {
  // Prime cache for both /products and /products/1
  await request('GET', '/products');
  await request('GET', '/products/1');

  assert.strictEqual((await request('GET', '/products')).headers['x-cache'], 'HIT');
  assert.strictEqual((await request('GET', '/products/1')).headers['x-cache'], 'HIT');

  // Create new product
  const postRes = await request('POST', '/products', {
    name: 'Wireless Headphones',
    price: 89.99
  });
  assert.strictEqual(postRes.statusCode, 201);
  assert.strictEqual(postRes.data.name, 'Wireless Headphones');

  // Both cache entries must now be invalidated
  const resProducts = await request('GET', '/products');
  assert.strictEqual(resProducts.headers['x-cache'], 'MISS');
  const createdInList = resProducts.data.find((p) => p.name === 'Wireless Headphones');
  assert.ok(createdInList, 'New product should be in fresh DB query');

  const resItem = await request('GET', '/products/1');
  assert.strictEqual(resItem.headers['x-cache'], 'MISS');
});

test('PUT /products/:id invalidates cache and updates stored product', async () => {
  // Prime cache
  await request('GET', '/products');
  await request('GET', '/products/2');
  assert.strictEqual((await request('GET', '/products/2')).headers['x-cache'], 'HIT');

  // Update product 2
  const putRes = await request('PUT', '/products/2', {
    name: 'Gaming Mouse',
    price: 39.99
  });
  assert.strictEqual(putRes.statusCode, 200);
  assert.strictEqual(putRes.data.name, 'Gaming Mouse');

  // Cache should be invalidated: MISS
  const resAfterPut = await request('GET', '/products/2');
  assert.strictEqual(resAfterPut.headers['x-cache'], 'MISS');
  assert.strictEqual(resAfterPut.data.name, 'Gaming Mouse');
});

test('PATCH /products/:id invalidates cache and partially updates stored product', async () => {
  // Prime cache
  await request('GET', '/products');
  await request('GET', '/products/3');
  assert.strictEqual((await request('GET', '/products/3')).headers['x-cache'], 'HIT');

  // Patch price of product 3
  const patchRes = await request('PATCH', '/products/3', {
    price: 179.99
  });
  assert.strictEqual(patchRes.statusCode, 200);
  assert.strictEqual(patchRes.data.price, 179.99);

  // Cache should be invalidated: MISS
  const resAfterPatch = await request('GET', '/products/3');
  assert.strictEqual(resAfterPatch.headers['x-cache'], 'MISS');
  assert.strictEqual(resAfterPatch.data.price, 179.99);
});

test('DELETE /products/:id invalidates cache and deletes stored product', async () => {
  // Prime cache
  await request('GET', '/products');
  await request('GET', '/products/4');
  assert.strictEqual((await request('GET', '/products/4')).headers['x-cache'], 'HIT');

  // Delete product 4
  const delRes = await request('DELETE', '/products/4');
  assert.strictEqual(delRes.statusCode, 200);

  // Cache should be invalidated: MISS
  const resAfterDel = await request('GET', '/products');
  assert.strictEqual(resAfterDel.headers['x-cache'], 'MISS');
  const deletedItem = resAfterDel.data.find((p) => p.id === 4);
  assert.strictEqual(deletedItem, undefined);
});

test('TTL: Cache entry expires after 1 minute (60s) TTL and fetches fresh data', async () => {
  const testKey = '/products';
  // Check that CacheService records createdAt timestamp
  cacheService.set(testKey, [{ id: 999, name: 'Mock' }]);
  const entryMeta = cacheService.getEntryMeta(testKey);
  assert.ok(entryMeta.createdAt, 'Cache entry must have createdAt timestamp');
  assert.strictEqual(entryMeta.ttl, 60000, 'Default TTL should be 60000ms (1 minute)');

  // Mock timestamp to simulate 61 seconds later
  const originalNow = Date.now;
  try {
    Date.now = () => entryMeta.createdAt + 61000; // 61 seconds later

    // Value should now be considered expired and return null
    const cached = cacheService.get(testKey);
    assert.strictEqual(cached, null, 'Expired entry must not be returned');

    // Next HTTP request should be a MISS and fetch fresh data
    const res = await request('GET', '/products');
    assert.strictEqual(res.headers['x-cache'], 'MISS');
  } finally {
    Date.now = originalNow;
  }
});
