const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveMergedDialog: (defaultFilename, content) => ipcRenderer.invoke('save-merged-dialog', defaultFilename, content),
  saveSeparateDialog: (filesToSaveArray) => ipcRenderer.invoke('save-separate-dialog', filesToSaveArray),
  convertUrlToMarkdown: (url, options) => ipcRenderer.invoke('convert-url-to-markdown', url, options)
});
