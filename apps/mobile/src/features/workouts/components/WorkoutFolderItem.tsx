import { Badge, Icon, Skeleton, Text } from '@workout-tracker/ui-mobile';
import { Folder, Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

export type WorkoutFolder = {
  id: string;
  name: string;
  workoutCount: number;
  color: string;
  iconColor: string;
};

export function WorkoutFolderItem({
  folder,
  onPress,
}: {
  folder: WorkoutFolder;
  onPress?: () => void;
}) {
  return (
    <Pressable className="w-20 items-center gap-2" onPress={onPress}>
      <View className="relative">
        <View className={`h-16 w-16 items-center justify-center rounded-2xl ${folder.color}`}>
          <Icon as={Folder} size={28} className={folder.iconColor} />
        </View>
        {folder.workoutCount > 0 ? (
          <Badge className="absolute -top-2 -right-2 h-7 min-w-7 items-center justify-center px-1.5 py-0">
            <Text className="text-center text-sm">{folder.workoutCount}</Text>
          </Badge>
        ) : null}
      </View>
      <Text variant="small" className="text-center" numberOfLines={2}>
        {folder.name}
      </Text>
    </Pressable>
  );
}

export function AddWorkoutFolderItem({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable className="w-20 items-center gap-2" onPress={onPress}>
      <View className="h-16 w-16 items-center justify-center rounded-2xl border-2 border-muted-foreground/40 border-dashed bg-muted/30">
        <Icon as={Plus} size={28} className="text-muted-foreground" />
      </View>
      <Text variant="small" className="text-center text-muted-foreground" numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export function WorkoutFolderItemSkeleton() {
  return (
    <View className="w-20 items-center gap-2">
      <Skeleton className="h-16 w-16 rounded-2xl" />
      <Skeleton className="h-3 w-16" />
    </View>
  );
}
