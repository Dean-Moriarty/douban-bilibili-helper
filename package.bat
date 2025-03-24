@echo off
echo 正在打包Chrome插件...

rem 创建临时目录
mkdir "temp" 2>nul

rem 复制必要文件到临时目录
copy "build\chrome\manifest.json" "temp\"
copy "build\chrome\content.js" "temp\"
copy "build\chrome\background.js" "temp\"
copy "build\chrome\popup.html" "temp\"
copy "build\chrome\popup.js" "temp\"
copy "build\chrome\icon.png" "temp\"

rem 创建ZIP文件
powershell Compress-Archive -Path "temp\*" -DestinationPath "douban-bilibili-helper.zip" -Force

rem 清理临时目录
rmdir /s /q "temp"

echo 打包完成！
echo 文件已保存为 douban-bilibili-helper.zip
pause 