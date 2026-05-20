import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@workout-tracker/ui-mobile';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useMuscleSections } from '@/features/muscles/hooks/use-muscle-sections';
import { SelectScrollArea } from '@/features/shared/components/select-scroll-area';

type Props = {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function MuscleSelect({ value, onValueChange, placeholder, disabled }: Props) {
  const { t } = useTranslation();
  const { sections, labels } = useMuscleSections();

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
        <SelectScrollArea>
          {sections.map((section) => (
            <SelectGroup key={section.id}>
              <SelectLabel className="text-sm">{section.label}</SelectLabel>
              {section.items.map((item) => (
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
        </SelectScrollArea>
      </SelectContent>
    </Select>
  );
}
