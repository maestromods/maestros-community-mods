# Maestro's Community Mods — Windows Setup 1.1.3

Independent community mods for Venus University 0.2.0. Obtain the game separately.

## Support the official release

Support Venus University at https://ko-fi.com/venusdev. Send mod-related issues to the mod maintainer, not the original game author. Both installer screens include this notice and a clickable support link.

## Downloads and source

Download the Windows setup executable from [Releases](https://github.com/maestromods/maestros-community-mods/releases). This repository contains the mod and installer source. To build it yourself on Windows, run powershell -NoProfile -File .\build.ps1 from this folder. Output goes into dist. See BUILD.md for compatibility and porting notes.

Report mod issues at https://github.com/maestromods/maestros-community-mods/issues.

## Install

1. Save and close all Venus University windows. Keep a save backup.
2. Double-click Maestro-Community-Mods-Setup-1.1.3.exe.
3. Choose the feature groups you want.
4. Click Let's begin, then point to the folder containing Venus University.exe.
5. Check compatibility and click Install. Launch the normal game executable afterward.

No administrator access or separate Node installation is required. The executable is unsigned, so Windows may show an unknown-publisher notice.

## Choices

* Story & Social: public NPC journals, player posts, threaded comments and NPC replies, portraits, tags, typing delays, comment regeneration and post deletion, recent-post narration context, selectable starting-stat detriments, specific/random ex or dislike setup, plot twists, Breakthrough, whole-reply text regeneration, and story-memory editing with local SQLite recall. These features share prompt/state code and install as one group. New-game stat detriments and relationship complications default off.
* City Life: bowling alley, roller rink and cat cafe, day/night images and player/NPC jobs. The map follows native NPC-presence rules. Existing schedules are not forcibly reassigned.
* Music & playthrough names: local MP3/OGG/WAV track replacement, looping, original-track restoration, and playthrough renaming. Portable backups include the custom music and names.
* Meanwhile conversations: optional, saved dramatizations of two NPCs' recent native encounters. The player observes without participating or changing time or relationship stats.

## Compatibility and uninstall

Feature-group installation requires the verified pristine Windows 0.2.0 archive. Existing feature-group selections must be uninstalled before changing them. The installer retains the 1.0.2 uninstall repair: it verifies the exact legacy general-mod/City Life backup chain before restoring the original game. Missing, changed or unrecognized backups stop the operation.

Archive backups are stored in venus-mods-backups inside the selected game folder. Uninstall preserves saves and character-library entries. Removing a feature does not undo events written to a save. Saves with custom locations/jobs require City Life; otherwise use a pre-mod save.

The optional Start Menu shortcut is Maestro's Community Mods Manager. Helper files are stored under %LOCALAPPDATA%\Programs\Maestro Community Mods\1.1.3. Remove those helpers and the shortcut after uninstalling if you no longer want the manager. No background service, scheduled task, download or system-wide execution-policy change is added. The game's existing online AI behavior remains. Stock automatic updates are blocked while the feature mods are installed; use a separate game copy for future official releases and a compatible mod update.

## Verification

The four feature groups retain their validated game-archive patches. This release removes optional character installation. Installer compilation, embedded payload extraction and all 15 feature combinations are checked before distribution. AI behavior depends on the player's configured provider.

Source is included in Setup.cs and Venus-Mods-Package. SHA256.txt covers the setup executable and embedded package; the package manifests cover archive combinations and character files.



## 1.1.3

This release includes only the four feature groups listed above. No character pack or character-install option is bundled.
