const fs = require('fs/promises');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db.json');

// Simulated database delay (default 1500ms as originally set in the workshop, configurable via DB_DELAY_MS)
const DB_DELAY_MS = process.env.DB_DELAY_MS !== undefined ? Number(process.env.DB_DELAY_MS) : 1500;

const delay = (ms) => {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
};

async function readDb() {
  await delay(DB_DELAY_MS);
  const data = await fs.readFile(dbPath, 'utf-8');
  return JSON.parse(data);
}

async function writeDb(data) {
  await delay(DB_DELAY_MS);
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Database operations for Products
 */
const productDb = {
  /**
   * Fetch all products from database
   */
  async findAll() {
    return await readDb();
  },

  /**
   * Fetch product by ID
   */
  async findById(id) {
    const products = await readDb();
    const product = products.find((item) => item.id === Number(id));
    return product || null;
  },

  /**
   * Create a new product in the database
   */
  async create(productData) {
    const products = await readDb();
    const maxId = products.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const newProduct = {
      id: maxId + 1,
      name: productData.name,
      price: productData.price,
      ...productData
    };
    newProduct.id = maxId + 1; // ensure ID is numeric and unique
    products.push(newProduct);
    await writeDb(products);
    return newProduct;
  },

  /**
   * Replace/update product by ID in the database
   */
  async update(id, productData) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === Number(id));
    if (index === -1) {
      return null;
    }
    const updatedProduct = {
      id: Number(id),
      name: productData.name,
      price: productData.price,
      ...productData
    };
    updatedProduct.id = Number(id);
    products[index] = updatedProduct;
    await writeDb(products);
    return updatedProduct;
  },

  /**
   * Partially update product by ID in the database
   */
  async patch(id, partialData) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === Number(id));
    if (index === -1) {
      return null;
    }
    const existing = products[index];
    const updatedProduct = {
      ...existing,
      ...partialData,
      id: Number(id) // preserve id
    };
    products[index] = updatedProduct;
    await writeDb(products);
    return updatedProduct;
  },

  /**
   * Delete product by ID from the database
   */
  async delete(id) {
    const products = await readDb();
    const index = products.findIndex((item) => item.id === Number(id));
    if (index === -1) {
      return null;
    }
    const [deletedProduct] = products.splice(index, 1);
    await writeDb(products);
    return deletedProduct;
  }
};

module.exports = productDb;
