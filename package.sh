# get current version
version=$(<./src/tweelectron-version)

# still create tarballs
echo "creating archives for Linux"
tar -C ./dist -zcf Tweelectron-linux-x64-$version.tar.gz Tweelectron-linux-x64
tar -C ./dist -zcf Tweelectron-linux-ia32-$version.tar.gz Tweelectron-linux-ia32

# change directory do dist
cd ./dist

# remove AppDir if it exists
if [ -d "Tweelectron.AppDir" ]
  then
    rm -r ./Tweelectron.AppDir
fi

# create AppDir
echo "creating AppDir"
mkdir Tweelectron.AppDir
mkdir ./Tweelectron.AppDir/usr
mkdir ./Tweelectron.AppDir/usr/bin
mkdir ./Tweelectron.AppDir/usr/share
mkdir ./Tweelectron.AppDir/usr/share/applications
mkdir ./Tweelectron.AppDir/usr/share/icons
mkdir ./Tweelectron.AppDir/usr/lib
mkdir ./Tweelectron.AppDir/usr/lib/x86_64-linux-gnu
mkdir ./Tweelectron.AppDir/usr/lib32

# copy files
echo "copying necessary files"
cp ../tweelectron.desktop ./Tweelectron.AppDir/usr/share/applications/
cp ../tweelectron.desktop ./Tweelectron.AppDir/
cp ../tweelectron.png ./Tweelectron.AppDir/usr/share/icons/
cp ../tweelectron.png ./Tweelectron.AppDir/
cp ../AppRun ./Tweelectron.AppDir/
# create symlink to executable in order for .desktop file to work
ln -s ../share/tweelectron/Tweelectron ./Tweelectron.AppDir/usr/bin/Tweelectron

echo "copying libraries"
# required for tor if not build locally
libevent=$(ldd ../src/tor-linux/tor | grep "libevent" | awk '{print $3}')
libm=$(ldd ../src/tor-linux/tor | grep "libm" | awk '{print $3}')
cp $libevent ./Tweelectron.AppDir/usr/lib/
cp $libm ./Tweelectron.AppDir/usr/lib/x86_64-linux-gnu/

# required for Tweelectron ia32
libs=$(ldd ./Tweelectron-linux-ia32/Tweelectron | awk '{print $3}' | grep "/usr/lib32" | grep 'libXcomposite\|libatk\|libgdk\|libgtk\|libpango\|libcairo\|libXrandr\|libatspi\|libcups\|libepoxy\|libfribidi\|libharfbuzz\|libfontconfig\|libfreetype\|libXinerama\|libxkbcommon\|libthai\|libpng\|libgnutls\|libpixman\|libdatrie\|libidn\|libnettle\|libhogweed\|libgmp\|libunistring')

for item in $libs
do
    echo "copying $(basename "$item")"
    cp $item ./Tweelectron.AppDir/usr/lib32/
done

# Copy x64 binary
echo "copying x64 version to AppDir"
cp -r ./Tweelectron-linux-x64 ./Tweelectron.AppDir/usr/share/tweelectron

# download appimagetool if not present
if [ ! -f "appimagetool-x86_64.AppImage" ]
  then
    wget https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage
fi
# make appimagetool executable
chmod +x appimagetool-x86_64.AppImage

# create x64 AppImage
ARCH=x86_64 ./appimagetool-x86_64.AppImage ./Tweelectron.AppDir

# remove x64 binary
rm -r ./Tweelectron.AppDir/usr/share/tweelectron

# copy ia32 binary
echo "copying ia32 version to AppDir"
cp -r ./Tweelectron-linux-ia32 ./Tweelectron.AppDir/usr/share/tweelectron

# create ia32 AppImage
ARCH=i386 ./appimagetool-x86_64.AppImage ./Tweelectron.AppDir

# rename created AppImages
echo "renaming AppImages"
mv Tweelectron-x86_64.AppImage ../Tweelectron-x86_64-$version.AppImage
mv Tweelectron-i386.AppImage ../Tweelectron-ia32-$version.AppImage

echo "creating archives for Windows"
zip -r ../Tweelectron-win32-ia32-$version.zip Tweelectron-win32-ia32
zip -r ../Tweelectron-win32-x64-$version.zip Tweelectron-win32-x64

# Move back to parent dir
cd ..

# create checksums
echo "creating checksums"
sha256sum Tweelectron-linux-x64-$version.tar.gz > SHA256SUMS.txt
sha256sum Tweelectron-linux-ia32-$version.tar.gz >> SHA256SUMS.txt
sha256sum Tweelectron-x86_64-$version.AppImage >> SHA256SUMS.txt
sha256sum Tweelectron-ia32-$version.AppImage >> SHA256SUMS.txt
sha256sum Tweelectron-win32-x64-$version.zip >> SHA256SUMS.txt
sha256sum Tweelectron-win32-ia32-$version.zip >> SHA256SUMS.txt
