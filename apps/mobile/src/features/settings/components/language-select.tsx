import { useValue } from '@legendapp/state/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workout-tracker/ui-mobile';
import {
  type LanguagePreference,
  language$,
  setLanguage,
} from '@/features/settings/state/settings-store';
import { useLanguageOptions } from '@/features/settings/state/use-language-options';

export function LanguageSelect() {
  const current = useValue(language$);
  const options = useLanguageOptions();
  const currentLabel = options.find((o) => o.value === current)?.label ?? '';

  return (
    <Select
      value={{ value: current, label: currentLabel }}
      onValueChange={(option) => {
        if (option) setLanguage(option.value as LanguagePreference);
      }}
    >
      <SelectTrigger className="h-12 w-full">
        <SelectValue placeholder={currentLabel} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} label={opt.label} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
