// expo-notifications adds the remote-push entitlement automatically. This app only schedules local
// notifications, which need no entitlement, so drop it: otherwise EAS has to enable the Push
// Notifications capability on the App ID and provisioning profile.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
