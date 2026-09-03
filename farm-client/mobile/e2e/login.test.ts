import { by, device, element, expect } from 'detox';

describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show login screen', async () => {
    await expect(element(by.text('Sign In'))).toBeVisible();
    await expect(element(by.id('email-input'))).toBeVisible();
    await expect(element(by.id('password-input'))).toBeVisible();
  });

  it('should show validation errors on empty submit', async () => {
    await element(by.id('login-button')).tap();
    await expect(element(by.text('Email is required'))).toBeVisible();
  });

  it('should navigate to register screen', async () => {
    await element(by.id('register-link')).tap();
    await expect(element(by.text('Create Account'))).toBeVisible();
  });
});
