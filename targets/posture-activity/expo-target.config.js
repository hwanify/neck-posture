/** Lock Screen / Dynamic Island Live Activity: "measuring" with a running timer during a session. */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'PostureActivity',
  displayName: 'Plumb',
  bundleIdentifier: '.activity',
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    $widgetBackground: '#000000',
    $accent: '#F2F2F2',
  },
};
