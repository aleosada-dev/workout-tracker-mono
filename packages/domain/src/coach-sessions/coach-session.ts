export type CoachSessionProps = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  coachId: string;
  coachFullName: string | null;
  status: string;
  notes: string | null;
};

export class CoachSession {
  readonly id!: string;
  readonly scheduledAt!: string;
  readonly durationMinutes!: number;
  readonly coachId!: string;
  readonly coachFullName!: string | null;
  readonly status!: string;
  readonly notes!: string | null;

  private constructor(props: CoachSessionProps) {
    Object.assign(this, props);
  }

  static restore(props: CoachSessionProps): CoachSession {
    return new CoachSession(props);
  }
}
