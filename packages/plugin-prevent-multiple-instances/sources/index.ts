import {Configuration, MessageName, Plugin, Project, Report, SettingsType} from '@yarnpkg/core';

import {CheckForMultipleInstancesCommand}                                  from './commands/CheckForMultipleInstancesCommand';
import {findPackagesWithMultipleInstances}                                 from './findPackagesWithMultipleInstances';


declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    preventMultipleInstances: Array<string>;
  }
}

const plugin: Plugin = {
  configuration: {
    preventMultipleInstances: {
      description: `Indicate packages which should not be allowed to be installed multiple times.

      This is important for stateful packages like react where the state should be shared globally in the application.

      Provide a list of glob patterns to match; packages that match the pattern will not be allowed to be installed multiple
      times.  This uses micromatch to match the pattern against the package name and version, so refer to micromatch's
      documentation for detailed syntax.

      Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
      to have multiple instances.

      Use a prefix of "virtual:" with a wildcard to only match packages that have peer dependencies, e.g. "virtual:*"
      to block multiple instances of packages with peer dependencies by default.

      For example, you could configure specific packages that you do not want to allow multiple instances of, e.g.

      preventMultipleInstances:
      - 'react-*'
      - 'styled-components'

      Or you could block multiple instances of all virtual packages by default, and add exclusions for packages
      you want to allow multiple instances of, e.g.

      preventMultipleInstances:
      - 'virtual:*'
      - '!debug'
      - '!webpack*'
      - '!*-loader'
      - '!typescript'
      - '!babel*'

      `,
      isArray: true,
      type: SettingsType.STRING,
      default: [],
    },
  },
  hooks: {
    afterAllInstalled: async (project: Project, {report}: {report: Report, configuration: Configuration}) => {
      const conflicts = findPackagesWithMultipleInstances(project);
      if (conflicts.size) {
        report.reportWarning(MessageName.UNNAMED, `[plugin-prevent-multiple-instances] ${conflicts.size} packages listed in preventMultipleInstances have multiple instances. Run "yarn check-for-multiple-instances" for details.`);
      }
    },
  },
  commands: [
    CheckForMultipleInstancesCommand, // Add the command here
  ],
};

// eslint-disable-next-line arca/no-default-export
export default plugin;
