import {BaseCommand}                       from '@yarnpkg/cli';
import {Command, UsageError}               from 'clipanion';

import {findPackagesWithMultipleInstances} from '../findPackagesWithMultipleInstances';

import {
  Configuration,
  formatUtils,
  Locator,
  LocatorHash,
  miscUtils,
  Project,
  structUtils,
  treeUtils,
} from '@yarnpkg/core';

// Assuming detectedConflicts is exported from src/index.ts

export class CheckForMultipleInstancesCommand extends BaseCommand {
  static paths = [[`check-for-multiple-instances`]];

  static usage = Command.Usage({
    description: `Detects multiple instances of packages due to peer dependency conflicts.`,
    details: `
      This command lists packages that have multiple instances within the project, along with
      their dependents and the peer dependency resolutions for each instance.

      If there are multiple instances found, the command will exit with a non-zero exit code.

      If checkForMultipleInstances is set in .yarnrc.yml, this only checks for multiple instances
      of packages matching the given patterns.
    `,
    examples: [[
      `Show detected but forbidden multiple package instances`,
      `yarn check-for-multiple-instances`,
    ]],
  });

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
    const {project} = await Project.find(configuration, this.context.cwd);

    await project.restoreInstallState();
    const patterns = project.configuration.get(`checkForMultipleInstances`);
    const instancesByIdent = findPackagesWithMultipleInstances(project, patterns?.length ? patterns : [`*`]);

    if (instancesByIdent.size) {
      const dependentMap = new Map<LocatorHash, Array<Locator>>();

      for (const pkg of miscUtils.sortMap([...project.storedPackages.values()], pkg => {
        return structUtils.stringifyLocator(pkg);
      })) {
        for (const dependency of pkg.dependencies.values()) {
          const resolution = project.storedResolutions.get(dependency.descriptorHash);
          miscUtils.getArrayWithDefault(dependentMap, resolution).push(pkg);
        }
      }
      const infoTreeChildren: treeUtils.TreeMap = {};
      const infoTree: treeUtils.TreeNode = {children: infoTreeChildren};

      for (const [identHash, instances] of instancesByIdent.entries()) {
        infoTreeChildren[identHash] = {
          value: [instances[0], formatUtils.Type.IDENT],
          children: {
            Instances: {
              label: `Instances`,
              value: [instances.length, formatUtils.Type.NUMBER],
              children: instances.map(instance => {
                const dependents = dependentMap.get(instance.locatorHash);
                return {
                  value: [instance, formatUtils.Type.LOCATOR],
                  children: [
                    ...dependents?.length ? [{
                      label: `Dependents`,
                      children: dependents.map(dependent => {
                        return {
                          value: formatUtils.tuple(formatUtils.Type.LOCATOR, dependent),
                        };
                      }),
                    }] : [],
                    ...instance.peerDependencies.size ? [
                      {
                        label: `Peer dependencies`,
                        children: Array.from(instance.peerDependencies.values()).map(
                          peerDependency => {
                            const dependency = instance.dependencies.get(peerDependency.identHash);

                            const resolutionHash = typeof dependency !== `undefined`
                              ? project.storedResolutions.get(dependency.descriptorHash) ?? null
                              : null;

                            const resolution = resolutionHash !== null
                              ? project.storedPackages.get(resolutionHash) ?? null
                              : null;

                            return {
                              value: formatUtils.tuple(formatUtils.Type.RESOLUTION, {
                                descriptor: peerDependency,
                                locator: resolution,
                              }),
                            };
                          }),
                      },
                    ] : [],
                  ],
                };
              }),
            },
          },
        };
      }

      treeUtils.emitTree(infoTree, {
        configuration,
        json: false,
        stdout: this.context.stdout,
        separators: 2,
      });

      throw new UsageError(`Multiple instances of packages detected due to peer dependency mismatches. This can lead to runtime errors.`);
    } else if (!project.configuration.get(`checkForMultipleInstances`)) {
      throw new UsageError(`No patterns defined in checkForMultipleInstances in your yarn configuration, no checking will be done.`);
    }
  }
}
