@echo off
setlocal EnableExtensions DisableDelayedExpansion
if "%~1"=="" goto openmenu
if /i "%~1"=="--menu" goto interactive
if /i "%~1"=="help" goto help
if /i "%~1"=="--help" goto help
set "VU_GAME_FOLDER=%~2"
if exist "%VU_GAME_FOLDER%\Venus University.exe" goto game
where node.exe >nul 2>nul
if errorlevel 1 goto missing
node.exe "%~dp0Venus-Mods-Package\terminal.cjs" %*
exit /b %errorlevel%
:game
set "ELECTRON_RUN_AS_NODE=1"
"%VU_GAME_FOLDER%\Venus University.exe" "%~dp0Venus-Mods-Package\terminal.cjs" %*
exit /b %errorlevel%
:missing
echo Point to the game folder containing Venus University.exe and resources.
echo Example: mods.cmd install "C:\Games\Venus University"
exit /b 1
:help
echo Maestro's Community Mods 1.8.2
echo Usage: mods.cmd check^|install^|uninstall "GAME FOLDER" [--features story,city,music,npc,names,jobs,setup,twist,breakthrough]
echo Omitting --features selects all nine mods. jobs requires city.
echo Double-click mods.cmd for an interactive menu.
exit /b 0
:openmenu
cmd.exe /d /k ""%~f0" --menu"
exit /b %errorlevel%
:interactive
setlocal EnableDelayedExpansion
echo Maestro's Community Mods 1.8.2
echo Enter the game folder path without surrounding quotes.
set /p "VU_GAME_FOLDER=Game folder: "
set "VU_GAME_FOLDER=!VU_GAME_FOLDER:"=!"
echo.
echo 1. Install selected mods
echo 2. Check compatibility
echo 3. Uninstall code mods
echo 4. Finish
:menuchoice
set "VU_ACTION="
set "VU_CHOICE="
set /p "VU_CHOICE=Enter one number (1, 2, 3 or 4): "
if "!VU_CHOICE!"=="1" set "VU_ACTION=install"
if "!VU_CHOICE!"=="2" set "VU_ACTION=check"
if "!VU_CHOICE!"=="3" set "VU_ACTION=uninstall"
if "!VU_CHOICE!"=="4" goto finishmenu
if defined VU_ACTION goto selectedaction
echo Enter a single number, such as 1. Do not type 1-4.
goto menuchoice
:selectedaction
set "VU_FEATURES="
if "!VU_ACTION!"=="uninstall" goto launchinteractive
call :askfeature story "Story and Social core"
call :askfeature city "City Life locations"
set "VU_CITY=!VU_ANSWER!"
call :askfeature music "Custom soundtrack"
call :askfeature npc "Meanwhile conversations"
call :askfeature names "Playthrough renaming"
if "!VU_CITY!"=="y" call :askfeature jobs "City Life jobs"
if not "!VU_CITY!"=="y" echo City Life jobs: skipped because City Life is off.
call :askfeature setup "Starting relationships"
call :askfeature twist "Plot Twist"
call :askfeature breakthrough "Breakthrough"
if not defined VU_FEATURES goto noselection
:launchinteractive
if exist "!VU_GAME_FOLDER!\Venus University.exe" goto interactivegame
where node.exe >nul 2>nul
if errorlevel 1 goto interactivemissing
if "!VU_ACTION!"=="uninstall" goto nodeuninstall
node.exe "%~dp0Venus-Mods-Package\terminal.cjs" !VU_ACTION! "!VU_GAME_FOLDER!" --features !VU_FEATURES!
goto interactiveend
:nodeuninstall
node.exe "%~dp0Venus-Mods-Package\terminal.cjs" uninstall "!VU_GAME_FOLDER!"
goto interactiveend
:interactivegame
set "ELECTRON_RUN_AS_NODE=1"
if "!VU_ACTION!"=="uninstall" goto gameuninstall
"!VU_GAME_FOLDER!\Venus University.exe" "%~dp0Venus-Mods-Package\terminal.cjs" !VU_ACTION! "!VU_GAME_FOLDER!" --features !VU_FEATURES!
goto interactiveend
:gameuninstall
"!VU_GAME_FOLDER!\Venus University.exe" "%~dp0Venus-Mods-Package\terminal.cjs" uninstall "!VU_GAME_FOLDER!"
goto interactiveend
:finishmenu
cmd /c exit 0
goto interactiveend
:noselection
echo Select at least one feature. Run mods.cmd again to choose your features.
cmd /c exit 1
goto interactiveend
:interactivemissing
echo The game executable was not found. Check the folder path and try again.
cmd /c exit 1
:interactiveend
set "VU_EXIT_CODE=!errorlevel!"
echo.
echo Operation finished. Read any message above before continuing.
echo Type exit and press Enter to close this terminal.
exit /b !VU_EXIT_CODE!
:askfeature
set "VU_ANSWER="
set /p "VU_ANSWER=Enable %~2? [Y/n] "
if not defined VU_ANSWER set "VU_ANSWER=y"
if /i "!VU_ANSWER!"=="yes" set "VU_ANSWER=y"
if /i "!VU_ANSWER!"=="no" set "VU_ANSWER=n"
if /i "!VU_ANSWER!"=="n" exit /b 0
if /i not "!VU_ANSWER!"=="y" goto askfeature
set "VU_ANSWER=y"
if defined VU_FEATURES goto appendfeature
set "VU_FEATURES=%~1"
exit /b 0
:appendfeature
set "VU_FEATURES=!VU_FEATURES!,%~1"
exit /b 0
