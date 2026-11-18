// Metro in the pnpm monorepo (Expo's "Work with monorepos" guide): Expo's
// default config watches the workspace root and resolves the workspace
// packages (@saaliheen/passages, @saaliheen/dataset) through their symlinks
// and package exports, which point at their TypeScript sources.
import { getDefaultConfig } from "expo/metro-config.js";

const config = getDefaultConfig(import.meta.dirname);

export default config;
