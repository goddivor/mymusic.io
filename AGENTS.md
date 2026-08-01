# This is NOT the React Native you know

React Native 0.85 is **New-Architecture-only**: the legacy Bridge is gone (no `reactInstanceManager`,
no bridge NativeModules interop). Released 2026-04-07. Read the module/native code before writing glue.

## Known divergences from training data

- **No Bridge.** TurboModules/Fabric only. Native events go via `reactHost.currentReactContext`, not `reactNativeHost.reactInstanceManager` (see `patches/`).
- **react-native-track-player 4.1.2** is not New-Arch-ready out of the box — 4 patch-package patches in `patches/` (TurboModule void return, bridgeless emit, foreground-service try/catch, Bundle null-safety), reapplied on postinstall.
- **op-sqlite**: use `executeSync()` for synchronous queries; `execute()` returns a Promise.
- **Build needs JDK 21** — the machine's Java 25 is a JRE with no compiler.

Verified 2026-07-27 against reactnative.dev/blog/2026/04/07/react-native-0.85 and the op-sqlite npm page.
