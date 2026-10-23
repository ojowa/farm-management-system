import {
  eggProductionAPI,
  feedingRecordsAPI,
  medicationAPI,
  mortalityRecordsAPI,
  poultrySalesAPI,
  vaccinationRecordsAPI,
} from '@/modules/poultry';
import type { PoultryRecordConfig } from './PoultryRecordScreen';

export const feedingConfig: PoultryRecordConfig = {
  title: 'Feeding',
  subtitle: 'Track the feed and quantities supplied to each flock.',
  icon: '🌾',
  searchKeys: ['flockId', 'feedType'],
  columns: [
    { key: 'flockId', label: 'Flock' },
    { key: 'feedType', label: 'Feed' },
    { key: 'quantityKg', label: 'Quantity (kg)' },
    { key: 'date', label: 'Date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock', type: 'flock', required: true },
    { key: 'feedType', label: 'Feed type', type: 'text', required: true, placeholder: 'Starter feed' },
    { key: 'quantityKg', label: 'Quantity (kg)', type: 'number', required: true, min: 0.01 },
    { key: 'date', label: 'Date', type: 'date', required: true },
  ],
  list: (page) => feedingRecordsAPI.list({ page, limit: 100 }),
  create: (values) =>
    feedingRecordsAPI.create({
      flockId: values.flockId,
      feedType: values.feedType.trim(),
      quantityKg: Number(values.quantityKg),
      date: values.date,
    }),
  remove: (id) => feedingRecordsAPI.delete(id),
};

export const vaccinationConfig: PoultryRecordConfig = {
  title: 'Vaccinations',
  subtitle: 'Keep a dated record of vaccines and dosage for each flock.',
  icon: '💉',
  searchKeys: ['flockId', 'vaccine', 'dosage'],
  columns: [
    { key: 'flockId', label: 'Flock' },
    { key: 'vaccine', label: 'Vaccine' },
    { key: 'dosage', label: 'Dosage' },
    { key: 'date', label: 'Date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock', type: 'flock', required: true },
    { key: 'vaccine', label: 'Vaccine', type: 'text', required: true },
    { key: 'dosage', label: 'Dosage (optional)', type: 'text' },
    { key: 'date', label: 'Date', type: 'date', required: true },
  ],
  list: (page) => vaccinationRecordsAPI.list({ page, limit: 100 }),
  create: (values) =>
    vaccinationRecordsAPI.create({
      flockId: values.flockId,
      vaccine: values.vaccine.trim(),
      dosage: values.dosage.trim() || undefined,
      date: values.date,
    }),
  remove: (id) => vaccinationRecordsAPI.delete(id),
};

export const medicationConfig: PoultryRecordConfig = {
  title: 'Medications',
  subtitle: 'Record medication, dosage, frequency, and treatment dates.',
  icon: '🩺',
  searchKeys: ['flockId', 'name', 'dosage', 'frequency'],
  columns: [
    { key: 'flockId', label: 'Flock' },
    { key: 'name', label: 'Medication' },
    { key: 'dosage', label: 'Dosage' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'startDate', label: 'Start date' },
    { key: 'endDate', label: 'End date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock', type: 'flock', required: true },
    { key: 'name', label: 'Medication', type: 'text', required: true },
    { key: 'dosage', label: 'Dosage', type: 'text', required: true },
    { key: 'frequency', label: 'Frequency', type: 'text', required: true },
    { key: 'startDate', label: 'Start date', type: 'date', required: true },
    { key: 'endDate', label: 'End date (optional)', type: 'date' },
    { key: 'notes', label: 'Notes (optional)', type: 'text' },
  ],
  list: (page) => medicationAPI.list({ page, limit: 100 }),
  create: (values) =>
    medicationAPI.create({
      flockId: values.flockId,
      name: values.name.trim(),
      dosage: values.dosage.trim(),
      frequency: values.frequency.trim(),
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      notes: values.notes.trim() || undefined,
    }),
  remove: (id) => medicationAPI.delete(id),
};

export const mortalityConfig: PoultryRecordConfig = {
  title: 'Mortality',
  subtitle: 'Record bird losses by flock, date, and cause.',
  icon: '📋',
  searchKeys: ['flockId', 'cause'],
  columns: [
    { key: 'flockId', label: 'Flock' },
    { key: 'count', label: 'Birds lost' },
    { key: 'cause', label: 'Cause' },
    { key: 'date', label: 'Date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock', type: 'flock', required: true },
    { key: 'count', label: 'Birds lost', type: 'number', required: true, min: 1, integer: true },
    { key: 'cause', label: 'Cause (optional)', type: 'text' },
    { key: 'date', label: 'Date', type: 'date', required: true },
  ],
  list: (page) => mortalityRecordsAPI.list({ page, limit: 100 }),
  create: (values) =>
    mortalityRecordsAPI.create({
      flockId: values.flockId,
      count: Number(values.count),
      cause: values.cause.trim() || undefined,
      date: values.date,
    }),
  remove: (id) => mortalityRecordsAPI.delete(id),
};

export const eggProductionConfig: PoultryRecordConfig = {
  title: 'Egg Production',
  subtitle: 'Log daily eggs collected and their condition.',
  icon: '🥚',
  searchKeys: ['flockId', 'notes'],
  columns: [
    { key: 'flockId', label: 'Flock' },
    { key: 'totalEggs', label: 'Total eggs' },
    { key: 'goodEggs', label: 'Good' },
    { key: 'brokenEggs', label: 'Broken' },
    { key: 'date', label: 'Date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock', type: 'flock', required: true },
    { key: 'totalEggs', label: 'Total eggs', type: 'number', required: true, min: 0, integer: true },
    { key: 'goodEggs', label: 'Good eggs', type: 'number', required: true, min: 0, integer: true },
    { key: 'brokenEggs', label: 'Broken eggs', type: 'number', required: true, min: 0, integer: true },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'notes', label: 'Notes (optional)', type: 'text' },
  ],
  validate: (values) =>
    Number(values.goodEggs) + Number(values.brokenEggs) > Number(values.totalEggs)
      ? 'Good and broken eggs cannot exceed the total egg count.'
      : null,
  list: (page) => eggProductionAPI.list({ page, limit: 100 }),
  create: (values) =>
    eggProductionAPI.create({
      flockId: values.flockId,
      totalEggs: Number(values.totalEggs),
      goodEggs: Number(values.goodEggs),
      brokenEggs: Number(values.brokenEggs),
      date: values.date,
      notes: values.notes.trim() || null,
    }),
  remove: (id) => eggProductionAPI.delete(id),
};

export const poultrySalesConfig: PoultryRecordConfig = {
  title: 'Sales',
  subtitle: 'Record poultry sales, buyer, payment, and revenue details.',
  icon: '💰',
  searchKeys: ['flockId', 'birdType', 'buyerName', 'paymentMethod'],
  columns: [
    { key: 'birdType', label: 'Product' },
    { key: 'flockId', label: 'Flock' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'totalAmount', label: 'Total' },
    { key: 'buyerName', label: 'Buyer' },
    { key: 'date', label: 'Date' },
  ],
  fields: [
    { key: 'flockId', label: 'Flock (optional)', type: 'flock' },
    { key: 'birdType', label: 'Product / bird type', type: 'text', required: true },
    { key: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1, integer: true },
    { key: 'weight', label: 'Total weight (optional)', type: 'number', min: 0.01 },
    { key: 'pricePerBird', label: 'Price per bird (optional)', type: 'number', min: 0.01 },
    { key: 'totalAmount', label: 'Total amount', type: 'number', required: true, min: 0.01 },
    { key: 'buyerName', label: 'Buyer (optional)', type: 'text' },
    { key: 'paymentMethod', label: 'Payment method (optional)', type: 'text' },
    { key: 'date', label: 'Date', type: 'date', required: true },
    { key: 'notes', label: 'Notes (optional)', type: 'text' },
  ],
  list: (page) => poultrySalesAPI.list({ page, limit: 100 }),
  create: (values) =>
    poultrySalesAPI.create({
      flockId: values.flockId || null,
      birdType: values.birdType.trim(),
      quantity: Number(values.quantity),
      weight: values.weight ? Number(values.weight) : null,
      pricePerBird: values.pricePerBird ? Number(values.pricePerBird) : null,
      totalAmount: Number(values.totalAmount),
      buyerName: values.buyerName.trim() || null,
      paymentMethod: values.paymentMethod.trim() || null,
      date: values.date,
      notes: values.notes.trim() || null,
    }),
  remove: (id) => poultrySalesAPI.delete(id),
};
