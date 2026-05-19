import { renderHook } from '@testing-library/react-native';
import { useOnNewError } from '@/features/observability/hooks/use-on-new-error';

type Props = { isError: boolean; error: unknown; cb: (e: unknown) => void };

describe('useOnNewError', () => {
  test('calls onError once when an error appears', () => {
    const cb = jest.fn();
    const err = new Error('boom');
    renderHook<void, Props>(({ isError, error, cb }) => useOnNewError(isError, error, cb), {
      initialProps: { isError: true, error: err, cb },
    });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(err);
  });

  test('does not re-fire on re-render with the same error', () => {
    const cb = jest.fn();
    const err = new Error('boom');
    const { rerender } = renderHook<void, Props>(
      ({ isError, error, cb }) => useOnNewError(isError, error, cb),
      { initialProps: { isError: true, error: err, cb } },
    );
    rerender({ isError: true, error: err, cb });
    rerender({ isError: true, error: err, cb });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test('fires again for a referentially new error', () => {
    const cb = jest.fn();
    const { rerender } = renderHook<void, Props>(
      ({ isError, error, cb }) => useOnNewError(isError, error, cb),
      { initialProps: { isError: true, error: new Error('one'), cb } },
    );
    rerender({ isError: true, error: new Error('two'), cb });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test('does not fire while isError is false', () => {
    const cb = jest.fn();
    const { rerender } = renderHook<void, Props>(
      ({ isError, error, cb }) => useOnNewError(isError, error, cb),
      { initialProps: { isError: false, error: new Error('boom'), cb } },
    );
    rerender({ isError: false, error: new Error('boom'), cb });
    expect(cb).not.toHaveBeenCalled();
  });

  test('uses the latest callback', () => {
    const first = jest.fn();
    const second = jest.fn();
    const err = new Error('boom');
    const { rerender } = renderHook<void, Props>(
      ({ isError, error, cb }) => useOnNewError(isError, error, cb),
      { initialProps: { isError: false, error: err, cb: first } },
    );
    rerender({ isError: true, error: err, cb: second });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
