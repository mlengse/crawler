# URL to Markdown Converter (Electron Version)

A desktop application built with Electron that converts a list of URLs into Markdown format. It uses an external API service for the conversion.

## Features

*   Load a list of URLs from a local `.txt` file.
*   Manually input a single URL for conversion.
*   Fetches markdown content from `https://urltomarkdown.herokuapp.com/`.
*   Displays a live preview of the markdown for the current URL being processed.
*   Handles API errors and includes a retry mechanism for transient issues.
*   Pause and resume batch processing of URLs.
*   Save converted markdown:
    *   As a single merged file.
    *   As individual files in a selected directory.
*   User-friendly interface with status messages.

## Prerequisites

*   [Node.js](https://nodejs.org/) (which includes npm)

## Installation

1.  **Clone the repository (or download the source code):**
    ```bash
    git clone https://github.com/your-username/url-to-markdown-electron.git
    cd url-to-markdown-electron
    ```
    *(Note: Replace `your-username/url-to-markdown-electron` with the actual repository URL after project setup)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```

## Running the Application (Development Mode)

To run the application in development mode:

```bash
npm start
```

This will launch the Electron application.

## How to Use

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
