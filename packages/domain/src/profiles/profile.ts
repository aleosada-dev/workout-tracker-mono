export type UserRole = 'coach' | 'athlete';

export type ProfileProps = {
  id: string;
  role: UserRole;
  fullName: string | null;
  avatarUrl: string | null;
};

export class Profile {
  readonly id!: string;
  readonly role!: UserRole;
  readonly fullName!: string | null;
  readonly avatarUrl!: string | null;

  private constructor(props: ProfileProps) {
    Object.assign(this, props);
  }

  static restore(props: ProfileProps): Profile {
    return new Profile(props);
  }
}
