#!/bin/bash
npm update electron
cp package.json ./src/
electron-packager ./src --platform=linux --arch=x64,ia32 --overwrite --asar --ignore="tor-(linux|win32)" --extra-resource="./src/tor-linux" --out ./dist
electron-packager "./src" --platform=win32 --arch=all --overwrite --asar --ignore="tor-(linux|win32)" --extra-resource="./src/tor-win32" --icon="./tweetdeck.ico" --out ./dist --win32metadata.CompanyName="Plastikmensch"
rm ./src/package.json
echo "Copying neccessary files..."
cp ./tweetdeck.png ./dist/Tweelectron-linux-ia32
cp ./tweetdeck.png ./dist/Tweelectron-linux-x64
cp ./tweelectron.desktop ./dist/Tweelectron-linux-ia32
cp ./tweelectron.desktop ./dist/Tweelectron-linux-x64
echo "done"
read -n1 -r -p "Press any key..." key