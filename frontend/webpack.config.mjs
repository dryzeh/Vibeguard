import createExpoWebpackConfigAsync from '@expo/webpack-config';
import process from 'process/browser';

export default async function(env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons']
    }
  }, argv);

  // Polyfill process for browser
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    process: process,
    'react-native': 'react-native-web'
  };

  // Use our custom web entry point
  if (env.platform === 'web') {
    config.entry = './index.web.js';
  }

  return config;
} 