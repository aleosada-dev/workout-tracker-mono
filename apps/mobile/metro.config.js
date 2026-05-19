const { withNativeWind } = require('nativewind/metro');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

const existingBlockList = config.resolver.blockList;
const existingPatterns = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
    ? [existingBlockList]
    : [];

config.resolver.blockList = [...existingPatterns, /.*\.test\.(ts|tsx|js|jsx)$/];

module.exports = withNativeWind(config, {
  input: './src/global.css',
  inlineRem: 16,
});
