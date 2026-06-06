// Minimal argv parser for the harness CLIs. Supports `--key value`, `--key=value`
// and boolean `--flag`. Repeatable keys collect into arrays via getList().

export interface Args {
  get(key: string): string | undefined;
  getList(key: string): string[];
  getNumber(key: string, fallback: number): number;
  has(key: string): boolean;
}

export function parseArgs(argv: string[]): Args {
  const map = new Map<string, string[]>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) {
      continue;
    }
    const body = tok.slice(2);
    const eq = body.indexOf("=");
    if (eq >= 0) {
      push(map, body.slice(0, eq), body.slice(eq + 1));
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      push(map, body, argv[++i]);
    } else {
      flags.add(body);
    }
  }
  return {
    get: (k) => map.get(k)?.[0],
    getList: (k) =>
      (map.get(k) ?? []).flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean),
    getNumber: (k, fb) => {
      const v = map.get(k)?.[0];
      const n = v === undefined ? NaN : Number(v);
      return Number.isFinite(n) ? n : fb;
    },
    has: (k) => flags.has(k) || map.has(k),
  };
}

function push(map: Map<string, string[]>, k: string, v: string): void {
  const arr = map.get(k) ?? [];
  arr.push(v);
  map.set(k, arr);
}
