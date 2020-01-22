const path = require('path')
const fs = require('fs')
let app
if (process.type === 'browser') {//(path.basename(require.main.filename) === 'main.js') {
  app = require('electron').app
}
else {
  app = require('electron').remote.app
}

//const logFile = path.join(app.getPath('userData'), 'tweelectron.log')

const Settings = {
  useTor: null,
  useRoundPics: false,
  theme: 0,
  width: 1336,
  height: 720,
  useCustomProxy: false,
  customProxy: 'foopy:80',
  openInTor: false,
  torBrowserExe: null,
  logLevel: 0
}

const settingsFile = SettingsFile()
function SettingsFile () {
  if (process.platform === 'linux') {
    return process.env.HOME + '/.config/Tweelectron/settings.json'
  }
  else {
    //Get path to the executable, delete /Tweelectron.exe and append /settings.json and return
    return path.join(app.getPath('exe').slice(0, app.getPath('exe').lastIndexOf(path.sep)), 'settings.json')
  }
}
/*
app.on('ready', () => {
  if (app.hasSingleInstanceLock() && fs.existsSync(logFile)) {
    fs.renameSync(logFile, logFile + '.backup')
  }
})
*/
var methods = {
  readSettings: function () {
    if (fs.existsSync(settingsFile)) {
      JSON.parse(fs.readFileSync(settingsFile, 'utf8'), function (key, value) {
        //Doing Settings[key] = value is more efficient but breaks backwards compability
        switch (key) {
          case 'use-tor':
          case 'useTor':
            Settings.useTor = value
            break
          case 'use-round-pics':
          case 'useRoundPics':
            Settings.useRoundPics = value
            break
          case 'theme':
            Settings.theme = value
            break
          case 'width':
            Settings.width = value
            break
          case 'height':
            Settings.height = value
            break
          case 'use-custom-proxy':
          case 'useCustomProxy':
            Settings.useCustomProxy = value
            break
          case 'customProxy':
            Settings.customProxy = value
            break
          case 'links-in-torbrowser':
          case 'openInTor':
            Settings.openInTor = value
            break
          case 'tor-browser-exe':
          case 'torBrowserExe':
            if (value !== 'null') {
              Settings.torBrowserExe = value
            }
            break
          case 'logLevel':
            Settings.logLevel = value
            break
          default:
            methods.log(`unknown key found: ${key} with value: ${JSON.stringify(value)}`, 0)
        }
      })
    }
    return Settings
  },
  saveSettings: function (Settings) {
    fs.writeFileSync(settingsFile, JSON.stringify(Settings, null, 4))
    this.log('Settings saved', 0)
  },
  log: function (message, level) {
    if (level <= Settings.logLevel) {
      if (!Array.isArray(message) && typeof message === 'object') {
        message = JSON.stringify(message)
      }
      fs.appendFileSync(this.logFile, message + '\n')
      console.log(message)
    }
  },
  themeDir: path.join(app.getPath('userData'), 'themes'),
  appDir: app.getPath('exe').slice(0, app.getPath('exe').lastIndexOf(path.sep)),
  logFile: path.join(app.getPath('userData'), 'tweelectron.log')
}
module.exports = methods
