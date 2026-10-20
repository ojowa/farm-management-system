import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { medicationConfig } from '@/modules/poultry/recordConfigs';

export default function MedicationsScreen() {
  return <PoultryRecordScreen config={medicationConfig} />;
}
