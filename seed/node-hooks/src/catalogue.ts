import { readFileSync } from 'node:fs';

export interface CatalogueBlock { effect: string; input: { properties?: Record<string, unknown>; required?: string[] }; output: unknown; untrusted_fields?: string[] }
const CATALOGUE_PATH = process.env.CATALOGUE_PATH ?? new URL('../../shared/catalogue/blocks.v0.json', import.meta.url).pathname;
export const catalogue = JSON.parse(readFileSync(CATALOGUE_PATH, 'utf8')) as { blocks: Record<string, CatalogueBlock> };
