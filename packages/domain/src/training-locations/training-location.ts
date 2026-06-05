/**
 * Local de treino (academia) privado do atleta. Só nome na v1 — sem GPS/endereço.
 * Serve para agrupar/filtrar aliases de equipamento.
 */
export type TrainingLocation = {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ListTrainingLocationsFilter = {
  userId: string;
};

export type CreateTrainingLocationInput = {
  userId: string;
  name: string;
};

export type UpdateTrainingLocationInput = {
  userId: string;
  locationId: string;
  name: string;
};

export type DeleteTrainingLocationInput = {
  userId: string;
  locationId: string;
};
