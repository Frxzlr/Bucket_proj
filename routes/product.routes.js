const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const cacheMiddleware = require('../middleware/cache.middleware');

// GET /products - with caching middleware
router.get('/', cacheMiddleware, (req, res, next) => productController.getAllProducts(req, res, next));

// GET /products/:id - with caching middleware
router.get('/:id', cacheMiddleware, (req, res, next) => productController.getProductById(req, res, next));

// POST /products - create product and invalidate cache
router.post('/', (req, res, next) => productController.createProduct(req, res, next));

// PUT /products/:id - replace product and invalidate cache
router.put('/:id', (req, res, next) => productController.updateProduct(req, res, next));

// PATCH /products/:id - partially update product and invalidate cache
router.patch('/:id', (req, res, next) => productController.patchProduct(req, res, next));

// DELETE /products/:id - delete product and invalidate cache
router.delete('/:id', (req, res, next) => productController.deleteProduct(req, res, next));

module.exports = router;
