import {
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectLabel,
  MultiSelectTrigger,
  MultiSelectValue,
} from '@workout-tracker/ui-mobile';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMuscleSections } from '@/features/muscles/hooks/use-muscle-sections';

type Props = {
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  testID?: string;
};

export function MuscleMultiSelect({ value, onValueChange, placeholder, disabled, testID }: Props) {
  const { t } = useTranslation();
  const { sections, labels } = useMuscleSections();

  return (
    <MultiSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <MultiSelectTrigger testID={testID}>
        <MultiSelectValue
          placeholder={placeholder ?? t('muscles.placeholder')}
          labels={labels}
          multipleSelectedText={t('multiSelect.multipleSelected')}
        />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {sections.map((section) => (
          <MultiSelectGroup key={section.id}>
            <MultiSelectLabel>{section.label}</MultiSelectLabel>
            {section.items.map((item) => (
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
