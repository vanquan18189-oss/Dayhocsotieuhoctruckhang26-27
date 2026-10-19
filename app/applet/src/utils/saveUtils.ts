export async function runSaveOperation<T>(
  operation: () => Promise<T>,
  setSaving: (saving: boolean) => void,
  timeoutMs: number = 15000
): Promise<T> {
  setSaving(true);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_15S')), timeoutMs)
  );

  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    return result;
  } finally {
    setSaving(false);
  }
}
