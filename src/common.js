const path = require('path')
const fs = require('fs')
let app
if (path.basename(require.main.filename) === 'main.js') {
  app = require('electron').app
}
else {
  app = require('electron').remote.app
}

const logFile = path.join(app.getPath('userData'), 'tweelectron.log')

const Settings = [
  [undefined, '"use-tor" :'], //useTor
  [false, '"use-round-pics" :'], //roundPics
  [0, '"theme" :'], //theme
  [1336, '"width" :'], //windowWidth
  [720, '"height" :'], //windowHeight
  [false, '"use-custom-proxy" :'], //useProxy
  ['foopy:80', '"customProxy" :'], //customProxy
  [false, '"links-in-torbrowser" :'], //openInTor
  ['null', '"tor-browser-exe" :'] //torExe
]

app.on('ready', () => {
  if (fs.existsSync(logFile)) {
    fs.renameSync(logFile, logFile + '.backup')
  }
})
var methods = {
  settingsFile: function () {
    if (process.platform === 'linux') {
      return process.env.HOME + '/.config/Tweelectron/settings.json'
    }
    else {
      //Get path to the executable, delete /Tweelectron.exe and append /settings.json and return
      return path.join(app.getPath('exe').slice(0, app.getPath('exe').lastIndexOf(path.sep)), 'settings.json')
    }
  },
  readSettings: function () {
    if (fs.existsSync(methods.settingsFile())) {
      const settingsData = fs.readFileSync(methods.settingsFile(), 'utf8')
      for (let i = 0; i < Settings.length; i++) {
        if (settingsData.search('=') === -1) {
          Settings[i][0] = settingsData.slice(settingsData.search(Settings[i][1]) + Settings[i][1].length, settingsData.indexOf('\n', settingsData.search(Settings[i][1]))).trim()
        }
        else {
          methods.log('Settings file has wrong format')
          const temp = settingsData.split('\n')
          if (i < temp.length - 1) {
            Settings[i][0] = temp[i].slice(temp[i].search('=') + 1)
          }
        }
        //remove ","
        if (Settings[i][0].search(',') !== -1) {
          Settings[i][0] = Settings[i][0].slice(0, -1)
        }
        //if setting is "true" or "false", convert to boolean
        if (Settings[i][0] === 'true' || Settings[i][0] === 'false') {
          Settings[i][0] = (Settings[i][0] === 'true')
        }
        //if setting is a number, convert to integer
        else if (!isNaN(Number(Settings[i][0]))) {
          Settings[i][0] = Number(Settings[i][0])
        }
        //else remove ""
        else if (Settings[i][0].search('"') !== -1) {
          Settings[i][0] = Settings[i][0].slice(1, Settings[i][0].lastIndexOf('"'))
        }
      }
    }
    return Settings
  },
  log: function (message) {
    fs.appendFileSync(logFile, message + '\n')
    console.log(message)
  },
  themeDir: path.join(app.getPath('userData'), 'themes'),
  appDir: app.getPath('exe').slice(0, app.getPath('exe').lastIndexOf(path.sep))
}
module.exports = methods
