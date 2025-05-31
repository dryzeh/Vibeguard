describe('BLE Connection Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Permission Handling', () => {
    it('should request location permissions on first launch', async () => {
      await expect(element(by.text('Location Access Required'))).toBeVisible();
      await element(by.text('Allow')).tap();
    });

    it('should request Bluetooth permissions', async () => {
      await expect(element(by.text('Bluetooth Access Required'))).toBeVisible();
      await element(by.text('Allow')).tap();
    });
  });

  describe('Device Scanning', () => {
    it('should start scanning when scan button is pressed', async () => {
      await element(by.text('Scan for Devices')).tap();
      
      // Verify scanning state
      await expect(element(by.text('Scanning...'))).toBeVisible();
      await expect(element(by.id('scanning-indicator'))).toBeVisible();
      await expect(element(by.text('Searching for devices...'))).toBeVisible();
    });

    it('should show error message when scanning fails', async () => {
      // This test assumes Bluetooth is turned off
      await element(by.text('Scan for Devices')).tap();
      await expect(element(by.id('error-message'))).toBeVisible();
    });

    it('should stop scanning after timeout', async () => {
      await element(by.text('Scan for Devices')).tap();
      
      // Wait for scanning to complete (timeout is 10 seconds)
      await waitFor(element(by.text('Scan for Devices')))
        .toBeVisible()
        .withTimeout(12000); // 12 seconds to account for delays
    });
  });

  describe('Device Discovery', () => {
    it('should display discovered devices in the list', async () => {
      await element(by.text('Scan for Devices')).tap();
      
      // Wait for device list to populate
      await waitFor(element(by.id('device-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify device items are visible
      await expect(element(by.id('device-item-0'))).toBeVisible();
    });

    it('should show device details correctly', async () => {
      await element(by.text('Scan for Devices')).tap();
      
      // Wait for device list
      await waitFor(element(by.id('device-list')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify device information is displayed
      await expect(element(by.text(/ID: .+/))).toBeVisible();
    });
  });

  describe('Connection Process', () => {
    it('should show connecting state when device is selected', async () => {
      // Start scan and wait for devices
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Select first device
      await element(by.id('device-item-0')).tap();
      
      // Verify connecting state
      await expect(element(by.text('Connecting...'))).toBeVisible();
    });

    it('should show connected state after successful connection', async () => {
      // Start scan and connect to device
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('device-item-0')).tap();
      
      // Wait for connection
      await waitFor(element(by.text('Connected!')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Verify connected state
      await expect(element(by.id('device-status-connected'))).toBeVisible();
      await expect(element(by.id('disconnect-button'))).toBeVisible();
    });

    it('should handle connection failures gracefully', async () => {
      // Start scan and attempt to connect to a device that will fail
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-1'))) // Using second device which might be unreachable
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('device-item-1')).tap();
      
      // Verify error state
      await expect(element(by.text('Failed to connect to device'))).toBeVisible();
    });
  });

  describe('Disconnection', () => {
    it('should disconnect when disconnect button is pressed', async () => {
      // First connect to a device
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('device-item-0')).tap();
      await waitFor(element(by.text('Connected!')))
        .toBeVisible()
        .withTimeout(10000);
      
      // Disconnect
      await element(by.id('disconnect-button')).tap();
      
      // Verify disconnected state
      await expect(element(by.text('Connected!'))).not.toBeVisible();
      await expect(element(by.text('Scan for Devices'))).toBeVisible();
    });

    it('should allow reconnecting after disconnection', async () => {
      // Connect and disconnect first
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('device-item-0')).tap();
      await waitFor(element(by.text('Connected!')))
        .toBeVisible()
        .withTimeout(10000);
      await element(by.id('disconnect-button')).tap();
      
      // Try reconnecting
      await element(by.text('Scan for Devices')).tap();
      await waitFor(element(by.id('device-item-0')))
        .toBeVisible()
        .withTimeout(5000);
      await element(by.id('device-item-0')).tap();
      
      // Verify reconnection
      await waitFor(element(by.text('Connected!')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
}); 