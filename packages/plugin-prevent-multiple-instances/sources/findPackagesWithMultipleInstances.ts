import {IdentHash, miscUtils, Package, Project, structUtils} from '@yarnpkg/core';
import micromatch                                            from 'micromatch';

/**
 * Find packages that match the configured patterns and have been resolved to multiple instances.
 */
export function findPackagesWithMultipleInstances(project: Project) {
  const instancesByIdent = new Map<IdentHash, Array<Package>>();

  const patterns = project.configuration.get(`preventMultipleInstances`);
  if (patterns?.length) {
    // Adjust the patterns so that an exclusion of a non-virtual package also applies to a virtual package
    const processedPatterns = patterns.map(pattern =>
      pattern.startsWith(`!`) &&
      !pattern.startsWith(`!?(virtual:)`) ? `!?(virtual:)${pattern.slice(1)}` : pattern);
    const packages = miscUtils.sortMap([...project.storedPackages.values()], pkg => {
      return structUtils.stringifyLocator(pkg);
    });
    for (const pkg of packages) {
      const ident = structUtils.stringifyIdent(pkg);
      // Check if the package ident matches the configured patterns
      // For a virtual package we also check against the package name with a prefix "virtual:"
      const idents = [ident];
      if (structUtils.isVirtualLocator(pkg))
        idents.push(`virtual:${ident}`);

      const matched = micromatch(idents, processedPatterns);
      if (matched.length) {
        const baseLocator = structUtils.ensureDevirtualizedLocator(pkg);
        miscUtils.getArrayWithDefault(instancesByIdent, baseLocator.identHash).push(pkg);
      }
    }

    for (const [k, instances] of instancesByIdent) {
      if (instances.length <= 1) {
        instancesByIdent.delete(k);
      }
    }
  }
  return instancesByIdent;
}
