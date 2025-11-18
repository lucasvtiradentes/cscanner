export const EXTENSION_PUBLISHER = 'lucasvtiradentes';
export const EXTENSION_NAME = 'lino-vscode';
export const EXTENSION_ID_PROD = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;
export const EXTENSION_ID_DEV = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}-dev`;
export const EXTENSION_DISPLAY_NAME = 'Lino';

export const CONTEXT_PREFIX = 'lino';
export const VIEW_CONTAINER_ID = 'lino';
export const VIEW_ID = 'linoExplorer';

export const DEV_SUFFIX = 'Dev';

export const BINARY_BASE_NAME = 'lino-server';

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
