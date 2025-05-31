describe('Device Compatibility Check', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show compatibility warning on unsupported device', async () => {
    // Wait for the app to load and check compatibility
    await expect(element(by.text('Device Compatibility Warning'))).toBeVisible();
    
    // Verify warning message content
    await expect(element(by.text(/This device may not be fully compatible/))).toBeVisible();
    
    // Check for action buttons
    await expect(element(by.text('Contact Support'))).toBeVisible();
    await expect(element(by.text('Continue Anyway'))).toBeVisible();
  });

  it('should allow proceeding after warning', async () => {
    // Wait for warning dialog
    await expect(element(by.text('Device Compatibility Warning'))).toBeVisible();
    
    // Tap continue button
    await element(by.text('Continue Anyway')).tap();
    
    // Verify warning is dismissed
    await expect(element(by.text('Device Compatibility Warning'))).not.toBeVisible();
  });

  it('should open support contact on button press', async () => {
    // Wait for warning dialog
    await expect(element(by.text('Device Compatibility Warning'))).toBeVisible();
    
    // Tap support button
    await element(by.text('Contact Support')).tap();
    
    // Add assertions for support contact screen/action
    // This will depend on your implementation
  });
}); 