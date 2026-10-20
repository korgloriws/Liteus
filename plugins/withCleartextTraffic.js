const {
  withAndroidManifest,
  AndroidConfig,
  withDangerousMod,
} = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Garante HTTP claro no release (API por IP sem HTTPS/domínio).
 */
function withCleartextTraffic(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const resXml = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(resXml, { recursive: true });
      const src = path.join(
        cfg.modRequest.projectRoot,
        'android-network-security-config.xml'
      );
      const dest = path.join(resXml, 'network_security_config.xml');
      fs.copyFileSync(src, dest);
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });

  return config;
}

module.exports = withCleartextTraffic;
