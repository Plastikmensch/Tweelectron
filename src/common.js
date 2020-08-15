const path = require('path')
const fs = require('fs')

let firstLog = true

//Fix for backup being created if common is required in other scripts
if (process.type !== 'browser') {
  firstLog = false
}

const settingsFile = getSettingsFile()

/**
 * Gets the path to the settings file
 * @return {string} Path to settings.json
 */
function getSettingsFile() {
  if (process.platform === 'linux') {
    return `${process.env.HOME}/.config/Tweelectron/settings.json`
  }

  //Get path to the executable, delete /Tweelectron.exe and append /settings.json and return
  return path.join(process.execPath.slice(0, process.execPath.lastIndexOf(path.sep)), 'settings.json')
}

/**
 * Reads settings.json and sets settings
 * @return {void} No return value
 */
function readSettings () {
  if (fs.existsSync(settingsFile)) {
    JSON.parse(fs.readFileSync(settingsFile, 'utf8'), (key, value) => {
      //NOTE: Doing Settings[key] = value is more efficient but breaks backwards compability
      switch (key) {
        case 'use-tor':
        case 'useTor':
          if (typeof value === 'boolean' ) {
            methods.settings.useTor = value
          }
          else foundError(key)
          break
        case 'use-round-pics':
        case 'useRoundPics':
          if (typeof value === 'boolean') {
            methods.settings.useRoundPics = value
          }
          else foundError(key)
          break
        case 'theme':
          if (typeof value === 'number' && value >= 0) {
            methods.settings.theme = value
          }
          else foundError(key)
          break
        case 'width':
          if (typeof value === 'number' && value >= 0) {
            methods.settings.width = value
          }
          else foundError(key)
          break
        case 'height':
          if (typeof value === 'number' && value >= 0) {
            methods.settings.height = value
          }
          else foundError(key)
          break
        case 'use-custom-proxy':
        case 'useCustomProxy':
          if (typeof value === 'boolean') {
            methods.settings.useCustomProxy = value
          }
          else foundError(key)
          break
        case 'customProxy':
          if (typeof value === 'string') {
            methods.settings.customProxy = value
          }
          else foundError(key)
          break
        case 'links-in-torbrowser':
        case 'openInTor':
          if (typeof value === 'boolean') {
            methods.settings.openInTor = value
          }
          else foundError(key)
          break
        case 'tor-browser-exe':
        case 'torBrowserExe':
          if (typeof value === 'string' && value !== 'null') {
            methods.settings.torBrowserExe = value
          }
          break
        case 'logLevel':
          if (typeof value === 'number' && value >= 0) {
            methods.settings.logLevel = value
          }
          else foundError(key)
          break
        default:
          methods.log(`unknown key found: ${key} with value: ${JSON.stringify(value)}`, 0)
      }
    })
  }
  else {
    methods.log('Settings file doesn\'t exist', 0)
  }
}

/**
 * Logs error and sets errorInSettings
 * @param {string} key - the object key of the setting
 * @return {void} No return value
 */
function foundError (key) {
  methods.log(`Error in Settings: value of ${key} is of invalid type`)
  methods.errorInSettings.found = true
  methods.errorInSettings.title = 'Error in Settings'
  methods.errorInSettings.message += `value of ${key} is invalid\n`
}

const methods = {
  /**
   * Save settings
   * @return {void} No return value
   */
  saveSettings: function () {
    fs.writeFileSync(settingsFile, JSON.stringify(this.settings, null, 4))
    this.log('Settings saved', 0)
    readSettings()
  },

  /**
   * Logs message in log file and console
   * @param {string} message - The message to log
   * @param {number} level - required level, default: 0
   * @return {void} No return value
   */
  log: function (message, level = 0) {
    if (level <= this.settings.logLevel) {
      if (firstLog) {
        firstLog = false
        if (fs.existsSync(this.logFile)) {
          fs.renameSync(this.logFile, `${this.logFile}.backup`)
          fs.appendFileSync(this.logFile, 'created backup of logs\n')
          console.log('created backup of logs')
        }
      }

      // Stringify message if it's an object, so logs don't say [object Object]
      if (!Array.isArray(message) && typeof message === 'object') {
        message = JSON.stringify(message)
      }

      //Append message to log file
      fs.appendFileSync(this.logFile, `${message}\n`)
      console.log(message)
    }
  },
  themeDir: process.platform === 'win32' ? path.join(process.env.APPDATA, 'Tweelectron', 'themes') : path.join(process.env.HOME, '.config', 'Tweelectron', 'themes'),
  appDir: process.execPath.slice(0, process.execPath.lastIndexOf(path.sep)),
  logFile: process.platform === 'win32' ? path.join(process.env.APPDATA, 'Tweelectron', 'tweelectron.log') : path.join(process.env.HOME, '.config', 'Tweelectron', 'tweelectron.log'),
  settings: {
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
  },
  errorInSettings: {
    found: false,
    title: '',
    message: ''
  }
}

readSettings()

module.exports = methods
