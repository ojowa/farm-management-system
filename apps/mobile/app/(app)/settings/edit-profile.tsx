import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { TextInputField, Button, colors } from '../../../src/components/common/UIComponents';
import { ScreenLoading, StateView } from '../../../src/components/feedback';
import { useToasts } from '../../../src/hooks/useToasts';
import { useAppDispatch } from '../../../src/hooks/useAuth';
import { describeApiError } from '../../../src/utils/apiError';
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  backButton: { padding: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingVertical: 16 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.light },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  editAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  avatarActions: { flexDirection: 'row', gap: 12 },
  avatarAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarActionText: { fontSize: 13, color: colors.text },
  formGroup: { marginBottom: 20 },
  submitButton: { marginTop: 20 },
});

interface ProfileData {
  fullName: string;
  email: string;
  avatar?: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    fullName: '',
    email: '',
    avatar: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await fetch('http://localhost:4000/auth/me');
      const data = await response.json();
      setProfile(data);
      setFormData({
        fullName: data.fullName || '',
        email: data.email || '',
        avatar: data.avatar || '',
      });
    } catch (error: any) {
      const message = describeApiError(error, 'Failed to load profile.');
      setLoadError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permission is required to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData((prev) => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFormData((prev) => ({ ...prev, avatar: result.assets[0].uri }));
    }
  };

  const removeAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: '' }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await fetch('http://localhost:4000/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          avatar: formData.avatar || undefined,
        }),
      });
      success('Profile updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update profile.'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof ProfileData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading profile…" />
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load profile"
          message={loadError}
          onRetry={fetchProfile}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  const initials = formData.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {formData.avatar ? (
                <Image source={{ uri: formData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>{initials || '?'}</Text>
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <Text style={styles.editAvatarText}>✏</Text>
              </View>
            </View>

            <View style={styles.avatarActions}>
              <TouchableOpacity style={styles.avatarAction} onPress={pickImage}>
                <Text style={styles.avatarActionText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarAction} onPress={takePhoto}>
                <Text style={styles.avatarActionText}>Camera</Text>
              </TouchableOpacity>
              {formData.avatar && (
                <TouchableOpacity style={styles.avatarAction} onPress={removeAvatar}>
                  <Text style={[styles.avatarActionText, { color: colors.error }]}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Full Name *"
              placeholder="Enter your name"
              value={formData.fullName}
              onChangeText={(v) => updateFormData('fullName', v)}
              error={errors.fullName}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Email *"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(v) => updateFormData('email', v)}
              keyboardType="email-address"
              error={errors.email}
            />
          </View>

          <Button
            title="Save Profile"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}