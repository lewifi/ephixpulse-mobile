module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // IMPORTANT: react-native-worklets/plugin must be LAST.
    // (Reanimated 4 moved the worklets plugin out of react-native-reanimated.)
    plugins: ['react-native-worklets/plugin'],
  };
};
