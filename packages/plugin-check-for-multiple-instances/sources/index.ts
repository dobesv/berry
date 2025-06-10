import {Configuration, MessageName, Plugin, Project, Report, SettingsType} from '@yarnpkg/core';

import {CheckForMultipleInstancesCommand}                                  from './commands/CheckForMultipleInstancesCommand';
import {findPackagesWithMultipleInstances}                                 from './findPackagesWithMultipleInstances';


declare module '@yarnpkg/core' {
  interface ConfigurationValueMap {
    checkForMultipleInstances: Array<string>;
  }
}

const plugin: Plugin = {
  configuration: {
    checkForMultipleInstances: {
      description: `Check for packages with multiple virtual instances.

      Multiple package instances can cause hard to find bugs with stateful packages like react where the state
      should be shared globally in the application.

      You can specify a list of packages that should be checked in .yarnrc.yml, as "checkForMultipleInstances".  If
      this is provided and there's a detected conflict during yarn install, it will print a warning.

      This also adds a command check-for-multiple-instances to list the packages with multiple instances; if the
      checkForMultipleInstances list is provided, it only reports on the packages matching those patterns, otherwise
      it will check all packages.

      checkForMultipleInstances is a list of glob patterns to match; packages that match the pattern will be checked
      for multiple instances.  It uses micromatch to match the pattern against the package name; refer to micromatch's
      documentation for detailed syntax.

      Negations can be used to "whitelist" specific packages that match an earlier wildcard but should still be allowed
      to have multiple instances.

      For example, you could configure specific packages that you do not want to allow multiple instances of, e.g.

      checkForMultipleInstances:
      - 'react-*'
      - 'styled-components'

      Or you could block multiple instances of all virtual packages by default, and add exclusions for packages
      you want to allow multiple instances of, e.g.

      checkForMultipleInstances:
      - '@myscope/*'
      - '*'
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
        report.reportWarning(MessageName.UNNAMED, `[plugin-check-for-multiple-instances] ${conflicts.size} packages listed in checkForMultipleInstances have multiple instances. Run "yarn check-for-multiple-instances" for details.`);
      }
    },
  },
  commands: [
    CheckForMultipleInstancesCommand, // Add the command here
  ],
};

// eslint-disable-next-line arca/no-default-export
export default plugin;
