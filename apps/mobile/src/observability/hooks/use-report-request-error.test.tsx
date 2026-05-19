import { renderHook } from '@testing-library/react-native';
import { ApiUnauthorizedError } from '@/api/lib/errors';
import { useReportRequestError } from '@/observability/hooks/use-report-request-error';

describe('useReportRequestError', () => {
  test('reports a generic error to the provided captureError', () => {
    const captureError = jest.fn();
    const err = new Error('boom');
    renderHook(() =>
      useReportRequestError({ isError: true, error: err }, captureError, { action: 'load_x' }),
    );
    expect(captureError).toHaveBeenCalledTimes(1);
    expect(captureError).toHaveBeenCalledWith(err, { action: 'load_x' });
  });

  test('ignores ApiUnauthorizedError', () => {
    const captureError = jest.fn();
    renderHook(() =>
      useReportRequestError({ isError: true, error: new ApiUnauthorizedError() }, captureError, {
        action: 'load_x',
      }),
    );
    expect(captureError).not.toHaveBeenCalled();
  });

  test('does not re-report the same error on re-render', () => {
    const captureError = jest.fn();
    const err = new Error('boom');
    const { rerender } = renderHook<void, { error: unknown }>(
      ({ error }) =>
        useReportRequestError({ isError: true, error }, captureError, { action: 'load_x' }),
      { initialProps: { error: err } },
    );
    rerender({ error: err });
    rerender({ error: err });
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});
