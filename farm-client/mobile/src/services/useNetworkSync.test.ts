import { act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch, useAppSelector } from '../modules/auth/hooks/useAuth';
import { setIsOnline } from '../store/slices/syncSlice';
import { socketService } from './socketService';
import { useNetworkSync } from './useNetworkSync';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

jest.mock('../modules/auth/hooks/useAuth', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock('./socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: false,
    setConnectionChangeHandler: jest.fn(),
    setReconnectingHandler: jest.fn(),
  },
}));

jest.mock('./reconcileQueue', () => ({
  reconcileOfflineQueue: jest.fn(() => ({ stop: jest.fn() })),
}));

const mockNetInfo = NetInfo as unknown as {
  addEventListener: jest.Mock;
};
const mockDispatch = jest.fn();
const mockSocket = socketService as jest.Mocked<typeof socketService>;
let networkListener: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;

describe('useNetworkSync', () => {
  beforeEach(() => {
    networkListener = undefined;
    mockNetInfo.addEventListener.mockImplementation((listener) => {
      networkListener = listener;
      return jest.fn();
    });
    (useAppDispatch as jest.Mock).mockReturnValue(mockDispatch);
    (useAppSelector as jest.Mock).mockImplementation((selector) =>
      selector({
        auth: {
          socketAccessToken: 'access-token',
          isAuthenticated: true,
          user: { id: 'user-1', organizationId: 'org-1' },
        },
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('marks the first reachable state online and connects the socket', () => {
    renderHook(() => useNetworkSync());

    expect(networkListener).toBeDefined();
    act(() => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(mockDispatch).toHaveBeenCalledWith(setIsOnline(true));
    expect(mockSocket.connect).toHaveBeenCalledWith('access-token', {
      userId: 'user-1',
      organizationId: 'org-1',
    });
  });

  it('marks an offline network state as offline', () => {
    renderHook(() => useNetworkSync());

    act(() => {
      networkListener?.({ isConnected: false, isInternetReachable: false });
    });

    expect(mockDispatch).toHaveBeenCalledWith(setIsOnline(false));
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });
});
