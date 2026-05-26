export type CoachAthleteProps = {
  athleteId: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export class CoachAthlete {
  readonly athleteId!: string;
  readonly fullName!: string | null;
  readonly avatarUrl!: string | null;

  private constructor(props: CoachAthleteProps) {
    Object.assign(this, props);
  }

  static restore(props: CoachAthleteProps): CoachAthlete {
    return new CoachAthlete(props);
  }
}
