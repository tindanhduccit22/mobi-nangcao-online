import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FacebookAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from '@react-native-firebase/auth';
import {AccessToken, LoginManager} from 'react-native-fbsdk-next';

type Profile = {uid: string; name: string; email: string};

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Please sign in.');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), user => {
      setProfile(
        user
          ? {
              uid: user.uid,
              name: user.displayName ?? 'Facebook user',
              email: user.email ?? 'Email not shared',
            }
          : null,
      );
    });
    return unsubscribe;
  }, []);

  async function login() {
    if (busy) {
      return;
    }
    setBusy(true);
    setStatus('Opening Facebook Login...');
    try {
      const result = await LoginManager.logInWithPermissions([
        'public_profile',
        'email',
      ]);
      if (result.isCancelled) {
        setStatus('Sign-in cancelled.');
        return;
      }
      const tokenData = await AccessToken.getCurrentAccessToken();
      if (!tokenData?.accessToken) {
        throw new Error('Facebook access token is missing.');
      }
      const credential = FacebookAuthProvider.credential(tokenData.accessToken);
      await signInWithCredential(getAuth(), credential);
      setStatus('Signed in with Firebase!');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus('Sign-in failed.');
      Alert.alert('Login error', message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await signOut(getAuth());
      setStatus('Signed out.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert('Sign-out error', message);
    } finally {
      LoginManager.logOut();
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Firebase Facebook Login</Text>
      <Text style={styles.hint}>{status}</Text>
      {busy ? <ActivityIndicator size="large" /> : null}
      {profile ? (
        <View style={styles.card}>
          <Text style={styles.label}>Signed-in account</Text>
          <Text>Name: {profile.name}</Text>
          <Text>Email: {profile.email}</Text>
          <Text selectable>UID: {profile.uid}</Text>
          <Pressable style={styles.button} onPress={logout} disabled={busy}>
            <Text style={styles.buttonText}>Sign out</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.button} onPress={login} disabled={busy}>
          <Text style={styles.buttonText}>Continue with Facebook</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    color: '#172554',
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 22,
    color: '#475569',
  },
  card: {
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    gap: 10,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
  },
  button: {
    padding: 14,
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: '#1877f2',
    borderRadius: 10,
  },
  buttonText: {
    fontWeight: '700',
    color: '#fff',
  },
});
