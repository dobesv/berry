
This plugin helps identify packages that have multiple virtual instances due to peer dependencies.

This is important for stateful packages like react where the state should be shared globally in the application.

To use it, update `.yarnrc.yml` to provide a list of glob patterns to match as `checkForMultipleInstances`; packages
that match the pattern will not be allowed to be installed multiple times.  This uses micromatch to match the
pattern against the package name and version, so refer to micromatch's documentation for detailed syntax.

Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
to have multiple instances.  Note that negations must occur after the pattern they negate.

For example, you could configure specific packages that you do not want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
checkForMultipleInstances:
- 'react-*'
- 'styled-components'
```

Or you could block multiple instances of all packages and your own scoped package
by default, and add exclusions for packages you want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
checkForMultipleInstances:
- '*'
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
yarn plugin import https://github.com/dobesv/berry/releases/download/plugin-check-for-multiple-instances-v1.2/plugin-check-for-multiple-instances.js
```
