import { useEffect, useState } from 'react';

export const PAGES = [
  { id: 'overview', label: 'Overview' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'over-time', label: 'Over time' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'donors', label: 'Donors' },
] as const;

export type PageId = (typeof PAGES)[number]['id'];

function pageFromHash(): PageId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return PAGES.find((p) => p.id === id)?.id ?? 'overview';
}

/** Current page from the URL hash (`#/milestones`), so pages work under any base path and keep `?demo`. */
export function usePage(): PageId {
  const [page, setPage] = useState(pageFromHash);
  useEffect(() => {
    const onChange = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return page;
}
