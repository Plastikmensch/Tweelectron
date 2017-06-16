const {remote,BrowserWindow,app,electron,shell,Menu,MenuItem,clipboard,dialog} = require('electron')
const fs = require('fs')

let useTor
let roundPics
const settingsFile = app.getPath('exe').replace("TweetElectronDeck.exe","settings.json")
const tor = app.getPath('exe').replace("TweetElectronDeck.exe","resources\\app.asar.unpacked") + "\\tor-win32-0.3.0.7\\Tor\\tor.exe"

let mainWindow

function createWindow (useTor,roundPics) {
  mainWindow = new BrowserWindow({autoHideMenuBar: true,width: 1345, height: 720})

  const url2 = 'file://' + app.getAppPath() +'/fail.html'
  const url = 'https://tweetdeck.twitter.com/'
  if(useTor == 1)
  {
    mainWindow.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
      mainWindow.loadURL(url)
      console.log("using Tor")
    });
  }
  else {
    mainWindow.loadURL(url)
    console.log("Not using Tor")
  }
  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadURL(url2)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    if(roundPics==0)
    {
      mainWindow.webContents.insertCSS(".avatar{border-radius:0 !important}")// makes profile pics angular shaped again Woohoo!
    }
  })
  mainWindow.webContents.on('new-window', (event,url) => {
    if(url.search('https://tweetdeck.twitter.com/') !== 0 || url.search('https://twitter.com/') !== 0)//prevents external opening when clicking on "Home" or "Twitter"
    {
      event.preventDefault()
      shell.openExternal(url)
    }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {

    if(url.search('https://twitter.com/login') == 0)
    {
      event.preventDefault()
      const twitterwin = new BrowserWindow({autoHideMenuBar: true}) //creates a new Window for login. For some reason login doesn't work in mainWindow
      if(useTor==1)
      {
        twitterwin.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
          twitterwin.loadURL(url)
          console.log("using Tor")
        });
      }
      else {
        twitterwin.loadURL(url)
        console.log("Not using Tor")
      }
      twitterwin.webContents.on('did-fail-load',() => {
        twitterwin.loadURL(url2)
      })
      event.newGuest = twitterwin
      twitterwin.webContents.on('will-navigate', (event,url) => { //close window when login successful
        mainWindow.loadURL(url)
        twitterwin.close()
      })
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    app.quit()
  })
}
function startTor() {
  var child = require('child_process').execFile
  child(tor, (err,data) => {
    if(err){
      console.error(err)
    }
    console.log(data.toString())
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.on('ready', () => {

  if(!fs.existsSync(settingsFile))
  {
    dialog.showMessageBox({type:'question', buttons:['No','Yes'],message:'This app is capable of using Tor.\n Do you want to use Tor?'}, (response)=>{
      if(response){
        fs.writeFileSync(settingsFile,'use-tor = 1\nuse-round-pics = 0', (err) =>{
          if(err) return console.log(err)
          console.log("wrote file")
        })
        useTor = 1
        roundPics = 0
        console.log("clicked YES")

        startTor()
        createWindow(useTor,roundPics)
      }
      else {
        fs.writeFileSync(settingsFile,'use-tor = 0\nuse-round-pics = 0', (err) => {
          if(err) return console.log(err)
          console.log("wrote file")
        })
        console.log("clicked NO")
        useTor = 0
        roundPics = 0
        createWindow(useTor,roundPics)
      }
    })
  }
  else if(fs.existsSync(settingsFile)) {
    const settingsData= fs.readFileSync(settingsFile,'utf8')
    console.log("Data:" + settingsData)
    useTor = settingsData.slice(settingsData.indexOf("use-tor =")+10,settingsData.indexOf("use-tor =")+11)
    roundPics = settingsData.slice(settingsData.indexOf("use-round-pics =")+17,settingsData.indexOf("use-round-pics =")+18)
    console.log("useTor: " + useTor)
    console.log("roundPics: " + roundPics)
    if(useTor>1||useTor<0)
    {
      dialog.showMessageBox({type:'error',message:'use-tor is set to an invalid value'},(response) =>{
        app.quit()
      })
    }
    else if(roundPics>1||roundPics<0)
    {
      dialog.showMessageBox({type:'error',message: 'use-round-pics is set to an invalid value'},(response) =>{
        app.quit()
      })
    }
    else {
      if(useTor == 1)
      {
        startTor()
      }
      createWindow(useTor,roundPics)
    }
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
          label: 'Home',
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
            if(focusedWindow) focusedWindow.webContents.openDevTools()
          }
        },
        {
          role: 'togglefullscreen'
        }
      ]
    }
  ]

    template.unshift({
      label: 'App',
      submenu: [
        {
          role: 'quit'
        }
      ]
    })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
