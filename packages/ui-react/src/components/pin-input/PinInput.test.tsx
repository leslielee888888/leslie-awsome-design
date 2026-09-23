import { useState, type ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PinInput, type PinInputRootProps } from '.';

function Boxes({ length }: { length: number }) {
  return (
    <PinInput.Control>
      {Array.from({ length }, (_, index) => (
        <PinInput.Input key={index} index={index} />
      ))}
    </PinInput.Control>
  );
}

function renderPinInput(props: Omit<PinInputRootProps, 'children'>, extraChildren?: ReactNode) {
  return render(
    <PinInput.Root {...props}>
      <Boxes length={props.length} />
      {extraChildren}
    </PinInput.Root>
  );
}

describe('PinInput', () => {
  it('renders one box per length and a group root', () => {
    renderPinInput({ length: 4 });
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
  });

  it('advances focus to the next box after typing a valid character', () => {
    renderPinInput({ length: 3 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } });

    expect(boxes[0]).toHaveValue('1');
    expect(boxes[1]).toHaveFocus();
  });

  it('does not advance past the last box', () => {
    renderPinInput({ length: 2 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } });
    fireEvent.change(boxes[1], { target: { value: '2' } });

    expect(boxes[1]).toHaveValue('2');
    expect(boxes[1]).toHaveFocus();
  });

  it('backspace on an empty box clears and focuses the previous box', () => {
    renderPinInput({ length: 3 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } }); // -> focus box 1
    fireEvent.change(boxes[1], { target: { value: '2' } }); // -> focus box 2
    fireEvent.keyDown(boxes[2], { key: 'Backspace' }); // box 2 is empty

    expect(boxes[1]).toHaveValue('');
    expect(boxes[1]).toHaveFocus();
  });

  it('backspace on a non-empty box only clears that box', () => {
    renderPinInput({ length: 3 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } });
    fireEvent.keyDown(boxes[0], { key: 'Backspace' });

    expect(boxes[0]).toHaveValue('');
  });

  it('arrow keys move focus without changing values', () => {
    renderPinInput({ length: 3 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.keyDown(boxes[0], { key: 'ArrowRight' });
    expect(boxes[1]).toHaveFocus();

    fireEvent.keyDown(boxes[1], { key: 'ArrowLeft' });
    expect(boxes[0]).toHaveFocus();
  });

  it('splits a pasted value across boxes starting at the paste target', () => {
    const onValueChange = vi.fn();
    renderPinInput({ length: 4, onValueChange });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.paste(boxes[0], { clipboardData: { getData: () => '5678' } });

    expect(boxes.map((box) => box.value)).toEqual(['5', '6', '7', '8']);
    expect(onValueChange).toHaveBeenCalledWith('5678');
  });

  it('rejects non-numeric characters by default', () => {
    renderPinInput({ length: 2 });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: 'a' } });

    expect(boxes[0]).toHaveValue('');
  });

  it('sets data-disabled on the root and every box, and ignores input, when disabled', () => {
    const onValueChange = vi.fn();
    renderPinInput({ length: 2, disabled: true, onValueChange });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    expect(screen.getByRole('group')).toHaveAttribute('data-disabled');
    boxes.forEach((box) => expect(box).toHaveAttribute('data-disabled'));

    fireEvent.change(boxes[0], { target: { value: '1' } });
    expect(onValueChange).not.toHaveBeenCalled();
    expect(boxes[0]).toHaveValue('');
  });

  it('sets data-invalid on the root and every box when invalid', () => {
    renderPinInput({ length: 2, invalid: true });
    const boxes = screen.getAllByRole('textbox');

    expect(screen.getByRole('group')).toHaveAttribute('data-invalid');
    boxes.forEach((box) => expect(box).toHaveAttribute('data-invalid'));
  });

  it('sets data-complete on every box once all boxes are filled, and fires onComplete once', () => {
    const onComplete = vi.fn();
    renderPinInput({ length: 2, onComplete });
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } });
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.change(boxes[1], { target: { value: '2' } });
    boxes.forEach((box) => expect(box).toHaveAttribute('data-complete'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('12');
  });

  it('mirrors the joined value onto PinInput.HiddenInput for form submission', () => {
    renderPinInput({ length: 2 }, <PinInput.HiddenInput name="otp" />);
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '1' } });
    fireEvent.change(boxes[1], { target: { value: '2' } });

    const hidden = document.querySelector<HTMLInputElement>('input[name="otp"]');
    expect(hidden).toHaveValue('12');
    expect(hidden).toHaveAttribute('aria-hidden', 'true');
  });

  it('throws a helpful error when PinInput.Input is used outside PinInput.Root', () => {
    // Swallow the expected console.error React logs for the thrown render error.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<PinInput.Input index={0} />)).toThrow(
      'PinInput components must be used within a <PinInput.Root>'
    );
    consoleError.mockRestore();
  });

  // Regression test: this whole PinInput + frameworks/react design exists to
  // stop a naive re-implementation from recreating the behavior (and losing
  // its state) whenever a *sibling*/parent prop changes for unrelated
  // reasons. `useBehavior` creates the behavior exactly once via
  // `useState`, so a new `PinInput.Root` props object on every Harness
  // render (from the counter re-render) must not reset typed values.
  it('keeps typed values after a parent re-render that only changes an unrelated prop', () => {
    function Harness() {
      const [count, setCount] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            unrelated: {count}
          </button>
          <PinInput.Root length={4}>
            <Boxes length={4} />
          </PinInput.Root>
        </div>
      );
    }

    render(<Harness />);
    const boxes = screen.getAllByRole<HTMLInputElement>('textbox');

    fireEvent.change(boxes[0], { target: { value: '7' } });
    expect(boxes[0]).toHaveValue('7');

    fireEvent.click(screen.getByRole('button', { name: /unrelated/ }));
    fireEvent.click(screen.getByRole('button', { name: /unrelated/ }));

    expect(screen.getAllByRole<HTMLInputElement>('textbox')[0]).toHaveValue('7');
  });
});
