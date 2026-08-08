export async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return data as T;
}
