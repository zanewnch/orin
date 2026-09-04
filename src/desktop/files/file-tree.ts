/**
 * Re-export: pure file-tree helpers live in `src/composer/file-tree.ts` so the common
 * host path (sidebar / remote browse) does not import from `desktop/`.
 * Desktop modules in `files/` keep `./file-tree`; other desktop folders import `../files/file-tree`.
 */
export * from "../../composer/file-tree";
