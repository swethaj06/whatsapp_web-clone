const fs = require('fs');
const path = require('path');

module.exports = {
  devServer: (devServerConfig) => {
    const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
    const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
    const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware');
    const paths = require('react-scripts/config/paths');

    // Remove deprecated options
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    // Add the new setupMiddlewares option
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Before setup middlewares
      devServer.app.use(evalSourceMapMiddleware(devServer));

      if (fs.existsSync(paths.proxySetup)) {
        require(paths.proxySetup)(devServer.app);
      }

      // Core middlewares
      middlewares.push(
        {
          name: 'redirect-served-path',
          middleware: redirectServedPath(paths.publicUrlOrPath)
        },
        {
          name: 'noop-service-worker',
          middleware: noopServiceWorkerMiddleware(paths.publicUrlOrPath)
        }
      );

      return middlewares;
    };

    return devServerConfig;
  },
  webpack: {
    configure: (webpackConfig) => {
      // Suppress util._extend deprecation warnings from http-proxy and ajv
      webpackConfig.node = webpackConfig.node || {};
      webpackConfig.ignoreWarnings = webpackConfig.ignoreWarnings || [];
      
      webpackConfig.ignoreWarnings.push(
        {
          module: /node_modules[\\/]http-proxy/,
          message: /The `util\._extend` API is deprecated/,
        },
        {
          module: /node_modules[\\/]ajv/,
          message: /The `util\._extend` API is deprecated/,
        }
      );

      return webpackConfig;
    }
  }
};
