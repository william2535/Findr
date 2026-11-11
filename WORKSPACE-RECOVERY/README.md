# Original workspace edits retained separately

The development checkout at `/workspace/sites/findr` was based on commit `a26b564` and contained an unfinished web 0.32.0 change. The latest source repository is web 0.32.6, Site version 69. The main project in this ZIP is that newer source, not a deployment archive.

`original-workspace-files.zip` preserves every differing eligible modified or untracked workspace file at its original relative path. Extract it outside the main project before reviewing TypeScript files. These are recovery copies, **not an overlay to apply automatically**: applying old 0.32.0 files over 0.32.6 could undo newer fixes. Review or cherry-pick only genuinely local work. Identical files are already present in the main project and are not duplicated. Generated builds and signing secrets are excluded in both trees.
