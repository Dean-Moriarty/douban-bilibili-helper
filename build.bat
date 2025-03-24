@echo off
echo 正在构建 Chrome 和 Edge 版本...

rem 创建目录
mkdir "build\chrome" 2>nul
mkdir "build\edge" 2>nul

rem 复制通用文件到 Chrome 版本
copy "content.js" "build\chrome\"
copy "background.js" "build\chrome\"
copy "popup.html" "build\chrome\"
copy "icon.png" "build\chrome\"
copy "manifest.json" "build\chrome\"

rem 复制通用文件到 Edge 版本
copy "content.js" "build\edge\"
copy "background.js" "build\edge\"
copy "popup.html" "build\edge\"
copy "icon.png" "build\edge\"
copy "manifest.edge.json" "build\edge\manifest.json"

echo 构建完成！
echo Chrome版本在 build\chrome 目录
echo Edge版本在 build\edge 目录
pause 