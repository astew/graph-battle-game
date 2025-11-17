# Repository Agent Guide

## Scope and Hierarchy
- This file is the root directive for all coding agents working in this repository.
- Before making changes, locate any `AGENTS.md` files in relevant subdirectories; they add to and may override these instructions.
- Unless a child document explicitly says otherwise, assume every directive here continues to apply.

## Orientation
- Read `README.md` at the repository root and any local READMEs referenced by child guides before editing or running tooling.
- Keep changes ASCII-only unless the existing file already uses non-ASCII characters for a clear reason.
- Favor incremental commits; do not rewrite unrelated files or revert user-authored changes.

## Tooling Expectations
- Use npm workspaces from the repository root. Examples: `npm install`, `npm run build`, `npm test --workspaces`.
- Only introduce additional build tools or dependencies after confirming they align with the existing setup (Node 18+, Vite for the UI, simple Node scripts for packages).
- When scripts exist, use them instead of re-implementing equivalent behaviors.

## Build and Test
- Primary build: `npm run build` (executes workspace builds).
- Primary tests: `npm test` or workspace-scoped variants.
- Do not assume `npm start` or other commands exist unless confirmed.
- Verify builds/tests succeed after making impactful changes.

## Documentation Links
- Human/agent shared docs: see `README.md` at the root and under each workspace directory.
- Game design notes live in `docs/`.

## Coding Conventions (Placeholder)
- Repository-wide code-style conventions will be documented later. Follow existing patterns in affected files until specific rules are defined here or in child guides.


## Miscellaneous
- "Fallback logic" is anathema in this repository. Its primary purpose is to mask bugs. All code should be **strict** about the form of its inputs, whether that comes from arguments, results of function calls, configuration files, the user, or any other source.
