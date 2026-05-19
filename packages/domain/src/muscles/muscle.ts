export type MuscleProps = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: MuscleProps[] | null;
  level: number;
  sortOrder: number;
  createdAt: Date;
};

export class Muscle {
  readonly id!: string;
  readonly name!: string;
  readonly slug!: string;
  readonly parentId!: string | null;
  readonly children!: Muscle[] | null;
  readonly level!: number;
  readonly sortOrder!: number;
  readonly createdAt!: Date;

  private constructor(props: MuscleProps) {
    Object.assign(this, props);
  }

  static restore(props: MuscleProps): Muscle {
    return new Muscle({
      ...props,
      children: props.children?.map((c) => Muscle.restore(c)) ?? null,
    });
  }
}
