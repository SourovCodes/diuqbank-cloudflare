import { useNavigate } from "react-router-dom";

/**
 * Reviewer flow: after acting on a queue item (approve/reject), jump straight
 * to the next item still awaiting review instead of bouncing back to the list.
 * `fetchPending` reads the queue fresh from the API (the just-handled item has
 * already left the pending status server-side, but it's filtered out anyway in
 * case of caching); when the queue is empty we land on the list page.
 */
export function useAdvanceQueue({
  listPath,
  currentId,
  fetchPending,
}: {
  listPath: string;
  currentId: number;
  fetchPending: () => Promise<{ id: number }[]>;
}) {
  const navigate = useNavigate();

  return async () => {
    try {
      const items = await fetchPending();
      const next = items.find((item) => item.id !== currentId);
      navigate(next ? `${listPath}/${next.id}` : listPath);
    } catch {
      // Advancing is best-effort; the action itself already succeeded.
      navigate(listPath);
    }
  };
}
