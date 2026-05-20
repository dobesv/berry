# plugin-materialize-virtual-workspaces

When a Yarn workspace has a peer dependency, Yarn PnP resolves it through a
"virtual" path of the form `.yarn/__virtual__/<slug>/<depth>/packages/<name>`
that does not exist on disk — PnP rewrites the path on the fly inside its
`fs` shim. That works for `require`/`import`, but it breaks tools that watch
files (`node --watch`, Jest's haste map, nodemon, chokidar, …) because they
ask the OS to watch a path that the kernel can't find.

This plugin creates a real symlink at each virtual workspace path after every
install:

```
.yarn/__virtual__/<slug>/<depth>/packages/<name>  -->  packages/<name>
```

PnP keeps using the virtual path as the resolution key, so peer-dependency
semantics are unchanged. The path is now real on disk, so file watchers
and dependency analyzers see the actual workspace files.

Only **workspace** packages are symlinked. Third-party packages that are
virtualized because they declare peer dependencies are left alone — you don't
edit `node_modules`, so there's nothing for a watcher to react to.

## Installation

```sh
yarn plugin import https://github.com/dobesv/berry/releases/download/plugin-materialize-virtual-workspaces-v1.0/plugin-materialize-virtual-workspaces.js
```

## Notes

- The `.yarn/__virtual__` directory is recreated on every install, so stale
  slugs from previous resolutions don't accumulate.
- Symlinks point at relative paths so the layout stays valid if the project
  directory is moved.
- On Windows the symlinks are created with type `"dir"`. Developer Mode (or
  running with elevated privileges) is required for non-junction symlinks to
  work without warnings.
