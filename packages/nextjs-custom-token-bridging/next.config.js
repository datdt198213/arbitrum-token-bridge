module.exports = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
      config.resolve.fallback = { fs: false };
        
      return config;
    },
  };