# Tweelectron
Missing TweetDeck for Desktop? This is for you.<br>
TweetDeck client built with [Electron](https://electron.atom.io/)

## Features
- [Tor](https://www.torproject.org/) support
- keep angular profile pictures
- copy links, usernames, hashtags or pictures
- open links in your default browser or tor browser
- theme support (Truly Dark and custom themes)
- no more t.co, open links directly
- update notifier

## Installation
No installation required! Just [download](https://github.com/Plastikmensch/Tweelectron/releases), unzip and double-click `Tweelectron.exe`

## Settings
Settings are saved in `settings.json` and will be generated when you first start the app.<br>
**Windows:**<br>
The `settings.json` file is in the same folder as `Tweelectron.exe`<br>
**Linux:**<br>
`home/.config/Tweelectron/settings.json`<br>
Example:
```
{
    "useTor": true,
    "useRoundPics": false,
    "theme": 0,
    "width": 1336,
    "height": 720,
    "useCustomProxy": false,
    "customProxy": "foopy:80",
    "openInTor": false,
    "torBrowserExe": null,
    "logLevel": 0
}
```
Or use the in-app settings! Press `Alt` click `App` -> `Settings`
## Update Tor
Since updates can take a while and it's not a good idea to use outdated tor, you can update it yourself:<br>
**Windows:**<br>
Download the expert bundle from the tor website and move the contents inside zip to<br>
`resources/tor-win32`<br>
inside Tweelectron folder<br>
**Linux:**<br>
Download Tor source, unpack, run terminal inside folder and do:<br>
`./configure && make`<br>
and move the tor file in src/app to<br>
`resources/tor-linux`<br>
inside Tweelectron folder<br>

Note: If you have tor already running, you can configure Tweelectron to use it as custom proxy.
## Packaging source
you can use [electron-packager](https://github.com/electron-userland/electron-packager)<br>
install globally:
`npm install electron-packager -g` (requires root on linux)<br>
and run `build.sh` (Linux only)<br>
This will create the packaged app in `./dist`
