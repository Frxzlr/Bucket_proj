const productDb = require('../database/product.db');
const cacheService = require('./cache.service');

/**
 * ProductService encapsulates business logic and coordinates with the database and cache.
 */
class ProductService {
  /**
   * Fetch all products
   */
  async getAllProducts() {
    return await productDb.findAll();
  }

  /**
   * Fetch a single product by ID
   * @param {number|string} id
   */
  async getProductById(id) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      const error = new Error('Invalid product ID');
      error.statusCode = 400;
      throw error;
    }
    return await productDb.findById(numericId);
  }

  /**
   * Create a new product.
   * On successful creation, invalidates all cache entries that may contain stale data.
   * @param {Object} productData
   */
  async createProduct(productData) {
    if (!productData || !productData.name || productData.price === undefined) {
      const error = new Error('Product name and price are required');
      error.statusCode = 400;
      throw error;
    }

    const createdProduct = await productDb.create(productData);

    // Invalidate all cache entries on successful data modification
    cacheService.invalidateAll();

    return createdProduct;
  }

  /**
   * Update (replace) a product by ID.
   * On successful update, invalidates all cache entries that may contain stale data.
   * @param {number|string} id
   * @param {Object} productData
   */
  async updateProduct(id, productData) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      const error = new Error('Invalid product ID');
      error.statusCode = 400;
      throw error;
    }

    if (!productData || !productData.name || productData.price === undefined) {
      const error = new Error('Product name and price are required');
      error.statusCode = 400;
      throw error;
    }

    const updatedProduct = await productDb.update(numericId, productData);
    if (!updatedProduct) {
      const error = new Error(`Product with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Invalidate all cache entries on successful data modification
    cacheService.invalidateAll();

    return updatedProduct;
  }

  /**
   * Partially update a product by ID.
   * On successful update, invalidates all cache entries that may contain stale data.
   * @param {number|string} id
   * @param {Object} partialData
   */
  async patchProduct(id, partialData) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      const error = new Error('Invalid product ID');
      error.statusCode = 400;
      throw error;
    }

    if (!partialData || Object.keys(partialData).length === 0) {
      const error = new Error('Request body must contain at least one field to update');
      error.statusCode = 400;
      throw error;
    }

    const updatedProduct = await productDb.patch(numericId, partialData);
    if (!updatedProduct) {
      const error = new Error(`Product with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Invalidate all cache entries on successful data modification
    cacheService.invalidateAll();

    return updatedProduct;
  }

  /**
   * Delete a product by ID.
   * On successful deletion, invalidates all cache entries that may contain stale data.
   * @param {number|string} id
   */
  async deleteProduct(id) {
    const numericId = Number(id);
    if (isNaN(numericId)) {
      const error = new Error('Invalid product ID');
      error.statusCode = 400;
      throw error;
    }

    const deletedProduct = await productDb.delete(numericId);
    if (!deletedProduct) {
      const error = new Error(`Product with ID ${numericId} not found`);
      error.statusCode = 404;
      throw error;
    }

    // Invalidate all cache entries on successful data modification
    cacheService.invalidateAll();

    return deletedProduct;
  }
}

module.exports = new ProductService();
