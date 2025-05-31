import React from 'react';
import { render } from '@testing-library/react-native';
import App from '../App';

// Mock the deviceCompatibility module
jest.mock('../utils/deviceCompatibility', () => ({
  showCompatibilityWarning: jest.fn(),
}));

// Mock the navigation container
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the AppNavigator
jest.mock('../navigation/AppNavigator', () => 'AppNavigator');

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('app-root')).toBeTruthy();
  });

  it('calls showCompatibilityWarning on mount', () => {
    const { showCompatibilityWarning } = require('../utils/deviceCompatibility');
    render(<App />);
    expect(showCompatibilityWarning).toHaveBeenCalled();
  });

  it('renders with all required components', () => {
    const { getByTestId } = render(<App />);
    const appRoot = getByTestId('app-root');
    expect(appRoot).toBeTruthy();
  });
}); 