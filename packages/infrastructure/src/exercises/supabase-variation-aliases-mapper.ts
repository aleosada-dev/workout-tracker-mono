import type { VariationAlias } from '@workout-tracker/domain';

export const VARIATION_ALIAS_COLUMNS =
  'id, user_id, variation_id, location_id, name, created_at, updated_at';

export type VariationAliasRow = {
  id: string;
  user_id: string;
  variation_id: string;
  location_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
};

export function toVariationAlias(row: VariationAliasRow): VariationAlias {
  return {
    id: row.id,
    userId: row.user_id,
    variationId: row.variation_id,
    locationId: row.location_id,
    name: row.name,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
