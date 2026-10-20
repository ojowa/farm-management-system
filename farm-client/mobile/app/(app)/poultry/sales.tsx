import React from 'react';
import { PoultryRecordScreen } from '@/modules/poultry/PoultryRecordScreen';
import { poultrySalesConfig } from '@/modules/poultry/recordConfigs';

export default function PoultrySalesScreen() {
  return <PoultryRecordScreen config={poultrySalesConfig} />;
}
