const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // These ObjC pods need modular headers so Swift Firebase pods can import them.
      // Exact list derived from pod install warnings for Firebase 12.x + RNFirebase 24.x.
      const podsNeedingModularHeaders = [
        'FirebaseAuthInterop',
        'FirebaseAppCheckInterop',
        'FirebaseMessagingInterop',
        'FirebaseFirestoreInternal',
        'FirebaseCoreInternal',
        'FirebaseCoreExtension',
        'GoogleUtilities',
        'RecaptchaInterop',
      ];

      // Use post_install hook to set DEFINES_MODULE on each pod target.
      // This is more reliable than inserting pod declarations into the Podfile.
      const postInstallSnippet = [
        '',
        '  # Firebase modular headers — required for Swift pods with static frameworks',
        '  firebase_modular_pods = [' + podsNeedingModularHeaders.map(p => `'${p}'`).join(', ') + ']',
        '  installer.pods_project.targets.each do |target|',
        '    if firebase_modular_pods.include?(target.name)',
        '      target.build_configurations.each do |build_config|',
        "        build_config.build_settings['DEFINES_MODULE'] = 'YES'",
        '      end',
        '    end',
        '  end',
      ].join('\n');

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          'post_install do |installer|' + postInstallSnippet
        );
      } else {
        podfile += '\npost_install do |installer|' + postInstallSnippet + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
