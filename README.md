# COLOMBIA ROCHA · Portfólio

```sh
npm ci
npm run dev      # http://localhost:5173
npm run check    # TypeScript
npm run build    # gera dist/
npm run preview
```

O build gera `dist/` com um `index.html` para cada projeto, Sobre e Contato. O GitHub Actions publica no Pages a cada push na branch `main`, usando o endereço e o caminho base do site nas configurações do Pages.

## Onde mudar o conteúdo

Tudo fica em **`src/content.ts`**.

### Projetos (`projects`)

- A ordem da lista é a ordem dos discos. Deixe animação 2D/3D e computação gráfica primeiro.
- `slug`: endereço da página (`/projetos/<slug>/`), só minúsculas, números e hífens. Rode o build de novo ao mudar.
- `cover`: a capa impressa no disco.
  - cor: `{ kind: 'color', color: '#5256a8' }`
  - imagem: `{ kind: 'image', src: '/projetos/<slug>/capa.webp', alt: '…' }` (quadrada, ≥ 1200 px)
  - `ink: 'light' | 'dark'` força a cor do texto impresso no disco.
- `final`: a peça final, exibida na “sala escura”. Aceita imagem, vídeo (`kind: 'video'`, com `poster` e legendas `.vtt`) ou YouTube/Vimeo (`kind: 'embed'`, URL de incorporação).
- `process`: esboços, testes e bastidores, numerados como P.01, P.02…
- `role`, `year`, `tools`, `summary`, `credits`: o que não for preenchido aparece como “a confirmar” / “a cadastrar”.
- `demo: true` marca projeto fictício (selo DEMO no disco e aviso na página). Apague ao trocar pelo trabalho real.
- `provisional: '…'` mostra um aviso de material provisório.

Coloque os arquivos em `public/projetos/<slug>/`.

### Perfil, contato e currículo (`profile`)

`bio`, `portrait`, `email`, `instagram`, `whatsapp` (só números com DDI; vazio oculta), `location`, `education`, `skills`, `software` e `cv` (PDF em `public/` ou link externo — sem ele, “CV” leva à seção Currículo da página Sobre).

## Direções visuais (Noite e Papel)

O site tem duas direções, alternáveis pela chave no canto inferior esquerdo da home e no rodapé das páginas internas:

- **Noite** (padrão): a paleta do portfólio dela — azul-noite `#032741`, preto `#0e0d15`, creme `#fefadf`, mostarda `#e0a108` —, Outfit pesada + Yellowtail em script, marca COL★MBIA.
- **Papel**: a primeira versão — papel creme, Instrument Serif, estrelas terra, COLOMBIA ROCHA.

`?tema=noite` ou `?tema=papel` na URL força uma delas (útil para mandar link). O padrão fica em `DEFAULT_THEME` no `index.html`. As cores e fontes de cada direção ficam em `src/styles.css` (`:root` e `:root[data-theme='noite']`). `profile.shortName` define a assinatura curta e `accent` em cada projeto tinge a sala escura da página.

A versão anterior a esta (só Papel) está copiada em `../colombi-backup-papel-2026-11-16/`.

## Material provisório

As imagens em `public/acervo/` foram recortadas do `PORTFOLIO_COLOMBIA.pdf` e estão em baixa resolução. Os três primeiros projetos (Projeto 1, 2 e 3) são demonstrações: troque título, slug, capa e dados pelo trabalho real.

## Interação

- Galeria: carrossel 3D com a física do site da A24 (inércia com atrito, mola de encaixe, atraso entre discos, inclinação pelo embalo). Arraste na horizontal para passar, na vertical sobre um disco para girá-lo; roda/trackpad, setas e Home/End também. Clique no disco central para abrir. Os parâmetros ficam no objeto `P` no topo de `src/Gallery.tsx`.
- Na direção Noite, o céu tem estrelas paradas que giram ao passar o mouse (posições em `src/StarField.tsx`).
- Página de projeto: ← → para o projeto anterior/próximo, Esc volta ao acervo.
- A abertura roda uma vez por sessão; clique ou tecla pula. Com “reduzir movimento”, abre direto na galeria.
- A duração da abertura fica em `OPENING_MS`/`ARRIVAL_MS` (`src/main.tsx`) e `--opening` (`src/styles.css`). A física dos discos e da estrela fica no topo de `src/Gallery.tsx`.

## Ícone, prévia de link e endereço do site

- `public/favicon.svg`, `public/apple-touch-icon.png` e `public/og.png` (imagem que aparece ao compartilhar o link) são gerados por `python3 scripts/brand-assets.py`, a partir da estrela de `src/Star.tsx` e da fonte do site. Rode de novo se mudar a estrela, o nome ou o subtítulo.
- Cada página de projeto ganha título e prévia próprios no build; projetos com capa em foto usam a capa como prévia.
- O build do GitHub Pages usa o endereço publicado para gerar URLs completas das imagens de prévia. Em outra hospedagem, preencha `profile.siteUrl` em `src/content.ts` (ex.: `'https://colombiarocha.com'`).
