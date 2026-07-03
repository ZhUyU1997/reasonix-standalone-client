/**
 * diff.ts — LCS line-diff algorithm + unified diff parser.
 * Matches desktop/frontend/src/lib/diff.ts.
 */

export type DiffRow = {
  type: "ctx" | "add" | "del";
  text: string;
  oldLine?: number;
  newLine?: number;
};

export function diffLines(a: string, b: string): DiffRow[] {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = x.length;
  const m = y.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0, j = 0, oldLine = 1, newLine = 1;
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      rows.push({ type: "ctx", text: x[i], oldLine, newLine });
      i++; j++; oldLine++; newLine++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", text: x[i], oldLine }); i++; oldLine++;
    } else {
      rows.push({ type: "add", text: y[j], newLine }); j++; newLine++;
    }
  }
  while (i < n) { rows.push({ type: "del", text: x[i++], oldLine }); oldLine++; }
  while (j < m) { rows.push({ type: "add", text: y[j++], newLine }); newLine++; }
  return rows;
}

const hunkHeader = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;

export function diffRowsFromUnifiedDiff(diff: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let oldLine = 0, newLine = 0, inHunk = false;
  const lines = diff.endsWith("\n") ? diff.slice(0, -1).split("\n") : diff.split("\n");
  for (const line of lines) {
    const header = hunkHeader.exec(line);
    if (header) { oldLine = Number(header[1]); newLine = Number(header[2]); inHunk = true; continue; }
    if (!inHunk) continue;
    if (line.startsWith("\\ No newline")) continue;
    const marker = line[0];
    const text = marker === " " || marker === "+" || marker === "-" ? line.slice(1) : line;
    if (marker === "+") { rows.push({ type: "add", text, newLine }); newLine++; continue; }
    if (marker === "-") { rows.push({ type: "del", text, oldLine }); oldLine++; continue; }
    rows.push({ type: "ctx", text, oldLine, newLine }); oldLine++; newLine++;
  }
  return rows;
}
