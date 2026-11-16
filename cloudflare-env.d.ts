declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ORCA_STAFF_EMAILS?: string;
    ASSETS?: Fetcher;
  }
}
