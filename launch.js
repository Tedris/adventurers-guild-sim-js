import { build } from 'esbuild';
import { copyFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { createServer } from 'http';

const DIST_DIR = resolve('dist');
const PORT = 8123;

// --- Build ---
console.log('[launch] Building...');
build({
  entryPoints: ['src/app.js', 'src/styles.css'],
  outdir: DIST_DIR,
  bundle: true,
  sourcemap: false,
  minify: true,
  splitting: false,
  format: 'iife',
  globalName: 'App',
})
  .then(() => {
    copyFileSync(resolve('index.html'), resolve(DIST_DIR, 'index.html'));
    console.log('[launch] Build complete.');
    return serve();
  })
  .catch((err) => {
    console.error('[launch] Build failed:', err.message);
    process.exit(1);
  });

// --- Server ---
function serve() {
  const server = createServer((req, res) => {
    let filePath = resolve(DIST_DIR, req.url === '/' ? 'index.html' : req.url);
    const ext = filePath.split('.').pop().toLowerCase();
    const types = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      gif: 'image/gif',
      json: 'application/json',
    };
    const contentType = types[ext] || 'application/octet-stream';

    import('fs').then(fs => {
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`[launch] Server running on http://localhost:${PORT}`);
    openBrowser();
  });

  // Clean shutdown
  const shutdown = () => {
    console.log('\n[launch] Shutting down...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// --- Open browser (cross-platform) ---
function openBrowser() {
  const url = `http://localhost:${PORT}`;
  const platform = process.platform;
  let cmd;

  if (platform === 'win32') {
    cmd = `start "" "${url}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;
  } else {
    // Linux — try xdg-open, fallback to sensible defaults
    try {
      execSync('which xdg-open', { stdio: 'pipe' });
      cmd = `xdg-open "${url}"`;
    } catch {
      // Fallbacks for common Linux DEs
      const env = process.env.XDG_CURRENT_DESKTOP;
      if (env?.includes('GNOME')) cmd = `gvfs-open "${url}"`;
      else if (env?.includes('KDE')) cmd = `xdg-open "${url}"`;
      else cmd = `firefox "${url}" || chrome "${url}" || chromium "${url}"`;
    }
  }

  try {
    execSync(cmd, { stdio: 'ignore' });
    console.log(`[launch] Opening browser...`);
  } catch {
    console.log(`[launch] Could not open browser automatically.`);
    console.log(`[launch] Please open: ${url}`);
  }
}
