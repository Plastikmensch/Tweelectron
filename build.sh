#!/bin/bash
npm update electron
electron-packager ./src --platform=linux --arch=x64,ia32 --overwrite --asar.unpackDir="tor-linux" --out ./dist
electron-packager "./src" --platform=win32 --arch=all --overwrite --asar.unpackDir="tor-win32" --icon="./tweetdeck.ico" --out ./dist --win32metadata.CompanyName="Plastikmensch"
echo "Copying neccessary files..."
cp ./tweetdeck.png ./dist/Tweelectron-linux-ia32
cp ./tweetdeck.png ./dist/Tweelectron-linux-x64
cp ./tweelectron.desktop ./dist/Tweelectron-linux-ia32
cp ./tweelectron.desktop ./dist/Tweelectron-linux-x64
echo "done"
read -n1 -r -p "Press any key..." key
