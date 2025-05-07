@echo off
REM Update visual regression snapshots
echo Updating visual regression snapshots...
call npm run test:visual:update

echo Visual regression snapshots updated successfully!
