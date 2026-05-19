import { Card, CardContent } from '@workout-tracker/ui-mobile';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
};

export function MenuCard({ children, onPress }: Props) {
  return (
    <Pressable className="aspect-square flex-1" onPress={onPress}>
      <Card className="flex-1 bg-primary">
        <CardContent className="flex-1 items-center justify-center gap-2">{children}</CardContent>
      </Card>
    </Pressable>
  );
}
