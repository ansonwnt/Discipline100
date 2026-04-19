const { withInfoPlist, withAndroidManifest } = require('expo/config-plugins');

function withAlarmService(config) {
  // iOS: Add AlarmKit usage description to Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSAlarmKitUsageDescription =
      'Discipline100 needs alarm access to wake you up at your scheduled time.';
    return config;
  });

  return config;
}

module.exports = withAlarmService;
