import React from 'react';
import { render } from '@testing-library/react-native';
import { useAppSelector } from '../../../modules/auth/hooks/useAuth';
import { useToasts } from '../../hooks/useToasts';
import { ConnectionBanner } from './ConnectionBanner';

jest.mock('../../../modules/auth/hooks/useAuth', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('../../hooks/useToasts', () => ({
  useToasts: jest.fn(),
}));

const syncState = {
  isOnline: true,
  socketConnected: false,
  reconnectAttempt: 0,
  syncing: false,
  offlineQueue: [],
};
const mockSuccess = jest.fn();

describe('ConnectionBanner', () => {
  beforeEach(() => {
    syncState.isOnline = true;
    syncState.socketConnected = false;
    (useToasts as jest.Mock).mockReturnValue({ success: mockSuccess });
    (useAppSelector as jest.Mock).mockImplementation((selector) => selector({ sync: syncState }));
  });

  it('shows when internet is online but realtime has not connected yet', () => {
    const { getByText } = render(<ConnectionBanner />);

    expect(getByText('Connecting to live updates…')).toBeTruthy();
  });

  it('shows the offline message when the device has no connection', () => {
    syncState.isOnline = false;
    const { getByText } = render(<ConnectionBanner />);

    expect(getByText('You are offline. Changes will sync when reconnected.')).toBeTruthy();
    syncState.isOnline = true;
  });

  it('waits for the realtime socket to reconnect before showing the back-online toast', () => {
    const { rerender } = render(<ConnectionBanner />);

    syncState.isOnline = false;
    rerender(<ConnectionBanner />);
    syncState.isOnline = true;
    rerender(<ConnectionBanner />);

    expect(mockSuccess).not.toHaveBeenCalled();

    syncState.socketConnected = true;
    rerender(<ConnectionBanner />);

    expect(mockSuccess).toHaveBeenCalledWith('Back online');
  });
});
