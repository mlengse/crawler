import { render, screen } from '@testing-library/react';
import StatusDisplay from './StatusDisplay';
import UrlInputPanel from './UrlInputPanel';

test('StatusDisplay has correct accessibility attributes', () => {
  render(<StatusDisplay message="Test message" type="info" />);
  const statusElement = screen.getByText(/Test message/i);
  expect(statusElement).toHaveAttribute('role', 'status');
  expect(statusElement).toHaveAttribute('aria-live', 'polite');
});

test('UrlInputPanel manual input has accessible label', () => {
  render(<UrlInputPanel disabled={false} />);
  const inputElement = screen.getByLabelText(/Masukkan URL secara manual/i);
  expect(inputElement).toBeInTheDocument();
});
