# Maestro’s Community Mods — 0.3.0 test preview

Installer 1.7.1 targets the original Windows **Venus University 0.3.0** archive. It does not install over 0.2.0 or an already-modified archive.

This is an unofficial community mod. Support the original game and developer at https://ko-fi.com/venusdev. Please report mod problems to the community mod project, not the game’s author.

## Install

1. Use a separate, clean copy of Venus University 0.3.0.
2. Close the game. Run `Maestro-Community-Mods-Setup-1.7.1.exe`.
3. Point to the folder containing `Venus University.exe`.
4. Choose the features you want, check compatibility, then install.
5. Launch the game normally.

No administrator access or separate Node installation is intended to be required. Setup can use the game’s bundled runtime. The installer validates the exact supported archive, stages the patched archive, and keeps an original backup. It refuses unexpected files instead of guessing.

## Feature choices

| Checkbox | What it adds |
| --- | --- |
| Story & Social core | Public campus journals, player posts, portrait comments, replies, tagging, NPC responses with typing delays, post deletion and comment regeneration; whole-text-reply regeneration; Story Memory and its local SQLite index. These interconnected features remain bundled in this preview. |
| Breakthrough | Independent per-character spirit bars, activation effects, strong one-turn narrative guidance, failure refunds, and saved outcome continuity in scenes and texts. Works with or without Story & Social; no SQLite dependency. |
| City Life locations | Lucky Strike Lanes, Starlight Roller Rink, and Purr & Pour Cat Café, with day/night backgrounds, map positions, and location descriptions. Map access follows native NPC presence. |
| City Life jobs | Player and NPC employment at the three venues. Requires locations. Bowling: Body tier 2, $125/shift. Rink: Body and Heart tier 2, $150/shift. Café: Brain and Heart tier 2, $140/shift. Native hiring, shifts, raises and attendance apply. |
| Custom soundtrack | Replace individual cues with local MP3, OGG or WAV files; preview, loop/play once, restore originals and clean unused imports. Files are copied locally. No YouTube/video integration. |
| Meanwhile conversations | View a generated, noninteractive conversation between the two NPCs in an eligible event, with saved replay. |
| Playthrough renaming | Change a playthrough’s display label, independently of the player character’s name. |
| Starting relationships | Choose a specific enrolled character or random character as an ex or someone who initially dislikes the player. Resentment can fade; this does not lock the relationship permanently. |
| Plot Twist | Add, edit or remove up to 10,000 characters of ongoing story direction. Guides subsequent generation without directly changing stats or relationship flags. |

Starting detriments now use **0.3.0’s native starting-stat controls**. The duplicate mod controls are removed. Native character notes, memory settings, custom backgrounds and the system-prompt editor remain available; they serve different purposes from automatic Story Memory, City Life and per-playthrough Plot Twist.

The shared setup layout fits normal creation and Quickstart, with or without relationship setup enabled. Feature choices other than jobs/locations do not require one another. Breakthrough is now separate. Journals, text regeneration and Story Memory remain together inside Story & Social.

## Breakthrough and Story & Social details

Breakthrough builds per character from positive interactions, loses progress on hated interactions, and leaves disliked interactions unchanged. At a full bar the player can request a powerful positive turn in a scene. Spending resets the bar; generation failure refunds the activation. It is strong story guidance, not a guarantee or a forced change to game flags. Recorded outcomes participate in continuity and are reconciled with edited or removed scene text.

Story Memory preserves additional lasting facts and retrieves relevant encounter recaps. Saves are authoritative. `data/ex-memory/memory.sqlite` is a rebuildable local index, not a cloud service and not a full transcript added to every prompt. Recall has an 18,000-character total budget, including a 6,500-character fact budget. Character ownership, who knows a fact, and timeline metadata are kept separate. Native character notes and affection memories continue to work.

Journal narration intentionally considers articles from the current or previous in-game day. Replying to an older article does not make that article eligible for scene context. Older articles remain readable and replyable.

Text regeneration replaces the latest complete generated reply group, including multiple bubbles. It does not impose a universal three-message cap.

## Changes in 1.4.0

- Breakthrough has its own checkbox, independent save/settlement hooks, UI stylesheet and scene/text continuity. Story & Social also works with Breakthrough unchecked.
- Existing Breakthrough save-field format is retained when the module is installed. No private playthrough migration was performed.
- Use Uninstall, then Install to change the code features of an existing installation. Disabling a feature stops its behavior; use an independent save backup before resaving a playthrough that relies on it.

## Earlier installer changes

- Plot Twist and Story Memory now use native menu hover, focus, press and entry animations. Their editor buttons and playthrough renaming also use native hover/press gestures.

## Changes and review fixes in this port

- Retargeted integration points and archive validation to the supplied 0.3.0 Windows build.
- Removed duplicate detriment logic; retained optional ex/dislike setup.
- Removed unconditional old form-scroller styling and checked both setup flows.
- Added explicit feature-save persistence at safe points, including between scenes. Failed or unsafe saves report that the player must save later; success is not inferred from a no-op helper.
- Coordinated initial and regenerated journal comments through a shared per-post lock.
- Stored stable participant IDs for newly settled encounter records; legacy recaps can match unique first names without depending on capped affection memories. Ambiguous first names are not guessed.
- Included player-known private facts in narrator recall without giving every NPC that knowledge.
- Deleted associated SQLite index rows when a playthrough is deleted. This is logical deletion, not secure erasure.
- Made rename styling independent of Story & Social and treated invalid optional names as absent while retaining strict validation for new names.
- Kept completed non-looping custom cues from restarting merely because UI recomputes the same cue. They can play again after the requested cue changes away and returns, or after explicit replacement/settings changes. Custom title playback no longer depends on the original title’s completed flag.
- Checked managed audio hashes during backup export as well as restore. A damaged soundtrack file produces an actionable error before a misleading successful export.

## Backup and removal


This preview has **not validated migration of existing modded 0.2.0 saves**. Test with new disposable playthroughs. Removing a feature from a save that relies on custom jobs, locations or other mod fields may remove behavior or cause incompatibilities. Do not use this preview as a migration tool.

## Data and generation


AI features use the game’s configured provider. Relevant fictional context is sent through the game’s normal generation calls; the SQLite index itself remains local. The mod adds no analytics endpoint. Local-only features such as renaming and soundtrack replacement do not require model requests.

## Validation status

See `VALIDATION.md` for checks completed on this build. Automated tests and rendered UI fixtures do not establish live model quality or cover a full semester of gameplay. This is a testing preview, not a claim that every gameplay path is QA-passed.

## Future game versions

Use a clean installation for each upstream version. Compare native features first, then update version/hash guards and exact integration anchors. Re-run module combinations, feature regression tests, setup layouts, and install/uninstall recovery checks. Do not weaken the archive guard to force an unsupported build.



## Settings layout fix in 1.7.1

The custom soundtrack column now scrolls within 0.3.0’s nested settings layout. The fixed footer stays separate, and music/backup controls remain reachable with space beside the scrollbar. First-run content settings are unchanged.

## Installing release 1.7.1


Requires the original Windows game 0.3.0. If an earlier community-mod preview is installed, close the game and use Uninstall mods to restore the verified original archive, then install your desired community features. Saves are retained. Keep a backup before changing your installation.
