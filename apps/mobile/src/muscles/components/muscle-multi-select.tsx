import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@workout-tracker/ui-mobile';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMuscles } from '@/muscles/hooks/use-muscles';
import { buildGroups, buildLabelMap } from '@/muscles/lib/build-groups';

type Props = {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function MuscleMultiSelect({ value, onValueChange, placeholder, disabled }: Props) {
  const { t } = useTranslation();
  const { data } = useMuscles();

  const groups = useMemo(() => buildGroups(data ?? [], t), [data, t]);
  const labels = useMemo(() => buildLabelMap(groups), [groups]);

  return (
    <MultiSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <MultiSelectTrigger>
        <MultiSelectValue
          placeholder={placeholder ?? t('muscles.placeholder')}
          labels={labels}
          multipleSelectedText={t('multiSelect.multipleSelected')}
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {groups.map((group) => (
          <MultiSelectGroup key={group.id}>
            <MultiSelectLabel>{group.label}</MultiSelectLabel>
            {group.items.map((item) => (
              <React.Fragment key={item.value}>
                <MultiSelectItem value={item.value} indent={0}>
                  {item.label}
                </MultiSelectItem>
                {item.children?.map((child) => (
                  <MultiSelectItem key={child.value} value={child.value} indent={1}>
                    {child.label}
                  </MultiSelectItem>
                ))}
              </React.Fragment>
            ))}
          </MultiSelectGroup>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
