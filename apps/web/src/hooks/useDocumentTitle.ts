import { useEffect } from 'react'

const SITE_NAME = 'DIU Question Bank'

/**
 * Set the document title for the lifetime of a page, restoring nothing (the
 * next page sets its own). Pass a page label; the site name is appended.
 * Call with no argument on the home page to use the bare site name.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE_NAME}` : SITE_NAME
  }, [title])
}
