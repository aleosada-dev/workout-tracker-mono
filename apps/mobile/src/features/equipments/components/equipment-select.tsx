import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workout-tracker/ui-mobile';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useEquipments } from '@/features/equipments/hooks/use-equipments';

type Props = {
  value: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function EquipmentSelect({ value, onValueChange, placeholder, disabled }: Props) {
  const { t, i18n } = useTranslation();
  const { data } = useEquipments();

  const options = useMemo(() => {
    const items = (data ?? []).map((eq) => ({
      value: eq.id,
      label: t(`equipment.${eq.slug}` as never) as string,
    }));
    return items.sort((a, b) => a.label.localeCompare(b.label, i18n.language));
  }, [data, t, i18n.language]);

  const selectedOption = useMemo(() => {
    if (!value) return undefined;
    const match = options.find((o) => o.value === value);
    return match ? { value: match.value, label: match.label } : undefined;
  }, [value, options]);

  return (
    <Select
      value={selectedOption}
      onValueChange={(opt) => onValueChange(opt?.value ?? null)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue
          placeholder={placeholder ?? t('exerciseListScreen.filter.placeholders.equipment')}
        />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} label={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
