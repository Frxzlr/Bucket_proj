const productService = require('../services/product.service');

/**
 * ProductController handles incoming HTTP requests, delegating business logic to ProductService.
 */
class ProductController {
  /**
   * GET /products
   */
  async getAllProducts(req, res, next) {
    try {
      const products = await productService.getAllProducts();
      return res.status(200).json(products);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /products/:id
   */
  async getProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id);
      if (!product) {
        return res.status(404).json({ error: `Product with ID ${id} not found` });
      }
      return res.status(200).json(product);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /products
   */
  async createProduct(req, res, next) {
    try {
      const newProduct = await productService.createProduct(req.body);
      return res.status(201).json(newProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /products/:id
   */
  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const updatedProduct = await productService.updateProduct(id, req.body);
      return res.status(200).json(updatedProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /products/:id
   */
  async patchProduct(req, res, next) {
    try {
      const { id } = req.params;
      const patchedProduct = await productService.patchProduct(id, req.body);
      return res.status(200).json(patchedProduct);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /products/:id
   */
  async deleteProduct(req, res, next) {
    try {
      const { id } = req.params;
      const deletedProduct = await productService.deleteProduct(id);
      return res.status(200).json({
        message: `Product with ID ${id} deleted successfully`,
        product: deletedProduct
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
