# Tweelectron
Missing TweetDeck for Desktop? This is for you.<br>
TweetDeck client built with [Electron](https://electron.atom.io/)

## Features
- [Tor](https://www.torproject.org/) support
- keep angular profile pictures
- copy links, usernames, hashtags or pictures
- open links in your default browser
- 2 themes (Truly Dark, Dreamy Blue)

## Installation
No installation required! Just [download](https://github.com/Plastikmensch/Tweelectron/releases), unzip and double-click `Tweelectron.exe`

## Settings
Settings are saved in `settings.json` and will be generated when you first start the app.<br>
Windows:<br>
The `settings.json` file is in the same folder as `Tweelectron.exe`<br>
Linux:<br>
`home/.config/Tweelectron/settings.json`<br>
Example:
```
use-tor =true
use-round-pics =false
theme =2
width =1336
height =720
use-custom-proxy =false
customProxy =foopy:80
links-in-browser =true
```
Or use the in-app settings! Press `Alt` click `App` -> `Settings`
## Update Tor
Since updates can take a while and it's not a good idea to use outdated tor, you can update it yourself:<br>
Windows:<br>
Download the expert bundle from the tor website and move the contents inside zip to<br>
`resources/app.asar.unpacked/tor-win32`<br>
inside Tweelectron folder<br>
Linux:<br>
Download Tor source, unpack, run terminal inside folder and do:<br>
`./configure && make`<br>
and move the tor file in src/app to<br>
`resources/app.asar.unpacked/tor-linux`<br>
inside Tweelectron folder<br>

Note: If you have tor already running, you can configure Tweelectron to use it as custom proxy.
## Packaging source
you can use [electron-packager](https://github.com/electron-userland/electron-packager)
