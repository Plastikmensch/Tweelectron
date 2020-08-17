# get current version
version=$(<./src/tweelectron-version)

#tar -C ./dist -zcf Tweelectron-linux-x64-$version.tar.gz Tweelectron-linux-x64
#tar -C ./dist -zcf Tweelectron-linux-ia32-$version.tar.gz Tweelectron-linux-ia32

# change directory do dist
cd ./dist

# create AppDir if it doesn't exists
if [ ! -d "Tweelectron.AppDir" ]
  then
    echo "creating AppDir"
    mkdir Tweelectron.AppDir
    mkdir ./Tweelectron.AppDir/usr
    mkdir ./Tweelectron.AppDir/usr/share
    mkdir ./Tweelectron.AppDir/usr/share/applications
    mkdir ./Tweelectron.AppDir/usr/share/icons
    echo "copying necessary files"
    cp ../tweelectron.desktop ./Tweelectron.AppDir/usr/share/applications/
    cp ../tweelectron.desktop ./Tweelectron.AppDir/
    cp ../tweelectron.png ./Tweelectron.AppDir/usr/share/icons/
    cp ../tweelectron.png ./Tweelectron.AppDir/
    cp ../AppRun ./Tweelectron.AppDir/
fi

# remove tweelectron dir if it exists
if [ -d "Tweelectron.AppDir/usr/share/tweelectron" ]
  then
    echo "removing existing tweelectron dir"
    rm -r ./Tweelectron.AppDir/usr/share/tweelectron
fi

# Copy x64 binary
echo "copying x64 version to AppDir"
cp -r ./Tweelectron-linux-x64 ./Tweelectron.AppDir/usr/share/tweelectron

# download appimagetool for x64
wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
chmod +x appimagetool-x86_64.AppImage

# create x64 AppImage
./appimagetool-x86_64.AppImage ./Tweelectron.AppDir

# remove x64 binary
rm -r ./Tweelectron.AppDir/usr/share/tweelectron

# copy ia32 binary
echo "copying ia32 version to AppDir"
cp -r ./Tweelectron-linux-ia32 ./Tweelectron.AppDir/usr/share/tweelectron

# create ia32 AppImage
ARCH=i686 ./appimagetool-x86_64.AppImage ./Tweelectron.AppDir

# remove appimagetool
echo "removing appimagetool"
rm appimagetool-x86_64.AppImage

# rename created AppImages
echo "renaming AppImages"
mv Tweelectron-x86_64.AppImage ../Tweelectron-x86_64-$version.AppImage
mv Tweelectron-i386.AppImage ../Tweelectron-ia32-$version.AppImage

echo "creating archives for Windows"
zip -r ../Tweelectron-win32-ia32-$version.zip Tweelectron-win32-ia32
zip -r ../Tweelectron-win32-x64-$version.zip Tweelectron-win32-x64
# create checksums
cd ..
echo "creating checksums"
#sha256sum Tweelectron-linux-x64-$version.tar.gz > SHA256SUMS.txt
#sha256sum Tweelectron-linux-ia32-$version.tar.gz >> SHA256SUMS.txt
sha256sum Tweelectron-x86_64-$version.AppImage > SHA256SUMS.txt
sha256sum Tweelectron-ia32-$version.AppImage >> SHA256SUMS.txt
sha256sum Tweelectron-win32-x64-$version.zip >> SHA256SUMS.txt
sha256sum Tweelectron-win32-ia32-$version.zip >> SHA256SUMS.txt