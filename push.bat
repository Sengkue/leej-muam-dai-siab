@echo off
REM Add all changes
git add .

REM Get current date and time
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set mydate=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set mytime=%%a-%%b

REM Commit with current date and time as message
git commit -m "Auto commit %mydate% %mytime%"

REM Push to remote
git push