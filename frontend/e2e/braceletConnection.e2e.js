describe('Bracelet Connection', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should show BLE permission request', async () => {
    // Navigate to connection screen (adjust the button ID based on your navigation)
    await element(by.id('connect-bracelet-button')).tap();

    // Check for Bluetooth permission dialog
    await expect(element(by.text('Bluetooth Access Required'))).toBeVisible();
    await expect(element(by.text('Allow'))).toBeVisible();
  });

  it('should show scanning UI when searching for devices', async () => {
    // Navigate to connection screen
    await element(by.id('connect-bracelet-button')).tap();
    
    // Allow permissions if prompted
    try {
      await element(by.text('Allow')).tap();
    } catch (e) {
      // Permission might have been granted already
    }

    // Verify scanning UI elements
    await expect(element(by.id('scanning-indicator'))).toBeVisible();
    await expect(element(by.text('Scanning for devices...'))).toBeVisible();
  });

  it('should display found devices in the list', async () => {
    // Navigate to connection screen
    await element(by.id('connect-bracelet-button')).tap();

    // Wait for device list to populate (adjust timeout as needed)
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Verify device list elements
    await expect(element(by.id('device-list'))).toBeVisible();
    await expect(element(by.id('refresh-button'))).toBeVisible();
  });

  it('should attempt connection when device is selected', async () => {
    // Navigate to connection screen
    await element(by.id('connect-bracelet-button')).tap();

    // Wait for device list
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Select first device in list
    await element(by.id('device-item-0')).tap();

    // Verify connection attempt UI
    await expect(element(by.text('Connecting...'))).toBeVisible();
  });

  it('should show success UI when connection is established', async () => {
    // Navigate to connection screen
    await element(by.id('connect-bracelet-button')).tap();

    // Wait for device list
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Select first device
    await element(by.id('device-item-0')).tap();

    // Wait for connection success (adjust timeout as needed)
    await waitFor(element(by.text('Connected!')))
      .toBeVisible()
      .withTimeout(15000);

    // Verify success UI elements
    await expect(element(by.text('Connected!'))).toBeVisible();
    await expect(element(by.id('device-status-connected'))).toBeVisible();
  });

  it('should handle connection failures gracefully', async () => {
    // Navigate to connection screen
    await element(by.id('connect-bracelet-button')).tap();

    // Wait for device list
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);

    // Select a device that might fail to connect
    await element(by.id('device-item-1')).tap();

    // Verify error handling
    await waitFor(element(by.text('Connection failed')))
      .toBeVisible()
      .withTimeout(15000);

    // Check retry button
    await expect(element(by.id('retry-connection-button'))).toBeVisible();
  });

  it('should allow disconnecting from device', async () => {
    // Navigate to connection screen and connect first
    await element(by.id('connect-bracelet-button')).tap();
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('device-item-0')).tap();
    await waitFor(element(by.text('Connected!')))
      .toBeVisible()
      .withTimeout(15000);

    // Tap disconnect button
    await element(by.id('disconnect-button')).tap();

    // Verify disconnection
    await expect(element(by.text('Disconnected'))).toBeVisible();
    await expect(element(by.id('connect-bracelet-button'))).toBeVisible();
  });

  it('should maintain connection state across app reloads', async () => {
    // First establish connection
    await element(by.id('connect-bracelet-button')).tap();
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('device-item-0')).tap();
    await waitFor(element(by.text('Connected!')))
      .toBeVisible()
      .withTimeout(15000);

    // Reload app
    await device.reloadReactNative();

    // Verify connection state persists
    await expect(element(by.text('Connected!'))).toBeVisible();
    await expect(element(by.id('device-status-connected'))).toBeVisible();
  });
}); 