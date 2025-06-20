const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises; // Use promise-based fs

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000, // Increased width for better UI visibility
    height: 700, // Increased height
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Important for security
      nodeIntegration: false // Keep false for security
    }
  })

  mainWindow.loadFile('index.html')

  // Open the DevTools - useful for debugging
  // mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// Handle 'open-file-dialog'
ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  });

  if (canceled || filePaths.length === 0) {
    return { canceled: true, filePath: null, content: null };
  }

  const filePath = filePaths[0];
  try {
    const rawContent = await fs.readFile(filePath, 'utf-8');
    // Split by lines and filter out empty lines or lines with only whitespace
    const contentArray = rawContent.split(/\r?\n/).filter(line => line.trim() !== '');
    return { canceled: false, filePath: filePath, content: contentArray };
  } catch (error) {
    console.error('Failed to read file:', error);
    return { canceled: false, filePath: filePath, content: null, error: error.message };
  }
});

// Handle 'save-merged-dialog'
ipcMain.handle('save-merged-dialog', async (event, defaultFilename, content) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultFilename,
    filters: [{ name: 'Markdown Files', extensions: ['md'] }]
  });

  if (canceled || !filePath) {
    return { canceled: true, filePath: null, error: null };
  }

  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { canceled: false, filePath: filePath, error: null };
  } catch (error) {
    console.error('Failed to save merged file:', error);
    return { canceled: false, filePath: filePath, error: error.message };
  }
});

// Handle 'save-separate-dialog'
ipcMain.handle('save-separate-dialog', async (event, filesToSaveArray) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'], // Allow creating directory if needed
    title: 'Select Directory to Save Markdown Files'
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { canceled: true, directoryPath: null, errors: [] };
  }

  const directoryPath = filePaths[0];
  const errors = [];

  for (const file of filesToSaveArray) {
    const fullPath = path.join(directoryPath, file.filename);
    try {
      await fs.writeFile(fullPath, file.content, 'utf-8');
    } catch (error) {
      console.error(`Failed to save separate file ${file.filename}:`, error);
      errors.push({ filename: file.filename, error: error.message });
    }
  }
  return { canceled: false, directoryPath: directoryPath, errors: errors };
});
