import type { Ref } from 'react'

/** Organic terra star. The outer element is positioned by CSS, the inner one reacts to motion. */
export function Star({ shape, className = '', reactRef }: {
  shape: 'a' | 'b'
  className?: string
  reactRef?: Ref<HTMLDivElement>
}) {
  return (
    <div className={`star star-${shape} ${className}`} aria-hidden="true">
      <div className="star-react" ref={reactRef}>
        <div className="star-silhouette" />
      </div>
    </div>
  )
}

/** Small star used as a marker in menus and labels. */
export function StarMark() {
  return (
    <svg className="star-mark" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.3 1.2c.4 3.6.1 6.9 1.6 8 1.4 1 4.9-.3 8.4-1-2.6 2.4-5.6 4.3-5.7 6.1-.1 1.8 2.4 4.3 4.1 7.3-3.2-1.5-5.9-3.6-7.7-3.3-1.9.3-3.6 3.3-6.2 5.6 1-3.3 2.4-6.4 1.6-8.1C8.6 14 5.2 13 1.4 11.6c3.6-.4 7 .3 8.3-.9 1.3-1.2 2-5.5 3.6-9.5z" fill="currentColor" />
    </svg>
  )
}

/** Organic star outline (100 × 100 box, centred), shared by the O of COL★MBIA and the night sky star. */
export const ORGANIC_STAR = 'M53.8 9.5Q55.3 7.3 56.0 8.8Q56.7 10.3 55.6 17.7Q54.5 25.1 54.5 30.3Q54.5 35.4 56.0 36.9Q57.5 38.4 59.3 38.4Q61.2 38.4 71.9 33.6Q82.6 28.8 84.1 28.8Q85.6 28.8 86.0 29.5Q86.3 30.3 85.2 31.4Q84.1 32.5 75.2 40.2Q66.4 48.0 64.1 50.6Q61.9 53.2 62.3 55.0Q62.7 56.9 68.6 65.4Q74.5 73.9 74.1 75.0Q73.8 76.1 71.9 75.8Q70.1 75.4 63.4 72.4Q56.7 69.5 53.4 68.0Q50.1 66.5 48.6 66.9Q47.1 67.3 44.2 69.8Q41.2 72.4 36.8 76.9Q32.3 81.3 31.2 81.3Q30.1 81.3 29.4 80.2Q28.6 79.1 29.4 76.1Q30.1 73.2 33.1 64.7Q36.0 56.2 34.9 54.3Q33.8 52.5 26.4 49.1Q19.0 45.8 16.4 43.6Q13.8 41.4 14.2 40.2Q14.6 39.1 16.8 39.1Q19.0 39.1 27.5 40.6Q36.0 42.1 38.2 41.7Q40.5 41.4 42.7 37.3Q44.9 33.2 48.6 22.5Q52.3 11.8 53.8 9.5Z'
