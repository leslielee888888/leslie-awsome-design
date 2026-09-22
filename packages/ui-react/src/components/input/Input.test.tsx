import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with a default value', () => {
    render(<Input defaultValue="hello" />);
    expect(screen.getByRole('textbox')).toHaveValue('hello');
  });

  it('calls onValueChange when typed into', () => {
    const onValueChange = vi.fn();
    render(<Input onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } });
    expect(onValueChange).toHaveBeenCalledWith('abc');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('sets aria-invalid when a required rule fails', () => {
    render(<Input defaultValue="" rules={[{ type: 'required', message: 'Required' }]} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when valid', () => {
    render(<Input defaultValue="ok" rules={[{ type: 'required', message: 'Required' }]} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('actually displays typed characters in uncontrolled mode (not just firing the callback)', () => {
    render(<Input />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(input.value).toBe('a');
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(input.value).toBe('ab');
  });

  it('stays fully controlled when a value prop is passed (ignores internal store notifications)', () => {
    const onValueChange = vi.fn();
    function Controlled() {
      const [value, setValue] = useState('start');
      return (
        <Input
          value={value}
          onValueChange={(next: string) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Controlled />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(input.value).toBe('start');
    fireEvent.change(input, { target: { value: 'started!' } });
    expect(onValueChange).toHaveBeenCalledWith('started!');
    expect(input.value).toBe('started!');
  });
});
