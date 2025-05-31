# End-to-End Testing Guide

This directory contains end-to-end tests for the mobile app using Detox.

## Prerequisites

1. For iOS:
   - Xcode
   - iOS Simulator
   - `applesimutils`: `brew tap wix/brew && brew install applesimutils`

2. For Android:
   - Android Studio
   - Android SDK
   - An Android Emulator (Pixel_4_API_30 recommended)

## Running Tests

### iOS

```bash
# Build the app for testing
npm run e2e:build:ios

# Run the tests
npm run e2e:test:ios
```

### Android

```bash
# Build the app for testing
npm run e2e:build:android

# Run the tests
npm run e2e:test:android
```

## Writing Tests

### Test Structure

Tests are written using Jest and Detox. Each test file should:
1. Be named with the `.e2e.js` extension
2. Be placed in the `e2e` directory
3. Use the standard Detox matchers and expectations

### Example Test

```javascript
describe('Feature Name', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should do something', async () => {
    await expect(element(by.id('some-element'))).toBeVisible();
    await element(by.id('some-button')).tap();
    await expect(element(by.text('Expected Result'))).toBeVisible();
  });
});
```

### Common Matchers

- `by.id('testID')`: Find element by testID
- `by.text('text')`: Find element by text content
- `by.label('label')`: Find element by accessibility label
- `by.type('type')`: Find element by type

### Common Actions

- `tap()`: Tap on an element
- `typeText('text')`: Enter text into an input
- `scroll(pixels, direction)`: Scroll an element
- `swipe(direction, speed, percentage)`: Swipe on an element

### Common Expectations

- `toBeVisible()`: Element is visible
- `toHaveText('text')`: Element has specific text
- `toExist()`: Element exists in the hierarchy
- `not.toBeVisible()`: Element is not visible

## Best Practices

1. Use testID for stable element selection
2. Keep tests focused and independent
3. Clean up app state between tests
4. Use meaningful test descriptions
5. Handle async operations properly
6. Test both success and failure scenarios

## Troubleshooting

Common issues and solutions:

1. Tests failing to start:
   - Ensure the simulator/emulator is running
   - Try rebuilding the app: `npm run e2e:build`
   - Clear the app data and reinstall

2. Tests are flaky:
   - Add appropriate wait conditions
   - Increase timeouts if needed
   - Ensure proper cleanup between tests

3. Element not found:
   - Check if testID is correct
   - Verify element is visible on screen
   - Use device.log() to debug

For more help, consult the [Detox documentation](https://wix.github.io/Detox/). 