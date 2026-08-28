import { randomUUID } from "crypto";

export function gerarId(prefixo: string): string {
  return `${prefixo}_${randomUUID()}`;
}
