import { Card, CardContent } from '@workout-tracker/ui-mobile';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

type Props = {
  children?: ReactNode;
  onPress?: () => void;
  testID?: string;
};

export function MenuCard({ children, onPress, testID }: Props) {
  return (
    <Pressable className="aspect-square flex-1" onPress={onPress} testID={testID}>
      <Card className="flex-1 bg-primary">
        <CardContent className="flex-1 items-center justify-center gap-2">{children}</CardContent>
      </Card>
    </Pressable>
  );
}
