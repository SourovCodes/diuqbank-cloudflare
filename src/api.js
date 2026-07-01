// ponytail: single const; swap to import.meta.env if we ever need per-env config
const API_BASE = "https://diuqbank-api-prod.sourov-cse.workers.dev";

async function get(path, params) {
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const getQuestions = (params) => get("/questions", params);
export const getQuestion = (id) => get(`/questions/${id}`);
export const getSubmissions = (id) => get(`/questions/${id}/submissions`);
export const getFilterOptions = () => get("/filter-options");
