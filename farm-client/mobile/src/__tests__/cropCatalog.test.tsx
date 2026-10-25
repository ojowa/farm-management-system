import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import CropCatalogScreen from '../../app/(app)/crops/catalog';

// ─── API mocks ────────────────────────────────────────────────────────────────
// The catalog screen is the org's crop-name manager: it lists GET /crops and
// posts / puts / deletes single names. It also tallies cycle usage so the
// delete warning can say how many cycles plant a crop.

const mockList = jest.fn();
const mockListCycles = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockHasPermission = jest.fn();

jest.mock('@/modules/crop', () => ({
  offlineCropsAPI: {
    list: (...a: any[]) => mockList(...a),
    listCycles: (...a: any[]) => mockListCycles(...a),
    create: (...a: any[]) => mockCreate(...a),
    update: (...a: any[]) => mockUpdate(...a),
    delete: (...a: any[]) => mockDelete(...a),
    get: jest.fn(),
    getCycle: jest.fn(),
  },
}));

jest.mock('@/core/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: mockHasPermission }),
}));

jest.mock('@/core/hooks/useToasts', () => ({
  useToasts: () => ({ success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() }),
}));

jest.mock('@/core/theme/ThemeContext', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: '#16A34A',
      background: '#F9FAFB',
      text: '#111827',
      textSecondary: '#6B7280',
      card: '#FFFFFF',
      border: '#E5E7EB',
      surface: '#FFFFFF',
      headerBg: '#16A34A',
    },
  }),
}));

jest.mock('@/core/ui/MenuButton', () => ({ MenuButton: () => null }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

const CROPS = [
  { id: 'crop1', name: 'Maize' },
  { id: 'crop2', name: 'Tomatoes' },
  { id: 'crop3', name: 'Cassava' },
];

describe('CropCatalogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
    mockList.mockResolvedValue({ data: CROPS });
    mockListCycles.mockResolvedValue({
      data: [
        { id: 'cyc1', cropId: 'crop1' },
        { id: 'cyc2', cropId: 'crop1' },
        { id: 'cyc3', cropId: 'crop2' },
      ],
    });
  });

  it('lists the org catalog with per-crop cycle usage', async () => {
    render(<CropCatalogScreen />);

    expect(await screen.findByText('Maize', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.getByText('Tomatoes')).toBeTruthy();
    expect(screen.getByText('Cassava')).toBeTruthy();
    // Maize is planted twice, Tomatoes once.
    expect(await screen.findByText('2 cycles')).toBeTruthy();
    expect(screen.getByText('1 cycle')).toBeTruthy();
    // Usage needs the cycles endpoint.
    expect(mockListCycles).toHaveBeenCalledWith({ limit: 500 });
  });

  it('filters the list by search text', async () => {
    render(<CropCatalogScreen />);

    await screen.findByText('Cassava', {}, { timeout: 10000 });
    fireEvent.changeText(screen.getByLabelText('Search crops'), 'tomat');

    expect(await screen.findByText('Tomatoes')).toBeTruthy();
    expect(screen.queryByText('Maize')).toBeNull();
    expect(screen.queryByText('Cassava')).toBeNull();
  });

  it('creates a crop with a trimmed name of at least 2 characters', async () => {
    mockList.mockResolvedValueOnce({ data: CROPS }).mockResolvedValue({
      data: [...CROPS, { id: 'crop4', name: 'Beans' }],
    });
    mockCreate.mockResolvedValue({ data: { id: 'crop4' } });

    render(<CropCatalogScreen />);
    fireEvent.press(await screen.findByText('Add Crop', {}, { timeout: 10000 }));

    fireEvent.changeText(screen.getByLabelText('Crop name'), '  Beans  ');
    fireEvent.press(screen.getByText('Create Crop'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ name: 'Beans' }));
    // The list reloads so the new crop appears.
    await screen.findByText('Beans');
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('rejects a one-character name before touching the API', async () => {
    render(<CropCatalogScreen />);
    fireEvent.press(await screen.findByText('Add Crop', {}, { timeout: 10000 }));

    fireEvent.changeText(screen.getByLabelText('Crop name'), 'x');
    fireEvent.press(screen.getByText('Create Crop'));

    expect(
      await screen.findByText('Crop name must be at least 2 characters')
    ).toBeTruthy();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('surfaces the server 409 for a duplicate name inline', async () => {
    mockCreate.mockRejectedValue({
      response: { data: { message: 'Crop already exists in this organization' } },
    });

    render(<CropCatalogScreen />);
    fireEvent.press(await screen.findByText('Add Crop', {}, { timeout: 10000 }));

    fireEvent.changeText(screen.getByLabelText('Crop name'), 'Maize');
    fireEvent.press(screen.getByText('Create Crop'));

    expect(
      await screen.findByText('Crop already exists in this organization')
    ).toBeTruthy();
    // The dialog stays open so the name can be corrected.
    expect(screen.getByText('Create Crop')).toBeTruthy();
  });

  it('hides every manage action from read-only users', async () => {
    mockHasPermission.mockReturnValue(false);

    render(<CropCatalogScreen />);

    expect(await screen.findByText('Maize', {}, { timeout: 10000 })).toBeTruthy();
    expect(screen.queryByText('Add Crop')).toBeNull();
    expect(screen.queryByLabelText('Rename Maize')).toBeNull();
    expect(screen.queryByLabelText('Delete Maize')).toBeNull();
  });
});
