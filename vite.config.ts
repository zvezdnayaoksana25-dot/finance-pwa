import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const basePath = (globalThis as { process?: { env?: { BASE_PATH?: string } } }).process?.env?.BASE_PATH || '/';

export default defineConfig({ base: basePath, plugins: [react()] });
