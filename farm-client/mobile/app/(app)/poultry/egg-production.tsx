import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { eggProductionConfig } from '@/modules/poultry/recordConfigs';

export default function EggProductionScreen() {
  return <PoultryRecordScreen config={eggProductionConfig} />;
}
