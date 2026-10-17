import { io, Socket } from 'socket.io-client';
import { socketService } from './socketService';

jest.mock('socket.io-client', () => ({
  io: jest.fn(),
}));

type TestSocket = Socket & {
  handlers: Map<string, (...args: unknown[]) => void>;
};

function createSocket(): TestSocket {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    connected: false,
    active: true,
    handlers,
    removeAllListeners: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return socket;
    }),
    onAny: jest.fn(),
    emit: jest.fn(),
  };
  socket.disconnect.mockImplementation(() => {
    socket.active = false;
    socket.connected = false;
    return socket;
  });
  return socket as unknown as TestSocket;
}

describe('socketService', () => {
  afterEach(() => {
    socketService.disconnect();
    jest.clearAllMocks();
  });

  it('resets the retry budget when opening a new socket after exhausted retries', async () => {
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const reconnecting = jest.fn();
    (io as jest.MockedFunction<typeof io>)
      .mockReturnValueOnce(firstSocket)
      .mockReturnValueOnce(secondSocket);
    socketService.setReconnectingHandler(reconnecting);

    await socketService.connect('access-token');
    const firstConnectError = firstSocket.handlers.get('connect_error');
    expect(firstConnectError).toBeDefined();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      firstConnectError?.(new Error('connection failed'));
    }

    await socketService.connect('access-token');
    secondSocket.handlers.get('connect_error')?.(new Error('connection failed'));

    expect(reconnecting).toHaveBeenLastCalledWith(1);
    expect(io).toHaveBeenCalledTimes(2);
  });
});
