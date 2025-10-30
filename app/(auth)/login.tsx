import React, { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useAuth } from '../../src/features/auth/useAuth';
import { useRouter } from 'expo-router';

export default function Login() {
  const { signInWithGoogle, continueAsGuest, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/focus');
    }
  }, [isAuthenticated, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0F1C', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ color: '#F8FAFC', fontSize: 24, marginBottom: 24 }}>Welcome to FocusUp</Text>
      <Pressable
        onPress={() => signInWithGoogle()}
        style={{ backgroundColor: '#3B82F6', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue with Google</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          await continueAsGuest();
          router.replace('/(tabs)/focus');
        }}
        style={{ backgroundColor: '#1F2937', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, borderColor: '#374151' }}
      >
        <Text style={{ color: '#F8FAFC', fontWeight: '700' }}>Continue as Guest</Text>
      </Pressable>
    </View>
  );
}


