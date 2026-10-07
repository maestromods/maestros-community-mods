# Maestro's Community Mods — 1.8.2

Optional community features for the original Windows Venus University **0.3.0**. Support the official release at https://ko-fi.com/venusdev. Please report mod issues to this project.

## Install

1. Download and extract the release ZIP. Keep `mods.cmd` beside `Venus-Mods-Package`.
2. Save and close every Venus University window. Keep an independent save backup.
3. Double-click `mods.cmd`, enter the game folder path without surrounding quotes, and choose Install. Answer Y/N for each feature.
4. Launch the game's normal executable after installation succeeds.

No setup EXE, administrator access or separate Node installation is required. The batch file uses the game's bundled runtime; it can also use an existing Node installation if the executable is unavailable. No source, build tools or dependencies are downloaded.

## Command Prompt

Open Command Prompt in the extracted release folder. Replace the example path with your own game folder:

```bat
mods.cmd check "C:\Games\Venus University"
mods.cmd install "C:\Games\Venus University"
mods.cmd uninstall "C:\Games\Venus University"
```

Without `--features`, check/install select all nine features. To choose a subset:

```bat
mods.cmd install "C:\Games\Venus University" --features city,jobs,music,breakthrough
```

In PowerShell, use `./mods.cmd` in place of `mods.cmd`.

| ID | Feature |
| --- | --- |
| story | Story & Social: journals, public posts, portrait comments, replies, tags, typing delays, comment regeneration, text-reply regeneration and Story Memory with a local SQLite index |
| city | Bowling alley, roller rink and cat cafe locations/backgrounds |
| jobs | Player and NPC jobs at those venues; requires city |
| music | Custom soundtrack selection, previews and looping |
| npc | Meanwhile conversations between NPCs that the player can watch |
| names | Rename saved playthroughs |
| setup | Starting ex/dislike relationships |
| twist | Add or edit plot twists during play |
| breakthrough | Per-character spirit bars and a strong, grounded story prompt |

## Updating and uninstalling

Use `mods.cmd uninstall "GAME FOLDER"` to restore the original game code, then reinstall with your chosen features. It recognizes earlier community-mod installation records, including 1.7.1. Uninstall retains saves and creates a recovery copy. It restores all code mods together; use reinstall to change individual selections.

The installer checks the exact supported archive and records the original backup. It refuses unsupported or unexpectedly modified files and damaged backups. A renamed executable requires an existing Node installation or restoration of the original executable filename. New game releases require an updated package.

Story Memory's SQLite index stays local; generation uses the game's configured AI provider and sends relevant fictional context through its normal requests. This package contains no player saves, transcripts, credentials or databases. The mod adds no analytics endpoint.

## Source and license

The release ZIP contains the readable mod code, venue artwork, terminal launcher and license. The base game is obtained separately. Code is licensed under GNU AGPL v3; see LICENSE. Original game assets remain subject to their original terms.

For development and verification, see BUILD.md and VALIDATION.md.

## Interactive menu

Enter a single menu number: 1 to install, 2 to check, 3 to uninstall, or 4 to finish. Invalid entries prompt again. Quoted game-folder paths are accepted. After the operation the terminal stays open so you can read its result; type exit and press Enter or close the window when finished.

Version 1.8.2 collects every interactive answer through native CMD prompts before starting the game runtime. This prevents menu input from being skipped during the runtime handoff.
