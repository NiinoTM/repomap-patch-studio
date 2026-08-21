export async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `Server returned ${res.status} ${res.statusText} (non-JSON response). Ensure backend server is running and updated.`,
    );
  }
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return data as T;
}
