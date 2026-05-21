import {
  MAX_VIDEO_DURATION_SECONDS,
  MAX_VIDEO_SIZE_BYTES,
  VIDEO_CONTENT_TYPES,
  type VideoContentType,
} from '@workout-tracker/domain';

/**
 * Validação no dispositivo do vídeo de demonstração escolhido na galeria.
 *
 * Os formatos e limites aceitos são definidos uma única vez em
 * `@workout-tracker/domain` (media/video). Aqui vive só a lógica específica do
 * device: normalizar o `mimeType` do `ImagePickerAsset` e validar o arquivo.
 */

// Reexportados para os consumidores do device (picker, upload) terem um import só.
export { MAX_VIDEO_SIZE_BYTES, type VideoContentType };

/** Limite de duração em milissegundos — o `durationMs` do `ImagePickerAsset` é em ms. */
export const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;

/**
 * Normaliza o `mimeType` do `ImagePickerAsset` para um tipo aceito, ou `null`
 * quando o formato não é suportado. Descarta parâmetros (`; codecs=...`).
 */
export function resolveVideoContentType(
  mimeType: string | null | undefined,
): VideoContentType | null {
  if (!mimeType) return null;
  const normalized = mimeType.toLowerCase().split(';')[0]?.trim();
  return VIDEO_CONTENT_TYPES.includes(normalized as VideoContentType)
    ? (normalized as VideoContentType)
    : null;
}

export type VideoValidationResult =
  | { ok: true; contentType: VideoContentType }
  | { ok: false; reason: 'tooLarge' | 'tooLong' | 'unsupportedFormat' };

/**
 * Valida um vídeo escolhido na galeria contra formato, tamanho e duração.
 *
 * `fileSize` (bytes) e `durationMs` (milissegundos) vêm direto do
 * `ImagePickerAsset`. Quando a plataforma não informa um deles — o `fileSize`
 * pode vir indefinido em alguns aparelhos Android — aquele check é ignorado em
 * vez de barrar um vídeo possivelmente válido. O formato, ao contrário, é
 * obrigatório: sem um content type aceito não há como enviar o arquivo.
 */
export function validatePickedVideo({
  fileSize,
  durationMs,
  mimeType,
}: {
  fileSize: number | null | undefined;
  durationMs: number | null | undefined;
  mimeType: string | null | undefined;
}): VideoValidationResult {
  const contentType = resolveVideoContentType(mimeType);
  if (!contentType) {
    return { ok: false, reason: 'unsupportedFormat' };
  }
  if (typeof fileSize === 'number' && fileSize >= MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, reason: 'tooLarge' };
  }
  if (typeof durationMs === 'number' && durationMs >= MAX_VIDEO_DURATION_MS) {
    return { ok: false, reason: 'tooLong' };
  }
  return { ok: true, contentType };
}
