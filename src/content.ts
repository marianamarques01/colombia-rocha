import { sitePath } from './paths'

/*
 * ACERVO — tudo o que muda no site mora neste arquivo.
 *
 * Projetos: a ordem de `projects` é a ordem dos discos. Animação 2D/3D e
 * computação gráfica vêm primeiro. Arquivos vão em `public/projetos/<slug>/`
 * e são referenciados como '/projetos/<slug>/arquivo.webp'.
 *
 * Capa: { kind: 'color', color: '#5256a8' } ou
 *       { kind: 'image', src: '/projetos/x/capa.webp', alt: '...' }
 * A capa é impressa no disco (quadrada, mínimo 1200 × 1200 px).
 * `ink` escolhe a cor do texto impresso no disco ('light' | 'dark');
 * sem `ink`, o site decide pela luminosidade da cor.
 */

export type ImageMedia = {
  kind: 'image'
  src: string
  alt: string
  caption?: string
}

export type VideoMedia = {
  kind: 'video'
  src: string
  label: string
  poster?: string
  captions?: string
  caption?: string
}

/** Vídeo hospedado no YouTube ou Vimeo (use a URL de incorporação). */
export type EmbedMedia = {
  kind: 'embed'
  src: string
  label: string
  caption?: string
}

export type ColorCover = { kind: 'color'; color: string }

export type Media = ImageMedia | VideoMedia | EmbedMedia
export type Cover = (ImageMedia | ColorCover) & { ink?: 'light' | 'dark' }

export type Project = {
  title: string
  /** Endereço da página: letras minúsculas, números e hífens. */
  slug: string
  category: string
  year?: string
  /** O que COLOMBIA fez no trabalho. `null` aparece como “a confirmar”. */
  role: string | null
  tools?: string[]
  /** Um ou dois parágrafos sobre o trabalho. */
  summary?: string[]
  cover: Cover
  /** A peça final, em destaque. Sem ela, a página mostra a capa. */
  final?: Media
  credits: { role: string; name: string }[]
  process: Media[]
  /** Projeto fictício, só para demonstrar o layout. Apague ao trocar pelo real. */
  demo?: boolean
  /** Aviso sobre material provisório (baixa resolução, recorte etc.). */
  provisional?: string
  /** Cor de destaque da página do projeto. Sem ela, usa a cor da capa. */
  accent?: string
}

export type Profile = {
  name: string
  /** Assinatura curta usada na direção Noite (COL★MBIA). */
  shortName: string
  subtitle: string
  /** Apresentação curta na home, na voz dela. */
  intro?: string
  /** Palavras que se alternam no fim do subtítulo da home (a primeira é a fixa). */
  roles: string[]
  bio: string[]
  portrait?: ImageMedia & { provisional?: string }
  email?: string
  instagram?: string
  /** Somente números com DDI, ex.: '5531999999999'. Deixe vazio para ocultar. */
  whatsapp?: string
  location?: string
  /** PDF em `public/` (ex.: '/colombia-rocha-cv.pdf') ou link externo. */
  cv?: string
  /** Endereço do site publicado, sem barra no fim (ex.: 'https://colombiarocha.com').
   *  Necessário para a imagem de prévia aparecer no WhatsApp e nas redes. */
  siteUrl?: string
  education: { course: string; school: string; status?: string }[]
  skills: string[]
  /** Ferramentas em grupos. */
  software: { group: string; items: string[] }[]
  /** Palavras do primeiro parágrafo da bio que aparecem em destaque no Sobre. */
  highlights?: string[]
}

const fromPdf = 'Imagem recortada do portfólio em PDF, em baixa resolução. Substituir pelo arquivo original.'

export const profile: Profile = {
  name: 'COLOMBIA ROCHA',
  shortName: 'COLOMBIA',
  subtitle: 'Designer e artista audiovisual',
  roles: ['audiovisual', 'cênico', 'videomaker', 'criativo'],
  intro: 'Oie, meu nome é Colombia :) Sou animadora 3D, VJ e designer, muito ligada à arte, com paixão por traduzir a experiência humana em mídias digitais.',
  bio: [
    'Animadora 3D, VJ e designer, muito ligada à arte, com paixão por traduzir a experiência humana em mídias digitais.',
    'Graduanda em Computação Gráfica, transita entre animação 3D, visuais ao vivo, vídeo e design, com experiência em comunicação, marketing e produção audiovisual.',
  ],
  // Foto fora do ar por enquanto. Para voltar, tire as barras das linhas abaixo.
  // portrait: {
  //   kind: 'image',
  //   src: '/acervo/retrato.webp',
  //   alt: 'Retrato de COLOMBIA ROCHA sentada à mesa, de óculos e blusa verde de gola alta.',
  //   provisional: fromPdf,
  // },
  email: 'colombiarra@gmail.com',
  instagram: 'colombiarra',
  location: 'Belo Horizonte, MG',
  education: [
    { course: 'Computação Gráfica', school: 'FUMEC', status: 'em curso' },
    { course: 'Design Gráfico', school: 'UniBH' },
    { course: 'Teatro', school: 'Cefart' },
  ],
  skills: [
    'Animação 3D',
    'Computação gráfica',
    'VJ e visuais ao vivo',
    'Motion design',
    'Captura e edição de vídeo',
    'Design para mídias sociais',
    'Criação de conteúdo',
    'Teasers corporativos',
    'Gestão de redes sociais',
  ],
  software: [
    { group: '3D e tempo real', items: ['Blender', 'Maya', 'Unity', 'Unreal Engine', 'TouchDesigner'] },
    { group: 'Vídeo e design', items: ['After Effects', 'Photoshop', 'Illustrator', 'InDesign', 'Figma', 'CapCut'] },
  ],
  highlights: ['Animadora 3D', 'VJ', 'designer'],
}

// A ordem aqui é a ordem da galeria.
export const projects: Project[] = [
  {
    title: 'Projeto 1',
    slug: 'projeto-1',
    category: 'Animação 3D',
    role: null,
    cover: { kind: 'color', color: '#5256a8' },
    credits: [],
    process: [],
    demo: true,
  },
  {
    title: 'Projeto 2',
    slug: 'projeto-2',
    category: 'Animação 2D',
    role: null,
    cover: { kind: 'color', color: '#242a49' },
    credits: [],
    process: [],
    demo: true,
  },
  {
    title: 'Projeto 3',
    slug: 'projeto-3',
    category: 'Motion design',
    role: null,
    cover: { kind: 'color', color: '#d46a4c' },
    credits: [],
    process: [],
    demo: true,
  },
  {
    title: 'Teaser corporativo',
    slug: 'teaser-corporativo',
    category: 'Vídeo institucional',
    role: null,
    tools: ['Premiere Pro'],
    accent: '#1b8fd6',
    cover: { kind: 'image', src: '/acervo/teaser.webp', alt: 'Equipe reunida em pé ao redor de uma mesa de café, em escritório com logotipo de neon azul.', ink: 'light' },
    final: { kind: 'image', src: '/acervo/teaser.webp', alt: 'Equipe reunida em pé ao redor de uma mesa de café, em escritório com logotipo de neon azul.', caption: 'Quadro do teaser. O vídeo completo entra aqui.' },
    credits: [],
    process: [],
    provisional: fromPdf,
  },
  {
    title: 'Memostra',
    slug: 'memostra',
    category: 'Design para redes',
    role: null,
    tools: ['Illustrator', 'Photoshop'],
    accent: '#e0a108',
    cover: { kind: 'image', src: '/acervo/memostra.webp', alt: 'Story amarelo da Memostra com letras desenhadas à mão anunciando inscrições prorrogadas.', ink: 'light' },
    final: { kind: 'image', src: '/acervo/memostra.webp', alt: 'Story amarelo da Memostra com letras desenhadas à mão anunciando inscrições prorrogadas até 30/04, exibido em um celular.', caption: 'Story de divulgação das inscrições.' },
    credits: [],
    process: [],
    provisional: fromPdf,
  },
  {
    title: 'Posts e edições',
    slug: 'redes-sociais',
    category: 'Redes sociais',
    role: null,
    tools: ['Premiere Pro', 'CapCut', 'Photoshop'],
    accent: '#d7834f',
    cover: { kind: 'image', src: '/acervo/fantasmas.webp', alt: 'Duas crianças brincando no mar ao pôr do sol, com texto sobreposto.', ink: 'light' },
    final: { kind: 'image', src: '/acervo/fantasmas.webp', alt: 'Duas crianças brincando no mar ao pôr do sol, com o texto “Eu esqueço que fantasmas tem primos e ando como se nada na vida fosse se repetir”.' },
    credits: [],
    process: [
      { kind: 'image', src: '/acervo/na-fita.webp', alt: 'Post azul-escuro “Estaremos na fita” com um foguete, anunciando estande na FITA.', caption: 'Na Fita — anúncio de estande' },
      { kind: 'image', src: '/acervo/oferenda.webp', alt: 'Post em preto e branco de uma mesa posta ao ar livre, com o título Oferenda.', caption: 'Oferenda — divulgação de evento' },
      { kind: 'image', src: '/acervo/grwm.webp', alt: 'Quadro de vídeo vertical em um brechó, com o texto GRWM com meus novos garimpos.', caption: 'GRWM — vídeo vertical' },
      { kind: 'image', src: '/acervo/instalacao.webp', alt: 'Teto coberto por tecido iluminado por lâmpadas quentes, sobre um carro.', caption: 'Vídeo vertical' },
      { kind: 'image', src: '/acervo/cachoeira.webp', alt: 'Cachoeira alta entre a mata, vista de baixo.', caption: 'Vídeo vertical' },
      { kind: 'image', src: '/acervo/equipe.webp', alt: 'Equipe de clínica de máscara e touca pretas posando em consultório.', caption: 'Vídeo vertical' },
    ],
    provisional: fromPdf,
  },
]

export function projectPath(project: Project) {
  return sitePath(`/projetos/${project.slug}/`)
}

export function catalogNumber(project: Project) {
  return String(projects.indexOf(project) + 1).padStart(2, '0')
}

/** Cor do texto impresso sobre a capa. */
export function coverInk(cover: Cover): 'light' | 'dark' {
  if (cover.ink) return cover.ink
  if (cover.kind === 'image') return 'light'
  const hex = cover.color.replace('#', '')
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4))
  return .2126 * r + .7152 * g + .0722 * b > .32 ? 'dark' : 'light'
}

/** Cor de destaque de um projeto, se houver. */
export function projectAccent(project: Project) {
  return project.accent ?? (project.cover.kind === 'color' ? project.cover.color : undefined)
}
