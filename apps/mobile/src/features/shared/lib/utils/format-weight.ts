const TONNE_THRESHOLD_KG = 1000;

/** Weight as `kg`, switching to tonnes (`t`) at 1000 kg, e.g. `696 kg` or `2,1 t`. */
export function formatWeight(totalKg: number, language: string): string {
  if (totalKg >= TONNE_THRESHOLD_KG) {
    const tonnes = new Intl.NumberFormat(language, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(totalKg / 1000);
    return `${tonnes} t`;
  }
  const kg = new Intl.NumberFormat(language, { maximumFractionDigits: 0 }).format(totalKg);
  return `${kg} kg`;
}
