const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Add modular headers for Firebase interop pods.
      // Required even with use_frameworks! :linkage => :static for pods that
      // don't include their own module maps.
      // Insert right before the first occurrence of use_react_native
      const modularHeaders = [
        "  pod 'FirebaseAuthInterop', :modular_headers => true",
        "  pod 'FirebaseAppCheckInterop', :modular_headers => true",
        "  pod 'FirebaseMessagingInterop', :modular_headers => true",
        "  pod 'FirebaseFirestoreInternal', :modular_headers => true",
        "  pod 'FirebaseCoreInternal', :modular_headers => true",
        "  pod 'GoogleUtilities', :modular_headers => true",
        "  pod 'RecaptchaInterop', :modular_headers => true",
      ].join('\n');

      if (!podfile.includes('FirebaseAuthInterop')) {
        // Find use_react_native with flexible whitespace matching
        const useReactNativeRegex = /(\s*use_react_native!\()/;
        const match = podfile.match(useReactNativeRegex);
        if (match) {
          podfile = podfile.replace(
            useReactNativeRegex,
            '\n  # Firebase Swift pods need modular headers\n' + modularHeaders + '\n\n$1'
          );
        } else {
          // Fallback: append before end of target block
          console.warn('[firebase-modular-headers] Could not find use_react_native!, appending before end');
          podfile = podfile.replace(/^end\s*$/m, modularHeaders + '\n\nend');
        }
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
