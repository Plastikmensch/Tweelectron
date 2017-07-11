# Tweelectron
Missing TweetDeck for Desktop? This is for you.<br>
TweetDeck client built with [Electron](https://electron.atom.io/)

## Features
- [Tor](https://www.torproject.org/) support
- keep angular profile pictures
- copy links, usernames, hashtags or pictures
- open links in your default browser
- a truly dark theme

## Installation
No installation required! Just [download](https://github.com/Plastikmensch/Tweelectron/releases), unzip and double-click `Tweelectron.exe`

## Settings
Settings are saved in `settings.json` and will be generated when you first start the app.<br>
The `settings.json` file is in the same folder as `Tweelectron.exe`<br>
Example:
```
use-tor =true
use-round-pics =false
truly-dark =true
width =1336
height =720
use-custom-proxy =false
customProxy =foopy:80
```
Or use the in-app settings! Press `Alt` -> `App` -> `Settings`
## Packaging source
you can use [electron-packager](https://github.com/electron-userland/electron-packager)
```sh
# make sure to always include --asar-unpackDir or else Tor won't run
electron-packager <src> <options> --asar.unpackDir="tor-win32-0.3.0.9"
```
