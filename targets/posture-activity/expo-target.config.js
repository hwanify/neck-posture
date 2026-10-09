/** Lock Screen / Dynamic Island Live Activity showing the current head tilt during a session. */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'PostureActivity',
  displayName: '바로목',
  bundleIdentifier: '.activity',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    $widgetBackground: '#000000',
    $accent: '#F2F2F2',
  },
};
