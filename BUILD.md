# Build and port notes

Compile Setup.cs as a Windows GUI executable using .NET Framework csc.exe. Reference System.Windows.Forms.dll, System.Drawing.dll and System.IO.Compression.dll. Embed payload.zip as VenusModsPayload, Installer-background.png as CityLifePreview. Set Setup.cs PayloadHash to the SHA-256 of payload.zip before compiling. The ZIP must contain Venus-Mods-Package as its top-level folder.

Feature selection uses bits 1=Story/Social, 2=City Life, 4=Music/naming, 8=Meanwhile. All 15 nonempty combinations are supported. Run build.ps1 on Windows to create the installer and checksums in dist.

For a new official game release, inspect renderer/main/preload changes, port each affected anchor/API, and test every feature combination, install/uninstall path using disposable copies. The installer pins the pristine 0.2.0 source hash independently of manifest.json to prevent accidentally releasing a patch against an already modded archive. Never regenerate that baseline from an active user installation. Do not bypass the hash check to force another version to accept a patch.

Retain the legacy uninstall manifest and two-backup verification for compatibility. Keep previous release artifacts. Do not include private saves, API settings, SQLite playthrough databases or logs in distribution packages.
