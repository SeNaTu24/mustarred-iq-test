export async function saveIfDraftIsCurrent<T>(
  questionId: string,
  response: T,
  version: number,
  getCurrentVersion: (questionId: string) => number,
  save: (questionId: string, response: T) => Promise<void>,
  markSaved: (questionId: string, version: number) => void,
): Promise<void> {
  await save(questionId, response);
  if (getCurrentVersion(questionId) === version) {
    markSaved(questionId, version);
  }
}

export async function saveAllPendingDrafts<T>({
  getDrafts,
  getVersion,
  getSavedVersion,
  save,
}: {
  getDrafts: () => Map<string, T>;
  getVersion: (questionId: string) => number;
  getSavedVersion: (questionId: string) => number | undefined;
  save: (questionId: string, response: T, version: number) => Promise<void>;
}): Promise<void> {
  while (true) {
    const pending = [...getDrafts()].find(
      ([questionId]) =>
        getSavedVersion(questionId) !== getVersion(questionId),
    );
    if (!pending) return;

    const [questionId, response] = pending;
    await save(questionId, response, getVersion(questionId));
  }
}

export function createDebouncedDraftAutosaver<T>({
  delayMs,
  getCurrentVersion,
  save,
}: {
  delayMs: number;
  getCurrentVersion: (questionId: string) => number;
  save: (questionId: string, response: T, version: number) => Promise<void>;
}) {
  const pending = new Map<string, { response: T; version: number }>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlight = new Map<string, Promise<void>>();

  async function flush(questionId: string): Promise<void> {
    const timer = timers.get(questionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(questionId);
    }

    const previousSave = inFlight.get(questionId);
    if (previousSave) {
      await previousSave.catch(() => undefined);
    }

    const draft = pending.get(questionId);
    if (!draft) return;
    pending.delete(questionId);

    const saveOperation = save(questionId, draft.response, draft.version)
      .catch((error: unknown) => {
        if (
          getCurrentVersion(questionId) === draft.version &&
          !pending.has(questionId)
        ) {
          pending.set(questionId, draft);
        }
        throw error;
      })
      .finally(() => {
        if (inFlight.get(questionId) === saveOperation) {
          inFlight.delete(questionId);
        }
      });

    inFlight.set(questionId, saveOperation);
    await saveOperation;

    if (pending.has(questionId)) {
      await flush(questionId);
    }
  }

  function schedule(
    questionId: string,
    response: T,
    version: number,
  ): void {
    pending.set(questionId, { response, version });

    const existingTimer = timers.get(questionId);
    if (existingTimer !== undefined) clearTimeout(existingTimer);

    timers.set(
      questionId,
      setTimeout(() => {
        timers.delete(questionId);
        void flush(questionId).catch(() => undefined);
      }, delayMs),
    );
  }

  async function flushAll(): Promise<void> {
    while (true) {
      const questionIds = new Set([
        ...pending.keys(),
        ...timers.keys(),
        ...inFlight.keys(),
      ]);

      if (questionIds.size === 0) return;

      const outcomes = await Promise.allSettled(
        [...questionIds].map((questionId) => flush(questionId)),
      );

      const failed = outcomes.find(
        (outcome): outcome is PromiseRejectedResult =>
          outcome.status === "rejected",
      );

      if (failed) throw failed.reason;
    }
  }

  return { schedule, flush, flushAll };
}