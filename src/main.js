/*
NOTE: This is just a proof of concept and will not be included,
      since altering tweet content is out of scope
      You can implement or run this code yourself, if you really want to
Blocking Emojis (replacing them with text)
var t= document.getElementsByClassName('emoji')
for (var e of t) {if (e.alt === '🚬') {var span = document.createElement('span'); span.innerText='(smoking emoji)';e.replaceWith(span)}}
*/

//Disable object-curly-newline rule for node imports
/* eslint-disable object-curly-newline*/
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const { BrowserWindow, app, shell, Menu, MenuItem, clipboard, dialog, ipcMain, nativeImage } = require('electron')
const common = require('./common.js')
/* eslint-enable object-curly-newline*/

const torFile = getTorFile()
const icon = nativeImage.createFromPath(path.join(common.appDir, 'tweelectron.png'))
const singleInstance = app.requestSingleInstanceLock()

const nav = {
  home: 'https://tweetdeck.twitter.com/',
  fail: `file://${path.join(app.getAppPath(), 'fail.html')}`,
  checkTor: 'https://check.torproject.org/',
  twitter: 'https://twitter.com/'
}

let themeAll
let mainWindow, settingsWin, loginWin, aboutWin, twitterWin
let torProcess

//NOTE: process.resourcesPath not really working as intended when starting app with "electron ." (in dev)
/**
 * Gets the path to the tor executable
 * @return {string} Path to tor executable
 */
function getTorFile () {
  if (process.platform === 'linux') {
    return path.join(process.resourcesPath, 'tor-linux', 'tor')
  }
  return path.join(process.resourcesPath, 'tor-win32', 'Tor', 'tor.exe')
}

/**
 * Creates the mainWindow and handles it's events
 * @return {void} No return value
 */
function createWindow () {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    width: common.settings.width,
    height: common.settings.height,
    minWidth: 371,
    minHeight: 200,
    webPreferences: {
      contextIsolation: true
    }
  })

  createMenu()

  common.log(common.settings, 1)
  common.log(common.themeDir, 1)
  common.log(common.appDir, 1)

  let retries = 0

  checkProxy(mainWindow, nav.home)

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
      // makes profile pics angular shaped again Woohoo!
      mainWindow.webContents.insertCSS('.avatar{border-radius:0 !important}')
      common.log('inserted code for angular profile pics', 0)
    }

    //If theme is selected and url matches tweetdeck, read theme file and insert css
    if (common.settings.theme > 0 && mainWindow.webContents.getURL().search(nav.home) === 0) {
      const themeFile = path.join(common.themeDir, themeAll[common.settings.theme - 1])
      if (fs.existsSync(themeFile)) {
        const fileContent = fs.readFileSync(themeFile, 'utf8').trim()
        common.log(themeFile, 1)
        mainWindow.webContents.insertCSS(fileContent)
        common.log('inserted custom theme', 0)
      }
      else common.log('failed to insert custom theme. File doesn\'t exist', 0)
    }
  })

  mainWindow.webContents.on('update-target-url', (event, url) => {
    //Only execute JS on t.co links
    if (url.search('https://t.co/') === 0) {
      /*
        Tweets: t.co refers to the link, so you can read out the data-full-url attribute,
        which is used to show link destination

        Pictures: t.co refers to the tweet, not the image,
        which makes getting the correct image difficult
      */

      //Replace t.co link on images with image src
      /*
        Replaces href attribute of parentElement of images with the image src attribute
        media-img is the class attribute of the images shown in preview
      */
      //NOTE: Removal of ?format... here breaks url
      mainWindow.webContents.executeJavaScript('var m = document.getElementsByClassName("media-img"); if (m !== undefined) { for (const e of m) {e.parentElement.href = e.src} }')

      /*
        Replaces href attributes of images in column preview with background-image style attribute
        Also removes ?format... from image links
      */
      mainWindow.webContents.executeJavaScript(`var i = document.querySelectorAll('[href="${url}"]'); if (i.length > 1) {for (const e of i) {if (!e.hasAttribute('data-full-url') && e.hasAttribute('style')) e.href = e.getAttribute('style').slice(21,-1).split('?')[0]} }`)
    }
  })

  mainWindow.webContents.on('new-window', (event, url) => {
    //prevent default behavior
    event.preventDefault()

    //If url doesn't start with tweetdeck or twitter, prevent it from opening and handle accordingly
    if (url.search(nav.home) !== 0 && url.search(nav.twitter) !== 0) {
      //common.log(urlList, 1)
      common.log(`clicked on ${url}`, 1)

      /*NOTE: Opening multiple links isn't desirable,
              because of "process already running" issue in firefox based browsers
      */
      /*
        Selects the element which has the href attribute with url
        and tries to get it's data-full-url or style attribute value
        Opens real url on success (has data-full-url or style attribute)
        Opens url on failure (doesn't have data-full-url or style attribute)
      */
      /*NOTE: Doesn't work as own function,
              because promise of executeJavascript seems to never get resolved,
              so there is no way to return the result
              Alternative solution: Do the same as with images, replace href.
              Also executes on non-t.co
      */
      //TODO: Maybe move image related stuff to update-target-url
      mainWindow.webContents.executeJavaScript(`var x = document.querySelector('[href="${url}"]'); if(x.hasAttribute('data-full-url')) {x.getAttribute('data-full-url')} else if (x.hasAttribute('style')) {x.getAttribute('style').slice(21,-1).split('?')[0]}`)
        .then((result) => {
          common.log(`found: ${result}`, 1)
          if(result) {
            openUrl(result)
          }
          else openUrl(url)
        })
    }
    else {
      //open new window
      if (twitterWin === undefined) {
        twitterWin = new BrowserWindow({
          parent: mainWindow,
          width: 600,
          height: 700,
          resizable: false,
          webPreferences: {
            contextIsolation: true
          }
        })
        common.log('created twitterWin', 0)

        checkProxy(twitterWin, url)

        twitterWin.webContents.on('did-fail-load', () => {
          twitterWin.loadURL(nav.fail)
          common.log('failed to load', 0)
        })

        twitterWin.webContents.on('did-finish-load', () => {
          /*NOTE: navigation is still possible
                  there is no good way of preventing it
                  and I don't want to use executeJavaScript.
                  There is also no good way to access the twitter settings
                  Disabling the back button also disables some other buttons
                  on a profile page, like sending a DM
                  Good to know: Twitter creates all elements via JS,
                  which makes did-navigate-in-page event useless,
                  even though it gets called, because url doesn't change
          */
          /*TODO: Reenable back button on in-page navigation
                  Disable it when returned to opened url
                  - There is currently no way to tell,
                    which "page" user is looking at/"navigated" to
                    see note above
          */
          //make navigation bar and back button invisible
          const css =
          `[role="banner"] {display: none !important}
          .r-u0dd49 {display: none !important}`
          twitterWin.webContents.insertCSS(css.trim())
        })

        //Disable navigation
        twitterWin.webContents.on('will-navigate', (event) =>{
          event.preventDefault()
        })

        twitterWin.on('closed', () => {
          twitterWin = undefined
          common.log('closed twitterWin', 0)
        })
        event.newGuest = twitterWin
      }
      else {
        twitterWin.loadURL(url)
      }
    }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    if (url.search('https://mobile.twitter.com/login') === 0) {
      loginWin = new BrowserWindow({
        parent: mainWindow,
        modal: true,
        webPreferences: {
          contextIsolation: true
        }
      })

      checkProxy(loginWin, url)

      loginWin.webContents.on('did-fail-load', () => {
        loginWin.loadURL(nav.fail)
        common.log('failed to load', 0)
      })
      event.newGuest = loginWin
      loginWin.webContents.on('will-navigate', (event, url) => {
        //NOTE: Having to solve a captcha, loads twitter instead
        mainWindow.loadURL(url)
        loginWin.close()
      })
    }
  })

  mainWindow.on('close', () => {
    const size = mainWindow.getSize()

    common.settings.width = size[0]
    common.settings.height = size[1]

    common.saveSettings()
  })

  mainWindow.on('closed', () => {
    app.quit()
  })
}

// IPC
ipcMain.on('Settings', (event, newSettings) => {
  common.log('newSettings:', 1)
  common.log(newSettings, 1)
  for (let i in common.settings) {
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
  checkThemes()
  event.returnValue = themeAll
})

/**
 * Starts the tor child process
 * @return {void} No return value
 */
function startTor () {
  common.log(`Directory: ${__dirname}\nPath: ${app.getPath('exe')}`, 1)
  common.log('starting Tor', 0)
  torProcess = childProcess.execFile(torFile, (err, stdout, stderr) => {
    if (err) {
      common.log('couldn\'t start tor. (already running?)', 0)
      common.log(err, 0)
    }
    common.log(stderr, 0)
  })
  common.log(`pid: ${torProcess.pid}`, 1)

  torProcess.on('exit', (code, signal) => {
    common.log(`Tor stopped:\ncode: ${code} signal: ${signal}`, 0)
    torProcess = undefined
  })
}

/*
  NOTE: Since all windows use the default session,
        proxy could be set in default session at start.
        But it's unclear how proxies handle file protocol,
        requires testing.
        For now it's done like this, because it's known working.
*/
/**
 * Sets the proxy to be used for win
 * @param {BrowserWindow} win - The window which should have a proxy
 * @param {string} url - the url to open if proxy connection is successful
 * @return {void} No return value
 */
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

/*
  Sends a https get request to fetch the latest github release,
  compares the release tag with current running app version,
  and displays a dialog with the response body, when versions differ.
*/
/**
 * Checks for updates
 * @return {void} No return value
 */
function checkForUpdates () {
  require('https').get('https://api.github.com/repos/Plastikmensch/Tweelectron/releases/latest', { headers: { 'User-Agent': 'Tweelectron' } }, (response) => {
    if (response.statusCode !== 200) common.log(`Request failed. Response code: ${response.statusCode}`, 0)

    //Make response readable
    response.setEncoding('utf8')

    let data = ''

    //Warning: gets called multiple times
    response.on('data', (d) => {
      data += d
    })
    response.on('end', () => {
      let fulldata = JSON.parse(data)
      common.log(`tag_name: ${fulldata.tag_name}`, 1)
      common.log(`body: ${fulldata.body}`, 1)

      const current = `v${fs.readFileSync(path.join(__dirname, 'tweelectron-version'), 'utf8').trim()}`

      fulldata.body = fulldata.body.replace(/__.+__/g, (x) => {
        return `${x.replace(/_/g, '')}:`
      })

      if(current !== fulldata.tag_name) {
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['OK'],
          title: 'Update available',
          message: `There is an Update available!\n\nCurrent version: ${current}\nlatest version: ${fulldata.tag_name}\n\n${fulldata.body}`
        })
        common.log('Update available', 0)
      }
      else common.log('No update available', 0)
    })
  }).on('error', (err) => {
    common.log(`Error:\n${err.message}`, 0)
  })
}

/**
 * Decides how url should be opened
 * @param {string} url - url to open
 * @return {void} No return value
 */
function openUrl (url) {
  if (!common.settings.openInTor) {
    //Opens link in default browser
    shell.openExternal(url)
    common.log('opened link external', 0)
  }
  else {
    if (common.settings.torBrowserExe !== null) {
      common.log(common.settings.torBrowserExe, 1)

      //NOTE: allow remote and new tab might break opening links with other browsers
      const linkChild = childProcess.spawn(common.settings.torBrowserExe, ['--allow-remote', '--new-tab', url])

      linkChild.on('error', (err) => {
        common.log(err, 0)
      })
      common.log('opened link in torbrowser', 0)
    }
    else {
      //Show dialog if no path is specified
      dialog.showMessageBox({
        type: 'error',
        buttons: ['OK'],
        title: 'Error occured',
        message: 'No file specified to open link'
      })
      common.log('failed to open in tor', 0)
    }
  }
}

/**
 * Reads and compares internal theme folder with external.
 * Creates external folder if it doesn't exist.
 * overwrites files in external folder if different.
 * sets themeAll variable
 * @return {void} No return value
 */
function checkThemes () {
  const includedThemes = fs.readdirSync(path.join(__dirname, 'themes'), 'utf-8')
  common.log(includedThemes, 1)

  /*
    If theme directory doesn't exist, create it and themes
    else check themes for updates
  */
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
      /*
        create theme file if it doesn't exist
        else if theme file doesn't match internal file, overwrite it
      */
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

//NOTE: Single instance lock seems to not work when primary instance crashed
//Only allow single instance
if (!singleInstance) {
  //Close second instance
  app.quit()
  common.log('quitting second instance', 0)
}
else {
  app.on('second-instance', () => {
    //Focus mainWindow when started a second time
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      common.log('tried to start second instance, focusing main window', 0)
    }
  })
  app.on('ready', () => {
    //fixes blank screen bug... fucking hell...
    app.commandLine.appendSwitch('disable-gpu-compositing')

    //Disable Electrons default application menu
    Menu.setApplicationMenu(null)

    //exit immediately if settings are faulty
    if (common.errorInSettings.found) {
      dialog.showMessageBoxSync({
        type: 'error',
        buttons: ['Quit'],
        message: common.errorInSettings.message,
        title: common.errorInSettings.title
      })
      app.exit()
    }

    //Show dialog asking if user wants to use tor if useTor is unset
    if (common.settings.useTor === null) {
      common.log('tor variable unset', 0)
      const dialogTor = dialog.showMessageBoxSync({
        type: 'question',
        buttons: ['No', 'Yes'],
        message: 'Do you want to use Tor?'
      })

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

    checkForUpdates()
  })

  //"Crashinfo"
  app.on('gpu-process-crashed', (event, killed) => {
    if (!killed) common.log('GPU process crashed', 0)
  })
  app.on('render-process-gone', (event, webContents, details) => {
    common.log(`Renderer gone ${details.reason}`)
  })

  /*NOTE: Moving everything inside this to browser-window-created
          could have the advantage of having a window reference
  */
  /*NOTE: Not a good idea to prevent will-navigate event here,
          breaks login window and other functionality
  */
  app.on('web-contents-created', (event, contents) => {
    //Prevent webview tags
    contents.on('will-attach-webview', (event) => {
      event.preventDefault()
      common.log('prevented webview tag', 0)
    })

    //Deny all permissions by default
    contents.session.setPermissionRequestHandler((webContents, permission, callback) => {
      common.log(`${webContents.getURL()} requested ${permission}`, 0)
      return callback(false)
    })
  })

  app.on('browser-window-created', (event, win) => {
    // Set window icon for linux
    if (process.platform === 'linux') {
      win.setIcon(icon)
    }

    //Log console messages (test)
    //NOTE: Doesn't always work. Might be an issue with logging
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
      common.log(`${getWindowName(win)}: Level: ${level} message: ${message} line: ${line} source: ${sourceId}`, 1)
    })

    //Prevent any window from opening new windows
    win.webContents.on('new-window', (event) => {
      event.preventDefault()
      common.log(`prevented ${getWindowName(win)} from opening new window`, 0)
    })

    win.webContents.on('context-menu', (e, params) => {
      const cmenu = new Menu()
      if (params.linkURL && params.mediaType === 'none') {
        cmenu.append(new MenuItem({
          label: 'Copy URL',
          click (item, focusedWindow) {
            //Note to self: Don't use linkText. Doesn't work. Whoops.
            let url = params.linkURL

            if(focusedWindow.id === mainWindow.id && url.search('https://t.co/') === 0) {
              // For explaination see mainWindows new-window event
              mainWindow.webContents.executeJavaScript(`var x = document.querySelector('[href="${url}"]'); if(x.hasAttribute('data-full-url')) {x.getAttribute('data-full-url')} else if (x.hasAttribute('style')) {x.getAttribute('style').slice(21,-1).split('?')[0]}`)
                .then((result) => {
                  common.log(`found: ${result}`, 1)
                  if(result) {
                    clipboard.writeText(result)
                  }
                  else clipboard.writeText(url)
                })
            }
            else clipboard.writeText(url)
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
        if (params.misspelledWord) {
          for (const word of params.dictionarySuggestions) {
            cmenu.append(new MenuItem({
              label: word,
              click (item, focusedWindow) {
                if (focusedWindow) focusedWindow.webContents.replaceMisspelling(word)
              }
            }))
          }
          cmenu.append(new MenuItem({
            label: 'Add to Dictionary',
            click (item, focusedWindow) {
              if (focusedWindow) focusedWindow.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
            }
          }))
          cmenu.append(new MenuItem({ type: 'separator' }))
        }
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
                common.log('clicked shrug', 1)
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

/**
 * Gets the name of a window
 * @param {BrowserWindow} win - Window to get the name of
 * @return {string} Name of the window
 */
function getWindowName(win) {
  switch(true) {
    case mainWindow !== undefined && mainWindow.id === win.id:
      return 'main window'
    case loginWin !== undefined && loginWin.id === win.id:
      return 'login window'
    case twitterWin !== undefined && twitterWin.id === win.id:
      return 'twitter window'
    case settingsWin !== undefined && settingsWin.id === win.id:
      return 'settings window'
    case aboutWin !== undefined && aboutWin.id === win.id:
      return 'about window'
    default:
      return 'unknown window'
  }
}

/**
 * Creates a menu from a template
 * @return {void} No return value
 */
function createMenu () {
  const template = [
    {
      label: 'App',
      submenu: [
        {
          label: 'Settings',
          click () {
            if (settingsWin !== undefined) {
              settingsWin.focus()
              common.log('focusing settings window', 0)
            }
            else {
              settingsWin = new BrowserWindow({
                parent: mainWindow,
                modal: true,
                width: 450,
                height: 320,
                minwidth: 440,
                minheight: 315,
                webPreferences: {
                  contextIsolation: true,
                  preload: path.join(__dirname, 'preload-settings.js')
                }
              })
              common.log('created settings window', 0)

              settingsWin.loadURL(`file://${path.join(app.getAppPath(), 'settings.html')}`)

              //settingsWin.webContents.toggleDevTools()
            }
            settingsWin.on('closed', () => {
              settingsWin = undefined
              common.log('closed settings window', 0)
            })
          }
        },
        {
          role: 'quit'
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

        /*
        {
          label: 'Twitter',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.loadURL(nav.twitter)
          }
        },
        */
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
      submenu: [
        {
          label: 'Report Issues',
          click () {
            shell.openExternal('https://github.com/Plastikmensch/Tweelectron/issues')
          }
        },
        {
          label: 'About',
          click () {
            if (aboutWin !== undefined) {
              aboutWin.focus()
              common.log('focusing about window', 0)
            }
            else {
              aboutWin = new BrowserWindow({
                parent: mainWindow,
                width: 500,
                height: 300,
                minwidth: 500,
                minheight: 300,
                webPreferences: {
                  contextIsolation: true,
                  preload: path.join(__dirname, 'preload-about.js')
                }
              })
              common.log('created about window', 0)

              aboutWin.loadURL(`file://${path.join(app.getAppPath(), 'about.html')}`)
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
    }
  ]

  const menu = Menu.buildFromTemplate(template)

  //NOTE: win.removeMenu() doesn't work if Menu.setApplicationMenu(menu) is used. Also: easier.
  mainWindow.setMenu(menu)
  common.log('created menu', 0)
}
