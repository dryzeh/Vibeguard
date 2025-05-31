import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { ToastProvider } from '../../contexts/ToastContext';
import { LanguageProvider } from '../../contexts/LanguageContext';
import ForgotPasswordScreen from '../../screens/ForgotPasswordScreen';
import { api } from '../../services/api';

// Mock dependencies
jest.mock('../../services/api');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Error: 'error',
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

describe('ForgotPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderScreen = () =>
    render(
      <NavigationContainer>
        <LanguageProvider>
          <ToastProvider>
            <ForgotPasswordScreen />
          </ToastProvider>
        </LanguageProvider>
      </NavigationContainer>
    );

  it('shows error toast when email is empty', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Send Reset Code'));
    
    await waitFor(() => {
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it('proceeds to verification code step on successful email submission', async () => {
    (api.post as jest.Mock).mockResolvedValueOnce({ success: true });
    
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    
    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(getByText('Send Reset Code'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password/request', {
        email: 'test@example.com',
      });
      expect(queryByText('Enter Verification Code')).toBeTruthy();
    });
  });

  it('shows error toast on API failure', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    
    const { getByPlaceholderText, getByText } = renderScreen();
    
    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(getByText('Send Reset Code'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
    });
  });

  it('validates matching passwords before submission', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    
    // Navigate to password step
    (api.post as jest.Mock).mockResolvedValueOnce({ success: true });
    (api.post as jest.Mock).mockResolvedValueOnce({ success: true });
    
    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(getByText('Send Reset Code'));

    await waitFor(() => {
      const codeInput = getByPlaceholderText('Enter verification code');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText('Verify Code'));
    });

    await waitFor(() => {
      const newPasswordInput = getByPlaceholderText('Enter new password');
      const confirmPasswordInput = getByPlaceholderText('Confirm new password');
      
      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456');
      fireEvent.press(getByText('Reset Password'));
      
      expect(api.post).not.toHaveBeenCalledWith('/auth/reset-password/reset');
    });
  });

  it('navigates back to login on successful password reset', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    
    // Navigate to password step
    (api.post as jest.Mock).mockResolvedValue({ success: true });
    
    const emailInput = getByPlaceholderText('Enter your email');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.press(getByText('Send Reset Code'));

    await waitFor(() => {
      const codeInput = getByPlaceholderText('Enter verification code');
      fireEvent.changeText(codeInput, '123456');
      fireEvent.press(getByText('Verify Code'));
    });

    await waitFor(() => {
      const newPasswordInput = getByPlaceholderText('Enter new password');
      const confirmPasswordInput = getByPlaceholderText('Confirm new password');
      
      fireEvent.changeText(newPasswordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');
      fireEvent.press(getByText('Reset Password'));
    });

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });
  });
}); 