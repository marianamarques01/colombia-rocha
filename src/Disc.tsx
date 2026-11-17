import { useId, type CSSProperties } from 'react'
import { catalogNumber, coverInk, type Project } from './content'
import { sitePath } from './paths'

const R = 43.2

/** Face of a printed disc: cover art, label, rim text, metallic sheen and a real hole. */
export function DiscFace({ project, style }: { project: Project; style?: CSSProperties }) {
  const id = useId()
  const n = catalogNumber(project)
  const rim = `Nº ${n}  ·  COLOMBIA  ·  `.repeat(4)

  return (
    <span className="disc-face" data-ink={coverInk(project.cover)} data-kind={project.cover.kind} aria-hidden="true" style={style}>
      <span className="disc-spin">
        {project.cover.kind === 'image'
          ? <img className="disc-art" src={sitePath(project.cover.src)} alt="" draggable={false} decoding="async" />
          : <span className="disc-art" style={{ backgroundColor: project.cover.color }} />}
        <span className="disc-grain" />
        <span className="disc-label">
          <span className="disc-title">{project.title}</span>
        </span>
        <svg className="disc-rim" viewBox="0 0 100 100">
          <defs>
            <path id={id} d={`M50,50 m-${R},0 a${R},${R} 0 1,1 ${R * 2},0 a${R},${R} 0 1,1 -${R * 2},0`} />
          </defs>
          <text>
            <textPath href={`#${id}`} textLength={2 * Math.PI * R - 1.5} lengthAdjust="spacing">{rim}</textPath>
          </text>
        </svg>
      </span>
      <span className="disc-iris" />
      <span className="disc-sheen" />
      <span className="disc-hub" />
      <span className="disc-mark" data-mark="r" />
      <span className="disc-mark" data-mark="t" />
      <span className="disc-mark" data-mark="l" />
    </span>
  )
}
