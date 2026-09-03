import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TextInputField } from '../components/common/UIComponents';

describe('TextInputField', () => {
  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <TextInputField placeholder="Enter email" value="" onChangeText={() => {}} />
    );
    expect(getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <TextInputField placeholder="Email" value="" onChangeText={onChangeText} />
    );
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('displays error message when error prop is set', () => {
    const { getByText } = render(
      <TextInputField placeholder="Email" value="" onChangeText={() => {}} error="Email is required" />
    );
    expect(getByText('Email is required')).toBeTruthy();
  });

  it('renders as secure entry when secureTextEntry is true', () => {
    const { getByPlaceholderText } = render(
      <TextInputField placeholder="Password" value="" onChangeText={() => {}} secureTextEntry />
    );
    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
  });
});
