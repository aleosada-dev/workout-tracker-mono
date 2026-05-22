import { render } from '@testing-library/react-native';
import { UploadProgressBar } from './upload-progress-bar';

describe('<UploadProgressBar />', () => {
  test('renders the label and percentage readout', () => {
    const { getByText } = render(<UploadProgressBar progress={0.42} label="Enviando vídeo…" />);

    getByText('Enviando vídeo…');
    getByText('42%');
  });

  test('exposes progress through the progressbar accessibility role', () => {
    const { getByRole } = render(<UploadProgressBar progress={0.6} testID="upload.progress" />);

    const bar = getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 60 });
  });

  test('clamps out-of-range and non-finite progress values', () => {
    const { getByRole, rerender } = render(<UploadProgressBar progress={1.8} />);
    expect(getByRole('progressbar').props.accessibilityValue.now).toBe(100);

    rerender(<UploadProgressBar progress={-0.5} />);
    expect(getByRole('progressbar').props.accessibilityValue.now).toBe(0);

    rerender(<UploadProgressBar progress={Number.NaN} />);
    expect(getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  test('hides the percentage readout when indeterminate', () => {
    const { getByText, queryByText } = render(
      <UploadProgressBar progress={0} indeterminate label="Enviando vídeo…" />,
    );

    getByText('Enviando vídeo…');
    expect(queryByText('0%')).toBeNull();
  });

  test('omits the accessibility value when indeterminate', () => {
    const { getByRole } = render(<UploadProgressBar progress={0} indeterminate />);

    expect(getByRole('progressbar').props.accessibilityValue).toBeUndefined();
  });
});
