import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const currentDir = dirname(fileURLToPath(import.meta.url));
register('@esbuild-kit/esm-loader', pathToFileURL(`${currentDir}/`));
