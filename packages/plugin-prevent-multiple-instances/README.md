
This plugin helps identify packages which should not be allowed to be installed multiple times.

This is important for stateful packages like react where the state should be shared globally in the application.

To use it, update `.yarnrc.yml` to provide a list of glob patterns to match as `preventMultipleInstances`; packages
that match the pattern will not be allowed to be installed multiple times.  This uses micromatch to match the
pattern against the package name and version, so refer to micromatch's documentation for detailed syntax.

Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
to have multiple instances.  Note that negations must occur after the pattern they negate in order to work.

Use a prefix of "virtual:" with a wildcard to only match dependencies that have peer dependencies, e.g. "virtual:*"
to block multiple instances of packages with peer dependencies by default.  Note that this doesn't match workspace
packages, though.

For example, you could configure specific packages that you do not want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
preventMultipleInstances:
- 'react-*'
- 'styled-components'
```

Or you could block multiple instances of all virtual packages and your own scoped package
by default, and add exclusions for packages you want to allow multiple instances of, e.g.

```yaml
# In .yarnrc.yml
preventMultipleInstances:
- '@myscope/*'
- 'virtual:*'
- '!debug'
- '!typescript'
- '!babel*'
```

Then when you run `yarn install` it will warn you if it detects multiple instances of packages according to
the confirmation.  If you run `yarn check-for-multiple-instances` it will print out the packages with multiple
instances, their dependent packages, and how peer dependencies were resolved.

Also, `yarn check-for-multiple-instances` will exit status 1 if multiple instances were found, so you can use this
in a lint/CI check and report failure.
