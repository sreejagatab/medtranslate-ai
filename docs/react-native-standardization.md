# React Native Version Standardization

This document outlines the process of standardizing React Native versions across all MedTranslate AI applications.

## Current Status

The MedTranslate AI project has been standardized to use React Native version 0.72.10 and Expo SDK 49 across all applications.

| Application | Previous Version | Current Version | Expo SDK |
|-------------|------------------|-----------------|----------|
| frontend/patient-app | 0.71.14 | 0.72.10 | 49.0.15 |
| frontend/provider-app | 0.71.14 | 0.72.10 | 49.0.15 |
| mobile/patient-app | 0.72.10 | 0.72.10 | 49.0.15 |

## Why Standardize?

Standardizing React Native versions across all applications provides several benefits:

1. **Consistent Development Experience**: Developers can use the same tools and techniques across all applications.
2. **Simplified Dependency Management**: Reduces conflicts and compatibility issues with shared libraries.
3. **Easier Maintenance**: Updates and security patches can be applied consistently.
4. **Code Sharing**: Components and utilities can be shared more easily between applications.
5. **Consistent User Experience**: Ensures consistent behavior and performance across all applications.

## Standardization Process

The standardization process involved the following steps:

1. **Analysis**: Identified all React Native applications and their current versions.
2. **Version Selection**: Selected React Native 0.72.10 and Expo SDK 49 as the target versions.
3. **Package.json Updates**: Updated all package.json files to use the target versions.
4. **Dependency Resolution**: Created and ran scripts to fix dependency issues.
5. **Testing**: Tested all applications to ensure they work correctly with the new versions.
6. **Documentation**: Updated documentation to reflect the standardized versions.

## Maintenance Guidelines

To maintain version consistency across applications:

1. **Coordinated Updates**: When updating React Native or Expo, update all applications together.
2. **Version Check Script**: Run the version check script regularly to ensure consistency:
   ```bash
   grep -r "\"react-native\":" --include="package.json" .
   ```
3. **Dependency Fix Script**: Use the dependency fix script when needed:
   ```bash
   node scripts/fix-dependencies.js
   ```
4. **Testing**: Always test all applications after version updates:
   ```bash
   node scripts/test-react-native-updates.js
   ```

## Troubleshooting Common Issues

### Expo SDK Version Mismatch

If you encounter Expo SDK version mismatches:

```bash
# Check current Expo versions
grep -r "\"expo\":" --include="package.json" .

# Update Expo SDK version
npx expo-cli upgrade
```

### Native Module Version Conflicts

If you encounter native module version conflicts:

```bash
# Clean installation
rm -rf node_modules
npm cache clean --force
npm install

# Fix specific dependencies
npx expo install [package-name]@[version]
```

### Metro Bundler Issues

If you encounter Metro bundler issues:

```bash
# Clear Metro cache
npx react-native start --reset-cache
```

## Future Updates

When planning future React Native or Expo SDK updates:

1. **Research Compatibility**: Check compatibility between React Native, Expo SDK, and key dependencies.
2. **Create Update Plan**: Document the update process and potential issues.
3. **Test in Isolation**: Test updates in a branch before applying to all applications.
4. **Gradual Rollout**: Consider updating one application first to identify issues.
5. **Update Documentation**: Update this document with new version information.

## Resources

- [React Native Upgrading Guide](https://reactnative.dev/docs/upgrading)
- [Expo SDK Documentation](https://docs.expo.dev/)
- [Expo SDK Version Compatibility](https://docs.expo.dev/versions/latest/)
