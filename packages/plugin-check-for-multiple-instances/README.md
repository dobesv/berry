
This plugin helps identify packages that have multiple virtual instances due to peer dependencies.

This is important for stateful packages like react where the state should be shared globally in the application.

To use it, update `.yarnrc.yml` to provide a list of glob patterns to match as `checkForMultipleInstances`; packages
that match the pattern will not be allowed to be installed multiple times.  This uses micromatch to match the
pattern against the package name, so refer to micromatch's documentation for detailed syntax.

Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
to have multiple instances.  Note that negations must occur after the pattern they negate.

**Important:** Use `**` (double asterisk) instead of `*` if you want to match all packages including scoped
packages (e.g., `@scope/package`). A single `*` does not match the `/` character in glob patterns, so `*` will
match `react` but not `@formative/browser-session`.

For example, you could configure specific packages that you do not want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
checkForMultipleInstances:
- 'react-*'
- 'styled-components'
- '@myorg/*'  # match all packages in your org's scope
```

Or you could block multiple instances of all packages (including scoped packages)
by default, and add exclusions for packages you want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
checkForMultipleInstances:
- '**'  # use ** to match scoped packages like @scope/package
- '!debug'
- '!typescript'
- '!babel*'
```

Then when you run `yarn install` it will warn you if it detects multiple instances of packages according to
the confirmation.  If you run `yarn check-for-multiple-instances` it will print out the packages with multiple
instances, their dependent packages, and how peer dependencies were resolved.

Also, `yarn check-for-multiple-instances` will exit status 1 if multiple instances were found, so you can use this
in a lint/CI check and report failure.

Installation:

```sh
yarn plugin import https://github.com/dobesv/berry/releases/download/plugin-check-for-multiple-instances-v1.3/plugin-check-for-multiple-instances.js
```
