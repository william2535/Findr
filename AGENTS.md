# FINDR release instructions

## Keep the GitHub source backup current

The owner requires every live FINDR website update to include updating the source backup at https://github.com/william2535/Findr (branch `main`). This is standing authorization to perform that backup as part of release work; do not ask for confirmation again for the same action.

- Establish the latest source before making changes. Never replace a newer release with a stale workspace or recovery snapshot.
- Back up the complete editable source used for the verified deployment, including required assets, lockfiles, migrations, tests and non-secret configuration. Do not substitute a compiled deployment archive.
- Exclude credentials, signing keys, real environment files, dependency/build caches, downloaded model weights and user manuals/data. Keep required bundled runtime assets and synthetic test fixtures. Keep the GitHub hosting configuration detached from the original live Site.
- Preserve GitHub-only setup/export documentation and separately retained recovery files. Inspect existing remote changes; do not force-push or overwrite unrelated work.
- Record the live web version, Site/deployment version when available, deployed source revision, and corresponding GitHub backup revision or source manifest. The two repositories may have different commit IDs; verify the application source contents and document intentional export exclusions.
- Push the backup and verify the remote commit and source contents before calling the release fully complete. If the website is live but backup synchronization fails, report that explicitly and retain the prepared backup for retry.
- Keep historical release tags and their checksums immutable. A new backup must use fresh provenance and an updated current-source manifest when maintained.
- This rule is part of the release workflow, not an installed background synchronization service. Do not claim automatic monitoring or synchronization unless it has actually been implemented and verified.

A request to change these instructions alone does not authorize rebuilding or redeploying the live website.
