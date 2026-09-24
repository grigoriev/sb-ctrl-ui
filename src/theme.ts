/**
 * Bootstrap picks its color mode from a `data-bs-theme` attribute and does not
 * watch the operating system on its own. Mirror the OS setting onto the
 * attribute, and keep mirroring it when the user switches theme mid-session.
 *
 * Returns a function that stops watching.
 */
export function followColorScheme(media: MediaQueryList, root: HTMLElement): () => void {
  const apply = () => {
    root.dataset.bsTheme = media.matches ? 'dark' : 'light'
  }
  apply()
  media.addEventListener('change', apply)
  return () => media.removeEventListener('change', apply)
}
