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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { farmsAPI } from '../../../../src/services/api';
import { offlineLivestockAPI, offlinePoultryAPI } from '../../../../src/services/offlineApi';
import { TextInputField, Button, colors } from '../../../../src/core/ui/UIComponents';
import { ScreenLoading, StateView } from '../../../../src/core/ui/feedback';
import { useToasts } from '../../../../src/core/hooks/useToasts';
import { describeApiError } from '../../../../src/core/utils/apiError';

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
  submitButton: { marginTop: 20 },
});

interface FormData {
  name: string;
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

interface AnimalData {
  id: string;
  name: string;
  type: 'livestock' | 'poultry';
  breed: string;
  quantity: number;
  health: 'healthy' | 'sick' | 'treatment';
  farm: string;
  farmId?: string;
  lastCheckup: string;
  penId?: string;
  breedId?: string;
}

export default function EditAnimalScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { success, error: showError } = useToasts();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [animal, setAnimal] = useState<AnimalData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [pens, setPens] = useState<PenOption[]>([]);
  const [breeds, setBreeds] = useState<BreedOption[]>([]);
  const [showFarmModal, setShowFarmModal] = useState(false);
  const [showPenModal, setShowPenModal] = useState(false);
  const [showBreedModal, setShowBreedModal] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
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
    Promise.all([fetchAnimal(), fetchFarms(), fetchPens(), fetchBreeds()]);
  }, [id]);

  const fetchAnimal = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const response = await offlineLivestockAPI.get(id);
      const data = response.data as any;
        setAnimal({ ...data, type: 'livestock' });
        setFormData({
          name: data.name || data.species || '',
          breed: data.breed || '',
          quantity: data.quantity?.toString() || '1',
          health: data.health || 'healthy',
          farmId: data.farmId || '',
          gender: data.gender || 'MALE',
          birthDate: data.birthDate || new Date().toISOString().split('T')[0],
          penId: data.penId || '',
          breedId: data.breedId || '',
        });
      } catch {
        try {
          const response = await offlinePoultryAPI.get(id);
          const data = response.data as any;
          setAnimal({ ...data, type: 'poultry' });
          setFormData({
            name: data.batchCode || data.name || '',
            breed: data.breed?.name || data.breed || '',
            quantity: data.currentCount?.toString() || data.quantity?.toString() || '',
            health: data.health || 'healthy',
            farmId: data.farmId || '',
            gender: data.gender || 'MALE',
            birthDate: data.arrivalDate || data.birthDate || new Date().toISOString().split('T')[0],
            penId: data.penId || '',
            breedId: data.breedId || '',
          });
      } catch (error: any) {
        const message = describeApiError(error, 'Failed to load animal details.');
        setLoadError(message);
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !animal) return;

    setSubmitting(true);
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

      if (animal.type === 'livestock') {
        await offlineLivestockAPI.update(animal.id, data);
      } else {
        await offlinePoultryAPI.update(animal.id, data);
      }

      success('Animal updated successfully');
      router.back();
    } catch (error: any) {
      showError(describeApiError(error, 'Failed to update animal.'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const selectedFarm = farms.find((f) => f.id === formData.farmId);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Animal</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScreenLoading message="Loading animal details…" />
      </SafeAreaView>
    );
  }

  if (loadError || !animal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Animal</Text>
          <View style={{ width: 60 }} />
        </View>
        <StateView
          variant="error"
          title="Couldn't load animal"
          message={loadError || 'Animal not found'}
          onRetry={() => Promise.all([fetchAnimal(), fetchFarms()])}
          retryLabel="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Animal</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            <Text style={styles.label}>Farm *</Text>
            <TouchableOpacity
              style={[styles.selectButton, errors.farmId && styles.selectError]}
              onPress={() => setShowFarmModal(true)}
            >
              <Text style={selectedFarm ? styles.selectButtonText : styles.selectPlaceholder}>
                {selectedFarm ? selectedFarm.name : 'Select a farm'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
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
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowFarmModal(false)}
            >
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Farm</Text>
                  {farms.length === 0 ? (
                    <View style={styles.modalItemEmpty}>
                      <Text style={styles.modalItemEmptyText}>No farms available</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={farms}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.modalItem}
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

          {animal?.type === 'poultry' && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Pen</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowPenModal(true)}
                >
                  <Text style={formData.penId ? styles.selectButtonText : styles.selectPlaceholder}>
                    {pens.find((p) => p.id === formData.penId)?.name || 'Select a pen'}
                  </Text>
                  <Text style={styles.selectArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <Modal
                visible={showPenModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPenModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowPenModal(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Select Pen</Text>
                      {pens.length === 0 ? (
                        <View style={styles.modalItemEmpty}>
                          <Text style={styles.modalItemEmptyText}>No pens available</Text>
                        </View>
                      ) : (
                        <FlatList
                          data={pens}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.modalItem}
                              onPress={() => {
                                updateFormData('penId', item.id);
                                setShowPenModal(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.modalItemText,
                                  item.id === formData.penId && { color: colors.primary, fontWeight: '600' },
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
                <Text style={styles.label}>Breed</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setShowBreedModal(true)}
                >
                  <Text style={formData.breedId ? styles.selectButtonText : styles.selectPlaceholder}>
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
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowBreedModal(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.modalContent}>
                      <Text style={styles.modalTitle}>Select Breed</Text>
                      {breeds.length === 0 ? (
                        <View style={styles.modalItemEmpty}>
                          <Text style={styles.modalItemEmptyText}>No breeds available</Text>
                        </View>
                      ) : (
                        <FlatList
                          data={breeds}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={styles.modalItem}
                              onPress={() => {
                                updateFormData('breedId', item.id);
                                setShowBreedModal(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.modalItemText,
                                  item.id === formData.breedId && { color: colors.primary, fontWeight: '600' },
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
            <Text style={styles.label}>Health</Text>
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
                  ]}
                  onPress={() => updateFormData('health', h)}
                >
                  <Text
                    style={[
                      styles.healthOptionText,
                      formData.health === h && {
                        color: h === 'healthy' ? colors.success : h === 'sick' ? colors.error : colors.warning,
                      },
                    ]}
                  >
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.healthContainer}>
              {(['MALE', 'FEMALE'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.healthOption,
                    formData.gender === g && styles.healthOptionActive,
                  ]}
                  onPress={() => updateFormData('gender', g)}
                >
                  <Text style={styles.healthOptionText}>
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
            title="Save Changes"
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