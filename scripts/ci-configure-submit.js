// Adds TestFlight submit settings to eas.json on CI from GitHub secrets/variables,
// so nothing account-specific has to be committed.
const fs = require('fs');

const { ASC_APP_ID, EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID } = process.env;
for (const [name, value] of Object.entries({ ASC_APP_ID, EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID })) {
  if (!value) {
    console.error(`::error::${name} is not set (see docs/IPHONE_SETUP.md)`);
    process.exit(1);
  }
}

const eas = JSON.parse(fs.readFileSync('eas.json', 'utf8'));
eas.submit.production.ios = {
  ...eas.submit.production.ios,
  ascAppId: ASC_APP_ID,
  ascApiKeyPath: EXPO_ASC_API_KEY_PATH,
  ascApiKeyId: EXPO_ASC_KEY_ID,
  ascApiKeyIssuerId: EXPO_ASC_ISSUER_ID,
};
fs.writeFileSync('eas.json', JSON.stringify(eas, null, 2) + '\n');
console.log('Configured TestFlight submission for App Store Connect app', ASC_APP_ID);
