import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { farmsAPI } from '@/modules/farm';
import { offlineLivestockAPI } from '@/modules/livestock';
import { offlinePoultryAPI } from '@/modules/poultry';
import { TextInputField, Button, colors } from '../../../src/core/ui/UIComponents';
import { useToasts } from '../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../src/core/utils/apiError';
import { useAppTheme } from '@/core/theme/ThemeContext';

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
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: colors.text },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonText: { fontSize: 16, color: colors.text },
  selectPlaceholder: { fontSize: 16, color: colors.textLight },
  selectArrow: { fontSize: 12, color: colors.textLight },
  selectError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, marginTop: 4 },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeOption: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeIcon: { fontSize: 28, marginBottom: 4 },
  typeLabel: { fontSize: 13, fontWeight: '500', color: colors.text },
  typeLabelActive: { color: '#FFFFFF' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  modalItemText: { fontSize: 16, color: colors.text },
  modalItemEmpty: { paddingVertical: 20, alignItems: 'center' },
  modalItemEmptyText: { fontSize: 14, color: colors.textLight },
  modalCloseButton: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseButtonText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
  healthContainer: { flexDirection: 'row', gap: 8 },
  healthOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  healthOptionActive: { borderColor: colors.primary },
  healthOptionHealthy: { backgroundColor: '#E8F5E9', borderColor: colors.success },
  healthOptionSick: { backgroundColor: '#FFEBEE', borderColor: colors.error },
  healthOptionTreatment: { backgroundColor: '#FFF3E0', borderColor: colors.warning },
  healthOptionText: { fontSize: 12, color: colors.text, fontWeight: '500' },
  submitButton: { marginTop: 20 },
});

interface FormData {
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: string;
  health: 'healthy' | 'sick' | 'treatment';
  farmId: string;
  gender: 'MALE' | 'FEMALE';
  birthDate: string;
  penId: string;
  breedId: string;
}

interface FormErrors {
  name?: string;
  breed?: string;
  quantity?: string;
  farmId?: string;
  birthDate?: string;
  penId?: string;
  breedId?: string;
}

interface FarmOption {
  id: string;
  name: string;
}

interface PenOption {
  id: string;
  name: string;
}

interface BreedOption {
  id: string;
  name: string;
  birdType: string;
}

export default function AddAnimalScreen() {
  const router = useRouter();
  const { success, error: showError } = useToasts();
  const { colors: tc, isDark } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [pens, setPens] = useState<PenOption[]>([]);
  const [breeds, setBreeds] = useState<BreedOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showPenModal, setShowPenModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'livestock',
    breed: '',
    quantity: '',
    health: 'healthy',
    farmId: '',
    gender: 'MALE',
    birthDate: new Date().toISOString().split('T')[0],
    penId: '',
    breedId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    fetchFarms();
    fetchPens();
    fetchBreeds();
  }, []);

  const fetchFarms = async () => {
    try {
      const response = await farmsAPI.list();
      const farmsData = response.data;
      setFarms(
        Array.isArray(farmsData)
          ? farmsData.map((f: any) => ({ id: f.id, name: f.name }))
          : []
      );
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to load farms.'));
    }
  };

  const fetchPens = async () => {
    try {
      const response = await offlinePoultryAPI.listPens();
      const data = response.data;
      setPens(
        Array.isArray(data)
          ? data.map((p: any) => ({ id: p.id, name: p.name }))
          : []
      );
    } catch { /* ignore */ }
  };

  const fetchBreeds = async () => {
    try {
      const response = await offlinePoultryAPI.listBreeds();
      const data = response.data;
      setBreeds(
        Array.isArray(data)
          ? data.map((b: any) => ({ id: b.id, name: b.name, birdType: b.birdType }))
          : []
      );
    } catch { /* ignore */ }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.breed.trim()) newErrors.breed = 'Breed is required';
    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    if (!formData.farmId) newErrors.farmId = 'Please select a farm';
    if (!formData.birthDate) newErrors.birthDate = 'Birth date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const data = {
        name: formData.name.trim(),
        breed: formData.breed.trim(),
        quantity: Number(formData.quantity),
        health: formData.health,
        farmId: formData.farmId,
        gender: formData.gender,
        birthDate: formData.birthDate,
        penId: formData.penId || undefined,
        breedId: formData.breedId || undefined,
      };
      if (formData.type === 'livestock') {
        await offlineLivestockAPI.create(data);
      } else {
        await offlinePoultryAPI.create(data);
      }
      success(`${formData.type === 'livestock' ? 'Livestock' : 'Poultry'} added successfully`);
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to add animal.'));
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedFarm = farms.find((f) => f.id === formData.farmId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: tc.background }]}>
      <View style={[styles.header, { backgroundColor: tc.headerBg || tc.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Animal</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Type *</Text>
            <View style={styles.typeContainer}>
              {(['livestock', 'poultry'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeOption,
                    formData.type === t && styles.typeOptionActive,
                    formData.type === t ? undefined : { backgroundColor: tc.card, borderColor: tc.border },
                  ]}
                  onPress={() => updateFormData('type', t)}
                >
                  <Text style={styles.typeIcon}>{t === 'livestock' ? '🐄' : '🐔'}</Text>
                  <Text
                    style={[
                      styles.typeLabel,
                      formData.type === t && styles.typeLabelActive,
                      formData.type === t ? undefined : { color: tc.text },
                    ]}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Name *"
              placeholder="e.g. Dairy Herd A"
              value={formData.name}
              onChangeText={(v) => updateFormData('name', v)}
              error={errors.name}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Breed *"
              placeholder="e.g. Holstein, Broiler"
              value={formData.breed}
              onChangeText={(v) => updateFormData('breed', v)}
              error={errors.breed}
            />
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Quantity *"
              placeholder="Number of animals"
              value={formData.quantity}
              onChangeText={(v) => updateFormData('quantity', v)}
              keyboardType="numeric"
              error={errors.quantity}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Farm *</Text>
            <TouchableOpacity
              style={[styles.selectButton, errors.farmId && styles.selectError, { backgroundColor: tc.card }, errors.farmId ? undefined : { borderColor: tc.border }]}
              onPress={() => setShowFarmModal(true)}
            >
              <Text style={[selectedFarm ? styles.selectButtonText : styles.selectPlaceholder, { color: selectedFarm ? tc.text : tc.textSecondary }]}>
                {selectedFarm ? selectedFarm.name : 'Select a farm'}
              </Text>
              <Text style={[styles.selectArrow, { color: tc.textSecondary }]}>▼</Text>
            </TouchableOpacity>
            {errors.farmId && <Text style={styles.errorText}>{errors.farmId}</Text>}
          </View>

          <Modal
            visible={showFarmModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFarmModal(false)}
          >
            <TouchableOpacity
              style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
              activeOpacity={1}
              onPress={() => setShowFarmModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
                  <Text style={[styles.modalTitle, { color: tc.text }]}>Select Farm</Text>
                  {farms.length === 0 ? (
                    <View style={styles.modalItemEmpty}>
                      <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>No farms available</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={farms}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[styles.modalItem, { borderBottomColor: isDark ? tc.surface : '#F5F5F5' }]}
                          onPress={() => {
                            updateFormData('farmId', item.id);
                            setShowFarmModal(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.modalItemText,
                              item.id === formData.farmId && {
                                color: colors.primary,
                                fontWeight: '600',
                              },
                              item.id === formData.farmId ? undefined : { color: tc.text },
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  )}
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowFarmModal(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {formData.type === 'poultry' && (
            <>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: tc.text }]}>Pen</Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: tc.card, borderColor: tc.border }]}
                  onPress={() => setShowPenModal(true)}
                >
                  <Text style={[formData.penId ? styles.selectButtonText : styles.selectPlaceholder, { color: formData.penId ? tc.text : tc.textSecondary }]}>
                    {pens.find((p) => p.id === formData.penId)?.name || 'Select a pen'}
                  </Text>
                  <Text style={[styles.selectArrow, { color: tc.textSecondary }]}>▼</Text>
                </TouchableOpacity>
              </View>

              <Modal
                visible={showPenModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPenModal(false)}
              >
                <TouchableOpacity
                  style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
                  activeOpacity={1}
                  onPress={() => setShowPenModal(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
                      <Text style={[styles.modalTitle, { color: tc.text }]}>Select Pen</Text>
                      {pens.length === 0 ? (
                        <View style={styles.modalItemEmpty}>
                          <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>No pens available</Text>
                        </View>
                      ) : (
                        <FlatList
                          data={pens}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.modalItem, { borderBottomColor: isDark ? tc.surface : '#F5F5F5' }]}
                              onPress={() => {
                                updateFormData('penId', item.id);
                                setShowPenModal(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.modalItemText,
                                  item.id === formData.penId && { color: colors.primary, fontWeight: '600' },
                                  item.id === formData.penId ? undefined : { color: tc.text },
                                ]}
                              >
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                      <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPenModal(false)}>
                        <Text style={styles.modalCloseButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: tc.text }]}>Breed</Text>
                <TouchableOpacity
                  style={[styles.selectButton, { backgroundColor: tc.card, borderColor: tc.border }]}
                  onPress={() => setShowBreedModal(true)}
                >
                  <Text style={[formData.breedId ? styles.selectButtonText : styles.selectPlaceholder, { color: formData.breedId ? tc.text : tc.textSecondary }]}>
                    {breeds.find((b) => b.id === formData.breedId)
                      ? `${breeds.find((b) => b.id === formData.breedId)!.name} (${breeds.find((b) => b.id === formData.breedId)!.birdType})`
                      : 'Select a breed'}
                  </Text>
                  <Text style={styles.selectArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <Modal
                visible={showBreedModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowBreedModal(false)}
              >
                <TouchableOpacity
                  style={[styles.modalOverlay, { backgroundColor: tc.overlay }]}
                  activeOpacity={1}
                  onPress={() => setShowBreedModal(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={[styles.modalContent, { backgroundColor: tc.surface }]}>
                      <Text style={[styles.modalTitle, { color: tc.text }]}>Select Breed</Text>
                      {breeds.length === 0 ? (
                        <View style={styles.modalItemEmpty}>
                          <Text style={[styles.modalItemEmptyText, { color: tc.textSecondary }]}>No breeds available</Text>
                        </View>
                      ) : (
                        <FlatList
                          data={breeds}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.modalItem, { borderBottomColor: isDark ? tc.surface : '#F5F5F5' }]}
                              onPress={() => {
                                updateFormData('breedId', item.id);
                                setShowBreedModal(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.modalItemText,
                                  item.id === formData.breedId && { color: colors.primary, fontWeight: '600' },
                                  item.id === formData.breedId ? undefined : { color: tc.text },
                                ]}
                              >
                                {item.name} ({item.birdType})
                              </Text>
                            </TouchableOpacity>
                          )}
                        />
                      )}
                      <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowBreedModal(false)}>
                        <Text style={styles.modalCloseButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Health</Text>
            <View style={styles.healthContainer}>
              {(['healthy', 'sick', 'treatment'] as const).map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.healthOption,
                    formData.health === h && styles.healthOptionActive,
                    formData.health === 'healthy' && h === 'healthy' && styles.healthOptionHealthy,
                    formData.health === 'sick' && h === 'sick' && styles.healthOptionSick,
                    formData.health === 'treatment' && h === 'treatment' && styles.healthOptionTreatment,
                    formData.health !== h && { backgroundColor: tc.card, borderColor: tc.border },
                  ]}
                  onPress={() => updateFormData('health', h)}
                >
                  <Text
                    style={[
                      styles.healthOptionText,
                      formData.health === h && {
                        color: h === 'healthy' ? colors.success : h === 'sick' ? colors.error : colors.warning,
                      },
                      formData.health !== h && { color: tc.text },
                    ]}
                  >
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: tc.text }]}>Gender</Text>
            <View style={styles.healthContainer}>
              {(['MALE', 'FEMALE'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.healthOption,
                    formData.gender === g && styles.healthOptionActive,
                    formData.gender !== g && { backgroundColor: tc.card, borderColor: tc.border },
                  ]}
                  onPress={() => updateFormData('gender', g)}
                >
                  <Text style={[styles.healthOptionText, formData.gender !== g ? { color: tc.text } : undefined]}>
                    {g === 'MALE' ? 'Male' : 'Female'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <TextInputField
              label="Birth Date *"
              placeholder="YYYY-MM-DD"
              value={formData.birthDate}
              onChangeText={(v) => updateFormData('birthDate', v)}
              error={errors.birthDate}
            />
          </View>

          <Button
            title="Add Animal"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}