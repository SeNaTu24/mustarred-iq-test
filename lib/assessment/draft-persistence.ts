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
