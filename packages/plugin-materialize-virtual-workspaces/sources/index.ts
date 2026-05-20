import {Plugin, Project, structUtils}                from '@yarnpkg/core';
import {PortablePath, SymlinkType, VirtualFS, ppath, xfs} from '@yarnpkg/fslib';

const SYMLINK_TYPE: SymlinkType = `dir`;

async function materializeVirtualWorkspaces(project: Project) {
  const virtualFolder = project.configuration.get(`virtualFolder`);

  // Drop the directory entirely so stale virtual slugs from previous installs
  // don't accumulate. PnP doesn't otherwise need anything on disk under
  // __virtual__, so removing it is safe.
  await xfs.removePromise(virtualFolder);

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
    const relTarget = ppath.relative(linkParent, workspace.cwd) as PortablePath;

    await xfs.mkdirPromise(linkParent, {recursive: true});
    await xfs.symlinkPromise(relTarget, virtualPath, SYMLINK_TYPE);
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
