const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuração para resolver problemas de roteamento
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Configuração para ignorar warnings específicos
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config; 