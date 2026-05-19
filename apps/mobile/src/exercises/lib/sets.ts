/** Set-type taxonomy used by the sets table and progression charts. */
export type SetType = 'warmup' | 'normal' | 'drop' | 'cluster';

type SetTypeConfig = {
  order: number;
  color: string;
  textColor: string;
  label: string;
  token: string;
};

export const SET_TYPE_CONFIG: Record<SetType, SetTypeConfig> = {
  warmup: {
    order: 0,
    color: '#f59e0b',
    textColor: 'text-amber-500',
    label: 'sets.warmup.label',
    token: 'sets.warmup.token',
  },
  normal: {
    order: 1,
    color: '#a1a1a1',
    textColor: 'text-foreground',
    label: 'sets.normal.label',
    token: 'sets.normal.token',
  },
  drop: {
    order: 2,
    color: '#38bdf8',
    textColor: 'text-sky-400',
    label: 'sets.drop.label',
    token: 'sets.drop.token',
  },
  cluster: {
    order: 3,
    color: '#10b981',
    textColor: 'text-emerald-500',
    label: 'sets.cluster.label',
    token: 'sets.cluster.token',
  },
};
