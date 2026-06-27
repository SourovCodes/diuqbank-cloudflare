/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the DIU Question Bank API. Defaults to the deployed Worker. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
