/*
    TO-DO:
     [x] use an array or object to store settings variables
     [x] save settings when app quits
     [x] add custom proxy support
     [x] create function to process settingsData
     [x] add in-app settings
     [x] make settings beautiful
     [x] add 'already saved' to settings
     [x] add about page
     [] praise energy drinks
*/
const {remote,BrowserWindow,app,electron,shell,Menu,MenuItem,clipboard,dialog,ipcMain} = require('electron')
const fs = require('fs')

let Settings = [//Could do smth. like Settings = [[undefined,'use-tor ='],...] see: https://stackoverflow.com/a/966234
  undefined, //useTor
  false,//roundPics
  false,//trulyDark
  1336,//windowWidth
  720,//windowHeight
  false,//useProxy
  'foopy:80'//customProxy
]
let settingsName = [
  'use-tor =',
  'use-round-pics =',
  'truly-dark =',
  'width =',
  'height =',
  'use-custom-proxy =',
  'customProxy ='
]
const settingsFile = "./settings.json"
const tor = "./resources/app.asar.unpacked/tor-win32-0.3.0.9/Tor/tor.exe"
let mainWindow,settingsWin,twitterwin,aboutWin

function createWindow (Settings) {
  mainWindow = new BrowserWindow({autoHideMenuBar: true,width: Settings[3], height: Settings[4]})
  console.log(Settings)
  const url2 = 'file://' + app.getAppPath() +'/fail.html'
  const home = 'https://tweetdeck.twitter.com/'
  if(Settings[0] && !Settings[5])
  {
    mainWindow.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
      mainWindow.loadURL(home)
      console.log("using Tor")
    })
  }
  else if(Settings[5])
  {
    mainWindow.webContents.session.setProxy({proxyRules: Settings[6]}, () => {
      mainWindow.loadURL(home)
      console.log("using custom Proxy")
    })
  }
  else {
    mainWindow.loadURL(home)
    console.log("Not using Tor or custom Proxy")
  }
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(url2)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    if(!Settings[1])
    {
      mainWindow.webContents.insertCSS(".avatar{border-radius:0 !important}")// makes profile pics angular shaped again Woohoo!
    }
    if(Settings[2])
    {
      mainWindow.webContents.insertCSS("\
      .is-inverted-dark .scroll-conversation{background: #222426 !important}\
      .mdl.s-full{background-color: #111 !important}\
      .mdl-placeholder{text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8) !important}\
      .list-account .username{color: #eaeaea !important}\
      .list-account .fullname{color: #eaeaea !important}\
      .list-account:hover{background-color: #666 !important}\
      .list-account{text-shadow: 0 1px 0 #000 !important}\
      .is-inverted-dark .column-scroller::-webkit-scrollbar-thumb{background-color: #666 !important}\
      .column-background-fill{background-color: #222426 !important}\
      .scroll-alt::-webkit-scrollbar-thumb{background-color: #666 !important}\
      .is-inverted-dark .stream-item{background-color: #222426 !important}\
      .is-inverted-dark .account-link{color: #e1e8ed !important}\
      .follow-btn{background-color: #292f33 !important;color: #fff !important;border-color: #111 !important}\
      .s-following .follow-btn{background-color: #50a5e6 !important}\
      .s-following .follow-btn:hover{color:#fff !important;background-color:#a0041e !important}\
      .is-inverted-dark .btn-square:focus{color: #eaeaea !important;background-color: #292f33 !important}\
      .is-inverted-dark .btn-square{color: #e1e8ed !important;background-color: #292f33 !important;border-color: #111 !important} \
      .lst-profile{background-color: #2a2c2d !important}\
      .text-like-keyboard-key{color: #000 !important}\
      .social-proof-container{background-color: #2a2e31 !important}\
      .is-inverted-dark{color: #fff !important}\
      .prf-stats a strong{color: #8899a6 !important}\
      .caret-inner{border-bottom: 6px solid #222426 !important}\
      .bg-r-white,.prf-meta{background-color: #222426 !important}\
      .txt-seamful-black{color: #fff !important}\
      .dropdown-menu,.dropdown-menu [data-action]{background-color: #222426 !important;color: #fff !important}\
      .list-link:hover{background-color: #0e0e0e !important}\
      .mdl,.mdl-inner,.mdl-column,.mdl-col-settings,.bg-seamful-faint-gray,.bg-seamful-faded-gray{background-color: #222426 !important}\
      .frm,.a-list-link,.list-link,.mdl-header,.mdl-dismiss,.non-selectable-item{color: #fff !important}")
    }
  })
  mainWindow.webContents.on('new-window', (event,url) => {
    if(url.search('https://tweetdeck.twitter.com/') !== 0 || url.search('https://twitter.com/') !== 0)
    {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {

    if(url.search('https://twitter.com/login') == 0)
    {
      event.preventDefault()
      twitterwin = new BrowserWindow({parent: mainWindow})
      twitterwin.setMenu(null)
      if(Settings[0] && !Settings[5])
      {
        twitterwin.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
          twitterwin.loadURL(url)
          console.log("using Tor")
        })
      }
      else if(Settings[5])
      {
        twitterwin.webContents.session.setProxy({proxyRules: Settings[6]}, () => {
          twitterwin.loadURL(url)
          console.log("using custom Proxy")
        })
      }
      else {
        twitterwin.loadURL(url)
        console.log("Not using Tor or custom Proxy")
      }
      twitterwin.webContents.on('did-fail-load',() => {
        twitterwin.loadURL(url2)
      })
      event.newGuest = twitterwin
      twitterwin.webContents.on('will-navigate', (event,url) => {
        mainWindow.loadURL(url)
        twitterwin.close()
      })
    }
  })
  mainWindow.on('close', (event) => {
    const size = mainWindow.getSize()
    Settings[3] = size[0]
    Settings[4] = size[1]
    var saveSettings = ""
    for(var i=0;i<Settings.length;i++)
    {
      saveSettings += (settingsName[i] + Settings[i] + '\n')
    }
    fs.writeFileSync(settingsFile,saveSettings, (err) =>{
      if(err) return console.log(err)
    })
  })
  mainWindow.on('closed', function () {
    app.quit()
  })
  ipcMain.on('Settings',(event,newSettings) => {
    console.log(newSettings)
    if(newSettings.toString() == Settings.toString())
    {
      event.returnValue = false
    }
    else {
      Settings = newSettings
      event.returnValue = true
    }
    console.log(Settings)
  })
}
function startTor() {
  var child = require('child_process').execFile(tor)
}

app.on('ready', () => {

  if(!fs.existsSync(settingsFile))
  {
    dialog.showMessageBox({type:'question', buttons:['No','Yes'],message:'This app is capable of using Tor.\n Do you want to use Tor?'}, (response)=>{
      if(response){
        Settings[0] = true
        var saveSettings = ""
        for(var i=0;i<Settings.length;i++)
        {
          saveSettings += (settingsName[i] + Settings[i] + '\n')
        }
        fs.writeFileSync(settingsFile,saveSettings, (err) =>{
          if(err) return console.log(err)
          else return console.log("wrote file")
        })
        console.log("clicked YES")
        startTor()
        createWindow(Settings)
        }
      else {
        Settings[0] = false
        var saveSettings = ""
        for(var i=0;i<Settings.length;i++)
        {
          saveSettings += (settingsName[i] + Settings[i] + '\n')
        }
        fs.writeFileSync(settingsFile,saveSettings, (err) =>{
          if(err) return console.log(err)
          else return console.log("wrote file")
        })
        console.log("clicked NO")
        createWindow(Settings)
      }
    })
  }
  else if(fs.existsSync(settingsFile)) {
    const settingsData= fs.readFileSync(settingsFile,'utf8')
    console.log("Data:\n" + settingsData + "\nend of data")

    for(var i=0;i<Settings.length;i++)
    {
      Settings[i] = settingsData.slice(settingsData.search(settingsName[i])+settingsName[i].length,settingsData.indexOf('\n',settingsData.search(settingsName[i]))).trim()
      if(Settings[i] == 'true'||Settings[i] == 'false')
      {
        Settings[i] = (Settings[i] == 'true')
      }
      else if(!isNaN(Number(Settings[i]))){
        Settings[i] = Number(Settings[i])
      }
    }
    console.log(Settings)
      if(Settings[0] && !Settings[1])
      {
        startTor()
      }
      createWindow(Settings)
  }
  else { //unreachable code, but... you know
    console.log("Something went terribly wrong")
  }
  createMenu()
})
app.on('browser-window-created', function (event, win) {

  win.webContents.on('context-menu', function (e, params) {
    const cmenu = new Menu()
    if(params.linkURL && params.mediaType === 'none')
    {
      cmenu.append(new MenuItem({
        label: 'Copy URL',
        click () {
          clipboard.writeText(params.linkURL)
        }
      }))
      if(params.linkText.charAt(0) === '#')
      {
        cmenu.append(new MenuItem({
          label: 'Copy Hashtag',
          click () {
            clipboard.writeText(params.linkText)
          }
        }))
      }
      if(params.linkText.charAt(0) === '@')
      {
        cmenu.append(new MenuItem({
          label: 'Copy Username',
          click () {
            clipboard.writeText(params.linkText)
          }
        }))
      }
    }
    else if(params.mediaType === 'image')
    {
      cmenu.append(new MenuItem({
        label: 'Copy Image',
        click () {
          win.webContents.copyImageAt(params.x,params.y)
        }
      }))
    }
    else if(params.mediaType === 'none'){
      cmenu.append(new MenuItem({role: 'copy'}))
      cmenu.append(new MenuItem({label:'Paste', role: 'pasteandmatchstyle'}))
      cmenu.append(new MenuItem({role: 'cut'}))
      cmenu.append(new MenuItem({role: 'selectall'}))
    }
    else {
      cmenu.append(new MenuItem({label:'...'}))
    }
    cmenu.popup(win, params.x, params.y)
  })
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
    app.quit()
})
function createMenu() {
  if (Menu.getApplicationMenu()) return

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
            settingsWin = new BrowserWindow({autoHideMenuBar: true,width:450,height:310,parent: mainWindow})
            settingsWin.setMenu(null)
            settingsWin.loadURL('file://' + app.getAppPath() + '/settings.html')
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
          label:'Paste',
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
            if (focusedWindow) focusedWindow.loadURL("https://tweetdeck.twitter.com/")}
        },
        {
          label: 'Twitter',
          click (item, focusedWindow) {
            if(focusedWindow) focusedWindow.loadURL("https://twitter.com/")}
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
          click (item, focusedWindow){
            if(focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      label: 'About',
      click(item){
        aboutWin = new BrowserWindow({width: 500,height: 300})
        aboutWin.setMenu(null)
        aboutWin.loadURL('file://' + app.getAppPath() + '/about.html')
        aboutWin.webContents.on('will-navigate', (event,url) => {
          event.preventDefault()
          shell.openExternal(url)
        })
      }
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
