import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export async function readBoundedJson(path: string): Promise<unknown> {
  const absolute = resolve(path);
  const metadata = await stat(absolute);
  if (!metadata.isFile()) throw new Error(`${absolute} is not a file.`);
  if (metadata.size > MAX_INPUT_BYTES) {
    throw new Error(`${absolute} exceeds the 2 MiB input limit.`);
  }
  const contents = await readFile(absolute, "utf8");
  const json = contents.charCodeAt(0) === 0xfeff ? contents.slice(1) : contents;
  return JSON.parse(json) as unknown;
}
