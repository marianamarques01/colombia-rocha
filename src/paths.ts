export function sitePath(path: string, base = import.meta.env.BASE_URL) {
  return path.startsWith('/') && !path.startsWith('//') ? base + path.slice(1) : path
}
