export type EquipmentProps = {
  id: string;
  name: string;
  slug: string;
  preposition: string;
  createdAt: Date;
};

export class Equipment {
  readonly id!: string;
  readonly name!: string;
  readonly slug!: string;
  readonly preposition!: string;
  readonly createdAt!: Date;

  private constructor(props: EquipmentProps) {
    Object.assign(this, props);
  }

  static restore(props: EquipmentProps): Equipment {
    return new Equipment(props);
  }
}
