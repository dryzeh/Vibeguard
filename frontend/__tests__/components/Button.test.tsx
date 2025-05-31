/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../../components/Button';

describe('Button Component', () => {
  it('renders correctly', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress} title="Test Button" />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('handles press events', () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress} title="Test Button" />);
    fireEvent.press(screen.getByText('Test Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    const { getByTestId } = render(
      <Button 
        title="Test Button" 
        onPress={() => {}} 
        isLoading={true}
      />
    );
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('applies variant styles correctly', () => {
    const { getByTestId } = render(
      <Button
        title="Test Button"
        onPress={() => {}}
        variant="outline"
        testID="test-button"
      />
    );
    const button = getByTestId('test-button');
    expect(button.props.style).toMatchObject({
      backgroundColor: 'transparent',
    });
  });

  it('disables button when loading or disabled', () => {
    const onPress = jest.fn();
    const { getByTestId, rerender } = render(
      <Button
        title="Test Button"
        onPress={onPress}
        isLoading={true}
        testID="test-button"
      />
    );
    
    fireEvent.press(getByTestId('test-button'));
    expect(onPress).not.toHaveBeenCalled();

    rerender(
      <Button
        title="Test Button"
        onPress={onPress}
        disabled={true}
        testID="test-button"
      />
    );
    
    fireEvent.press(getByTestId('test-button'));
    expect(onPress).not.toHaveBeenCalled();
  });
}); 