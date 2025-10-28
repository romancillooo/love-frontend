interface ImportMetaEnv {
  readonly NG_APP_SECRET_PASSWORD?: string;
  readonly NG_APP_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
