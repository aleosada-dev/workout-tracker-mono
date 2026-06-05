/**
 * Alias de equipamento: uma máquina física específica de uma variação, privada do
 * atleta, com um local opcional. Segmenta última-carga e records por máquina.
 * Faz parte do domínio de exercises (sempre vinculado a uma variation).
 */
export type VariationAlias = {
  id: string;
  userId: string;
  variationId: string;
  locationId: string | null;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ListVariationAliasesFilter = {
  userId: string;
  variationIds: string[];
};

export type CreateVariationAliasInput = {
  userId: string;
  variationId: string;
  locationId: string | null;
  name: string;
};

export type UpdateVariationAliasInput = {
  userId: string;
  aliasId: string;
  name?: string;
  locationId?: string | null;
};

export type DeleteVariationAliasInput = {
  userId: string;
  aliasId: string;
};
