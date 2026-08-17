/**
 * Bootstrap picks its colour mode from a `data-bs-theme` attribute and does not
 * watch the operating system on its own. Mirror the OS setting onto the
 * attribute, and keep mirroring it when the user switches theme mid-session.
 *
 * Returns a function that stops watching.
 */
export function followColorScheme(media: MediaQueryList, root: Element): () => void {
  const apply = () => root.setAttribute('data-bs-theme', media.matches ? 'dark' : 'light')
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
