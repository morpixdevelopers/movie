module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved worklets into their own package; this plugin must be
    // last, and without it every animated style silently does nothing.
    plugins: ['react-native-worklets/plugin'],
  };
};
