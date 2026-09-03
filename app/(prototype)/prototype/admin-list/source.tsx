/**
 * PROTOTYPE — the reaction surface.
 *
 * Both shapes render an identical table by construction, so the pixels decide
 * nothing. What is being compared is what it cost to write, so the page puts
 * the source next to the render.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "app", "(prototype)", "prototype", "admin-list");

/** Lines that are neither blank nor comment — the honest cost of a file. */
function countCode(source: string): number {
  let inBlock = false;
  let count = 0;

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (!line) continue;
    if (line.startsWith("//")) continue;
    if (line.startsWith("{/*") || line.startsWith("*")) continue;
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlock = true;
      continue;
    }
    count += 1;
  }

  return count;
}

export type SourceFile = {
  relativePath: string;
  source: string;
  lines: number;
  codeLines: number;
};

export async function readSources(paths: string[]): Promise<SourceFile[]> {
  return Promise.all(
    paths.map(async (relativePath) => {
      const source = await readFile(path.join(ROOT, relativePath), "utf8");
      return {
        relativePath,
        source,
        lines: source.split("\n").length,
        codeLines: countCode(source),
      };
    }),
  );
}

export function SourcePanel({
  title,
  subtitle,
  files,
  open,
}: {
  title: string;
  subtitle: string;
  files: SourceFile[];
  open?: boolean;
}) {
  const total = files.reduce((sum, file) => sum + file.codeLines, 0);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-xs text-muted-foreground">
          {subtitle} — {total} linhas de código em {files.length}{" "}
          {files.length === 1 ? "arquivo" : "arquivos"}
        </span>
      </div>

      {files.map((file) => (
        <details
          key={file.relativePath}
          open={open}
          className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
            <code>{file.relativePath}</code>
            <span className="ml-2 font-normal text-muted-foreground">
              {file.codeLines} linhas de código / {file.lines} no total
            </span>
          </summary>
          <pre className="overflow-x-auto border-t px-3 py-2 text-xs leading-relaxed">
            <code>{file.source}</code>
          </pre>
        </details>
      ))}
    </section>
  );
}
