import { rename, writeFile, readFile } from "node:fs/promises";

export interface SaveFile {
  schema: 1;
  savedAt: string; // ISO 8601
  state: unknown; // duck typing — validé en surface par l'appelant
}

/** Écriture atomique : tmp puis rename, pour ne jamais corrompre un état existant. */
export async function saveState(path: string, state: unknown): Promise<void> {
  const file: SaveFile = { schema: 1, savedAt: new Date().toISOString(), state };
  const tmp = `${path}.tmp`; // ponytail: pas de fsync du tmp ni de lock — acceptable pour un état local mono-processus
  await writeFile(tmp, JSON.stringify(file), "utf8");
  await rename(tmp, path);
}

export async function loadState(path: string): Promise<unknown> {
  let file: SaveFile;
  try {
    file = JSON.parse(await readFile(path, "utf8")) as SaveFile;
  } catch (e) {
    throw new Error(`persist: fichier illisible ou JSON corrompu (${path}): ${(e as Error).message}`);
  }
  if (file?.schema !== 1) throw new Error(`persist: schéma non supporté (${String(file?.schema)}), attendu 1`);
  if (typeof file.savedAt !== "string") throw new Error("persist: champ requis 'savedAt' manquant");
  if (!("state" in file)) throw new Error("persist: champ requis 'state' manquant");
  return file.state;
}
