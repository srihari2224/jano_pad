import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

/**
 * Serves /api/enhance during `npm run dev` by reusing the same handler that
 * Vercel runs in production (api/enhance.js). Without this, plain Vite would
 * 404 the AI endpoint locally.
 */
function aiDevApiPlugin(env: Record<string, string>) {
  return {
    name: 'ai-dev-api',
    configureServer(server: any) {
      server.middlewares.use('/api/enhance', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()
        // The handler reads process.env; loadEnv does not populate it.
        if (!process.env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY) {
          process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY
        }
        if (!process.env.OPENROUTER_MODEL && env.OPENROUTER_MODEL) {
          process.env.OPENROUTER_MODEL = env.OPENROUTER_MODEL
        }
        try {
          const { default: handler } = await import('./api/enhance.js')
          await handler(req, res)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[ai-dev-api] handler failed', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'AI request failed' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Empty prefix loads ALL env vars (incl. the non-VITE_ ANTHROPIC_API_KEY).
  const env = loadEnv(mode, process.cwd(), '')
  return {
    build: {
      sourcemap: true,
    },
    plugins: [
      react(),
      sentryVitePlugin({
        org: 'o4511426749923328',
        project: '4511426751692880',
      }),
      aiDevApiPlugin(env),
    ],
  }
})
