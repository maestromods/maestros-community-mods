# Build this preview

Requires Windows, Node.js for development checks, PowerShell, and the .NET Framework C# compiler used by build.ps1.

The source payload is Venus-Mods-Package. Setup.cs is the Windows installer; build.ps1 embeds the payload and background image. Run build.ps1 from this directory after validating changes. The script refuses to overwrite an existing dist/payload.zip.

Target game: Windows 0.3.0.
Original archive SHA256: bf6d54c42d507d48415f5beb9a6950de5a216d307a6d4c42dc39e05e3c1ee72a

manifest.json records patched-archive hashes for every supported selection. Any changes to injected code or bundled venue assets require regeneration of that manifest and repeat validation. A successful syntax check alone is insufficient. Keep the exact-one-anchor checks, staging, backup checks and version restrictions intact.

Distribute the compiled setup and SHA256.txt, or the source tree without test game copies, data, logs, credentials, databases or saves. The source does not include the base game. Do not publish an extracted original game archive.
