import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// Mock the dynamic WASM import
jest.mock('/rust_backend.js', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined), // Mock the init function
  process_html_to_markdown: jest.fn((html, url) => `# Mocked Markdown\n\nProcessed from: ${url}\n\n${html}`),
}), { virtual: true });

describe('App component', () => {
  test('renders app and initializes WASM correctly', async () => {
    render(<App />);

    // Check that the main elements are rendered
    expect(screen.getByText(/URL to Markdown Converter/i)).toBeInTheDocument();
    
    // Wait for WASM initialization
    await waitFor(() => {
      expect(screen.getByText(/WASM initialized. Ready to process URLs./i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
