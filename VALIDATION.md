# Validation — terminal release 1.8.2

Earlier engine checks, retained as prior evidence:
- Actual mods.cmd commands ran through the supported game's bundled Electron/Node runtime using a disposable game copy whose path contained spaces and an ampersand.
- Compatibility check left the archive unchanged. Install/uninstall passed for Breakthrough alone, City Life/jobs/music, and all nine features, with expected patched archive hashes, exact original restoration and saved-data preservation.
- The normal running-game check refused installation while a real game was open. For isolated transaction tests only, the process probe was mocked inside the disposable fixture; no mock is shipped.
- Damaged original backups and unknown feature choices were refused. A simulated previous 1.7.1 installation record uninstalled successfully.
- The interactive batch menu passed folder input, individual feature choices, automatic skipping of jobs when City Life was disabled, and a check-only result.
- Command parsing rejects unsupported actions/options, unknown features, empty selections and jobs without City Life. Script syntax checks passed.
- All game patches, venue assets and validated combination hashes are unchanged from 1.7.1. Prior gameplay and full combination checks remain prior evidence; this release changes launching and selection, not game behavior.

No user's installed game or personal save was edited during verification. The terminal package still requires the original supported Windows game 0.3.0. These checks do not represent a new complete AI-generated gameplay regression.

The 1.8.2 regression test ran the actual double-click-style batch entry with native CMD input: an invalid 1-4 entry prompted again, a quoted folder with spaces and an ampersand was accepted, selected-feature check succeeded, and the terminal stayed open until exit was typed. Game patch code is unchanged; earlier install/uninstall checks remain prior evidence.

A real Windows terminal session also accepted the user target folder, waited for menu choice 2, accepted all nine feature answers and ran a read-only compatibility check.
