const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Suppress specific deprecation warning
  const originalEmit = process.emit;
  process.emit = function(name, error) {
    if (
      name === 'warning' &&
      error.name === 'DeprecationWarning' &&
      error.message.includes('util._extend')
    ) {
      return false;
    }
    return originalEmit.apply(process, arguments);
  };

  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '',
      },
    })
  );
};
