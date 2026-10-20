import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { vaccinationConfig } from '@/modules/poultry/recordConfigs';

export default function VaccinationsScreen() {
  return <PoultryRecordScreen config={vaccinationConfig} />;
}
