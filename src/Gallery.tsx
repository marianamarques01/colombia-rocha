import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { catalogNumber, projectPath, projects, type Project } from './content'
import { DiscFace } from './Disc'
import { Star } from './Star'
import { readSession, writeSession } from './session'

/*
 * Disc carousel. The motion model follows a24.raviklaassens.com:
 * discs sit on a 3D arc inside a group tilted -30° / -30°, each disc chases its
 * slot with a lag that grows with distance, a released drag coasts with
 * friction .89 per frame and then a spring (freq 9.5, damping 12) settles on
 * the nearest disc. Clicks, keys and wheel ticks glide with a custom ease and
 * "kick" the flow, which leans, banks and dips the discs. A vertical drag on a
 * disc spins it in 3D; it springs back on release.
 */
const P = {
  hGap: 2.3,
  depthGap: 1,
  arc: .35,
  activeDiscY: .06,
  inactiveScale: .8,
  cameraDistance: 4.4,
  discUnits: 1.75,
  hoverTilt: .21,
  dragSensitivity: .95,
  dragVelocitySmoothing: .32,
  dragMaxVelocity: .5,
  dragStartDistance: 5,
  friction: .89,
  snapFreq: 9.5,
  snapDamping: 12,
  snapDuration: .46,
  flowLean: .055,
  flowLeanMax: .3,
  flowBank: .32,
  flowDip: .014,
  flowDipMax: .09,
  followTight: 15,
  followBase: 11,
  followFalloff: 1.15,
  followMin: 6.5,
  maxSpin: Math.PI,
  spinReset: 1.2,
}

const selectionKey = 'colombia.selected-project'
const count = projects.length
const RANGE = 4
const reducedQuery = '(prefers-reduced-motion: reduce)'

const wrap = (i: number) => ((i % count) + count) % count
const projectAt = (slot: number) => projects[wrap(slot)]
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** cubic-bezier(.32, .72, 0, 1) — the "discGlide" ease. */
function glide(x: number) {
  const [p1x, p1y, p2x, p2y] = [.32, .72, 0, 1]
  const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx
  const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by
  let t = x
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x
    const d = (3 * ax * t + 2 * bx) * t + cx
    if (Math.abs(err) < 1e-5 || Math.abs(d) < 1e-6) break
    t -= err / d
  }
  t = clamp(t, 0, 1)
  return ((ay * t + by) * t + cy) * t
}

type Source = 'click' | 'key' | 'wheel' | 'arrival'
function tweenFor(source: Source, distance: number) {
  switch (source) {
    case 'wheel': return { duration: P.snapDuration + .05, kick: 2.5 }
    case 'key': return { duration: Math.min(.6, P.snapDuration - .04 + distance * .05), kick: 4 }
    case 'click': return { duration: clamp(.45 + distance * .11, P.snapDuration, 1.05), kick: Math.min(5, distance * 1.4) }
    case 'arrival': return { duration: 1.25, kick: 5 }
  }
}

type Spring = { x: number; v: number }
type DiscState = { x: number; y: number; z: number; s: number; rx: number; ry: number; rz: number; hover: number }

type Sim = {
  L: number
  inertia: number
  spring: number
  flow: number
  prevL: number
  tween: { from: number; to: number; start: number; duration: number } | null
  dragging: boolean
  hovered: number | null
  pointer: { x: number; y: number }
  spin: { slot: number | null; x: number; y: number; reset: { fromX: number; fromY: number; start: number } | null }
  unit: number
  perspective: number
  spread: number
  star: { x: Spring; y: Spring; r: Spring }
}

type Drag = {
  pointer: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  lastT: number
  mode: 'pending' | 'scroll' | 'spin'
  slot: number | null
}

const COS30 = Math.cos(Math.PI / 6)
const SIN30 = .5

/**
 * Each disc carries the whole camera in its own transform (perspective + the
 * tilted world), so discs never cut through each other: they are painted in
 * depth order instead of intersecting in a shared 3D space.
 */
function discTransform(d: { x: number; y: number; z: number; s: number; rx: number; ry: number; rz: number }, unit: number, perspective: number) {
  const x = d.x * unit
  const y = -d.y * unit
  const z = d.z * unit
  // Camera-space depth after rotateY(-30°) then rotateX(30°): larger is closer.
  const depth = SIN30 * y + COS30 * (SIN30 * x + COS30 * z)
  return {
    transform:
      `perspective(${perspective.toFixed(1)}px) rotateX(30deg) rotateY(-30deg) scale(1.08) ` +
      `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
      `rotateX(${(-d.rx).toFixed(4)}rad) rotateY(${d.ry.toFixed(4)}rad) rotateZ(${(-d.rz).toFixed(4)}rad) scale(${d.s.toFixed(4)})`,
    zIndex: String(Math.round(1000 + depth)),
  }
}

/* ---------------- hover scribble (A24: 24 points, 2 loops, boiling at 10 fps) ---------------- */

const SCRIBBLE = { points: 24, jitter: .028, loops: 2, loopGap: .045, padding: .06, fps: 10 }

type Ellipse = { cx: number; cy: number; ax: number; ay: number; bx: number; by: number }

/** The disc's projected outline, from three marks on its rim (right, top, left). */
function discEllipse(face: Element): Ellipse | null {
  const at = (mark: string) => {
    const r = face.querySelector(`[data-mark="${mark}"]`)?.getBoundingClientRect()
    return r ? [r.left + r.width / 2, r.top + r.height / 2] : null
  }
  const right = at('r'), top = at('t'), left = at('l')
  if (!right || !top || !left) return null
  const cx = (right[0] + left[0]) / 2
  const cy = (right[1] + left[1]) / 2
  return { cx, cy, ax: right[0] - cx, ay: right[1] - cy, bx: top[0] - cx, by: top[1] - cy }
}

function scribblePath(e: Ellipse, seed: number, start: number) {
  let n = seed
  const rand = () => {
    n = (n * 16807) % 2147483647
    return n / 2147483647
  }
  const size = 2 * Math.max(Math.hypot(e.ax, e.ay), Math.hypot(e.bx, e.by))
  const total = SCRIBBLE.points * SCRIBBLE.loops + 4
  const pts: [number, number][] = []
  for (let i = 0; i <= total; i++) {
    const t = i / SCRIBBLE.points
    const angle = start + t * Math.PI * 2
    const grow = 1 + SCRIBBLE.padding + (t / SCRIBBLE.loops) * SCRIBBLE.loopGap * 2
    const wobble = (rand() - .5) * 2 * SCRIBBLE.jitter * size
    const c = Math.cos(angle) * grow
    const sn = Math.sin(angle) * grow
    pts.push([
      e.cx + c * e.ax + sn * e.bx + wobble,
      e.cy + c * e.ay + sn * e.by + (rand() - .5) * 2 * SCRIBBLE.jitter * size,
    ])
  }
  // Catmull-Rom through the points, as cubic Béziers.
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

function initialSlot() {
  const slug = readSession(selectionKey)
  return Math.max(0, projects.findIndex((p) => p.slug === slug))
}

function Arrow({ left = false }: { left?: boolean }) {
  return (
    <svg className={left ? 'arrow arrow-left' : 'arrow'} viewBox="0 0 56 16" fill="none" aria-hidden="true">
      <path d="M1 8H54" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M45.5 1.5C48 4.6 50.6 6.8 54.6 8c-4 1.2-6.6 3.4-9.1 6.5" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function Gallery({ opening, arrivalDelay }: { opening: boolean; arrivalDelay: number }) {
  const start = useRef(initialSlot()).current
  const [base, setBase] = useState(opening ? start - 3 : start)
  const [hoverSlot, setHoverSlot] = useState<number | null>(null)
  const [settled, setSettled] = useState(!opening)
  const scribble = useRef<SVGPathElement>(null)
  const canHover = useRef(matchMedia('(hover: hover) and (pointer: fine)').matches)
  const baseRef = useRef(opening ? start - 3 : start)
  const sim = useRef<Sim>({
    L: opening ? start - 3 : start,
    inertia: 0,
    spring: 0,
    flow: 0,
    prevL: opening ? start - 3 : start,
    tween: null,
    dragging: false,
    hovered: null,
    pointer: { x: 0, y: 0 },
    spin: { slot: null, x: 0, y: 0, reset: null },
    unit: 200,
    perspective: 880,
    spread: 1,
    star: { x: { x: 0, v: 0 }, y: { x: 0, v: 0 }, r: { x: 0, v: 0 } },
  })
  const discs = useRef(new Map<number, DiscState>())
  const slotEls = useRef(new Map<number, HTMLDivElement>())
  const spinEls = useRef(new Map<number, HTMLDivElement>())
  const stage = useRef<HTMLDivElement>(null)
  const starA = useRef<HTMLDivElement>(null)
  const starB = useRef<HTMLDivElement>(null)
  const oStar = useRef<SVGGElement | null>(null)
  const tag = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const focusCenter = useRef(false)
  const raf = useRef(0)
  const last = useRef(0)
  const arrived = useRef(!opening)
  const reduced = useRef(matchMedia(reducedQuery).matches)
  const settledRef = useRef(!opening)
  /** Discs already brought to the centre (by wrapped index). */
  const seen = useRef(new Set([wrap(start)]))

  /* ---------------- where each disc wants to be (the arc) ---------------- */

  function targetFor(slot: number, L: number, center: number, hover: number): DiscState {
    const s = sim.current
    const m = slot - L
    const h = Math.abs(m)
    const active = slot === center
    const a = m * P.arc
    const live = !reduced.current
    const lean = live ? clamp(Math.sign(s.flow) * Math.sqrt(Math.abs(s.flow)) * P.flowLean, -P.flowLeanMax, P.flowLeanMax) : 0
    const dip = live ? Math.min(P.flowDipMax, Math.abs(s.flow) * P.flowDip) : 0
    let rx = 0
    let ry = -a + lean * (active ? 1 : 1.12)
    if (hover > .001) {
      rx += hover * P.hoverTilt * s.pointer.y
      ry += hover * P.hoverTilt * s.pointer.x
    }
    return {
      x: Math.sin(a) * P.hGap * 2.4 * s.spread,
      y: (active ? P.activeDiscY : 0) - dip * (active ? .7 : 1),
      z: -Math.cos(a) * P.depthGap * 2.4 + P.depthGap * 2.4,
      s: active ? 1 : Math.max(P.inactiveScale, 1 - h * (1 - P.inactiveScale) * .6),
      rx,
      ry,
      rz: -lean * P.flowBank * (active ? .7 : 1),
      hover,
    }
  }

  function paint(dt: number) {
    const s = sim.current
    const center = Math.round(s.L)
    const k = s.dragging ? P.followTight : P.followBase
    let residual = 0
    for (const slot of discs.current.keys()) if (!slotEls.current.has(slot)) discs.current.delete(slot)
    for (const [slot, el] of slotEls.current) {
      let d = discs.current.get(slot)
      const wantHover = s.hovered === slot && s.spin.slot === null ? 1 : 0
      const hover = d ? d.hover + (wantHover - d.hover) * Math.min(1, dt * 10) : 0
      const goal = targetFor(slot, s.L, center, hover)
      if (!d) {
        d = goal
        discs.current.set(slot, d)
      } else {
        // Each disc chases its slot; far discs lag more.
        const h = Math.abs(slot - s.L)
        const rate = clamp(k - h * P.followFalloff, P.followMin, P.followTight)
        const A = reduced.current || dt === 0 ? 1 : Math.min(1, dt * rate)
        for (const key of ['x', 'y', 'z', 's', 'rx', 'ry', 'rz'] as const) {
          residual += Math.abs(goal[key] - d[key])
          d[key] += (goal[key] - d[key]) * A
        }
        residual += Math.abs(wantHover - hover)
        d.hover = hover
      }
      const placed = discTransform(d, s.unit, s.perspective)
      el.style.transform = placed.transform
      el.style.zIndex = placed.zIndex

      const spinEl = spinEls.current.get(slot)
      if (spinEl) {
        spinEl.style.opacity = clamp(1.25 - Math.abs(slot - s.L) * .28, 0, 1).toFixed(3)
        // Rainbow diffraction follows the angle of the disc, its travel and the pointer.
        const iris = (d.ry * 1.6 + d.rx * 1.2 + d.rz) * 57.3 + s.L * 38 + d.hover * s.pointer.x * 50
        spinEl.style.setProperty('--iris', `${iris.toFixed(1)}deg`)
        spinEl.style.transform = s.spin.slot === slot
          ? `rotateX(${(-s.spin.x).toFixed(4)}rad) rotateY(${s.spin.y.toFixed(4)}rad)`
          : ''
      }
    }

    // TouchDesigner-style star: follows the flow of the gallery with lag.
    const { x, y, r } = s.star
    const scale = 1 + Math.min(.08, Math.abs(r.x) / 260)
    if (starB.current) starB.current.style.transform = `translate3d(${x.x.toFixed(2)}px, ${y.x.toFixed(2)}px, 0) rotate(${r.x.toFixed(2)}deg) scale(${scale.toFixed(3)})`
    if (starA.current) starA.current.style.transform = `translate3d(${(x.x * -.42).toFixed(2)}px, ${(y.x * -.6).toFixed(2)}px, 0) rotate(${(r.x * -.55).toFixed(2)}deg)`
    if (!oStar.current?.isConnected) oStar.current = document.querySelector<SVGGElement>('.o-star-spin')
    if (oStar.current) oStar.current.style.transform = `rotate(${(-s.L * 72).toFixed(2)}deg)`
    return residual
  }

  function stepSpring(sp: Spring, goal: number, k: number, c: number, dt: number) {
    sp.v += (k * (goal - sp.x) - c * sp.v) * dt
    sp.x += sp.v * dt
  }

  function loop(now: number) {
    const s = sim.current
    const dt = Math.min(.05, (now - last.current) / 1000 || .016)
    last.current = now
    const frames = Math.min(3, dt * 60)

    if (s.tween) {
      const p = clamp((now - s.tween.start) / (s.tween.duration * 1000), 0, 1)
      s.L = s.tween.from + (s.tween.to - s.tween.from) * (reduced.current ? 1 : glide(p))
      if (p >= 1 || reduced.current) {
        s.L = s.tween.to
        s.tween = null
      }
    } else if (!s.dragging) {
      // Coast with friction, then let the spring settle on the nearest disc.
      if (Math.abs(s.inertia) > 1e-5) {
        s.L += s.inertia * frames
        s.inertia *= P.friction ** frames
        if (Math.abs(s.inertia) < 4e-4) s.inertia = 0
      }
      if (s.inertia === 0) {
        const nearest = Math.round(s.L)
        const t = nearest - s.L
        if (reduced.current) {
          s.L = nearest
          s.spring = 0
        } else if (t !== 0 || Math.abs(s.spring) > 1e-5) {
          s.spring += t * P.snapFreq * P.snapFreq * dt
          s.spring *= Math.exp(-P.snapDamping * dt)
          s.L += s.spring * dt
          if (Math.abs(nearest - s.L) < 8e-4 && Math.abs(s.spring) < .004) {
            s.L = nearest
            s.spring = 0
          }
        }
      }
    }

    // Flow: smoothed velocity with fast attack and slow release.
    if (reduced.current) {
      s.flow = 0
    } else {
      const v = clamp((s.L - s.prevL) / Math.max(dt, .001), -40, 40)
      s.flow += (v - s.flow) * Math.min(1, dt * (Math.abs(v) > Math.abs(s.flow) ? 14 : 6))
      if (Math.abs(s.flow) < .01) s.flow = 0
    }
    s.prevL = s.L

    // A spun disc glides back once released.
    if (s.spin.reset) {
      const p = clamp((now - s.spin.reset.start) / (P.spinReset * 1000), 0, 1)
      const e = 1 - (reduced.current ? 1 : glide(p))
      s.spin.x = s.spin.reset.fromX * e
      s.spin.y = s.spin.reset.fromY * e
      if (p >= 1 || reduced.current) s.spin = { slot: null, x: 0, y: 0, reset: null }
    }

    if (!reduced.current) {
      const f = clamp(s.flow, -9, 9)
      stepSpring(s.star.x, clamp(-f * 13, -56, 56), 54, 7.4, dt)
      stepSpring(s.star.y, f * 6, 54, 7.4, dt)
      stepSpring(s.star.r, clamp(f * 6.5, -22, 22), 54, 7.4, dt)
    }

    const nextBase = Math.round(s.L)
    if (nextBase !== baseRef.current) {
      baseRef.current = nextBase
      setBase(nextBase)
    }

    const residual = paint(dt)
    const { x, y, r } = s.star
    const starBusy = [x, y, r].some((sp) => Math.abs(sp.x) > .05 || Math.abs(sp.v) > .05)
    const busy = s.dragging || !!s.tween || s.inertia !== 0 || s.spring !== 0 || s.flow !== 0 ||
      s.L !== Math.round(s.L) || residual > .002 || starBusy || s.spin.slot !== null
    raf.current = busy ? requestAnimationFrame(loop) : 0
    const still = !s.dragging && !s.tween && s.inertia === 0 && s.spring === 0 && Math.abs(s.flow) < .5
    if (still !== settledRef.current) {
      settledRef.current = still
      setSettled(still)
    }
  }

  function kick() {
    if (raf.current || !arrived.current) return
    last.current = performance.now()
    raf.current = requestAnimationFrame(loop)
  }

  function glideTo(goal: number, source: Source, fromKeyboard = false) {
    if (count < 2 && source !== 'arrival') return
    const s = sim.current
    const distance = Math.abs(goal - s.L)
    const { duration, kick: push } = tweenFor(source, distance)
    s.inertia = 0
    s.spring = 0
    if (!reduced.current && push) s.flow = clamp(s.flow + Math.sign(goal - s.L) * push, -12, 12)
    s.tween = { from: s.L, to: goal, start: performance.now(), duration }
    writeSession(selectionKey, projectAt(goal).slug)
    focusCenter.current = fromKeyboard
    kick()
  }

  function open(project: Project) {
    writeSession(selectionKey, project.slug)
    window.location.assign(projectPath(project))
  }

  const target = () => sim.current.tween?.to ?? Math.round(sim.current.L)

  /* ---------------- layout ---------------- */

  useEffect(() => {
    function measure() {
      const st = stage.current
      if (!st) return
      const w = st.clientWidth
      const h = st.clientHeight
      const mobile = w < 700
      const size = mobile ? Math.min(w * .7, h * .36) : Math.min(w * .3, h * .56)
      const unit = size / P.discUnits
      sim.current.unit = unit
      sim.current.perspective = P.cameraDistance * unit
      sim.current.spread = mobile ? .6 : 1
      st.style.setProperty('--disc', `${size}px`)
      st.parentElement?.style.setProperty('--disc', `${size}px`)
      st.style.setProperty('--perspective', `${P.cameraDistance * unit}px`)
      paint(0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (stage.current) observer.observe(stage.current)
    return () => observer.disconnect()
  }, [])

  /* ---------------- arrival after the splash ---------------- */

  useEffect(() => {
    if (arrived.current) {
      paint(0)
      return
    }
    const run = () => {
      if (arrived.current) return
      arrived.current = true
      glideTo(start, 'arrival')
    }
    if (!opening) {
      run()
      return
    }
    const timer = window.setTimeout(run, arrivalDelay)
    return () => window.clearTimeout(timer)
  }, [opening, arrivalDelay])

  useEffect(() => {
    const query = matchMedia(reducedQuery)
    const sync = () => {
      reduced.current = query.matches
      kick()
    }
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (!event.persisted) return
      const slug = readSession(selectionKey)
      const index = projects.findIndex((p) => p.slug === slug)
      const now = target()
      if (index < 0 || projectAt(now).slug === slug) return
      const offset = ((index - wrap(now)) + count) % count
      glideTo(now + (offset > count / 2 ? offset - count : offset), 'key')
    }
    window.addEventListener('pageshow', restore)
    return () => window.removeEventListener('pageshow', restore)
  }, [])

  /* ---------------- keyboard and wheel ---------------- */

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (opening || event.altKey || event.ctrlKey || event.metaKey) return
      const t = event.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      const onDisc = !!stage.current?.contains(t)
      const now = target()
      let next: number | null = null
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = now + 1
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = now - 1
      if (event.key === 'Home') next = now - wrap(now)
      if (event.key === 'End') next = now - wrap(now) + count - 1
      if (next === null) return
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !onDisc) return
      event.preventDefault()
      glideTo(next, 'key', onDisc || document.activeElement === document.body)
    }

    // One disc per wheel gesture; a sustained scroll keeps stepping.
    let acc = 0
    let lastEvent = 0
    let lastStep = 0
    let gesture = false
    function onWheel(event: WheelEvent) {
      if (opening || event.ctrlKey) return
      const delta = (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * (event.deltaMode === 1 ? 32 : 1)
      // Once every disc has been seen, scrolling down leaves the carousel for the
      // about section below; while the page is scrolled, the wheel just scrolls it.
      const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
      if (vertical && (window.scrollY > 0 || (event.deltaY > 0 && seen.current.size >= count))) {
        acc = 0
        return
      }
      event.preventDefault()
      const now = performance.now()
      if (now - lastEvent > 130) {
        gesture = false
        acc = 0
      }
      lastEvent = now
      if (Math.abs(delta) < .3) return
      acc += clamp(delta, -24, 24)
      const sustained = gesture && now - lastStep > 480
      if ((!gesture || sustained) && Math.abs(acc) >= 6) {
        gesture = true
        lastStep = now
        const goal = target() + Math.sign(acc)
        glideTo(goal, 'wheel')
        seen.current.add(wrap(goal))
        acc = 0
      }
    }

    const area = stage.current?.parentElement
    window.addEventListener('keydown', onKey)
    area?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      area?.removeEventListener('wheel', onWheel)
    }
  }, [opening])

  useEffect(() => {
    seen.current.add(wrap(base))
  }, [base])

  useEffect(() => {
    if (!focusCenter.current) return
    focusCenter.current = false
    stage.current?.querySelector<HTMLButtonElement>('[data-center="true"]')?.focus({ preventScroll: true })
  }, [base])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  // The scribble is redrawn at 10 fps with fresh jitter, so it "boils" like a hand-drawn line.
  const scribbleSlot = hoverSlot !== null && canHover.current && !opening ? hoverSlot : null
  useEffect(() => {
    const path = scribble.current
    if (!path) return
    if (scribbleSlot === null) {
      path.dataset.on = 'false'
      return
    }
    const startAngle = -Math.PI / 2 - .6 + Math.random() * 1.2
    let tick = 1
    const draw = () => {
      const face = slotEls.current.get(scribbleSlot)?.querySelector('.disc-face')
      const ellipse = face && discEllipse(face)
      if (!ellipse) return
      path.setAttribute('d', scribblePath(ellipse, 977 + (reduced.current ? 1 : tick++) * 7919, startAngle))
    }
    draw()
    path.dataset.on = 'false'
    void path.getBoundingClientRect()
    path.dataset.on = 'true'
    const timer = window.setInterval(draw, 1000 / SCRIBBLE.fps)
    return () => window.clearInterval(timer)
  }, [scribbleSlot])

  /* ---------------- pointer ---------------- */

  function slotFromEvent(event: ReactPointerEvent) {
    const el = (event.target as HTMLElement).closest<HTMLElement>('[data-slot]')
    return el ? Number(el.dataset.slot) : null
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || opening) return
    suppressClick.current = false
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastT: event.timeStamp,
      mode: 'pending',
      slot: slotFromEvent(event),
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const s = sim.current
    s.pointer = { x: (event.clientX / innerWidth) * 2 - 1, y: -((event.clientY / innerHeight) * 2 - 1) }
    const over = event.pointerType === 'mouse' ? slotFromEvent(event) : null
    if (over !== s.hovered) {
      s.hovered = over
      setHoverSlot(over)
    }
    moveTag(event)
    kick()

    const d = drag.current
    if (!d || d.pointer !== event.pointerId) return
    if (d.mode === 'pending') {
      const dx = event.clientX - d.startX
      const dy = event.clientY - d.startY
      if (Math.hypot(dx, dy) < P.dragStartDistance) return
      d.mode = Math.abs(dx) >= Math.abs(dy) || d.slot === null ? 'scroll' : 'spin'
      if (d.mode === 'scroll' && count < 2) {
        drag.current = null
        return
      }
      suppressClick.current = true
      try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* pointer already gone */ }
      s.tween = null
      s.inertia = 0
      s.spring = 0
      if (d.mode === 'scroll') {
        s.dragging = true
      } else {
        const same = s.spin.slot === d.slot
        s.spin = { slot: d.slot, x: same ? s.spin.x : 0, y: same ? s.spin.y : 0, reset: null }
      }
      d.lastX = event.clientX
      d.lastY = event.clientY
      d.lastT = event.timeStamp
    }
    const dx = event.clientX - d.lastX
    const dy = event.clientY - d.lastY
    const dtMs = Math.max(8, event.timeStamp - d.lastT)
    d.lastX = event.clientX
    d.lastY = event.clientY
    d.lastT = event.timeStamp

    if (d.mode === 'spin') {
      const k = P.dragSensitivity * .0045
      s.spin.y = clamp(s.spin.y + dx * k, -P.maxSpin, P.maxSpin)
      s.spin.x = clamp(s.spin.x + dy * k, -P.maxSpin, P.maxSpin)
      return
    }
    const width = stage.current?.clientWidth ?? innerWidth
    const step = -(dx / width) * 6 * P.dragSensitivity
    s.L += step
    const v = clamp((16.667 / dtMs) * step, -P.dragMaxVelocity, P.dragMaxVelocity)
    s.inertia += (v - s.inertia) * P.dragVelocitySmoothing
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pointer !== event.pointerId) return
    drag.current = null
    const s = sim.current
    if (d.mode === 'spin') {
      s.spin.reset = { fromX: s.spin.x, fromY: s.spin.y, start: performance.now() }
      kick()
      return
    }
    if (d.mode !== 'scroll') return
    s.dragging = false
    // Pointer held still before release: no fling.
    if (event.timeStamp - d.lastT > 90) s.inertia *= .2
    writeSession(selectionKey, projectAt(Math.round(s.L + s.inertia * 8)).slug)
    kick()
  }

  function moveTag(event: ReactPointerEvent) {
    const el = tag.current
    if (!el || event.pointerType !== 'mouse') return
    const over = (event.target as HTMLElement).closest('[data-center="true"]')
    const busy = drag.current?.mode === 'scroll' || drag.current?.mode === 'spin'
    el.dataset.visible = String(!!over && !busy)
    el.style.translate = `${event.clientX}px ${event.clientY}px`
  }

  const center = base
  const project = projectAt(center)
  const slots: number[] = []
  for (let o = -RANGE; o <= RANGE; o++) slots.push(base + o)

  return (
    <section className="gallery" aria-roledescription="carrossel" aria-label="Acervo de projetos" inert={opening}>
      <Star shape="a" className="gallery-star-a" reactRef={starA} />
      <Star shape="b" className="gallery-star-b" reactRef={starB} />
      <div
        ref={stage}
        className="disc-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          sim.current.hovered = null
          setHoverSlot(null)
          if (tag.current) tag.current.dataset.visible = 'false'
          kick()
        }}
        onLostPointerCapture={endDrag}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = false
          }
        }}
      >
        <div className="disc-world">
          {slots.map((slot) => {
            const item = projectAt(slot)
            const isCenter = slot === center
            return (
              <div
                key={slot}
                className="disc-slot"
                data-slot={slot}
                ref={(el) => {
                  if (el) {
                    slotEls.current.set(slot, el)
                    if (!discs.current.has(slot)) paintOne(slot, el)
                  } else {
                    slotEls.current.delete(slot)
                  }
                }}
                inert={Math.abs(slot - center) > 1}
              >
                <button
                  type="button"
                  className="disc"
                  data-center={isCenter}
                  tabIndex={isCenter ? 0 : -1}
                  aria-label={isCenter
                    ? `Abrir projeto ${catalogNumber(item)}: ${item.title}, ${item.category}${item.demo ? ' (demonstração)' : ''}`
                    : `Mostrar ${item.title}`}
                  onClick={() => (isCenter ? open(item) : glideTo(slot, 'click'))}
                >
                  <div className="disc-spin3d" ref={(el) => { if (el) spinEls.current.set(slot, el); else spinEls.current.delete(slot) }}>
                    <DiscFace project={item} style={isCenter ? { viewTransitionName: 'disc' } as CSSProperties : undefined} />
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>
      <svg className="scribble" aria-hidden="true"><path ref={scribble} pathLength={1} data-on="false" /></svg>
      <DiscInfo
        slot={scribbleSlot ?? ((!canHover.current || matchMedia('(max-width: 700px)').matches) && settled && !opening ? center : null)}
        center={center}
      />
      <div className="cursor-tag" ref={tag} data-visible="false" aria-hidden="true"><span>Abrir</span></div>
      <p className="visually-hidden" role="status" aria-live="polite">
        {`${catalogNumber(project)} de ${String(count).padStart(2, '0')}: ${project.title}, ${project.category}`}
      </p>
      {count > 1 && (
        <div className="gallery-footer">
          <button type="button" aria-label="Projeto anterior" onClick={() => glideTo(target() - 1, 'key')}><Arrow left /></button>
          <button type="button" aria-label="Próximo projeto" onClick={() => glideTo(target() + 1, 'key')}><Arrow /></button>
        </div>
      )}
    </section>
  )

  /** Places a newly mounted disc straight at its slot, so it does not fly in from the origin. */
  function paintOne(slot: number, el: HTMLDivElement) {
    const s = sim.current
    const d = targetFor(slot, s.L, Math.round(s.L), 0)
    discs.current.set(slot, d)
    const placed = discTransform(d, s.unit, s.perspective)
    el.style.transform = placed.transform
    el.style.zIndex = placed.zIndex
  }
}

/** Announces the disc under the pointer (or the centre disc on touch screens). */
function DiscInfo({ slot, center }: { slot: number | null; center: number }) {
  const [shown, setShown] = useState<number | null>(slot)
  useEffect(() => {
    if (slot !== null) {
      setShown(slot)
      return
    }
    const timer = window.setTimeout(() => setShown(null), 220)
    return () => window.clearTimeout(timer)
  }, [slot])
  if (shown === null) return null
  const item = projectAt(shown)
  const touch = !matchMedia('(hover: hover)').matches
  const rows = [['Ano', item.year], ['Função', item.role]].filter(([, v]) => v) as [string, string][]
  return (
    <aside className="disc-info" data-visible={slot !== null} aria-hidden="true">
      <div className="disc-info-inner" key={shown}>
        <p className="disc-info-kicker"><span>Nº {catalogNumber(item)}</span><span>{item.category}</span></p>
        <p className="disc-info-title">{item.title}</p>
        {rows.length > 0 && (
          <dl className="disc-info-rows">
            {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        )}
        <p className="disc-info-hint">
          {item.demo && <span className="disc-info-demo">Demonstração</span>}
          {(touch ? 'Toque para ' : 'Clique para ') + (shown === center ? 'abrir' : 'trazer')}
        </p>
      </div>
    </aside>
  )
}
