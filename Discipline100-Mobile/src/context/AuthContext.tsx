import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  AppleAuthProvider,
  GoogleAuthProvider,
  FirebaseAuthTypes,
} from '@react-native-firebase/auth';
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
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithApple: async () => {},
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

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

      const appleCredential = AppleAuthProvider.credential(identityToken);
      const userCredential = await signInWithCredential(getAuth(), appleCredential);

      if (fullName?.givenName && !userCredential.user.displayName) {
        await userCredential.user.updateProfile({
          displayName: `${fullName.givenName} ${fullName.familyName || ''}`.trim(),
        });
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') return;
      console.error('Apple Sign-In error:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) throw new Error('No ID token');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(getAuth(), googleCredential);
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') return;
      console.error('Google Sign-In error:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getAuth(), email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(getAuth(), email, password);
  };

  const signOutUser = async () => {
    try {
      await firebaseSignOut(getAuth());
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
      signInWithEmail,
      signUpWithEmail,
      signOut: signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
