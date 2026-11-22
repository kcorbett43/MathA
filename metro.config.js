const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow bundling `.matha` ZIPs as assets (Import example packages).
if (!config.resolver.assetExts.includes('matha')) {
  config.resolver.assetExts.push('matha');
}

module.exports = config;
