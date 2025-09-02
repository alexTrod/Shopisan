const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  
  const { transformer, resolver } = config;
  
  // Enable better tree shaking
  config.transformer = {
    ...transformer,
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
    },
  };
  
  // Optimize resolver for better module resolution
  config.resolver = {
    ...resolver,
    // Enable symlinks for better module resolution
    enableSymlinks: true,
    // Add source map support
    sourceExts: [...resolver.sourceExts, 'map'],
  };
  
  // Enable compression
  config.transformer.minifierPath = 'metro-minify-terser';
  
  return config;
})();
