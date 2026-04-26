import React, { createContext, useContext, useEffect, useState } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: '56434363051-4js3meu263qukc73lc7n5c900ieb27va.apps.googleusercontent.com',
});

interface AuthContextType {
  user: FirebaseAuthTypes.User | null;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Sign in with Apple
  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;
      if (!identityToken) throw new Error('No identity token');

      const appleCredential = auth.AppleAuthProvider.credential(identityToken);
      const userCredential = await auth().signInWithCredential(appleCredential);

      // Apple only gives the name on first sign-in, update profile if available
      if (fullName?.givenName && !userCredential.user.displayName) {
        await userCredential.user.updateProfile({
          displayName: `${fullName.givenName} ${fullName.familyName || ''}`.trim(),
        });
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, not an error
        return;
      }
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) throw new Error('No ID token');

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        return;
      }
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  // Sign out
  const signOutUser = async () => {
    try {
      await auth().signOut();
      try { await GoogleSignin.signOut(); } catch {}
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signInWithApple,
      signInWithGoogle,
      signOut: signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
