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
    /*TODO: rework this
            parse and then check values
            then set settings
    */
    let settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'), function (key, value) {
      // Update keys from old format
      /*
        create new property and remove old property
      */
      switch (key) {
        case 'use-tor':
          this.useTor = value
          return
        case 'use-round-pics':
          this.useRoundPics = value
          return
        case 'use-custom-proxy':
          this.useCustomProxy = value
          break
        case 'links-in-torbrowser':
          this.openInTor = value
          break
        case 'tor-browser-exe':
          this.torBrowserExe = value
          return
        case 'test-key':
          this.testKey = value
          return
        default:
          return value
      }
    })

    // check validity of settings
    checkValidity(settings)

    // Set settings if no error found
    if (!methods.errorInSettings.found) {
      for (let prop in settings) {
        if (Object.prototype.hasOwnProperty.call(settings, prop)) {
          methods.settings[prop] = settings[prop]
        }
        else {
          methods.log('unknown property in settings', 0)
        }
      }
    }

    methods.log(settings, 1)
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

/**
 * checks validity of settings.
 * Calls foundError if error found
 * @param {object} settings - object containing settings
 * @return {void} No return value
 */
function checkValidity(settings) {
  for (let prop in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, prop)) {
      switch (prop) {
        case 'theme':
        case 'width':
        case 'height':
        case 'logLevel':
          if (typeof settings[prop] !== 'number' || settings[prop] < 0) {
            foundError(prop)
          }
          break
        case 'useTor':
        case 'useRoundPics':
        case 'useCustomProxy':
        case 'openInTor':
          if (typeof settings[prop] !== 'boolean') {
            foundError(prop)
          }
          break
        case 'customProxy':
        case 'torBrowserExe':
          if (typeof settings[prop] !== 'string' && settings[prop] !== null) {
            foundError(prop)
          }
          break
        case 'language':
          //af,bg,ca,cs,cy,da,de,el,en-AU,en-CA,en-GB,en-US,es,es-419,es-AR,es-ES,es-MX,es-US,et,fa,fo,fr,he,hi,hr,hu,hy,id,it,ko,lt,lv,nb,nl,pl,pt-BR,pt-PT,ro,ru,sh,sk,sl,sq,sr,sv,ta,tg,tr,uk,vi
          if (!Array.isArray(settings[prop])) {
            foundError(prop)
          }
          else {
            settings[prop].forEach( (value) => {
              if (!Object.prototype.hasOwnProperty.call(methods.langCodes, value)) {
                foundError(prop)
              }
            })
          }
          break
        default:
          methods.log(`found ${prop} with value ${settings[prop]} of type ${typeof settings[prop]}`)
      }
    }
    else {
      methods.log('unknown property in validity check', 0)
    }
  }
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
    logLevel: 0,
    language: ['en-US']
  },
  errorInSettings: {
    found: false,
    title: '',
    message: ''
  },
  langCodes: {
    af: 'Afrikaans',
    bg: 'Bulgarian',
    ca: 'Catalan',
    cs: 'Czech',
    cy: 'Welsh',
    da: 'Danish',
    de: 'German',
    el: 'Greek',
    'en-AU': 'English (Australia)',
    'en-CA': 'English (Canada)',
    'en-GB': 'English (Britain)',
    'en-US': 'English (US)',
    es: 'Spanish',
    'es-419': 'Spanish (Latin America)',
    'es-AR': 'Spanish (Argentina)',
    'es-ES': 'Spanish (Spain)',
    'es-MX': 'Spanish (Mexico)',
    'es-US': 'Spanish (US)',
    et: 'Estonian',
    fa: 'Persian',
    fo: 'Faroese',
    fr: 'French',
    he: 'Hebrew',
    hi: 'Hindi',
    hr: 'Croatian',
    hu: 'Hungarian',
    hy: 'Armenian',
    id: 'Indonesian',
    it: 'Italian',
    ko: 'Korean',
    lt: 'Lithuanian',
    lv: 'Latvian',
    nb: 'Norwegian Bokmål',
    nl: 'Dutch',
    pl: 'Polish',
    'pt-BR': 'Portugese (Brazil)',
    'pt-PT': 'Portugese (Portugal)',
    ro: 'Romanian',
    ru: 'Russian',
    sh: 'Serbo-Croatian',
    sk: 'Slovak',
    sl: 'Slovenian',
    sq: 'Albanian',
    sr: 'Serbian',
    sv: 'Swedish',
    ta: 'Tamil',
    tg: 'Tajik',
    tr: 'Turkish',
    uk: 'Ukrainian',
    vi: 'Vietnamese'
  }
}

readSettings()

module.exports = methods
