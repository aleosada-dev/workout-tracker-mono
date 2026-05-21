/**
 * Limites do vídeo de demonstração selecionado da galeria, validados no
 * dispositivo logo após a escolha do arquivo.
 */
export const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_DURATION_MS = 30_000;

export type VideoValidationResult = { ok: true } | { ok: false; reason: 'tooLarge' | 'tooLong' };

/**
 * Valida um vídeo escolhido na galeria contra os limites de tamanho e duração.
 *
 * `fileSize` (bytes) e `durationMs` (milissegundos) vêm direto do
 * `ImagePickerAsset`. Quando a plataforma não informa um deles — o `fileSize`
 * pode vir indefinido em alguns aparelhos Android — aquele check é ignorado em
 * vez de barrar um vídeo possivelmente válido.
 */
export function validatePickedVideo({
  fileSize,
  durationMs,
}: {
  fileSize: number | null | undefined;
  durationMs: number | null | undefined;
}): VideoValidationResult {
  if (typeof fileSize === 'number' && fileSize >= MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, reason: 'tooLarge' };
  }
  if (typeof durationMs === 'number' && durationMs >= MAX_VIDEO_DURATION_MS) {
    return { ok: false, reason: 'tooLong' };
  }
  return { ok: true };
}
