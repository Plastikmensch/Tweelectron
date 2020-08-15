const { contextBridge, ipcRenderer } = require('electron')
const common = require('./common.js')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    ipc: {
      sendSync: (channel, data) => {
        // whitelist channels
        let validChannels = ['Settings', 'Themes']

        if (validChannels.includes(channel)) {
          return ipcRenderer.sendSync(channel, data)
        }
        common.log('prevented invalid ipc call', 0)
      }
    },
    common: {
      log: (message, logLevel = 0) => {
        common.log(message, logLevel)
      },
      settings: common.settings
    }
  }
)
