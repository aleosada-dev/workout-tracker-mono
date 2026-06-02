import {
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from '@workout-tracker/ui-mobile';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import type { CoachSessionResponse } from '@/features/coach-sessions/api/coach-sessions';

const NONE_VALUE = '__none__';

type Props = {
  sessions: CoachSessionResponse[];
  isCoached: boolean;
  onCoachedChange: (value: boolean) => void;
  selectedSessionId: string | null;
  onSelectedSessionChange: (sessionId: string | null) => void;
};

export function CoachedSessionField({
  sessions,
  isCoached,
  onCoachedChange,
  selectedSessionId,
  onSelectedSessionChange,
}: Props) {
  const { t, i18n } = useTranslation();

  const formatSession = (session: CoachSessionResponse) => {
    const time = new Date(session.scheduledAt).toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return session.coachFullName ? `${time} — ${session.coachFullName}` : time;
  };

  const placeholder = t('workoutExecutionSummaryScreen.coached.selectPlaceholder');
  const selectedLabel =
    selectedSessionId === null
      ? placeholder
      : (() => {
          const found = sessions.find((s) => s.id === selectedSessionId);
          return found ? formatSession(found) : placeholder;
        })();

  return (
    <View className="gap-3 px-4 pt-4">
      <Pressable
        className="flex-row items-center gap-2"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCoached }}
        onPress={() => onCoachedChange(!isCoached)}
      >
        <Checkbox checked={isCoached} onCheckedChange={onCoachedChange} hitSlop={0} />
        <Text>{t('workoutExecutionSummaryScreen.coached.label')}</Text>
      </Pressable>

      {isCoached && sessions.length > 0 ? (
        <Select
          value={{ value: selectedSessionId ?? NONE_VALUE, label: selectedLabel }}
          onValueChange={(option) => {
            if (!option) return;
            onSelectedSessionChange(option.value === NONE_VALUE ? null : option.value);
          }}
        >
          <SelectTrigger className="h-12 w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem label={placeholder} value={NONE_VALUE}>
              {placeholder}
            </SelectItem>
            {sessions.map((session) => {
              const label = formatSession(session);
              return (
                <SelectItem key={session.id} label={label} value={session.id}>
                  {label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : null}

      {isCoached && sessions.length === 0 ? (
        <Text variant="muted">{t('workoutExecutionSummaryScreen.coached.none')}</Text>
      ) : null}
    </View>
  );
}
