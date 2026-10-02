const express = require('express');
const productRoutes = require('./routes/product.routes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Mount product routes
app.use('/products', productRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Products API with Caching',
    endpoints: [
      'GET    /products',
      'GET    /products/:id',
      'POST   /products',
      'PUT    /products/:id',
      'PATCH  /products/:id',
      'DELETE /products/:id'
    ]
  });
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Error]:', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server if run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;