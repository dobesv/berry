
This plugin helps identify packages which should not be allowed to be installed multiple times.

This is important for stateful packages like react where the state should be shared globally in the application.

Provide a list of glob patterns to match; packages that match the pattern will not be allowed to be installed multiple
times.  This uses micromatch to match the pattern against the package name and version, so refer to micromatch's
documentation for detailed syntax.

Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
to have multiple instances.

Use a prefix of "virtual:" with a wildcard to only match packages that have peer dependencies, e.g. "virtual:*"
to block multiple instances of packages with peer dependencies by default.

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
