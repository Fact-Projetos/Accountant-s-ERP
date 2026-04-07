import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';

// ─── Plugin: Auto-start automation-server alongside Vite ─────────
function automationServerPlugin(): Plugin {
  let serverProcess: ChildProcess | null = null;

  return {
    name: 'fact-automation-server',
    configureServer() {
      const serverDir = path.resolve(__dirname, 'automation-server');
      const serverFile = path.join(serverDir, 'server.js');
      const nodeModules = path.join(serverDir, 'node_modules');

      // Skip if automation-server doesn't exist
      if (!existsSync(serverFile)) {
        console.log('\x1b[33m[Fact ERP]\x1b[0m automation-server/server.js não encontrado. Pulando...');
        return;
      }

      // Check if node_modules are installed
      if (!existsSync(nodeModules)) {
        console.log('\x1b[36m[Fact ERP]\x1b[0m Instalando dependências do automation-server...');
        const install = spawn('npm', ['install'], {
          cwd: serverDir,
          stdio: 'inherit',
          shell: true,
        });
        install.on('close', (code) => {
          if (code === 0) {
            startServer(serverDir);
          } else {
            console.error('\x1b[31m[Fact ERP]\x1b[0m Erro ao instalar dependências do automation-server.');
          }
        });
      } else {
        startServer(serverDir);
      }

      function startServer(cwd: string) {
        console.log('\n\x1b[36m══════════════════════════════════════════\x1b[0m');
        console.log('\x1b[36m  Fact ERP - Servidor de Automação\x1b[0m');
        console.log('\x1b[36m  Iniciando automaticamente na porta 3099\x1b[0m');
        console.log('\x1b[36m══════════════════════════════════════════\x1b[0m\n');

        serverProcess = spawn('node', ['server.js'], {
          cwd,
          stdio: 'pipe',
          shell: true,
        });

        serverProcess.stdout?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.log(`\x1b[36m[AutoServer]\x1b[0m ${msg}`);
        });

        serverProcess.stderr?.on('data', (data: Buffer) => {
          const msg = data.toString().trim();
          if (msg) console.error(`\x1b[31m[AutoServer]\x1b[0m ${msg}`);
        });

        serverProcess.on('error', (err) => {
          console.error('\x1b[31m[AutoServer]\x1b[0m Erro ao iniciar:', err.message);
        });

        serverProcess.on('close', (code) => {
          if (code !== null && code !== 0) {
            console.error(`\x1b[31m[AutoServer]\x1b[0m Encerrado com código ${code}`);
          }
          serverProcess = null;
        });
      }

      // Cleanup: kill server when Vite shuts down
      const cleanup = () => {
        if (serverProcess && !serverProcess.killed) {
          console.log('\n\x1b[36m[Fact ERP]\x1b[0m Encerrando servidor de automação...');
          serverProcess.kill('SIGINT');
          serverProcess = null;
        }
      };

      process.on('exit', cleanup);
      process.on('SIGINT', () => { cleanup(); process.exit(0); });
      process.on('SIGTERM', () => { cleanup(); process.exit(0); });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), automationServerPlugin()],
    optimizeDeps: {
      include: [],
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            icons: ['lucide-react'],
          }
        }
      }
    }
  };
});
