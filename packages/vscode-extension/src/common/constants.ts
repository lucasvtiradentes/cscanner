import { IS_DEV } from './utils/is-dev';

export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'cscanner-vscode';
export const EXTENSION_ID_PROD = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
export const EXTENSION_ID_DEV = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}-dev`;
export const EXTENSION_DISPLAY_NAME = 'Cscanner';

export const CONTEXT_PREFIX = 'cscanner';
export const VIEW_CONTAINER_ID = 'cscanner';
export const VIEW_ID = 'cscannerExplorer';

export const DEV_SUFFIX = 'Dev';

export function getCommandId(command: string): string {
  return IS_DEV ? `${CONTEXT_PREFIX}${DEV_SUFFIX}.${command}` : `${CONTEXT_PREFIX}.${command}`;
}

export function getContextKey(key: string): string {
  return IS_DEV ? `${key}${DEV_SUFFIX}` : key;
}

export function getViewId(): string {
  return IS_DEV ? `${VIEW_ID}${DEV_SUFFIX}` : VIEW_ID;
}

export const BINARY_BASE_NAME = 'cscanner-server';

export function getBinaryName(): string {
  return process.platform === 'win32' ? `${BINARY_BASE_NAME}.exe` : BINARY_BASE_NAME;
}

export const PLATFORM_TARGET_MAP: Record<string, string> = {
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'win32-x64': 'x86_64-pc-windows-msvc',
};
