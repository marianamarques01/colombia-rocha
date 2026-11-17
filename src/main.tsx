import { createRoot } from 'react-dom/client'
import { Fragment, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/baskervville/latin-400.css'
import '@fontsource/baskervville/latin-400-italic.css'
import '@fontsource/inter-tight/latin-400.css'
import '@fontsource/inter-tight/latin-500.css'
import '@fontsource/outfit/latin-400.css'
import '@fontsource/outfit/latin-500.css'
import '@fontsource/outfit/latin-800.css'
import '@fontsource/nunito/latin-900.css'
import '@fontsource/yellowtail/latin-400.css'
import { catalogNumber, profile, projectAccent, projectPath, projects, type Cover, type Media, type Project } from './content'
import { DiscFace } from './Disc'
import { Gallery } from './Gallery'
import { sitePath } from './paths'
import { ORGANIC_STAR, Star, StarMark } from './Star'
import { readSession, writeSession } from './session'
import { setTheme, themeLabels, useTheme } from './theme'
import './styles.css'

const splashKey = 'colombia.splash-seen'
const reducedMotion = '(prefers-reduced-motion: reduce)'
/** Total length of the opening, in ms. Keep in sync with --opening in styles.css. */
const OPENING_MS = 2600
const ARRIVAL_MS = 1500

type Page = 'projects' | 'project' | 'about' | 'contact' | 'missing'

/* ---------------- navigation ---------------- */

function Navigation({ page, inert }: { page: Page; inert?: boolean }) {
  const items: { href: string; label: string; current: boolean; sup?: string; external?: boolean }[] = [
    { href: '/#acervo', label: 'Projetos', current: page === 'projects' || page === 'project' },
    { href: '/sobre/', label: 'Sobre', current: page === 'about' },
    { href: '/contato/', label: 'Contato', current: page === 'contact' },
  ]
  return (
    <nav className="site-nav" aria-label="Navegação principal" inert={inert}>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <a
              href={sitePath(item.href)}
              aria-current={item.current ? (page === 'project' ? 'location' : 'page') : undefined}
              {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <span className="nav-label">{item.label}</span>
              {item.external && <span className="nav-ext" aria-hidden="true">↗</span>}
            </a>
          </li>
        ))}
        <li className="nav-theme"><ThemeToggle /></li>
      </ul>
    </nav>
  )
}

/* ---------------- home ---------------- */

/** A word whose tail is set in script in the Noite direction (PORT·fólio, Habilida·des). */
/** Small, deterministic irregularity per letter: like type set by hand or cut from paper. */
function jitter(index: number, ch: string): CSSProperties {
  const n = (index * 7919 + ch.charCodeAt(0) * 104729) % 1000 / 1000
  const m = (index * 3571 + ch.charCodeAt(0) * 2903) % 1000 / 1000
  return { '--r': `${((n - .5) * 2.6).toFixed(2)}deg`, '--y': `${((m - .5) * .035).toFixed(3)}em` } as CSSProperties
}

/** Splits a title into letters that each sit a little off the line in the Noite direction. */
function Letters({ text }: { text: string }) {
  let i = 0
  return (
    <span className="letters" aria-hidden="true">
      {text.split(' ').map((word, w) => (
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="lw">
            {[...word].map((ch, j) => <span className="lc" key={j} style={jitter(i++, ch)}>{ch}</span>)}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

/** A word whose tail is set in script in the Noite direction (PORT·fólio, Habilida·des). */
function Mixed({ main, script, joined = false }: { main: string; script: string; joined?: boolean }) {
  return (
    <>
      <span className="visually-hidden">{main}{joined ? '' : ' '}{script}</span>
      <span className="mixed-main" aria-hidden="true"><Letters text={main} /></span>{joined ? '' : ' '}
      <span className="script" aria-hidden="true">{script}</span>
    </>
  )
}

/** SVG filter that roughens the edges of display type like ink on paper. */
function InkFilter() {
  return (
    <svg className="ink-defs" aria-hidden="true" focusable="false">
      <filter id="ink" x="-4%" y="-12%" width="108%" height="124%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="11" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="moved" />
        <feGaussianBlur in="moved" stdDeviation=".55" result="soft" />
        <feComponentTransfer in="soft">
          <feFuncA type="table" tableValues="0 0 .6 1 1" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

function StarO() {
  // The serif O stays; a small organic star sits in its counter and turns with the discs.
  return (
    <span className="ch o-star" aria-hidden="true">
      O
      <svg className="o-star-glyph" viewBox="0 0 100 100">
        <g className="o-star-spin"><path d={ORGANIC_STAR} /></g>
      </svg>
    </span>
  )
}

function Wordmark({ animated }: { animated: boolean }) {
  // The first O carries a small star in its counter.
  let i = 0
  let starred = false
  // Both directions sign COL★MBIA: the short name, with a star in the first O.
  const name = profile.shortName
  return (
    <h1 aria-label={profile.name} data-animated={animated}>
      {name.split(' ').map((word) => (
        <span className="word" key={word} aria-hidden="true">
          {[...word].map((ch, j) => {
            const index = i++
            if (ch === 'O' && !starred) {
              starred = true
              return <span key={j} className="ch-wrap" style={{ '--i': index } as CSSProperties}><StarO /></span>
            }
            return <span className="ch" key={j} style={{ '--i': index } as CSSProperties}>{ch}</span>
          })}
        </span>
      ))}
    </h1>
  )
}

/** COL★MBIA for the top bar of the inner pages: same letters and star as the home. */
function StarName() {
  let starred = false
  return (
    <span className="star-name" aria-hidden="true">
      {[...profile.shortName].map((ch, i) => {
        if (ch === 'O' && !starred) {
          starred = true
          return <StarO key={i} />
        }
        return <span key={i}>{ch}</span>
      })}
    </span>
  )
}

/** “Designer e artista …” — the last word turns over every few seconds. */
function Subtitle() {
  const words = profile.subtitle.split(' ')
  const lead = words.slice(0, -1).join(' ')
  const roles = profile.roles.length ? profile.roles : [words.at(-1) ?? '']
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (roles.length < 2 || matchMedia(reducedMotion).matches) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % roles.length), 2400)
    return () => window.clearInterval(timer)
  }, [roles.length])
  return (
    <p className="subtitle">
      <span className="visually-hidden">{profile.subtitle}</span>
      <span aria-hidden="true">{lead} </span>
      <span className="role-cycle" aria-hidden="true">
        {roles.map((role, k) => (
          <span
            key={role}
            data-state={k === index ? 'in' : k === (index - 1 + roles.length) % roles.length ? 'out' : 'wait'}
          >
            {role}
          </span>
        ))}
      </span>
    </p>
  )
}

/** One icon toggles between the two directions; the circle turns half over when it switches. */
function ThemeToggle() {
  const theme = useTheme()
  const next = theme === 'noite' ? 'papel' : 'noite'
  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-now={theme}
      aria-label={`Trocar para a direção ${themeLabels[next]}`}
      title={`Direção ${themeLabels[next]}`}
      onClick={(event) => {
        const r = event.currentTarget.getBoundingClientRect()
        setTheme(next, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
      </svg>
    </button>
  )
}

function Home() {
  const [opening, setOpening] = useState(() => !readSession(splashKey) && !matchMedia(reducedMotion).matches)

  useEffect(() => {
    writeSession(splashKey, '1')
    if (!opening) return
    const end = window.setTimeout(() => setOpening(false), OPENING_MS)
    const skip = () => setOpening(false)
    const preference = matchMedia(reducedMotion)
    preference.addEventListener('change', skip)
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('pointerdown', skip, { once: true })
    return () => {
      window.clearTimeout(end)
      preference.removeEventListener('change', skip)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [opening])

  return (
    <>
    <div className="home" data-opening={opening}>
      <a className="skip-link" href="#acervo">Pular para o acervo</a>
      <header className="home-bar">
        <Navigation page="projects" inert={opening} />
      </header>
      <main id="acervo" className="home-main">
        <div className="masthead">
          <Wordmark animated={opening} />
          <Subtitle />
          <HomeIntro inert={opening} place="inline" />
        </div>
        {projects.length > 0 && <Gallery opening={opening} arrivalDelay={ARRIVAL_MS} />}
        <HomeIntro inert={opening} place="corner" />
      </main>
      {opening && (
        <div className="splash" aria-hidden="true">
          <Star shape="a" className="splash-star-a" />
          <Star shape="b" className="splash-star-b" />
          <span className="splash-meta"><span>Portfólio</span><span>Acervo {String(projects.length).padStart(2, '0')}</span></span>
        </div>
      )}
    </div>
    {!opening && (
      <div className="home-about">
        <AboutContent id="sobre" />
        <footer className="site-footer">
          <span>{profile.name}</span>
          <span>{profile.subtitle}</span>
          {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
        </footer>
      </div>
    )}
    </>
  )
}

/** Her own words and a direct way to reach her, in the corner of the home. */
function HomeIntro({ inert, place }: { inert: boolean; place: 'inline' | 'corner' }) {
  if (!profile.intro && !profile.email) return null
  return (
    <aside className="home-intro" data-place={place} aria-label="Apresentação" inert={inert}>
      {profile.intro && <p className="home-intro-text">{profile.intro}</p>}
      <p className="home-intro-links">
        {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
        {profile.instagram && (
          <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer">@{profile.instagram}</a>
        )}
      </p>
    </aside>
  )
}

/* ---------------- shared inner layout ---------------- */

function InnerPage({ page, children }: { page: Page; children: ReactNode }) {
  return (
    <div className="inner-page" data-page={page}>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="inner-bar">
        <a className="wordmark" href={sitePath('/')} aria-label={`${profile.name} — início`}>
          <StarName />
        </a>
        <Navigation page={page} />
      </header>
      <main id="conteudo" className="inner-main">{children}</main>
      <footer className="site-footer">
        <span>{profile.name}</span>
        <span>{profile.subtitle}</span>
        {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
      </footer>
    </div>
  )
}

/* ---------------- project page ---------------- */

function MediaView({ item, eager = false, variant }: { item: Media | Cover; eager?: boolean; variant?: 'hero' | 'process' }) {
  if (item.kind === 'color') {
    return (
      <figure className="media media-swatch" data-variant={variant}>
        <div className="swatch" style={{ background: item.color }}>
          <span>Peça final a cadastrar</span>
        </div>
      </figure>
    )
  }
  return (
    <figure className="media" data-variant={variant}>
      {item.kind === 'image' && <img src={sitePath(item.src)} alt={item.alt} loading={eager ? 'eager' : 'lazy'} decoding="async" />}
      {item.kind === 'video' && (
        <video aria-label={item.label} src={sitePath(item.src)} poster={item.poster && sitePath(item.poster)} controls playsInline preload="metadata">
          {item.captions && <track src={sitePath(item.captions)} kind="captions" srcLang="pt-BR" label="Português" default />}
        </video>
      )}
      {item.kind === 'embed' && (
        <div className="embed"><iframe src={sitePath(item.src)} title={item.label} loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
      )}
      {item.caption && <figcaption>{item.caption}</figcaption>}
    </figure>
  )
}

function ProjectPage({ project }: { project: Project }) {
  const index = projects.indexOf(project)
  const prev = projects[(index - 1 + projects.length) % projects.length]
  const next = projects[(index + 1) % projects.length]
  const n = catalogNumber(project)

  useEffect(() => {
    writeSession('colombia.selected-project', project.slug)
    function onKey(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const t = event.target as HTMLElement
      if (t.closest('video, iframe, input, textarea, select')) return
      if (event.key === 'Escape') window.location.assign(sitePath('/#acervo'))
      if (projects.length < 2) return
      if (event.key === 'ArrowLeft') window.location.assign(projectPath(prev))
      if (event.key === 'ArrowRight') window.location.assign(projectPath(next))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [project, prev, next])

  // Only what exists is shown: empty fields stay out of the page.
  const line = [project.category, project.year, project.role].filter(Boolean).join(' · ')
  const hasCredits = project.credits.length > 0 || !!project.tools?.length
  const hasText = !!project.summary?.length

  const accent = projectAccent(project)

  return (
    <InnerPage page="project">
      <article className="project" style={accent ? { '--project': accent } as CSSProperties : undefined}>
        <header className="project-hero">
          <p className="kicker"><span>Nº {n}</span></p>
          <h1 aria-label={project.title}><Letters text={project.title} /></h1>
          <p className="byline">{line}</p>
        </header>

        <section className="screening" aria-label="Peça final">
          <div className="screening-disc">
            <DiscFace project={project} style={{ viewTransitionName: 'disc' } as CSSProperties} />
          </div>
          <MediaView item={project.final ?? project.cover} eager variant="hero" />
        </section>

        {(project.demo || project.provisional) && (
          <p className="notice" role="note">
            {project.demo
              ? 'Projeto de demonstração: título, capa e dados são provisórios.'
              : project.provisional}
          </p>
        )}

        {(hasText || hasCredits) && (
          <div className="project-body" data-columns={hasText && hasCredits ? 2 : 1}>
            {hasText && (
              <section className="about-work" aria-label="Sobre o trabalho">
                {project.summary!.map((p) => <p key={p}>{p}</p>)}
              </section>
            )}
            {hasCredits && (
              <dl className="credits">
                {project.credits.map(({ role, name }) => (
                  <div key={`${role}-${name}`}><dt>{role}</dt><dd>{name}</dd></div>
                ))}
                {!!project.tools?.length && <div><dt>Ferramentas</dt><dd>{project.tools.join(', ')}</dd></div>}
              </dl>
            )}
          </div>
        )}

        {project.process.length > 0 && (
          <section className="process" aria-labelledby="processo">
            <header>
              <h2 id="processo">Processo</h2>
              <span className="process-count">{String(project.process.length).padStart(2, '0')}</span>
            </header>
            <ol className="process-grid">
              {project.process.map((item, i) => (
                <li key={item.src}>
                  <MediaView item={item} variant="process" />
                  <span className="process-index">{String(i + 1).padStart(2, '0')}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {projects.length > 1 && (
          <nav className="project-pager" aria-label="Outros projetos">
            <a href={projectPath(prev)} rel="prev">
              <span className="pager-label">← Anterior</span>
              <span className="pager-title">{prev.title}</span>
            </a>
            <a href={sitePath('/#acervo')} className="pager-index">
              <span className="pager-label">Acervo</span>
            </a>
            <a href={projectPath(next)} rel="next">
              <span className="pager-label">Próximo →</span>
              <span className="pager-title">{next.title}</span>
            </a>
          </nav>
        )}
      </article>
    </InnerPage>
  )
}

/* ---------------- about + CV ---------------- */

/** Wraps the highlighted terms of a sentence in <em>. */
function Highlight({ text, terms = [] }: { text: string; terms?: string[] }) {
  if (!terms.length) return <>{text}</>
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g')
  return <>{text.split(pattern).map((part, i) => (terms.includes(part) ? <em key={i}>{part}</em> : part))}</>
}

/** The about article: on its own page (/sobre/) and below the discs on the home. */
function AboutContent({ id }: { id?: string }) {
  const portrait = profile.portrait
  const [lede, ...rest] = profile.bio
  return (
      <article className="about-page" id={id}>
        <header className="about-hero">
          <Star shape="c" className="about-star" />
          <p className="about-kicker"><span>Sobre</span>{profile.location && <span>{profile.location}</span>}</p>
          <h1 className="about-statement"><Highlight text={lede ?? profile.subtitle} terms={profile.highlights} /></h1>
          {rest.length > 0 && <div className="about-more">{rest.map((p) => <p key={p}>{p}</p>)}</div>}
          <figure className="about-photo about-photo-camera">
            <img src={sitePath('/acervo/sobre-camera.webp')} alt="Câmera exibindo um retrato de Colombia com iluminação vermelha e azul." loading="lazy" />
          </figure>
          <figure className="about-photo about-photo-portrait">
            <img src={sitePath('/acervo/sobre-retrato.webp')} alt="Retrato de Colombia com cabelo escuro e maquiagem artística, iluminada pelo sol." loading="lazy" />
          </figure>
          {portrait && (
            <figure className="portrait">
              <img src={sitePath(portrait.src)} alt={portrait.alt} />
              {portrait.provisional && <figcaption>{portrait.provisional}</figcaption>}
            </figure>
          )}
        </header>

        <section className="about-row" aria-labelledby="skills-title">
          <h2 id="skills-title" className="about-label">Habilidades</h2>
          <div className="about-content">
            <ul className="skills-rest">{profile.skills.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </section>

        <section className="about-row" aria-labelledby="tools-title">
          <h2 id="tools-title" className="about-label">Ferramentas</h2>
          <div className="about-content tools">
            {profile.software.map(({ group, items }) => (
              <div className="tool-group" key={group}>
                <h3>{group}</h3>
                <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section id="cv" className="about-row" aria-labelledby="edu-title">
          <h2 id="edu-title" className="about-label">Formação</h2>
          <div className="about-content">
            <ul className="education">
              {profile.education.map((e) => (
                <li key={e.course}>
                  <span className="edu-course">{e.course}</span>
                  <span className="edu-school">{e.school}{e.status ? ` · ${e.status}` : ''}</span>
                </li>
              ))}
            </ul>
            {profile.cv && <a className="button-link" href={sitePath(profile.cv)} target="_blank" rel="noreferrer">Baixar CV ↗</a>}
          </div>
        </section>

        {profile.email && (
          <section className="about-row about-contact" aria-labelledby="talk-title">
            <h2 id="talk-title" className="about-label">Contato</h2>
            <div className="about-content">
              <a className="about-mail" href={`mailto:${profile.email}`}>{profile.email}</a>
              {profile.instagram && (
                <a className="about-insta" href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noreferrer">@{profile.instagram}</a>
              )}
            </div>
          </section>
        )}
      </article>
  )
}

function AboutPage() {
  return (
    <InnerPage page="about">
      <AboutContent />
    </InnerPage>
  )
}

/* ---------------- contact ---------------- */

function ContactPage() {
  const channels = [
    profile.email && { label: 'E-mail', href: `mailto:${profile.email}`, text: profile.email },
    profile.instagram && { label: 'Instagram', href: `https://instagram.com/${profile.instagram}`, text: `@${profile.instagram}` },
    profile.whatsapp && { label: 'WhatsApp', href: `https://wa.me/${profile.whatsapp}`, text: 'Enviar mensagem' },
  ].filter(Boolean) as { label: string; href: string; text: string }[]

  return (
    <InnerPage page="contact">
      <div className="contact">
        <header className="page-hero">
          <p className="kicker"><span>Contato</span><span>{profile.location}</span></p>
          <h1><Mixed main="Vamos" script="conversar" /></h1>
        </header>
        {profile.email && (
          <a className="contact-mail" href={`mailto:${profile.email}`}>
            <span>{profile.email.split('@')[0]}</span><span>@{profile.email.split('@')[1]}</span>
          </a>
        )}
        <dl className="facts">
          {channels.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd><a href={c.href} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{c.text}</a></dd>
            </div>
          ))}
          <div>
            <dt>Currículo</dt>
            <dd><a href={sitePath(profile.cv || '/sobre/#cv')}>{profile.cv ? 'Baixar PDF ↗' : 'Ver formação e habilidades'}</a></dd>
          </div>
        </dl>
      </div>
    </InnerPage>
  )
}

function MissingPage() {
  return (
    <InnerPage page="missing">
      <header className="page-hero">
        <p className="kicker"><span>Erro 404</span></p>
        <h1>Faixa não encontrada</h1>
        <p className="lede-small"><a href={sitePath('/#acervo')}>Voltar ao acervo</a></p>
      </header>
    </InnerPage>
  )
}

/* ---------------- router ---------------- */

const path = window.location.pathname.slice(import.meta.env.BASE_URL.length - 1).replace(/\/+$/, '')
const project = projects.find(({ slug }) => path === `/projetos/${slug}`)

let view: ReactNode
if (project) {
  document.title = `${project.title} — ${profile.name}`
  view = <ProjectPage project={project} />
} else if (path === '') {
  view = <Home />
} else if (path === '/sobre') {
  document.title = `Sobre — ${profile.name}`
  view = <AboutPage />
} else if (path === '/contato') {
  document.title = `Contato — ${profile.name}`
  view = <ContactPage />
} else {
  document.title = `Página não encontrada — ${profile.name}`
  view = <MissingPage />
}

createRoot(document.getElementById('root')!).render(<><InkFilter />{view}</>)
