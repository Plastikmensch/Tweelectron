/*
    TO-DO: [x] = done, [\] = won't do

     Internal:
     [] find motivation to work on this list
     [x] push new release 1.0.10 (it's about time)
     [x] write install script for linux
        - find out why sudo doesn't work and script fails to execute (probably for security reasons)
        (forgot chmod +x... btw changed it to require being run as root instead of using sudo inside script)
     [] add more comments
     [x] change file structure to be more compliant
     [] update Readme (How to use scripts, requirements etc., settings)
     [] sort this list with version numbers, so it's clear why new releases take so long
     [] include pictures in Readme
     [] (Maybe) move to-do list to issues as task list
     Misc:
     [x] use an array or object to store settings variables
     [x] save settings when app quits
     [x] add custom proxy support
     [x] create function to process settingsData
     [x] add in-app settings
     [x] make settings beautiful
     [x] add 'already saved' to settings
     [x] add about page
     [x] adjust theme for TweetDecks awful color choice.
     [x] rework old theme
     [x] add theme selection
     [x] find a way to include Tor in linux
     [x] rework windows
     [x] change location of settingsFile (EACCESS ERROR)
     [x] make tor process close when Tweelectron closes
        - avoid closing tor when not started by Tweelectron
     [\] (optional) include torbrowser (Maybe just download it for reduced filesize?)
     [\] (Maybe) Get rid of old theme (Truly Dark)
     [] rework theme (turns out: TweetDecks theme doesn't suck anymore)
     [] (Maybe) implement configurable text shortcuts (like replace *shrug with ¯\_(ツ)_/¯)
     [x] Actually use json format for settings or just change it to .cfg
     [x] move theme code to files in theme folder
        - create files on first start
     [x] rewrite code (avoid repetition and optimize)
     [x] please linter (what a pain in the ass...)
     [x] create logfile
        - backup last logfile
     [] fix Truly Dark theme (aka wait for TweetDeck to remove !important from their stylesheet)
     [x] move all settingsFile related stuff to common.js
     [x] show titles in changelog
     1.1 Release:
     [x] find a way to bypass t.co links (Need help)
        - https://github.com/Spaxe/Goodbye--t.co- ?
        - read out "data-full-url" (But how?)
     [x] Update notifier
     [x] give option to open links in tor
        - (optional) let users, who already have torbrowser, pick a path
     [x] add support for custom themes

*/
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const { BrowserWindow, app, shell, Menu, MenuItem, clipboard, dialog, ipcMain, nativeImage } = require('electron')
const common = require('./common.js')

let Settings = common.readSettings()
let child

const tor = TorFile()
const icon = nativeImage.createFromPath(path.join(common.appDir, 'tweelectron.png'))
const singleInstance = app.requestSingleInstanceLock()

let themeAll, urlList
let mainWindow, settingsWin, twitterwin, aboutWin

function TorFile () {
  if (process.platform === 'linux') {
    return process.resourcesPath + '/tor-linux/tor'
  }
  else {
    return path.join(process.resourcesPath, 'tor-win32', 'Tor', 'tor.exe')
  }
}

function createWindow () {
  //Disable nodeIntegration before release!
  mainWindow = new BrowserWindow({ autoHideMenuBar: true, width: Settings[3][0], height: Settings[4][0], minWidth: 371, minHeight: 200/*, webPreferences:{nodeIntegration: true}*/ })
  createMenu()
  common.log(Settings)
  common.log(common.themeDir)
  common.log(common.appDir)
  const url2 = 'file://' + path.join(app.getAppPath(), 'fail.html')
  const home = 'https://tweetdeck.twitter.com/'
  let retries = 0
  if (Settings[0][0] && !Settings[5][0]) {
    mainWindow.webContents.session.setProxy({ proxyRules: 'socks5://127.0.0.1:9050' }, () => {
      mainWindow.loadURL(home)
      common.log('using Tor')
    })
  }
  else if (Settings[5][0]) {
    mainWindow.webContents.session.setProxy({ proxyRules: Settings[6][0] }, () => {
      mainWindow.loadURL(home)
      common.log('using custom Proxy')
    })
  }
  else {
    mainWindow.loadURL(home)
    common.log('Not using Tor or custom Proxy')
  }
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    common.log(`failed to load. Retrying...\nError: ${errorCode}  ${errorDescription}  ${validatedURL}`)
    if (validatedURL === home) {
      if (retries === 3) {
        mainWindow.loadURL(url2)
        common.log('loading fail page')
      }
      else {
        mainWindow.loadURL(home)
        retries++
        common.log('Retrying...')
      }
    }
  })
  //Gets called after did-fail-load, preventing timers from running
  mainWindow.webContents.on('did-finish-load', () => {
    if (!Settings[1][0] && mainWindow.webContents.getURL().search(home) === 0) {
      mainWindow.webContents.insertCSS('.avatar{border-radius:0 !important}')// makes profile pics angular shaped again Woohoo!
      common.log('inserted code for angular profile pics')
    }
    /*
    if(Settings[2][0]==2 && mainWindow.webContents.getURL().search("https://tweetdeck.twitter.com/") == 0)
    {
      //First: Dropdown menu (Settings, account actions)
      //Second: Keyboard shortcuts
      //Third: Settings
      //Fourth: Search
      //Fifth: Profile
      //Sixth: Profile -> Tweets, Mentions, Lists etc.
      //Seventh: Tweets (Pictures, Videos)

      //Twitter bg color #15202b
      //Not needed anymore
      //mainWindow.webContents.insertCSS("html.dark .bg-color-twitter-white{background-color: #243447!important}")

      //Basically not needed anymore and full of obsolete stuff

      /*html.dark .dropdown-menu{background-color: #243447 !important}\
      html.dark .non-selectable-item{color: #e1e8ed !important}\
      html.dark .dropdown-menu .typeahead-item, html.dark .dropdown-menu [data-action]{color: #e1e8ed !important}\
      html.dark .dropdown-menu .dropdown-menu-url-item{color: #e1e8ed !important}\
      \
      html.dark .mdl{background-color: #243447 !important}\
      html.dark .text-like-keyboard-key{color: #292f33 !important}\
      html.dark .keyboard-shortcut-list{color: #e1e8ed !important}\
      html.dark .mdl-header{color: #e1e8ed !important}\
      html.dark .mdl-dismiss{color: #e1e8ed !important}\
      .txt-r-deep-gray{color: #e1e8ed !important}\
      .bg-r-white{background-color: #243447 !important}\
      \
      html.dark .mdl-col-settings{background-color: #243447 !important}\
      html.dark .frm{color: #e1e8ed !important}\
      html.dark .bg-color-twitter-lightest-gray{background-color: #243447 !important}\
      html.dark .is-inverted-dark .list-link{color: #e1e8ed !important}\
      html.dark .list-filter{color: #e1e8ed !important}\
      html.dark .list-link:hover:hover{color: #e1e8ed !important; background-color: #1B2836 !important}\
      \
      html.dark .is-inverted-dark .accordion .is-active{color: #e1e8ed !important}\
      .txt-twitter-dark-black{color: #e1e8ed !important}\
      html.dark .is-inverted-dark{color: #e1e8ed !important}\
      html.dark .popover{background-color: #243447 !important}\
      .caret-inner{border-bottom: 6px solid #243447 !important}\
      html.dark .list-item{color: #e1e8ed !important}\
      html.dark .bg-color-twitter-white{background-color: #243447 !important}\
      html.dark .color-twitter-dark-gray{color:#fff !important}\
      html.dark .hover-bg-color-twitter-faint-blue:hover, html.dark .hover-bg-color-twitter-faint-blue:focus{background-color: #1B2836 !important}\
      html.dark .Button{background-color: #1B2836 !important}\
      html.dark .Button:hover{background-color: #1B2836 !important}\
      \
      html.dark .prf-meta{background-color: #1B2836 !important}\
      html.dark .prf-stats a strong{color: #e1e8ed !important}\
      html.dark .social-proof-container{background-color: #1B2836 !important}\
      html.dark .is-inverted-dark .btn:hover, html.dark .is-inverted-dark .btn:focus{background-color: #243447 !important}\
      html.dark .Button{background-color: #1B2836 !important}\
      html.dark .btn-round{background-color: #1B2836 !important}\
      html.dark .Button:hover{background-color: #243447 !important}\
      html.dark .is-condensed .tweet-button{background-color: #1da1f2 !important}\
      html.dark .s-thats-you .thats-you-text{background-color: #1B2836 !important}\
      html.dark .s-thats-you .thats-you-text:hover{background-color: #243447 !important}\
      html.dark .s-not-following .follow-text{background-color: #1b2836 !important}\
      \
      html.dark .mdl-column-med{background: #243447 !important}\
      html.dark .mdl-column-rhs{background: #243447 !important}\
      html.dark .is-inverted-dark .stream-item{background-color: #1B2836 !important}\
      html.dark .is-inverted-dark .account-link{color: #e1e8ed !important}\
      html.dark .list-account .fullname{color: #e1e8ed !important}\
      html.dark .column-background-fill{background-color: #243447 !important}\
      html.dark .is-inverted-dark .scroll-conversation{background: #1B2836 !important}\
      .list-btn{background-color: #243447 !important;border-color: #000 !important}\
      .list-btn:hover{background-color: #1B2836 !important}\
      .list-explaination{background-color: #243447 !important}\
      .page-bottom{background-color: #243447 !important;color: #7a8994 !important}\
      html.dark .modal-content-with-border{border: 1px solid #000 !important}\
      .list-btn:first-of-type{border: 2px solid #000 !important}\
      \
      html.dark .med-fullpanel{background-color: #14171A !important}\
      html.dark .is-unread{background-color: #2d4a6d !important}\
      html.dark .color-twitter-dark-black{color: #fff !important}\
      ")
      console.log("inserted code for blue theme")
    }
    */
    if (Settings[2][0] > 0 && mainWindow.webContents.getURL().search('https://tweetdeck.twitter.com/') === 0) {
      const themeFile = path.join(common.themeDir, themeAll[Settings[2][0] - 1])
      if (fs.existsSync(themeFile)) {
        const fileContent = fs.readFileSync(themeFile, 'utf8').trim()
        common.log(themeFile)
        //common.log(fileContent)
        mainWindow.webContents.insertCSS(fileContent)
        common.log('inserted custom theme')
      }
      else common.log('failed to insert custom theme. File doesn\'t exist')
    }
  })
  mainWindow.webContents.on('update-target-url', (event, url) => {
    mainWindow.webContents.executeJavaScript('function getURL() {var x = document.querySelectorAll(\'.url-ext\');var urls = []; for(var i=0;i<x.length;i++) {urls.push([x[i].getAttributeNode(\'href\').value,x[i].getAttributeNode(\'data-full-url\').value])} return urls}; getURL()').then((result) => { //`var x = document.querySelectorAll('.url-ext'); for(var i=0;i<x.length;i++) {x[i].getAttributeNode('data-full-url').value}`
      //console.log("result: " + result)
      urlList = result
    })
  })
  /*Not needed anymore since what I wanted to do doesn't work.
  //Display all changes of cookies in console
  session.defaultSession.cookies.on('changed', (event,cookie,cause,removed) =>{
    console.log(event,cookie,cause,removed)
  })*/
  mainWindow.webContents.on('new-window', (event, url) => {
    if (url.search('https://tweetdeck.twitter.com/') !== 0 || url.search('https://twitter.com/') !== 0) {
      event.preventDefault()
      for (let i = 0; i < urlList.length; i++) {
        if (url === urlList[i][0]) url = urlList[i][1]
      }
      if (!Settings[7][0]) {
        shell.openExternal(url)//opens link in default browser
        common.log('opened link external')
      }
      else {
        //Settings[8][0] browser exec
        //Settings[8][0] + url
        if (Settings[8][0] !== 'null') {
          //allow remote and new tab might break opening links with other browsers
          const linkChild = childProcess.spawn(Settings[8][0], ['--allow-remote', '--new-tab', url])
          linkChild.on('error', (err) => {
            common.log(err)
          })
          common.log('opened link in torbrowser')
        }
        else {
          dialog.showMessageBox({ type: 'error', buttons: ['OK'], title: 'Error occured', message: 'No file specified to open link' })
          common.log('failed to open in tor')
        }
      }
    }
  })
  //Login button doesn't call this anymore
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.search('https://twitter.com/login') === 0) {
      event.preventDefault()
      twitterwin = new BrowserWindow({ parent: mainWindow })
      twitterwin.removeMenu()
      if (Settings[0][0] && !Settings[5][0]) {
        twitterwin.webContents.session.setProxy({ proxyRules: 'socks5://127.0.0.1:9050' }, () => {
          twitterwin.loadURL(url)
          common.log('using Tor')
        })
      }
      else if (Settings[5][0]) {
        twitterwin.webContents.session.setProxy({ proxyRules: Settings[6][0] }, () => {
          twitterwin.loadURL(url)
          common.log('using custom Proxy')
        })
      }
      else {
        twitterwin.loadURL(url)
        common.log('Not using Tor or custom Proxy')
      }
      twitterwin.webContents.on('did-fail-load', () => {
        twitterwin.loadURL(url2)
        common.log('failed to load')
      })
      event.newGuest = twitterwin
      twitterwin.webContents.on('will-navigate', (event, url) => {
        mainWindow.loadURL(url)
        twitterwin.close()
      })
    }
  })
  mainWindow.on('close', (event) => {
    const size = mainWindow.getSize()
    Settings[3][0] = size[0]//width
    Settings[4][0] = size[1]//height
    common.saveSettings(Settings)
  })
  mainWindow.on('closed', () => {
    app.quit()
  })
  ipcMain.on('Settings', (event, newSettings) => {
    common.log(newSettings)
    if (newSettings.toString() === Settings.toString()) {
      event.returnValue = false
    }
    else {
      let reload = false
      //check if theme is changed
      if (Settings[2][0] !== newSettings[2][0]) {
        reload = true
      }
      Settings = newSettings
      //reload TweetDeck if theme is changed
      if (reload) {
        mainWindow.reload()
      }
      common.saveSettings(Settings)
      event.returnValue = true
    }
    common.log(Settings)
  })
  CheckForUpdates()
  //Set icon on Linux
  if (process.platform === 'linux') {
    mainWindow.setIcon(icon)
  }
}
function startTor () {
  common.log(`Directory: ${__dirname}\nPath: ${app.getPath('exe')}`)
  common.log('starting Tor')
  child = childProcess.execFile(tor, (err) => {
    if (err) {
      common.log('couldn\'t start tor. (already running?)')
      common.log(err)
    }
  })
  common.log(`pid: ${child.pid}`)

  child.on('exit', (code, signal) => {
    common.log(`Tor stopped:\ncode: ${code} signal: ${signal}`)
    child = undefined
  })
}

function CheckForUpdates () {
  require('https').get('https://api.github.com/repos/Plastikmensch/Tweelectron/releases/latest', { headers: { 'User-Agent': 'Tweelectron' } }, (response) => {
    if (response.statusCode !== 200) common.log(`Request failed. Response code: ${response.statusCode}`)
    //console.log(JSON.stringify(response.headers))
    response.setEncoding('utf8')//makes d readable
    let data = ''
    //Warning: gets called multiple times
    response.on('data', (d) => {
      //console.log(d)
      data += d
    })
    response.on('end', () => {
      //console.log(data)
      //console.log("end of response")
      if (data.search('tag_name') !== -1) {
        //get tag_name by slicing data from "v" after "tag_name" to "," after "tag_name", Well also removes ""
        const latest = data.slice(data.indexOf(':', data.search('tag_name')) + 3, data.indexOf(',', data.search('tag_name')) - 1)
        //console.log("latest: " + latest)
        const body = data.slice(data.indexOf(':', data.search('body')) + 2, -2)
        const splitBody = body.split('\\r\\n')
        let slicedBody = ''
        for (let i = 1; i < splitBody.length; i++) {
          if (splitBody[i].search('_') !== -1) {
            splitBody[i] = splitBody[i].slice(splitBody[i].indexOf('_') + 2, splitBody[i].lastIndexOf('_') - 1) + ':'
          }
          slicedBody += splitBody[i] + '\n'//.slice(0, splitBody[i].indexOf('\\r\\n')) + '\n'
        }
        //Note: use trim() when reading from files or \n is also part of string. The fuck JS?
        const current = fs.readFileSync(path.join(__dirname, 'tweelectron-version'), 'utf8').trim()
        //console.log("current: " + current)
        if (current !== latest) {
          dialog.showMessageBox(mainWindow, { type: 'info', buttons: ['OK'], title: 'Update available', message: `There is an Update available!\n\nCurrent version: v${current}\nlatest version: v${latest}\n\nChanges:\n${slicedBody}` })
          common.log('Update available')
        }
        else common.log('No update available')
      }
    })
  }).on('error', (err) => {
    common.log(`Error:\n${err.message}`)
  })
}
app.on('remote-require', (event, webContents, moduleName) => {
  common.log(`${moduleName} required`)
  event.preventDefault()
})

app.on('remote-get-builtin', (event, webContents, moduleName) => {
  common.log(`get builtin ${moduleName}`)
  if (moduleName !== 'app') {
    event.preventDefault()
    common.log(`preventing ${moduleName} from loading`)
  }
})

app.on('remote-get-global', (event, webContents, globalName) => {
  common.log(`get global ${globalName}`)
  event.preventDefault()
})

app.on('remote-get-current-window', (event, webContents) => {
  common.log('get current window')
  event.preventDefault()
})

app.on('remote-get-current-web-contents', (event, webContents) => {
  common.log('get current webcontents')
  event.preventDefault()
})

app.on('remote-get-guest-web-contents', (event, webContents, guestWebContents) => {
  common.log('get guest web contents')
  event.preventDefault()
})

if (!singleInstance) {
  //Close second instance
  app.quit()
  common.log('quitting second instance')
}
else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    //Focus mainWindow when started a second time
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      common.log('tried to start second instance, focusing main window')
    }
  })
  app.on('ready', () => {
    app.commandLine.appendSwitch('disable-gpu-compositing')//fixes blank screen bug... fucking hell...
    Menu.setApplicationMenu(null)//needed, because Electron has a default menu now.

    if (Settings[0][0] === undefined) {
      common.log('tor variable unset')
      const dialogTor = dialog.showMessageBoxSync({ type: 'question', buttons: ['No', 'Yes'], message: 'Do you want to use Tor?' })

      if (dialogTor) {
        Settings[0][0] = true
        common.log('clicked YES')
      }
      else {
        Settings[0][0] = false
        common.log('clicked NO')
      }
      common.saveSettings(Settings)
    }
    if (Settings[0][0] && !Settings[1][0]) {
      startTor()
    }
    createWindow()

    const themeTrulyDark =
    //Overall appearance (Tweets, sidebar etc.)
    'html.dark .stream-item{background-color: #222426 !important}\n' +
    'html.dark .column-nav-item{background-color: #292f33 !important}\n' +
    'html.dark .app-header{background-color: #292f33 !important}\n' +
    'html.dark .app-navigator{background-color: #292f33 !important}\n' +
    'html.dark .app-title{background-color: #292f33 !important}\n' +
    'html.dark .column-header, html.dark .column-header-temp{background-color: #292f33 !important}\n' +
    'html.dark .column-message{background-color: #292f33 !important}\n' +
    'html.dark .app-content{background-color: #222426 !important}\n' +
    'html.dark .column{background-color: #222426 !important}\n' +
    'html.dark .app-columns-container{background-color: #14171a !important}\n' +
    'html.dark .is-inverted-dark .accordion .is-active{color: #fff !important}\n' +
    'html.dark .is-inverted-dark{color: #fff !important}\n' +
    'html.dark .scroll-conversation{background: #222426 !important}\n' +
    'html.dark .detail-view-inline{background-color: #222426 !important}\n' +
    'html.dark .detail-view-inline-text{background-color: #292f33 !important}\n' +
    'html.dark .app-search-input{background-color: #222426 !important}\n' +
    'html.dark .column-scroller{background-color: #222426 !important}\n' +
    'html.dark .compose{background-color: #495966 !important}\n' +
    'html.dark .old-composer-footer{background-color: #495966 !important}\n' +
    'html.dark .attach-compose-buttons .Button.tweet-button, html.dark .attach-compose-buttons button.tweet-button, html.dark .attach-compose-buttons input.tweet-button[type=button]{background-color: #495966 !important}\n' +
    'html.dark .column-panel{background-color: #495966 !important}\n' +
    'html.dark .accounts-drawer{background-color: #495966 !important}\n' + //TweetDeck, please stop using !important in your stylesheet
    'html.dark .popover{background-color: #222426 !important}\n' +
    'html.dark input, html.dark select, html.dark textarea{background-color: #111 !important}\n' +
    'html.dark .account-settings-row{background-color: #292f33 !important}\n' +
    'html.dark .join-team{background-color: #292f33 !important}\n' +
    'html.dark .app-nav-tab.is-selected{background-color: #111 !important}\n' +
    'html.dark input.light-on-dark{color: #fff !important}\n' +
    'html.dark #caltoday{color: #444 !important}\n' +
    //Column options
    'html.dark .column-options{background-color: #2a2c2d !important}\n' +
    'html.dark .column-options .button-tray{background-color: #2a2c2d !important}\n' +
    'html.dark .is-options-open .column-settings-link{background-color: #2a2c2d !important}\n' +
    'html.dark .facet-type.is-active{background-color: #2a2c2d !important}\n' +
    //Dropdown
    '.caret-inner{border-bottom: 6px solid #222426 !important}\n' +
    '.dropdown-menu,.dropdown-menu [data-action]{background-color: #222426 !important;color: #fff !important}\n' +
    'html.dark .non-selectable-item{color: #fff !important}\n' +
    //Search Tips
    'html.dark .bg-color-twitter-white{background-color: #222426 !important}\n' +
    'html.dark .color-twitter-dark-gray{color: #fff !important}\n' +
    'html.dark .hover-bg-color-twitter-faint-blue:hover, html.dark .hover-bg-color-twitter-faint-blue:focus{background-color: #111 !important}\n' +
    'html.dark .Button{background-color: #111 !important}\n' +
    'html.dark .Button:hover{background-color: #111 !important}\n' +
    'html.dark .mdl-dismiss{color: #fff !important}\n' +
    //Keyboard shortcuts
    'html.dark .color-twitter-dark-black{color: #fff !important}\n' +
    '.text-like-keyboard-key{color: #000 !important}\n' +
    //Settings
    '.list-link:hover{background-color: #0e0e0e !important}\n' +
    'html.dark .mdl{background-color: #222426 !important}\n' +
    'html.dark .mdl-col-settings{background-color: #222426 !important}\n' +
    'html.dark .bg-color-twitter-lightest-gray{background-color: #222426 !important}\n' +
    'html.dark .frm{color: #fff !important}\n' +
    'html.dark .is-inverted-dark .list-link{color: #fff !important}\n' +
    'html.dark .list-link:hover:hover{color: #fff !important}\n' +
    'html.dark .list-filter{color: #fff !important}\n' +
    'html.dark .mdl-header{color: #fff !important}\n' +
    'html.dark .is-inverted-dark .link-normal-dark{color: #fff !important}\n' +
    //Profile
    'html.dark .social-proof-container{background-color: #292f33 !important}\n' +
    '.prf-stats a strong{color: #8899a6 !important}\n' +
    'html.dark .prf-meta{background-color: #222426 !important}\n' +
    'html.dark .is-inverted-dark .btn:hover{background-color: #292f33 !important}\n' +
    'html.dark .mdl-column-med{background: #222426 !important}\n' +
    'html.dark .list-account .fullname{color: #fff !important}\n' +
    'html.dark .list-account:hover:hover{background: #111 !important}\n' +
    'html.dark .is-inverted-dark .account-link{color: #fff !important}\n' +
    'html.dark .column-header-temp{background-color: #222426 !important}\n' +
    'html.dark .column-background-fill{background-color: #222426 !important}\n' +
    'html.dark .is-inverted-dark .scroll-conversation{background: #222426 !important}\n' +
    'html.dark .Button{background-color: #222426 !important}\n' +
    'html.dark .btn-round{background-color: #222426 !important}\n' +
    'html.dark .Button:hover{background-color: #292f33 !important}\n' +
    'html.dark .is-condensed .tweet-button{background-color: #1da1f2 !important}\n' +
    'html.dark .s-thats-you .thats-you-text:hover{background-color: #292f33 !important}\n' +
    'html.dark .s-thats-you .thats-you-text{background-color: #222426 !important}\n' +
    'html.dark .s-not-following .follow-text{background-color: #222426 !important}\n'
    const fileTrulyDark = path.join(common.themeDir, 'Truly Dark.css')
    if (!fs.existsSync(common.themeDir)) {
      fs.mkdirSync(common.themeDir)
      fs.writeFileSync(fileTrulyDark, themeTrulyDark)
      common.log('created Truly Dark.css')
    }
    if (fs.existsSync(common.themeDir)) {
      themeAll = fs.readdirSync(common.themeDir)
      if (fs.existsSync(fileTrulyDark)) {
        const themeTemp = fs.readFileSync(fileTrulyDark, 'utf8').trim()
        if (themeTemp !== themeTrulyDark.trim()) {
          fs.writeFileSync(fileTrulyDark, themeTrulyDark)
          common.log('updated Truly Dark')
        }
      }
      common.log(themeAll)
      common.log(`found ${themeAll.length} themes`)
    }
  })
  app.on('browser-window-created', (event, win) => {
    win.webContents.on('context-menu', (e, params) => {
      const cmenu = new Menu()
      if (params.linkURL && params.mediaType === 'none') {
        cmenu.append(new MenuItem({
          label: 'Copy URL',
          click () {
            let url = params.linkURL //Note to self: Don't use linkText. Doesn't work. Whoops.
            for (let i = 0; i < urlList.length; i++) {
              if (url === urlList[i][0]) url = urlList[i][1]
            }
            clipboard.writeText(url)
          }
        }))
        if (params.linkText.charAt(0) === '#') {
          cmenu.append(new MenuItem({
            label: 'Copy Hashtag',
            click () {
              clipboard.writeText(params.linkText)
            }
          }))
        }
        if (params.linkText.charAt(0) === '@') {
          cmenu.append(new MenuItem({
            label: 'Copy Username',
            click () {
              clipboard.writeText(params.linkText)
            }
          }))
        }
      }
      else if (params.mediaType === 'image') {
        cmenu.append(new MenuItem({
          label: 'Copy Image',
          click () {
            win.webContents.copyImageAt(params.x, params.y)
          }
        }))
        cmenu.append(new MenuItem({
          label: 'Save Image',
          click () {
            win.webContents.downloadURL(params.srcURL)
          }
        }))
      }
      else if (params.mediaType === 'video') {
        cmenu.append(new MenuItem({
          label: 'Save Video',
          click () {
            win.webContents.downloadURL(params.srcURL)
          }
        }))
      }
      else if (params.mediaType === 'none') {
        cmenu.append(new MenuItem({ role: 'copy' }))
        cmenu.append(new MenuItem({ label: 'Paste', role: 'pasteandmatchstyle' }))
        cmenu.append(new MenuItem({ role: 'cut' }))
        cmenu.append(new MenuItem({ role: 'selectall' }))
      }
      else {
        cmenu.append(new MenuItem({ label: '...' }))
      }
      cmenu.popup(win, params.x, params.y)
    })
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
  app.on('quit', () => {
    //terminate tor when app is closed
    if (child !== undefined) {
      child.kill()
      common.log('stopped tor')
    }
    else common.log('tor wasn\'t running')
  })
}
function createMenu () {
  const template = [
    {
      label: 'App',
      submenu: [
        {
          role: 'quit'
        },
        {
          label: 'Settings',
          click () {
            if (settingsWin !== undefined) {
              settingsWin.focus()
              common.log('focusing settings window')
            }
            else {
              settingsWin = new BrowserWindow({ width: 450, height: 310, parent: mainWindow, webPreferences: { nodeIntegration: true } })
              common.log('created settings window')
              settingsWin.removeMenu()
              settingsWin.loadURL('file://' + path.join(app.getAppPath(), 'settings.html'))
              if (process.platform === 'linux') {
                settingsWin.setIcon(icon)
              }
              //settingsWin.webContents.toggleDevTools()
            }
            settingsWin.on('closed', () => {
              settingsWin = undefined
              common.log('closed settings window')
            })
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'pasteandmatchstyle'
        },
        {
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'TweetDeck',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL('https://tweetdeck.twitter.com/')
          }
        },
        {
          label: 'Twitter',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL('https://twitter.com/')
          }
        },
        {
          label: 'Check Tor',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL('https://check.torproject.org/')
          }
        },
        {
          label: 'Reload',
          accelerator: 'F5',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: 'DevTools',
          accelerator: 'F12',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'About',
      click () {
        if (aboutWin !== undefined) {
          aboutWin.focus()
          common.log('focusing about window')
        }
        else {
          aboutWin = new BrowserWindow({ width: 500, height: 300, parent: mainWindow, webPreferences: { nodeIntegration: true } })
          common.log('created about window')
          aboutWin.removeMenu()
          aboutWin.loadURL('file://' + path.join(app.getAppPath(), 'about.html'))
          if (process.platform === 'linux') {
            aboutWin.setIcon(icon)
          }
        }
        aboutWin.on('closed', () => {
          aboutWin = undefined
          common.log('closed about window')
        })
        aboutWin.webContents.on('will-navigate', (event, url) => {
          event.preventDefault()
          shell.openExternal(url)
        })
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  //win.removeMenu() doesn't work if Menu.setApplicationMenu(menu) is used. Also: easier.
  mainWindow.setMenu(menu)
}
