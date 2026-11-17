import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import { profile, projects } from './src/content'
import { sitePath } from './src/paths'

let buildDirectory: string
let buildBase: string

type Meta = { title: string; description: string; image: string; width?: number; height?: number }

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** Rewrites title and link-preview tags so each route shares its own card. */
function withMeta(html: string, meta: Meta) {
  const siteUrl = process.env.PAGES_SITE_URL || profile.siteUrl
  const image = siteUrl
    ? new URL(meta.image.replace(/^\/(?!\/)/, ''), `${siteUrl.replace(/\/+$/, '')}/`).href
    : sitePath(meta.image, buildBase)
  const set = (attr: 'name' | 'property', key: string, value: string) => {
    const pattern = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`)
    html = html.replace(pattern, `$1${escape(value)}$2`)
  }
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`)
  set('name', 'description', meta.description)
  set('property', 'og:title', meta.title)
  set('property', 'og:description', meta.description)
  set('property', 'og:image', image)
  if (!meta.width) {
    html = html.replace(/\s*<meta property="og:image:(width|height)" content="[^"]*" \/>/g, '')
  }
  return html
}

export default defineConfig({
  plugins: [{
    name: 'portfolio-static-routes',
    apply: 'build',
    configResolved(config) {
      buildDirectory = resolve(config.root, config.build.outDir)
      buildBase = config.base
    },
    async closeBundle() {
      const template = await readFile(resolve(buildDirectory, 'index.html'), 'utf8')
      const base: Meta = {
        title: `${profile.name} — Portfólio`,
        description: `Portfólio de ${profile.name}, ${profile.subtitle.toLowerCase()}.`,
        image: '/og.png',
        width: 1200,
        height: 630,
      }
      const routes: [string, Meta][] = [
        ['index.html', base],
        ['404.html', { ...base, title: `Página não encontrada — ${profile.name}` }],
        ['sobre/index.html', { ...base, title: `Sobre — ${profile.name}`, description: profile.bio[0] ?? base.description }],
        ['contato/index.html', { ...base, title: `Contato — ${profile.name}` }],
        ...projects.map((project): [string, Meta] => [`projetos/${project.slug}/index.html`, {
          title: `${project.title} — ${profile.name}`,
          description: project.summary?.[0] ?? `${project.category} · ${profile.name}`,
          ...(project.cover.kind === 'image' ? { image: project.cover.src } : { image: '/og.png', width: 1200, height: 630 }),
        }]),
      ]

      await Promise.all(routes.map(async ([path, meta]) => {
        const destination = resolve(buildDirectory, path)
        await mkdir(dirname(destination), { recursive: true })
        await writeFile(destination, withMeta(template, meta))
      }))
    },
  }],
})
