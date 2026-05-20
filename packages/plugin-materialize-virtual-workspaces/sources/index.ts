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

async function materializeVirtualWorkspaces(project: Project) {
  const virtualFolder = project.configuration.get(`virtualFolder`);
  const nativeVirtualFolder = npath.fromPortablePath(virtualFolder);

  // Drop the directory entirely so stale virtual slugs from previous installs
  // don't accumulate. PnP doesn't otherwise need anything on disk under
  // __virtual__, so removing it is safe.
  try {
    rawRmSync(nativeVirtualFolder, {recursive: true, force: true});
  } catch {}

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
    rawSymlinkSync(nativeRelTarget, nativeVirtualPath, `dir`);
    created += 1;
  }

  return created;
}

const plugin: Plugin = {
  hooks: {
    afterAllInstalled: async (project: Project) => {
      await materializeVirtualWorkspaces(project);
    },
  },
};

// eslint-disable-next-line arca/no-default-export
export default plugin;
