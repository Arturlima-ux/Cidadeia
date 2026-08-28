import { createClient } from "@supabase/supabase-js";

const BUCKET = "avatars";
const TAMANHO_MAX_BYTES = 3 * 1024 * 1024; // 3MB
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];

function clienteStorage() {
  const url = process.env.SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return null;
  // Service role key — usado só no servidor, nunca exposto ao navegador.
  return createClient(url, chave);
}

export type ResultadoUpload = { ok: true; url: string } | { ok: false; erro: string };

export async function enviarFotoPerfil(
  usuarioId: string,
  arquivo: File
): Promise<ResultadoUpload> {
  const supabase = clienteStorage();
  if (!supabase) {
    return {
      ok: false,
      erro:
        "Upload de foto ainda não configurado — falta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.",
    };
  }

  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return { ok: false, erro: "Use uma imagem JPG, PNG ou WEBP." };
  }
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return { ok: false, erro: "A imagem precisa ter até 3MB." };
  }

  const extensao = arquivo.type === "image/png" ? "png" : arquivo.type === "image/webp" ? "webp" : "jpg";
  const caminho = `${usuarioId}/perfil.${extensao}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type });

  if (error) {
    return { ok: false, erro: "Não foi possível enviar a imagem. Tente novamente." };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
  // Cache-bust: mesma URL a cada troca de foto quebraria o cache do navegador.
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}
