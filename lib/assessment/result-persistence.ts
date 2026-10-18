export async function getOrCreateImmutableResult<T>({
  read,
  create,
}: {
  read: () => Promise<T | null>;
  create: () => Promise<void>;
}): Promise<T> {
  const existing = await read();
  if (existing !== null) return existing;

  await create();

  const saved = await read();
  if (saved === null) {
    throw new Error("Final assessment result could not be retrieved after saving.");
  }
  return saved;
}
