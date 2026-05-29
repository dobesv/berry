import {Plugin, Project, structUtils} from '@yarnpkg/core';
import {VirtualFS, npath, ppath}      from '@yarnpkg/fslib';
import * as nodeFs                    from 'fs';
import * as nodePath                  from 'path';

// `@yarnpkg/fslib`'s xfs goes through Yarn's PnP-patched fs, which rewrites
// any path under `.yarn/__virtual__` to its real (devirtualized) target.
// That defeats the entire point of this plugin, so we reach for the raw fs
// binding to do the directory and symlink creation directly.
const rawSymlinkSync: (target: string, p: string, type?: string) => void = (nodeFs as any).symlinkSync;
const rawMkdirSync: (p: string, opts?: any) => void = (nodeFs as any).mkdirSync;
const rawRmSync: (p: string, opts?: any) => void = (nodeFs as any).rmSync;
const rawReaddirSync: (p: string) => Array<string> = (nodeFs as any).readdirSync;

// Matches slugs produced by structUtils.slugifyLocator() for virtual locators:
// "<name>-virtual-<10 hex chars>" (with an optional "@scope-" prefix folded
// into the name part).
const VIRTUAL_SLUG_REGEX = /-virtual-[a-f0-9]+$/;

function cleanStaleVirtualSlugs(virtualFolder: string) {
  let entries: Array<string>;
  try {
    entries = rawReaddirSync(virtualFolder);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!VIRTUAL_SLUG_REGEX.test(entry))
      continue;
    rawRmSync(nodePath.join(virtualFolder, entry), {recursive: true, force: true});
  }
}

async function materializeVirtualWorkspaces(project: Project) {
  const virtualFolder = project.configuration.get(`virtualFolder`);
  const nativeVirtualFolder = npath.fromPortablePath(virtualFolder);

  // Remove existing slug subdirectories so stale entries from previous
  // installs don't accumulate. Only entries matching the virtual-slug pattern
  // are touched — that way a misconfigured `virtualFolder` (or a future
  // schema change) can't lead us to delete unrelated content.
  cleanStaleVirtualSlugs(nativeVirtualFolder);

  let created = 0;

  for (const pkg of project.storedPackages.values()) {
    if (!structUtils.isVirtualLocator(pkg))
      continue;

    const devirtualized = structUtils.devirtualizeLocator(pkg);
    const workspace = project.tryWorkspaceByLocator(devirtualized);
    if (!workspace)
      continue;

    const virtualName = structUtils.slugifyLocator(pkg);
    const virtualPath = VirtualFS.makeVirtualPath(virtualFolder, virtualName, workspace.cwd);
    const linkParent = ppath.dirname(virtualPath);
    const nativeLinkParent = npath.fromPortablePath(linkParent);
    const nativeVirtualPath = npath.fromPortablePath(virtualPath);
    const nativeWorkspaceCwd = npath.fromPortablePath(workspace.cwd);
    const nativeRelTarget = nodePath.relative(nativeLinkParent, nativeWorkspaceCwd);

    rawMkdirSync(nativeLinkParent, {recursive: true});
    try {
      rawSymlinkSync(nativeRelTarget, nativeVirtualPath, `dir`);
      created += 1;
    } catch (err) {
      // If the symlink is already there, leave it as-is and move on — there's
      // nothing to fix and no reason to warn. Anything else is unexpected and
      // should propagate to the hook's error handler.
      if ((err as NodeJS.ErrnoException).code !== `EEXIST`)
        throw err;
    }
  }

  return created;
}

const plugin: Plugin = {
  hooks: {
    afterAllInstalled: async (project: Project) => {
      try {
        await materializeVirtualWorkspaces(project);
      } catch (err) {
        // Materializing virtual workspaces is a best-effort convenience for
        // file watchers; never let a filesystem error crash `yarn install`.
        console.warn(`[plugin-materialize-virtual-workspaces] Warning: failed to materialize virtual workspaces: ${(err as Error).message}`);
      }
    },
  },
};

// eslint-disable-next-line arca/no-default-export
export default plugin;
