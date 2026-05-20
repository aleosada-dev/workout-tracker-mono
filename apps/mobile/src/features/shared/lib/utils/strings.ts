/** Lowercase + strip diacritics — so "abducao" matches "Abdução". */
export const normalizeString = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
