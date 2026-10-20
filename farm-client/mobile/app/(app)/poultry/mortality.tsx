import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { mortalityConfig } from '@/modules/poultry/recordConfigs';

export default function MortalityScreen() {
  return <PoultryRecordScreen config={mortalityConfig} />;
}
