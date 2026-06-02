import type {
  CreateWorkoutLogInput,
  CreateWorkoutLogResult,
  NotificationRepository,
  WorkoutLogRepository,
} from '@workout-tracker/domain';

export type CreateWorkoutLog = (input: CreateWorkoutLogInput) => Promise<CreateWorkoutLogResult>;

export function makeCreateWorkoutLog(
  repository: WorkoutLogRepository,
  notifications: NotificationRepository,
): CreateWorkoutLog {
  return async (input) => {
    const athleteId = input.userId;
    const actorId = input.actorId;
    const athleteFinished = actorId === athleteId;

    const result = await repository.create(input);

    if (result.coachId) {
      const recipientUserId = athleteFinished ? result.coachId : athleteId;
      await notifications
        .create({
          recipientUserId,
          senderUserId: actorId,
          type: 'coach_session_completed',
          title: 'Aula realizada',
          message: athleteFinished
            ? 'Seu aluno marcou uma aula como realizada.'
            : 'Seu personal registrou uma aula realizada.',
          metadata: { workoutLogId: result.workoutLogId, coachSessionId: result.coachSessionId },
        })
        .catch(() => undefined);
    }

    return result;
  };
}
