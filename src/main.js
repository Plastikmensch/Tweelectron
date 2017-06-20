/*
    TO-DO:
     [] use an array or object to store settings variables
     [x] save settings when app quits
     [x] add custom proxy support
     [x] create function to process settingsData
     [x] add in-app settings
     [x] make settings beautiful
     [x] add 'already saved' to settings
*/
const {remote,BrowserWindow,app,electron,shell,Menu,MenuItem,clipboard,dialog,ipcMain} = require('electron')
const fs = require('fs')

let useTor,roundPics = 0,windowWidth = 1336,windowHeight = 720,useProxy = 0,customProxy = 'foopy:80'
const settingsFile = "./settings.json"
const tor = "./resources/app.asar.unpacked/tor-win32-0.3.0.8/Tor/tor.exe"
let mainWindow,settingsWin

function createWindow (useTor,roundPics,windowWidth,windowHeight,useProxy,customProxy) {
  mainWindow = new BrowserWindow({autoHideMenuBar: true,width: windowWidth, height: windowHeight})

  const url2 = 'file://' + app.getAppPath() +'/fail.html'
  const url = 'https://tweetdeck.twitter.com/'
  if(useTor == 1 && useProxy == 0)
  {
    mainWindow.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
      mainWindow.loadURL(url)
      console.log("using Tor")
    })
  }
  else if(useProxy == 1)
  {
    mainWindow.webContents.session.setProxy({proxyRules: customProxy}, () => {
      mainWindow.loadURL(url)
      console.log("using custom Proxy")
    })
  }
  else {
    mainWindow.loadURL(url)
    console.log("Not using Tor or custom Proxy")
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
      let twitterwin = new BrowserWindow({autoHideMenuBar: true}) //creates a new Window for login. For some reason login doesn't work in mainWindow
      if(useTor == 1 && useProxy == 0)
      {
        twitterwin.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
          twitterwin.loadURL(url)
          console.log("using Tor")
        })
      }
      else if(useProxy == 1)
      {
        mainWindow.webContents.session.setProxy({proxyRules: customProxy}, () => {
          mainWindow.loadURL(url)
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
      twitterwin.webContents.on('will-navigate', (event,url) => { //close window when login successful
        mainWindow.loadURL(url)
        twitterwin.close()
      })
    }
  })
  mainWindow.on('close', (event) => {
    const size = mainWindow.getSize()
    windowWidth = size[0]
    windowHeight = size[1]
    fs.writeFileSync(settingsFile,'use-tor = '+ useTor + '\nuse-round-pics = ' + roundPics + '\nwidth = ' + windowWidth + '\nheight = ' + windowHeight + '\nuse-custom-proxy = ' + useProxy + '\ncustomProxy = {' + customProxy + '}', (err)=>{
      if(err) return console.log(err)
    })
  })
  mainWindow.on('closed', function () {
    app.quit()
  })
  ipcMain.on('Settings',(event,torSetting,picsSetting,proxySetting,proxyAddress) => {
    console.log('torSetting: ' + torSetting +'\npicsSetting: ' + picsSetting +'\nproxySetting: ' + proxySetting + '\nproxyAddress: ' + proxyAddress)
    if(torSetting == useTor && picsSetting == roundPics && proxySetting == useProxy && proxyAddress === customProxy)
    {
      event.returnValue = false
    }
    else {
      useTor = torSetting
      roundPics = picsSetting
      useProxy = proxySetting
      customProxy = proxyAddress
      event.returnValue = true
    }
    console.log('Settings:\nuseTor: ' + useTor + '\nroundPics: ' + roundPics + '\nuseProxy: ' + useProxy + '\nproxyAddress: ' + customProxy)
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
        fs.writeFileSync(settingsFile,'use-tor = 1\nuse-round-pics = '+ roundPics + '\nwidth = ' + windowWidth + '\nheight = ' + windowHeight + '\nuse-custom-proxy ='+ useProxy +'\ncustomProxy = {' + customProxy +'}', (err) =>{
          if(err) return console.log(err)
          else return console.log("wrote file")
        })
        console.log("clicked YES")
        useTor = 1
        startTor()
        createWindow(useTor,roundPics,windowWidth,windowHeight,useProxy,customProxy)
        }
      else {
        fs.writeFileSync(settingsFile,'use-tor = 0\nuse-round-pics = '+ roundPics + '\nwidth = ' + windowWidth + '\nheight = ' + windowHeight + '\nuse-custom-proxy ='+ useProxy +'\ncustomProxy = {' + customProxy +'}', (err) =>{          if(err) return console.log(err)
          if(err) return console.log(err)
          else return console.log("wrote file")
        })
        console.log("clicked NO")
        useTor = 0
        createWindow(useTor,roundPics,windowWidth,windowHeight,useProxy,customProxy)
      }
    })
  }
  else if(fs.existsSync(settingsFile)) {
    const settingsData= fs.readFileSync(settingsFile,'utf8')
    console.log("Data:\n" + settingsData + "\nend of data")
    useTor = getData(settingsData,"use-tor =",1)
    roundPics = getData(settingsData,"use-round-pics =",1)
    windowWidth = Number(getData(settingsData,"width =",4))
    windowHeight = Number(getData(settingsData,"height =",4))
    useProxy = getData(settingsData,"use-custom-proxy =",1)
    customProxy = getData(settingsData,"customProxy =",settingsData.length-1).slice(1,-1)
    if(useTor>1||useTor<0||isNaN(useTor))
    {
      dialog.showMessageBox({type:'error',message:'use-tor is set to an invalid value!'},(response) =>{
        app.quit()
      })
    }
    else if(roundPics>1||roundPics<0||isNaN(roundPics))
    {
      dialog.showMessageBox({type:'error',message: 'use-round-pics is set to an invalid value!'},(response) =>{
        app.quit()
      })
    }
    else if(useProxy>1||useProxy<0||isNaN(useProxy))
    {
      dialog.showMessageBox({type:'error',message: 'use-custom-proxy is set to an invalid value!'},(response) =>{
        app.quit()
      })
    }
    else if(isNaN(windowWidth)||isNaN(windowHeight)||windowWidth<0||windowHeight<0)
    {
      dialog.showMessageBox({type:'error',message: 'width or height is set to an invalid value!'},(response) =>{
        app.quit()
      })
    }
    else {
      if(useTor == 1 && useProxy == 0)
      {
        startTor()
      }
      createWindow(useTor,roundPics,windowWidth,windowHeight,useProxy,customProxy)
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
function getData(data,valueName,maxEntry) {
  const value = data.slice(data.indexOf(valueName)+valueName.length+1,data.indexOf(valueName) + valueName.length + (maxEntry+1))
  return value
}

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
        },
        {
          label: 'Settings',
          click () {
            settingsWin = new BrowserWindow({autoHideMenuBar: true})
            settingsWin.loadURL('file://' + app.getAppPath() + '/settings.html')
          }
        }
      ]
    })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
