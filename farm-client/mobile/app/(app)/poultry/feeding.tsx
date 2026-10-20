import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { feedingConfig } from '@/modules/poultry/recordConfigs';

export default function FeedingScreen() {
  return <PoultryRecordScreen config={feedingConfig} />;
}
