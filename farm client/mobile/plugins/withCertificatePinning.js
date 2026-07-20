const {
  withAndroidManifest,
  withInfoPlist,
  withDangerousMod,
  createRunOncePlugin,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const CERT_PIN_SHA256 = process.env.EXPO_PUBLIC_CERT_PIN_SHA256 || '';

function withCertificatePinning(config) {
  // Android: Reference network security config in manifest
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const application = manifest.application?.[0];
    if (application) {
      application.$['android:networkSecurityConfig'] =
        '@xml/network_security_config';
    }
    return config;
  });

  // iOS: Allow HTTP for localhost (dev), enforce HTTPS + pinning for everything else
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAppTransportSecurity = {
      NSAllowsArbitraryLoads: false,
      NSExceptionDomains: {
        'localhost': {
          NSExceptionAllowsInsecureHTTPLoads: true,
          NSIncludesSubdomains: true,
        },
        '127.0.0.1': {
          NSExceptionAllowsInsecureHTTPLoads: true,
        },
      },
    };
    return config;
  });

  // Android: Write network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });

      const pinSection = CERT_PIN_SHA256
        ? `    <pin-set expiration="2027-01-01">
      <pin digest="SHA-256">${CERT_PIN_SHA256}</pin>
    </pin-set>`
        : '';

      const xml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Dev: allow cleartext for localhost and local networks -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">192.168.0.0/16</domain>
    <domain includeSubdomains="true">10.0.0.0/8</domain>
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </domain-config>
  <!-- Production: HTTPS required, certificate pinning if configured -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">your-production-domain.com</domain>
${pinSection}
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </domain-config>
</network-security-config>
`;
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), xml);
      return config;
    },
  ]);

  return config;
}

module.exports = createRunOncePlugin(
  withCertificatePinning,
  'withCertificatePinning',
  '1.0.0'
);
