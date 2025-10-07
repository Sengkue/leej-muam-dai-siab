@echo off
REM Automate git add, commit, and push

REM Stage all changes
git add .

REM Prompt for commit message
set /p msg="Enter commit message: "

REM Commit changes
git commit -m "%msg%"

REM Push to current branch
git push

pause