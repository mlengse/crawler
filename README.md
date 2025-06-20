# URL to Markdown Converter

A desktop application that converts a list of URLs into Markdown format. Available in two versions:

## Main Application (Electron Version - Recommended)

Built with Electron, this is the main application with full features and local processing.

### Features

*   **Local processing** - no external API dependencies for privacy and reliability
*   Uses Mozilla Readability for content extraction and Turndown for markdown conversion
*   Real-time preview with toggle between raw markdown and rendered HTML view
*   Responsive UI that adapts to screen size with side-by-side preview on wide screens
*   Load a list of URLs from a local `.txt` file
*   Manually input a single URL for conversion
*   Handles network errors and includes retry mechanism for URL fetching
*   Pause and resume batch processing of URLs
*   Save converted markdown:
    *   As a single merged file
    *   As individual files in a selected directory
*   User-friendly interface with status messages and progress tracking

## Alternative Rust Version (Iced GUI)

A basic implementation using Rust and the Iced GUI framework. Located in `src/main.rs`.

**Note:** The Rust version provides basic functionality only. Use the Electron version for full features.

## Prerequisites

*   [Node.js](https://nodejs.org/) (which includes npm)
*   For Rust version: [Rust](https://rustup.rs/) toolchain

## Installation & Running

### Electron Version (Main App)

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Run the application:**
    ```bash
    npm start
    ```

### Rust Version (Alternative)

1.  **Build and run:**
    ```bash
    cargo run
    ```

## How to Use (Electron Version)

1.  **Open URL File:** Click "Open URL File" to select a `.txt` file. Each URL should be on a new line.
2.  **Start Processing File:** Once a file is loaded, click "Start Processing File".
3.  **Manual URL:** Alternatively, type a single URL into the input field and click "Process Manual URL".
4.  **Pause/Resume:** During batch processing, you can use the "Pause" and "Resume" buttons.
5.  **Save Mode:** Choose between "Save merged into single file" (default) or saving individual files.
6.  **Save Markdown:** After processing, click "Save Markdown" and choose a location.
7.  **Status & Preview:** Monitor the status messages and markdown preview for progress and results.


## Building for Production (Optional)

To package the application for distribution (e.g., as an executable), you can use tools like Electron Forge or Electron Builder. This typically involves adding them as development dependencies and configuring their build process.

Example using Electron Forge (you would need to install it first: `npm install --save-dev @electron-forge/cli` and then `npx electron-forge import`):

```bash
# To make executables/installers
npm run make
```

Or using Electron Builder (after installation and configuration):
```bash
npm run dist # Or similar command based on your setup
```
Further configuration is required for these tools.
