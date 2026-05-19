import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@workout-tracker/ui-mobile';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMuscles } from '@/features/muscles/hooks/use-muscles';
import { buildGroups, buildLabelMap } from '@/features/muscles/lib/build-groups';

type Props = {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function MuscleSelect({ value, onValueChange, placeholder, disabled }: Props) {
  const { t } = useTranslation();
  const { data } = useMuscles();

  const groups = useMemo(() => buildGroups(data ?? [], t), [data, t]);
  const labels = useMemo(() => buildLabelMap(groups), [groups]);

  const selectedOption = value ? { value, label: labels[value] ?? value } : undefined;

  return (
    <Select
      value={selectedOption}
      onValueChange={(opt) => onValueChange(opt?.value ?? null)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? t('muscles.placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((group) => (
          <SelectGroup key={group.id}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.items.map((item) => (
              <React.Fragment key={item.value}>
                <SelectItem value={item.value} label={item.label}>
                  {item.label}
                </SelectItem>
                {item.children?.map((child) => (
                  <SelectItem
                    key={child.value}
                    value={child.value}
                    label={child.label}
                    className="pl-8"
                  >
                    {child.label}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
