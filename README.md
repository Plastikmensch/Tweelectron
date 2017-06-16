# TweetElectronDeck
Missing TweetDeck for Desktop? This is for you.<br>
TweetDeck client built with [Electron](https://electron.atom.io/)

## Features
- Tor support
- keep angular profile pictures
- copy links, usernames, hashtags or pictures
- open links in your default browser

## Installation
No installation required! Just unzip and double-click `TweetElectronDeck.exe`

## Settings
Settings are saved in `settings.json` and will be generated when you first start the app.<br>
The `settings.json` file is located there the exe is.

## Building source
you can use [electron-packager](https://github.com/electron-userland/electron-packager)
´´´sh
electron-packager <src> --platform=win32 --arch=all --overwrite --asar.unpackDir="tor-win32-0.3.0.7"
´´´
