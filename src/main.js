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
     [x] sort this list with version numbers, so it's clear why new releases take so long
     [] include pictures in Readme
     [] (Maybe) move to-do list to issues as task list
     [] Open issues for bugs/unintended behaviour instead of maintaining this list
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
     [\] rework theme (turns out: TweetDecks theme doesn't suck anymore)
     [\] (Maybe) implement configurable text shortcuts (like replace *shrug with ¯\_(ツ)_/¯)
        - too unreliable
        - implemented entry to context menu for inserting emoticons instead
     [x] Actually use json format for settings or just change it to .cfg
     [x] move theme code to files in theme folder
        - create files on first start
     [x] rewrite code (avoid repetition and optimize)
     [x] please linter (what a pain in the ass...)
     [x] create logfile
        - backup last logfile
     [x] fix Truly Dark theme (aka wait for TweetDeck to remove !important from their stylesheet)
        - seems to be working now
     [x] move all settingsFile related stuff to common.js
     [x] show titles in changelog
     [] (Maybe) use app directory to store all files to be more portable and easier deletion
        - keep EACCESS in mind (linux)
     [x] create loglevel setting, so it's not necessary to comment logs
     [x] create function for opening stuff (no code repetition)
     [] (Maybe) create new themes
     [] provide better accessibility
        - need a screenreader or audit tool
     1.1 Release:
     [x] find a way to bypass t.co links (Need help)
        - https://github.com/Spaxe/Goodbye--t.co- ?
        - read out "data-full-url" (But how?)
     [x] Update notifier
     [x] give option to open links in tor
        - (optional) let users, who already have torbrowser, pick a path
     [x] add support for custom themes
     1.1.1 Release:
     [x] bypass t.co when clicking on pictures
        - (optional) open them in new window
     [x] fix font issues
     [x] rewrite for Electron 7 (uuuuuuuugh)
     1.2 Release:
     [] bypass t.co on links in profiles (not really possible...)
        - links in profile description work, but link in profile doesn't
     [x] rewrite so settings are not duplicated through scripts
        - let common.js handle settings completely
        - turn into object
     [x] fix logs so backup is created before new stuff logs
        - everything logged before the ready event ends up in backup
        - backup is now created on exit
        - adding a check for first log in common.log might be a better solution
        - added check
     [] optimise code
        - rework settings and about page
     [] Threadmaker
        - thinking about abandoning this idea
     [x] fix opening of multiple images in tweets
        - need a way to tell which image is clicked on
        - function handling t.co returns only first match
        - replacing link with image source might work
     [x] fix potential issues caused by corrupt settings file
        - check settings value type
        - issue caused by going back from 1.2.x to 1.1.x
        - if settings can't be read, treat them as nonexistent
        - if value is of wrong type, default value is used now
     [x] inform users of errors in settings
        - dialogs won't work before ready event
        - showErrorBox is useless on Linux
          - won't show up
          - doesn't stop execution
     [] define content security policy for child windows
        - <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline'">
          might be a good start, needs testing
     [x] change theme code
        - having truly dark as a const is a waste of memory
        - adding user supplied themes can be easier
*/
/*
NOTE: This is just a proof of concept and will not be included,
      since altering tweet content is out of scope
      You can implement or run this code yourself, if you really want to
Blocking Emojis (replacing them with text)
var t= document.getElementsByClassName('emoji')
for (var e of t) {if (e.alt === '🚬') {var span = document.createElement('span'); span.innerText='(smoking emoji)';e.replaceWith(span)}}
*/

const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const { BrowserWindow, app, shell, Menu, MenuItem, clipboard, dialog, ipcMain, nativeImage } = require('electron')
const common = require('./common.js')

const torFile = getTorFile()
const icon = nativeImage.createFromPath(path.join(common.appDir, 'tweelectron.png'))
const singleInstance = app.requestSingleInstanceLock()

const nav = {
  home: 'https://tweetdeck.twitter.com/',
  fail: 'file://' + path.join(app.getAppPath(), 'fail.html'),
  checkTor: 'https://check.torproject.org/',
  twitter: 'https://twitter.com/'
}

let themeAll, urlList
let mainWindow, settingsWin, loginWin, aboutWin, twitterWin
let torProcess

//process.resourcesPath not really working as intended when starting app with "electron ." (in dev)
function getTorFile () {
  if (process.platform === 'linux') {
    return path.join(process.resourcesPath, 'tor-linux','tor')
  }
  else {
    return path.join(process.resourcesPath, 'tor-win32', 'Tor', 'tor.exe')
  }
}

function createWindow () {
  mainWindow = new BrowserWindow({ autoHideMenuBar: true, width: common.settings.width, height: common.settings.height, minWidth: 371, minHeight: 200, webPreferences:{ contextIsolation: true, enableRemoteModule: false } })
  createMenu()

  common.log(common.settings, 1)
  common.log(common.themeDir, 1)
  common.log(common.appDir, 1)

  //const url2 = 'file://' + path.join(app.getAppPath(), 'fail.html')
  //const home = 'https://tweetdeck.twitter.com/'
  let retries = 0

  checkProxy(mainWindow, nav.home)

  //Deny all permissions by default
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    common.log(`${webContents.getURL()} requested ${permission}`, 0)
    return callback(false)
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    common.log(`failed to load. Retrying...\nError: ${errorCode}  ${errorDescription}  ${validatedURL}`, 0)
    if (validatedURL === nav.home) {
      if (retries === 3) {
        mainWindow.loadURL(nav.fail)
        common.log('loading fail page', 0)
      }
      else {
        mainWindow.loadURL(nav.home)
        retries++
        common.log('Retrying...', 0)
      }
    }
  })
  //Gets called after did-fail-load, preventing timers from running
  mainWindow.webContents.on('did-finish-load', () => {
    if (!common.settings.useRoundPics && mainWindow.webContents.getURL().search(nav.home) === 0) {
      mainWindow.webContents.insertCSS('.avatar{border-radius:0 !important}')// makes profile pics angular shaped again Woohoo!
      common.log('inserted code for angular profile pics', 0)
    }

    //If theme is selected and url matches tweetdeck, read theme file and insert css
    if (common.settings.theme > 0 && mainWindow.webContents.getURL().search(nav.home) === 0) {
      const themeFile = path.join(common.themeDir, themeAll[common.settings.theme - 1])
      if (fs.existsSync(themeFile)) {
        const fileContent = fs.readFileSync(themeFile, 'utf8').trim()
        common.log(themeFile, 1)
        //common.log(fileContent)
        mainWindow.webContents.insertCSS(fileContent)
        common.log('inserted custom theme', 0)
      }
      else common.log('failed to insert custom theme. File doesn\'t exist', 0)
    }
  })
  //Read out every t.co url and real url from tweets and media and save result when mouse hovers over a link
  mainWindow.webContents.on('update-target-url', (event, url) => {
    /*
      Tweets: t.co refers to the link, so you can read out the data-full-url attribute,
      which is used to show link destination

      Pictures: t.co refers to the tweet, not the image,
      which makes getting the correct image difficult
    */
    //NOTE: urlList contains duplicates
    //NOTE: Moving this to new-window event leads to urlList being undefined
    mainWindow.webContents.executeJavaScript('function getURL() {var x = document.querySelectorAll(\'.url-ext\');var y = document.querySelectorAll(\'.js-media-image-link\');var urls = []; for(var i=0, j=x.length;i<j;i++) {urls.push([x[i].getAttributeNode(\'href\').value,x[i].getAttributeNode(\'data-full-url\').value])} for (var i=0, j=y.length;i<j;i++) {if (y[i].hasAttribute(\'style\')) urls.push([y[i].getAttributeNode(\'href\').value, y[i].getAttributeNode(\'style\').value.slice(21,-1)])} return urls}; getURL()').then((result) => { //`var x = document.querySelectorAll('.url-ext'); for(var i=0;i<x.length;i++) {x[i].getAttributeNode('data-full-url').value}`
      urlList = result
    })

    //Replace t.co link on images with image src
    /*
      Replaces href attribute of parentElement of the image with the image src attribute
      media-img is the class attribute of the image shown in preview and unique
    */
    mainWindow.webContents.executeJavaScript('var m = document.getElementsByClassName("media-img")[0]; if (m !== undefined) {m.parentElement.href = m.src}')
  })

  mainWindow.webContents.on('new-window', (event, url) => {
    //prevent default behavior
    event.preventDefault()
    //If url doesn't start with tweetdeck or twitter, prevent it from opening and handle accordingly
    if (url.search(nav.home) !== 0 && url.search(nav.twitter) !== 0) {
      //common.log(urlList, 1)
      common.log(`clicked on ${url}`, 1)


      //NOTE: Opening multiple links isn't desirable, because of "process already running" issue in firefox based browsers
      //Might work if multiple links can be parsed to OpenUrl

      //Replace t.co url with real url
      for (let i = 0, j = urlList.length; i < j; i++) {
        if (url === urlList[i][0]) {
          //remove ?format=X&name=XxX from image links
          if(urlList[i][1].search('https://pbs.twimg.com/media') === 0) {
            url = urlList[i][1].slice(0, urlList[i][1].lastIndexOf('?'))
            //common.log(`${urlList[i][1]} is twitter media`)
          }
          else url = urlList[i][1]
          common.log(`found matching ${urlList[i][0]} to ${urlList[i][1]} url: ${url} index: ${i}`, 1)
        }
      }
      //NOTE: Applying removal of ?format... breaks replaced image links
      openUrl(url)
    }
    else {
      //open new window
      if (twitterWin === undefined) {
        twitterWin = new BrowserWindow({ parent: mainWindow, webPreferences: { enableRemoteModule: false, contextIsolation: true}})
        common.log('created twitterWin', 0)
        twitterWin.removeMenu()

        checkProxy(twitterWin, url)

        twitterWin.webContents.on('did-fail-load', () => {
          twitterWin.loadURL(nav.fail)
          common.log('failed to load', 0)
        })
        //prevent window from opening other windows
        twitterWin.webContents.on('new-window', (event) => {
          event.preventDefault()
        })
        twitterWin.webContents.on('will-navigate', (event) => {
          event.preventDefault()
        })
        twitterWin.on('closed', () => {
          twitterWin = undefined
          common.log('closed twitterWin', 0)
        })
      }
      else {
        twitterWin.loadURL(url)
      }
    }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    //Login button doesn't call this anymore
    if (url.search('https://twitter.com/login') === 0) {
      loginWin = new BrowserWindow({ parent: mainWindow, webPreferences: { enableRemoteModule: false, contextIsolation: true } })
      loginWin.removeMenu()

      checkProxy(loginWin, url)

      loginWin.webContents.on('did-fail-load', () => {
        loginWin.loadURL(nav.fail)
        common.log('failed to load', 0)
      })
      event.newGuest = loginWin
      loginWin.webContents.on('will-navigate', (event, url) => {
        mainWindow.loadURL(url)
        loginWin.close()
      })
    }
  })

  mainWindow.on('close', (event) => {
    const size = mainWindow.getSize()
    common.settings.width = size[0]//width
    common.settings.height = size[1]//height
    common.saveSettings()
  })

  mainWindow.on('closed', () => {
    app.quit()
  })

  ipcMain.on('Settings', (event, newSettings) => {
    common.log('newSettings:', 1)
    common.log(newSettings, 1)
    for (var i in common.settings) {
      if (common.settings[i] !== newSettings[i]) {
        common.log('change in Settings', 1)
        let reload = false
        if (common.settings.theme !== newSettings.theme) {
          reload = true
        }

        common.settings = newSettings

        if (reload) {
          mainWindow.reload()
        }

        common.saveSettings()
        common.log('Settings:', 1)
        common.log(common.settings, 1)
        event.returnValue = true
      }
    }
    event.returnValue = false
  })
  ipcMain.on('Themes', (event) => {
    checkThemes ()
    event.returnValue = themeAll
  })

  checkForUpdates()
  //Set icon on Linux
  if (process.platform === 'linux') {
    mainWindow.setIcon(icon)
  }
}
function startTor () {
  common.log(`Directory: ${__dirname}\nPath: ${app.getPath('exe')}`, 1)
  common.log('starting Tor', 0)
  torProcess = childProcess.execFile(torFile, (err) => {
    if (err) {
      common.log('couldn\'t start tor. (already running?)', 0)
      common.log(err, 0)
    }
  })
  common.log(`pid: ${torProcess.pid}`, 1)

  torProcess.on('exit', (code, signal) => {
    common.log(`Tor stopped:\ncode: ${code} signal: ${signal}`, 0)
    torProcess = undefined
  })
}

function checkProxy (win, url) {
  if (common.settings.useCustomProxy) {
    let proxy = win.webContents.session.setProxy({ proxyRules: common.settings.customProxy })
    if (proxy) {
      win.loadURL(url)
      common.log('using custom Proxy', 0)
    }
    else {
      common.log('custom proxy failed', 0)
    }
  }
  else {
    if (common.settings.useTor) {
      let proxy = win.webContents.session.setProxy({ proxyRules: 'socks5://127.0.0.1:9050' })
      if (proxy) {
        win.loadURL(url)
        common.log('using Tor', 0)
      }
      else {
        common.log('tor connection failed', 0)
      }
    }
    else {
      win.loadURL(url)
      common.log('Not using Tor or custom Proxy', 0)
    }
  }
}

function checkForUpdates () {
  require('https').get('https://api.github.com/repos/Plastikmensch/Tweelectron/releases/latest', { headers: { 'User-Agent': 'Tweelectron' } }, (response) => {
    if (response.statusCode !== 200) common.log(`Request failed. Response code: ${response.statusCode}`, 0)
    //Make response readable
    response.setEncoding('utf8')

    let data = ''
    //Warning: gets called multiple times
    response.on('data', (d) => {
      //console.log(d)
      data += d
    })
    response.on('end', () => {
      //console.log(data)
      //console.log("end of response")
      let fulldata = JSON.parse(data)
      common.log(`tag_name: ${fulldata.tag_name}`, 1)
      common.log(`body: ${fulldata.body}`, 1)

      const current = `v${fs.readFileSync(path.join(__dirname, 'tweelectron-version'), 'utf8').trim()}`

      fulldata.body = fulldata.body.replace(/__.+__/g, function (x) {
        return `${x.replace(/_/g, '')}:`
      })

      if(current !== fulldata.tag_name) {
        dialog.showMessageBox(mainWindow, { type: 'info', buttons: ['OK'], title: 'Update available', message: `There is an Update available!\n\nCurrent version: ${current}\nlatest version: ${fulldata.tag_name}\n\n${fulldata.body}` })
        common.log('Update available', 0)
      }
      else common.log('No update available', 0)
    })
  }).on('error', (err) => {
    common.log(`Error:\n${err.message}`, 0)
  })
}

function openUrl (url) {
  if (!common.settings.openInTor) {
    shell.openExternal(url)//opens link in default browser
    common.log('opened link external', 0)
  }
  else {
    if (common.settings.torBrowserExe !== null) {
      common.log(common.settings.torBrowserExe, 1)
      //allow remote and new tab might break opening links with other browsers
      const linkChild = childProcess.spawn(common.settings.torBrowserExe, ['--allow-remote', '--new-tab', url])
      linkChild.on('error', (err) => {
        common.log(err, 0)
      })
      common.log('opened link in torbrowser', 0)
    }
    else {
      dialog.showMessageBox({ type: 'error', buttons: ['OK'], title: 'Error occured', message: 'No file specified to open link' })
      common.log('failed to open in tor', 0)
    }
  }
}

function checkThemes () {
  const includedThemes = fs.readdirSync(path.join(__dirname, 'themes'), 'utf-8')
  common.log(includedThemes, 1)
  // If theme directory doesn't exist, create it and themes
  // else check themes for updates
  if (!fs.existsSync(common.themeDir)) {
    fs.mkdirSync(common.themeDir)
    common.log('created theme directory', 0)
    for (const theme of includedThemes) {
      fs.writeFileSync(path.join(common.themeDir, theme), fs.readFileSync(path.join(__dirname, 'themes', theme), 'utf-8'))
      common.log(`created ${theme}`, 0)
    }
  }
  else {
    for (const theme of includedThemes) {
      //create theme file if it doesn't exist
      //else if theme file doesn't match internal file, overwrite it
      if (!fs.existsSync(path.join(common.themeDir, theme))) {
        fs.writeFileSync(path.join(common.themeDir, theme), fs.readFileSync(path.join(__dirname, 'themes', theme), 'utf-8'))
        common.log(`created missing ${theme}`, 0)
      }
      else if (fs.readFileSync(path.join(common.themeDir, theme), 'utf-8').trim() !== fs.readFileSync(path.join(__dirname, 'themes', theme), 'utf-8').trim()) {
        fs.writeFileSync(path.join(common.themeDir, theme), fs.readFileSync(path.join(__dirname, 'themes', theme), 'utf-8'))
        common.log(`updated ${theme}`, 0)
      }
    }
  }

  //Read theme directory
  themeAll = fs.readdirSync(common.themeDir)
  common.log(`found ${themeAll.length} theme(s)`, 0)
}

//Block remote modules
//NOTE: The new default of disabling the remote module makes this obsolete in Electron 10
app.on('remote-require', (event, webContents, moduleName) => {
  common.log(`remote ${moduleName} required`, 1)
  event.preventDefault()
})

app.on('remote-get-builtin', (event, webContents, moduleName) => {
  common.log(`remote get builtin ${moduleName}`, 1)
  event.preventDefault()
})

app.on('remote-get-global', (event, webContents, globalName) => {
  common.log(`remote get global ${globalName}`, 1)
  event.preventDefault()
})

app.on('remote-get-current-window', (event, webContents) => {
  common.log('remote get current window', 1)
  event.preventDefault()
})

app.on('remote-get-current-web-contents', (event, webContents) => {
  common.log('remote get current webcontents', 1)
  event.preventDefault()
})

app.on('remote-get-guest-web-contents', (event, webContents, guestWebContents) => {
  common.log('remote get guest web contents', 1)
  event.preventDefault()
})

//Only allow single instance
if (!singleInstance) {
  //Close second instance
  app.quit()
  common.log('quitting second instance', 0)
}
else {

  app.on('second-instance', (event, commandLine, workingDirectory) => {
    //Focus mainWindow when started a second time
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      common.log('tried to start second instance, focusing main window', 0)
    }
  })
  app.on('ready', () => {
    app.commandLine.appendSwitch('disable-gpu-compositing')//fixes blank screen bug... fucking hell...
    //Disable Electrons default application menu
    Menu.setApplicationMenu(null)

    //exit immediately if settings are faulty
    if (common.errorInSettings.found) {
      dialog.showMessageBoxSync({type: 'error', buttons: ['Quit'], message: common.errorInSettings.message, title: common.errorInSettings.title})
      app.exit()
    }

    //Show dialog asking if user wants to use tor if useTor is unset
    if (common.settings.useTor === null) {
      common.log('tor variable unset', 0)
      const dialogTor = dialog.showMessageBoxSync({ type: 'question', buttons: ['No', 'Yes'], message: 'Do you want to use Tor?' })

      if (dialogTor) {
        common.settings.useTor = true
        common.log('clicked YES', 0)
      }
      else {
        common.settings.useTor = false
        common.log('clicked NO', 0)
      }
      common.saveSettings()
    }
    if (common.settings.useTor && !common.settings.useCustomProxy) {
      startTor()
    }

    createWindow()

    checkThemes()
  })

  //"Crashinfo"
  app.on('gpu-process-crashed', (event, killed) => {
    if (!killed) common.log('GPU process crashed', 0)
  })
  app.on('renderer-process-crashed', (event, webContents, killed) => {
    if (!killed) common.log('Renderer crashed', 0)
  })
  app.on('render-process-gone', (event, webContents, details) => {
    common.log(`Renderer gone ${details.reason}`)
  })

  app.on('web-contents-created', (event, contents) => {
    //Prevent webview tags
    contents.on('will-attach-webview', (event, webPreferences, params) => {
      event.preventDefault()
      common.log('prevented webview tag', 0)
    })
    //Log console messages (test)
    contents.on('console-message', (event, level, message, line, sourceId) => {
      common.log(`log event: Level: ${level} message: ${message} line: ${line} source: ${sourceId}`, 1)
    })
    //prevent any window from navigating, which isn't caused by loadURL
    contents.on('will-navigate', (event) => {
      event.preventDefault()
      common.log('prevented navigation', 0)
    })
    //Prevent any window from opening new windows
    contents.on('new-window', (event) => {
      event.preventDefault()
    })
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
          label: 'Open Image',
          click () {
            if (params.srcURL.search('https://pbs.twimg.com/media') === 0) {
              params.srcURL = `${params.srcURL.slice(0, params.srcURL.lastIndexOf('?'))}.jpg`
            }
            openUrl(params.srcURL)
          }
        }))
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
        if (params.isEditable && win === mainWindow) {
          cmenu.append(new MenuItem({
            label: 'insert',
            type: 'submenu',
            submenu: [{
              //NOTE: This label is most likely bad for accessibility, needs testing
              label: '¯\\_(ツ)_/¯',
              click (item, focusedWindow) {
                common.log('clicked shrug',1)
                if (focusedWindow) focusedWindow.webContents.insertText('¯\\_(ツ)_/¯')
              }
            }]
          }))
        }
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
    common.log('Quitting Tweelectron', 0)
    //terminate tor when app is closed
    if (torProcess !== undefined) {
      torProcess.kill()
      common.log('stopped tor', 0)
    }
    else common.log('tor wasn\'t running', 0)
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
              common.log('focusing settings window', 0)
            }
            else {
              settingsWin = new BrowserWindow({ width: 450, height: 320, minwidth: 440, minheight: 315, parent: mainWindow, webPreferences: { enableRemoteModule: false, contextIsolation: true, preload: path.join(__dirname, 'preload-settings.js') } })
              common.log('created settings window', 0)
              settingsWin.removeMenu()
              settingsWin.loadURL('file://' + path.join(app.getAppPath(), 'settings.html'))
              if (process.platform === 'linux') {
                settingsWin.setIcon(icon)
              }
              //settingsWin.webContents.toggleDevTools()
            }
            settingsWin.on('closed', () => {
              settingsWin = undefined
              common.log('closed settings window', 0)
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
            if (focusedWindow) focusedWindow.loadURL(nav.home)
          }
        },
        {
          label: 'Twitter',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL(nav.twitter)
          }
        },
        {
          label: 'Check Tor',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL(nav.checkTor)
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
          common.log('focusing about window', 0)
        }
        else {
          aboutWin = new BrowserWindow({ width: 500, height: 300, minwidth: 500, minheight: 300, parent: mainWindow, webPreferences: { enableRemoteModule: false, contextIsolation: true, preload: path.join(__dirname, 'preload-about.js') } })
          common.log('created about window', 0)
          aboutWin.removeMenu()
          aboutWin.loadURL('file://' + path.join(app.getAppPath(), 'about.html'))
          if (process.platform === 'linux') {
            aboutWin.setIcon(icon)
          }
        }

        aboutWin.on('closed', () => {
          aboutWin = undefined
          common.log('closed about window', 0)
        })

        aboutWin.webContents.on('will-navigate', (event, url) => {
          event.preventDefault()
          shell.openExternal(url)
        })
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  //NOTE: win.removeMenu() doesn't work if Menu.setApplicationMenu(menu) is used. Also: easier.
  mainWindow.setMenu(menu)
  common.log('created app menu', 0)
}
