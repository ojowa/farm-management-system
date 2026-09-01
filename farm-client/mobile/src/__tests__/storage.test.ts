import { clearAllStorage } from '../utils/storage';

describe('clearAllStorage', () => {
  it('is a no-op (auth moved to redux-persist)', async () => {
    await expect(clearAllStorage()).resolves.toBeUndefined();
  });
});
