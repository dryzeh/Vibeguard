describe('Bracelet Features', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Connect to a bracelet before each test
    await connectToBracelet();
  });

  async function connectToBracelet() {
    await element(by.id('connect-bracelet-button')).tap();
    await waitFor(element(by.id('device-list')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('device-item-0')).tap();
    await waitFor(element(by.text('Connected!')))
      .toBeVisible()
      .withTimeout(10000);
  }

  describe('Emergency Button', () => {
    it('should show emergency button when connected', async () => {
      await expect(element(by.id('emergency-button'))).toBeVisible();
    });

    it('should trigger emergency alert when button is pressed', async () => {
      await element(by.id('emergency-button')).tap();
      
      // Verify emergency UI
      await expect(element(by.id('emergency-alert-active'))).toBeVisible();
      await expect(element(by.text('Emergency Alert Active'))).toBeVisible();
      await expect(element(by.id('cancel-emergency-button'))).toBeVisible();
    });

    it('should show confirmation dialog before canceling emergency', async () => {
      // Trigger emergency first
      await element(by.id('emergency-button')).tap();
      
      // Try to cancel
      await element(by.id('cancel-emergency-button')).tap();
      
      // Verify confirmation dialog
      await expect(element(by.text('Cancel Emergency?'))).toBeVisible();
      await expect(element(by.text('Are you sure you want to cancel the emergency alert?'))).toBeVisible();
      await expect(element(by.text('Yes, Cancel'))).toBeVisible();
      await expect(element(by.text('No, Keep Active'))).toBeVisible();
    });

    it('should cancel emergency when confirmed', async () => {
      // Trigger and cancel emergency
      await element(by.id('emergency-button')).tap();
      await element(by.id('cancel-emergency-button')).tap();
      await element(by.text('Yes, Cancel')).tap();
      
      // Verify emergency is canceled
      await expect(element(by.id('emergency-alert-active'))).not.toBeVisible();
      await expect(element(by.id('emergency-button'))).toBeVisible();
    });
  });

  describe('Battery Monitoring', () => {
    it('should display battery level indicator', async () => {
      await expect(element(by.id('battery-indicator'))).toBeVisible();
    });

    it('should show low battery warning', async () => {
      // Wait for low battery state
      await waitFor(element(by.id('low-battery-warning')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Low Battery'))).toBeVisible();
      await expect(element(by.text('Please charge your bracelet soon'))).toBeVisible();
    });

    it('should update battery level in real-time', async () => {
      const initialBatteryLevel = await element(by.id('battery-level')).getText();
      
      // Wait for potential battery level change
      await waitFor(element(by.id('battery-level')))
        .not.toHaveText(initialBatteryLevel)
        .withTimeout(10000);
    });
  });

  describe('Signal Strength', () => {
    it('should display signal strength indicator', async () => {
      await expect(element(by.id('signal-strength-indicator'))).toBeVisible();
    });

    it('should warn on weak signal', async () => {
      // Move away from device or simulate weak signal
      await waitFor(element(by.id('weak-signal-warning')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Weak Signal'))).toBeVisible();
      await expect(element(by.text('Please move closer to improve connection'))).toBeVisible();
    });

    it('should show connection quality status', async () => {
      await expect(element(by.id('connection-quality-status'))).toBeVisible();
    });
  });

  describe('Vibration Patterns', () => {
    it('should allow testing vibration pattern', async () => {
      await element(by.id('test-vibration-button')).tap();
      
      // Verify vibration test UI
      await expect(element(by.text('Testing Vibration...'))).toBeVisible();
      await waitFor(element(by.text('Vibration Test Complete')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should confirm vibration was felt', async () => {
      await element(by.id('test-vibration-button')).tap();
      await waitFor(element(by.text('Did you feel the vibration?')))
        .toBeVisible()
        .withTimeout(5000);
      
      // Verify confirmation options
      await expect(element(by.text('Yes, I felt it'))).toBeVisible();
      await expect(element(by.text('No, try again'))).toBeVisible();
    });
  });

  describe('Location Tracking', () => {
    it('should show current zone location', async () => {
      await expect(element(by.id('current-zone-indicator'))).toBeVisible();
    });

    it('should update location when moving between zones', async () => {
      const initialZone = await element(by.id('current-zone')).getText();
      
      // Wait for zone change
      await waitFor(element(by.id('current-zone')))
        .not.toHaveText(initialZone)
        .withTimeout(15000);
      
      // Verify zone change notification
      await expect(element(by.id('zone-change-notification'))).toBeVisible();
    });

    it('should show out-of-range warning', async () => {
      // Simulate moving out of range
      await waitFor(element(by.id('out-of-range-warning')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.text('Bracelet Out of Range'))).toBeVisible();
      await expect(element(by.text('Please return to the monitored area'))).toBeVisible();
    });
  });

  describe('Settings and Calibration', () => {
    it('should allow adjusting vibration intensity', async () => {
      await element(by.id('bracelet-settings-button')).tap();
      await element(by.id('vibration-intensity-slider')).swipe('right', 'slow');
      
      // Verify intensity change
      await expect(element(by.id('vibration-intensity-value'))).toHaveText('High');
    });

    it('should allow calibrating sensors', async () => {
      await element(by.id('bracelet-settings-button')).tap();
      await element(by.id('calibrate-sensors-button')).tap();
      
      // Verify calibration process
      await expect(element(by.text('Calibrating Sensors...'))).toBeVisible();
      await waitFor(element(by.text('Calibration Complete')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
}); 