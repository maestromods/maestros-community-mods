# Packaging and development

The distribution is the source tree itself. Package `mods.cmd`, `Venus-Mods-Package`, README.md, BUILD.md, VALIDATION.md, LICENSE and .gitignore together. Do not include game archives, test fixtures, save data, databases, credentials, build caches or an older setup executable.

`Venus-Mods-Package/terminal.cjs` validates named-feature selection, then runs the existing `install.cjs` engine in the same process. This keeps the game runtime from being counted as an additional open game. Errors produce a nonzero exit status. `mods.cmd` collects interactive input using native CMD prompts before starting the runtime. It locates the game runtime and sets ELECTRON_RUN_AS_NODE inside its local environment. The underlying backup, staging, manifest and uninstall checks remain in install.cjs.

Target: original Windows Venus University 0.3.0.
Original archive SHA-256: bf6d54c42d507d48415f5beb9a6950de5a216d307a6d4c42dc39e05e3c1ee72a

Changes to game patches or venue assets require regenerating manifest.json and verifying every supported selection. Do not weaken exact anchors, archive hashes or backup checks to force installation. No native game code or assets are supplied by the terminal launcher.
