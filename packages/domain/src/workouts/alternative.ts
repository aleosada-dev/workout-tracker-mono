import type { MeasurementType } from '../set/sets';

/**
 * Um exercício alternativo compartilha as séries do principal, então só pode ser
 * criado quando os tipos de medição são compatíveis. Tipos iguais são sempre
 * compatíveis; entre tipos diferentes, apenas `weight_reps` e `reps` (ambos
 * baseados em repetições) se equivalem.
 */
const ALTERNATIVE_COMPATIBLE_GROUPS: readonly (readonly MeasurementType[])[] = [
  ['weight_reps', 'reps'],
];

export function areAlternativeMeasurementTypesCompatible(
  principal: MeasurementType,
  alternative: MeasurementType,
): boolean {
  if (principal === alternative) return true;
  return ALTERNATIVE_COMPATIBLE_GROUPS.some(
    (group) => group.includes(principal) && group.includes(alternative),
  );
}
