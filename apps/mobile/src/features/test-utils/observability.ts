export const createObservabilityMock = () => {
  const observability = {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    init: jest.fn(),
    startSpan: jest.fn(<T>(_name: string, _op: string, fn: () => Promise<T> | T) => fn()),
  };

  const makeModule = (category: string) => ({
    trackAction: jest.fn((action: string, data?: Record<string, string | number>) => {
      observability.addBreadcrumb({ category, message: action, data });
    }),
    captureError: jest.fn(
      (err: unknown, ctx: { action: string; extra?: Record<string, unknown> }) => {
        observability.captureException(err, {
          tags: { feature: category, action: ctx.action },
          extra: ctx.extra,
        });
      },
    ),
  });

  return {
    observability,
    createModuleObservability: jest.fn(makeModule),
    workoutObservability: makeModule('workout'),
    exerciseObservability: makeModule('exercise'),
    workoutLogObservability: makeModule('workout-log'),
  };
};
