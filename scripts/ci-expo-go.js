// Helpers for the "Expo Go Preview" workflow.
//   node scripts/ci-expo-go.js prepare            → make app.json's runtime loadable by Expo Go
//   node scripts/ci-expo-go.js summary <json> <account>  → print links to open the update
const fs = require('fs');

const [command, jsonPath, account] = process.argv.slice(2);

if (command === 'prepare') {
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  // Store builds use the fingerprint policy; Expo Go loads updates whose runtime follows the app version.
  app.expo.runtimeVersion = { policy: 'appVersion' };
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
  console.log('runtimeVersion set to appVersion for Expo Go');
} else if (command === 'summary') {
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const updates = JSON.parse(raw.slice(raw.indexOf('[')));
  const group = updates[0]?.group;
  if (!group) throw new Error(`No update group in eas update output:\n${raw}`);
  const slug = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.slug;
  const page = `https://expo.dev/accounts/${account}/projects/${slug}/updates/${group}`;
  console.log(
    [
      '## 📱 Expo Go에서 열기',
      '',
      'iPhone의 Expo Go 앱에 같은 Expo 계정으로 로그인한 뒤 아래 중 하나로 여세요.',
      '',
      `1. 업데이트 페이지: ${page} → **Preview / Open with Expo Go**`,
      '2. 아래 주소를 복사해 Safari 주소창에 붙여넣기:',
      '',
      '```',
      `exp://u.expo.dev/update/${group}`,
      '```',
      '',
      '3. Expo Go 홈 → Projects → baromok → 브랜치 `expo-go` → 최신 업데이트',
    ].join('\n'),
  );
} else {
  console.error('usage: ci-expo-go.js prepare | summary <json> <account>');
  process.exit(1);
}
