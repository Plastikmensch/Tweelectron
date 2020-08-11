const { contextBridge } = require('electron')
const fs = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld(
  'version', {
    app: fs.readFileSync(path.join(__dirname, 'tweelectron-version'), 'utf8').trim(),
    tor: process.platform === 'linux' ? fs.readFileSync(path.join(__dirname, 'tor-version-linux'), 'utf8').trim() : fs.readFileSync(path.join(__dirname, 'tor-version-win'), 'utf8').trim(),
    electron: process.versions.electron
  }
)