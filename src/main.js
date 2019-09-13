/*
    TO-DO: [x] = done, [\] = won't do
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
     [] find motivation to work on this list
     [] sort this list with version numbers, so it's clear why new releases take so long
     [x] find a way to include Tor in linux
     [x] write install script for linux
        - find out why sudo doesn't work and script fails to execute (probably for security reasons)
        (forgot chmod +x... btw changed it to require being run as root instead of using sudo inside script)
     [x] rework windows
     [] add more comments
     [x] change location of settingsFile (EACCESS ERROR)
     [\] (optional) include torbrowser (Maybe just download it for reduced filesize?)
     [x] make tor process close when Tweelectron closes
        - avoid closing tor when not started by Tweelectron
     [] include pictures in Readme
     [] (Maybe) Get rid of old theme (Truly Dark)
     [] rework theme (turns out: TweetDecks theme doesn't suck anymore)
     [] (Maybe) implement configurable text shortcuts (like replace *shrug with ¯\_(ツ)_/¯)
     [x] push new release 1.0.10 (it's about time)
     [x] Actually use json format for settings or just change it to .cfg
     [] update Readme (How to use scripts, requirements etc., settings)
     [] change file structure to be more compliant
     1.1 Release:
     [x] find a way to bypass t.co links (Need help)
        - https://github.com/Spaxe/Goodbye--t.co- ?
        - read out "data-full-url" (But how?)
     [x] Update notifier
     [x] give option to open links in tor
        - (optional) let users, who already have torbrowser, pick a path
     [x] add support for custom themes
     [] fix Truly Dark theme

*/
const {remote,BrowserWindow,app,electron,shell,Menu,MenuItem,clipboard,dialog,ipcMain,session} = require('electron')
const fs = require('fs')

let Settings = [
  [undefined,'"use-tor" :'],
  [false,'"use-round-pics" :'],
  [0,'"theme" :'], // 0 = no theme, 1 = Truly Dark, 2 = Dreamy Blue
  [1320,'"width" :'],
  [720,'"height" :'],
  [false,'"use-custom-proxy" :'],
  ['foopy:80','"customProxy" :'],
  [false,'"links-in-torbrowser" :'],
  [null,'"tor-browser-exe" :']
]
let child

const settingsFile = SettingsFile()
const tor = TorFile()
const themeDir = app.getPath('userData') + '/themes'
let themeFiles,urlList
let mainWindow,settingsWin,twitterwin,aboutWin

function TorFile() {
  if(process.platform=='linux')
  {
    return __dirname + ".unpacked/tor-linux/tor"
  }
  else {
    return "./resources/app.asar.unpacked/tor-win32/Tor/tor.exe"
  }
}
function SettingsFile(){
  if(process.platform=='linux'){
    return process.env.HOME + "/.config/Tweelectron/settings.json"
  }
  else {
    //Get path to the executable, delete /Tweelectron.exe and append /settings.json and return
    return app.getPath('exe').slice(0, app.getPath('exe').lastIndexOf("/")) + "/settings.json"
  }
}
function createWindow (Settings) {
  mainWindow = new BrowserWindow({autoHideMenuBar: true,width: Settings[3][0], height: Settings[4][0], minWidth: 371, minHeight:200/*, webPreferences:{nodeIntegration: false}*/})
  createMenu()
  console.log(Settings)
  console.log(themeDir)
  const url2 = 'file://' + app.getAppPath() + '/fail.html'
  const home = 'https://tweetdeck.twitter.com/'
  var retries = 0
  var reloadTimer
  if(Settings[0][0] && !Settings[5][0])
  {
    mainWindow.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
      mainWindow.loadURL(home)
      console.log("using Tor")
    })
  }
  else if(Settings[5][0])
  {
    mainWindow.webContents.session.setProxy({proxyRules: Settings[6][0]}, () => {
      mainWindow.loadURL(home)
      console.log("using custom Proxy")
    })
  }
  else {
    mainWindow.loadURL(home)
    console.log("Not using Tor or custom Proxy")
  }
  mainWindow.webContents.on('did-fail-load', (event,errorCode,errorDescription,validatedURL) => {
    console.log("failed to load. Retrying..." + "\nError: " +errorCode+" " + errorDescription + " " + validatedURL)
    if(validatedURL==home){
      reloadTimer = setTimeout(function(){
        mainWindow.loadURL(home)
        if(retries==3) {
          mainWindow.loadURL(url2)
          console.log("failed to load")
        }},5000)
      retries++
    }
  })
  mainWindow.webContents.on('did-finish-load', () => {
    clearTimeout(reloadTimer)
    if(!Settings[1][0])
    {
      mainWindow.webContents.insertCSS(".avatar{border-radius:0 !important}")// makes profile pics angular shaped again Woohoo!
      console.log("inserted code for angular profile pics")
    }
    if(Settings[2][0]==1 && mainWindow.webContents.getURL().search("https://tweetdeck.twitter.com/") == 0)
    {
      //First: Overall appearance (Tweets, sidebar etc.)
      //Second: Column options
      //Third: Dropdown
      //Fourth: Search Tips
      //Fifth: Keyboard shortcuts
      //Sixth: Settings
      //Seventh: Profile
      mainWindow.webContents.insertCSS(
      "html.dark .stream-item{background-color: #222426 !important}" +
      "html.dark .column-nav-item{background-color: #292f33 !important}" +
      "html.dark .app-header{background-color: #292f33 !important}" +
      "html.dark .app-navigator{background-color: #292f33 !important}" +
      "html.dark .app-title{background-color: #292f33 !important}" +
      "html.dark .column-header, html.dark .column-header-temp{background-color: #292f33 !important}" +
      "html.dark .column-message{background-color: #292f33 !important}" +
      "html.dark .app-content{background-color: #222426 !important}" +
      "html.dark .column{background-color: #222426 !important}" +
      "html.dark .app-columns-container{background-color: #14171a !important}" +
      "html.dark .is-inverted-dark .accordion .is-active{color: #fff !important}" +
      "html.dark .is-inverted-dark{color: #fff !important}" +
      "html.dark .scroll-conversation{background: #222426 !important}" +
      "html.dark .detail-view-inline{background-color: #222426 !important}" +
      "html.dark .detail-view-inline-text{background-color: #292f33 !important}" +
      "html.dark .app-search-input{background-color: #222426 !important}" +
      "html.dark .column-scroller{background-color: #222426 !important}" +
      "html.dark .compose{background-color: #495966 !important}" +
      "html.dark .old-composer-footer{background-color: #495966 !important}" +
      "html.dark .attach-compose-buttons .Button.tweet-button, html.dark .attach-compose-buttons button.tweet-button, html.dark .attach-compose-buttons input.tweet-button[type=button]{background-color: #495966 !important}" +
      "html.dark .column-panel{background-color: #495966 !important}" +
      "html.dark .accounts-drawer{background-color: #495966 !important}" + //TweetDeck, please stop using !important in your stylesheet
      "html.dark .popover{background-color: #222426 !important}" +
      "html.dark input, html.dark select, html.dark textarea{background-color: #111 !important}" +
      "html.dark .account-settings-row{background-color: #292f33 !important}" +
      "html.dark .join-team{background-color: #292f33 !important}" +
      "html.dark .app-nav-tab.is-selected{background-color: #111 !important}" +
      "html.dark input.light-on-dark{color: #fff !important}" +

      "html.dark .column-options{background-color: #2a2c2d !important}" +
      "html.dark .column-options .button-tray{background-color: #2a2c2d !important}" +
      "html.dark .is-options-open .column-settings-link{background-color: #2a2c2d !important}" +
      "html.dark .facet-type.is-active{background-color: #2a2c2d !important}" +

      ".caret-inner{border-bottom: 6px solid #222426 !important}" +
      ".dropdown-menu,.dropdown-menu [data-action]{background-color: #222426 !important;color: #fff !important}" +
      "html.dark .non-selectable-item{color: #fff !important}" +

      "html.dark .bg-color-twitter-white{background-color: #222426 !important}" +
      "html.dark .color-twitter-dark-gray{color: #fff !important}" +
      "html.dark .hover-bg-color-twitter-faint-blue:hover, html.dark .hover-bg-color-twitter-faint-blue:focus{background-color: #111 !important}" +
      "html.dark .Button{background-color: #111 !important}" +
      "html.dark .Button:hover{background-color: #111 !important}" +
      "html.dark .mdl-dismiss{color: #fff !important}" +

      "html.dark .color-twitter-dark-black{color: #fff !important}" +
      ".text-like-keyboard-key{color: #000 !important}" +

      ".list-link:hover{background-color: #0e0e0e !important}" +
      "html.dark .mdl{background-color: #222426 !important}" +
      "html.dark .mdl-col-settings{background-color: #222426 !important}" +
      "html.dark .bg-color-twitter-lightest-gray{background-color: #222426 !important}" +
      "html.dark .frm{color: #fff !important}" +
      "html.dark .is-inverted-dark .list-link{color: #fff !important}" +
      "html.dark .list-link:hover:hover{color: #fff !important}" +
      "html.dark .list-filter{color: #fff !important}" +
      "html.dark .mdl-header{color: #fff !important}" +
      "html.dark .is-inverted-dark .link-normal-dark{color: #fff !important}" +

      "html.dark .social-proof-container{background-color: #292f33 !important}" +
      ".prf-stats a strong{color: #8899a6 !important}" +
      "html.dark .prf-meta{background-color: #222426 !important}" +
      "html.dark .is-inverted-dark .btn:hover{background-color: #292f33 !important}" +
      "html.dark .mdl-column-med{background: #222426 !important}" +
      "html.dark .list-account .fullname{color: #fff !important}" +
      "html.dark .list-account:hover:hover{background: #111 !important}" +
      "html.dark .is-inverted-dark .account-link{color: #fff !important}" +
      "html.dark .column-header-temp{background-color: #222426 !important}" +
      "html.dark .column-background-fill{background-color: #222426 !important}" +
      "html.dark .is-inverted-dark .scroll-conversation{background: #222426 !important}" +
      "html.dark .Button{background-color: #222426 !important}" +
      "html.dark .btn-round{background-color: #222426 !important}" +
      "html.dark .Button:hover{background-color: #292f33 !important}" +
      "html.dark .is-condensed .tweet-button{background-color: #1da1f2 !important}" +
      "html.dark .s-thats-you .thats-you-text:hover{background-color: #292f33 !important}" +
      "html.dark .s-thats-you .thats-you-text{background-color: #222426 !important}" +
      "html.dark .s-not-following .follow-text{background-color: #222426 !important}"
      )
      console.log("inserted code for dark theme")
    }
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
      //This does nothing, because someone had the brilliant idea of doing "background-color: #fff!important"...
      mainWindow.webContents.insertCSS("html.dark .bg-color-twitter-white{background-color: #243447!important}")

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
      ")*/
      console.log("inserted code for blue theme")
    }
    if(Settings[2][0]>2)
    {
      if(fs.existsSync(themeDir + "/" + themeFiles[Settings[2][0]-3])) {
        const fileContent = fs.readFileSync(themeDir + "/" + themeFiles[Settings[2][0]-3],'utf8').trim()
        console.log(themeDir + "/" + themeFiles[Settings[2][0]-3])
        console.log(fileContent)
        mainWindow.webContents.insertCSS(fileContent)
        console.log("inserted custom theme")
      }
      else console.log("failed to insert custom theme. File doesn't exist")
    }
  })
  mainWindow.webContents.on('update-target-url', (event,url) => {
    mainWindow.webContents.executeJavaScript(`function getURL() {var x = document.querySelectorAll('.url-ext');var urls = []; for(var i=0;i<x.length;i++) {urls.push([x[i].getAttributeNode('href').value,x[i].getAttributeNode('data-full-url').value])} return urls}; getURL()`).then((result) => {//`var x = document.querySelectorAll('.url-ext'); for(var i=0;i<x.length;i++) {x[i].getAttributeNode('data-full-url').value}`
      //console.log("result: " + result)
      urlList=result
    })
    /*
    mainWindow.webContents.executeJavaScript(`document.querySelectorAll('.url-ext').length`, (result) => {
      console.log("length: " + result)
    })*/
  })
  /*Not needed anymore since what I wanted to do doesn't work.
  //Display all changes of cookies in console
  session.defaultSession.cookies.on('changed', (event,cookie,cause,removed) =>{
    console.log(event,cookie,cause,removed)
  })*/
  mainWindow.webContents.on('new-window', (event,url) => {
    if(url.search('https://tweetdeck.twitter.com/') !== 0 || url.search('https://twitter.com/') !== 0)
    {
      event.preventDefault()
      for(var i=0;i<urlList.length;i++)
      {
        if(url == urlList[i][0]) url = urlList[i][1]
      }
      if(!Settings[7][0]){
        shell.openExternal(url)//opens link in default browser
        console.log("opened link external")
      }
      else {
        //Settings[8][0] browser exec
        //Settings[8][0] + url
        if(Settings[8][0]!== "null")
        {
          const linkChild = require('child_process').spawn(Settings[8][0],[url])
          linkChild.on('error', (err) => {
            console.log(err)
          })
          console.log("opened link in torbrowser")
        }
        else {
          dialog.showMessageBox({type: 'error', buttons: ['OK'],title: 'Error occured', message:'No file specified to open link'})
          console.log("failed to open in tor")
        }
      }
    }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {

    if(url.search('https://twitter.com/login') == 0)
    {
      event.preventDefault()
      twitterwin = new BrowserWindow({parent: mainWindow})
      twitterwin.removeMenu()
      if(Settings[0][0] && !Settings[5][0])
      {
        twitterwin.webContents.session.setProxy({proxyRules:"socks5://127.0.0.1:9050"}, () => {
          twitterwin.loadURL(url)
          console.log("using Tor")
        })
      }
      else if(Settings[5][0])
      {
        twitterwin.webContents.session.setProxy({proxyRules: Settings[6][0]}, () => {
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
        console.log("failed to load")
      })
      event.newGuest = twitterwin
      twitterwin.webContents.on('will-navigate', (event,url) => {
        mainWindow.loadURL(url)
        twitterwin.close()
      })
    }
  })
  mainWindow.on('close', (event) => {
    SaveSettings(Settings)
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
      var reload = false
      //check if theme is changed
      if(Settings[2][0]!==newSettings[2][0])
      {
        reload = true
      }
      Settings = newSettings
      //reload TweetDeck if theme is changed
      if(reload){
        mainWindow.reload()
      }
      SaveSettings(Settings)
      event.returnValue = true
    }
    console.log(Settings)
  })
  CheckForUpdates()
}
function startTor() {
  console.log("Directory: " + __dirname + "\nPath: " + app.getPath('exe'))
    child = require('child_process').execFile(tor, (err) => {
      if(err)
      {
        console.log("couldn't start tor. (already running?)")
        console.log(err)
      }
      else console.log("started tor")
    })
    console.log("pid: " + child.pid)
    child.on('exit', (code,signal) => {
      console.log("tor stopped:")
      console.log("code: " + code + " signal: " + signal)
      child = undefined
    })
}
function SaveSettings(Settings){
  if(mainWindow != undefined)
  {
    const size = mainWindow.getSize()
    Settings[3][0] = size[0]//width
    Settings[4][0] = size[1]//height
  }
  else console.log("mainWindow undefined")
  var saveSettings = "{" + '\n'
  for(var i=0;i<Settings.length;i++)
  {
    if(isNaN(Settings[i][0]) || Settings[i][0]=== null)
    {
      //console.log(Settings[i][0] + " is not a number or boolean")
      saveSettings += (Settings[i][1] + '"' + Settings[i][0] + '"')
    }
    else {
      //console.log(Settings[i][0] + " is a number or boolean")
      saveSettings += (Settings[i][1] + Settings[i][0])
    }
    if(i==Settings.length-1) saveSettings += '\n'
    else saveSettings+= "," + '\n'
  }
  saveSettings += "}"
  fs.writeFileSync(settingsFile,saveSettings, (err) =>{
    if(err) return console.log(err)
    else return console.log("Settings saved")
  })
}
function CheckForUpdates(){
  require('https').get("https://api.github.com/repos/Plastikmensch/Tweelectron/releases/latest",{headers: {'User-Agent': 'Tweelectron'}}, (response) =>{
    if(response.statusCode != 200) console.log("Request failed. Response code: " + response.statusCode)
    //console.log(JSON.stringify(response.headers))
    response.setEncoding('utf8')//makes d readable
    var data = ""
    //Warning: gets called multiple times
    response.on('data', (d)=> {
      //console.log(d)
      data += d
    })
    response.on('end', ()=> {
      //console.log(data)
      //console.log("end of response")
      if(data.search("tag_name")!= -1)
      {
        //get tag_name by slicing d from ":" after "tag_name" to "," after "tag_name", Well also removes ""
        const latest = data.slice(data.indexOf(":",data.search("tag_name"))+2,data.indexOf(",",data.search("tag_name"))-1)
        //console.log("latest: " + latest)
        const body = data.slice(data.indexOf(":",data.search("body"))+2,-1)
        var splitBody = body.split('\*')
        var slicedBody = ""
        for(var i=1;i<splitBody.length;i++) {
          slicedBody += '\* ' + splitBody[i].slice(0,splitBody[i].indexOf('\\r\\n')) + '\n'
        }
        //Note: use trim() when reading from files or \n is also part of string. The fuck JS?
        const current = "v" + fs.readFileSync(__dirname + "/tweelectron-version",'utf8').trim()
        //console.log("current: " + current)
        //For testing. Might be useful for later for better comparison (Probably better to get index of . and compare numbers)
        /*
        for(var i= 0;i<current.length;i++)
        {
          if(current[i] != latest[i])
          {
            console.log("current " + current[i] + " doesn't match latest " + latest[i])
          }
          else console.log("current " + current[i] + " does match latest " + latest[i])
        }
        */
        if(current != latest)
        {
          dialog.showMessageBox({type:'info', buttons:['OK'], title: 'Update available', message:'There is an Update available!\n\nCurrent version: '+ current + '\nlatest version: ' + latest + '\n\nChanges:\n' + slicedBody})
          console.log("Update available")
        }
        else console.log("No update available")
      }
    })
  }).on('error', (err)=>{
    console.log("Error" + '\n' + err.message)
  })
}
app.on('ready', () => {
  app.commandLine.appendSwitch('disable-gpu-compositing')//fixes blank screen bug... fucking hell...
  Menu.setApplicationMenu(null)//needed, because Electron has a default menu now.
  //app.setAppLogsPath()//Sets logpath to userData (appData in Windows and .config in linux). No logs created though.
  if(!fs.existsSync(settingsFile))
  {
    dialog.showMessageBox({type:'question', buttons:['No','Yes'],message:'Do you want to use Tor?'}, (response)=>{
      if(response){
        Settings[0][0] = true
        console.log("clicked YES")
        startTor()
        }
      else {
        Settings[0][0] = false
        console.log("clicked NO")
      }
      SaveSettings(Settings)//Could move to mainWindow creation, but unnecessary file operations
      createWindow(Settings)
    })
  }
  else if(fs.existsSync(settingsFile)) {
    const settingsData= fs.readFileSync(settingsFile,'utf8')
    console.log("Data:\n" + settingsData + "\nend of data")

    for(var i=0;i<Settings.length;i++)
    {
      Settings[i][0] = settingsData.slice(settingsData.search(Settings[i][1])+Settings[i][1].length,settingsData.indexOf('\n',settingsData.search(Settings[i][1]))).trim()
      //remove ","
      if(Settings[i][0].search(",") !=-1)
      {
        Settings[i][0] = Settings[i][0].slice(0,-1)
      }
      //if setting is "true" or "false", convert to boolean
      if(Settings[i][0] == 'true'||Settings[i][0] == 'false')
      {
        Settings[i][0] = (Settings[i][0] == 'true')
      }
      //if setting is a number, convert to integer
      else if(!isNaN(Number(Settings[i][0]))){
        Settings[i][0] = Number(Settings[i][0])
      }
      //else remove ""
      else if(Settings[i][0].search("\"")!=-1){
        Settings[i][0]=Settings[i][0].slice(1,Settings[i][0].lastIndexOf("\""))
      }
    }
    console.log(Settings)
      if(Settings[0][0] && !Settings[1][0])
      {
        startTor()
      }
      createWindow(Settings)
  }
  else { //unreachable code, but... you know
    console.log("Something went terribly wrong")
  }
  if(!fs.existsSync(themeDir)) fs.mkdirSync(themeDir)
  else if(fs.existsSync(themeDir))
  {
    themeFiles = fs.readdirSync(themeDir)
    console.log(themeFiles)
    console.log(themeFiles[0])
    console.log(typeof(themeFiles[0]))
    console.log("found " + themeFiles.length + " themes")
  }
})
app.on('browser-window-created', function (event, win) {
  win.webContents.on('context-menu', function (e, params) {
    const cmenu = new Menu()
    if(params.linkURL && params.mediaType === 'none')
    {
      cmenu.append(new MenuItem({
        label: 'Copy URL',
        click () {
          clipboard.writeText(params.linkURL)//Note to self: Don't use linkText. Doesn't work. Whoops.
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
      cmenu.append(new MenuItem({
        label: 'Save Image',
        click () {
          win.webContents.downloadURL(params.srcURL)
        }
      }))
    }
    else if(params.mediaType === 'video')
    {
      cmenu.append(new MenuItem({
        label: 'Save Video',
        click () {
          win.webContents.downloadURL(params.srcURL)
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

app.on('window-all-closed', function () {
    app.quit()
})
app.on('quit', function () {
  //terminate tor when app is closed
  //(Could probably just check if child is undefined)
  if(child != undefined)
  {
    child.kill()
    console.log("stopped tor")
  }
  else console.log("tor wasn't running")
})
function createMenu() {
  /*
  //No need to check if menu already exists here
  if (Menu.getApplicationMenu())
  {
    console.log("Menu exists already")
    return
  }*/

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
            if(settingsWin != undefined) settingsWin.focus()
            else {
              settingsWin = new BrowserWindow({width: 450,height: 310,parent: mainWindow, webPreferences:{nodeIntegration: true}})
              settingsWin.removeMenu()
              settingsWin.loadURL('file://' + app.getAppPath() + '/settings.html')
              //settingsWin.webContents.toggleDevTools()
            }
            settingsWin.on('closed', () => {
              settingsWin = undefined
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
          label: 'Check Tor',
          click (item, focusedWindow) {
            if(focusedWindow) focusedWindow.loadURL("https://check.torproject.org/")
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
      click(){
        if(aboutWin != undefined) aboutWin.focus()
        else {
          aboutWin = new BrowserWindow({width: 500,height: 300,parent: mainWindow, webPreferences:{nodeIntegration: true}})
          aboutWin.removeMenu()
          aboutWin.loadURL('file://' + app.getAppPath() + '/about.html')
        }
        aboutWin.on('closed', ()=> {
          aboutWin = undefined
        })
        aboutWin.webContents.on('will-navigate', (event,url) => {
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
