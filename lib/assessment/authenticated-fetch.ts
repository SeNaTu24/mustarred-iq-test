export async function fetchWithSessionRefresh(
  getAccessToken: () => Promise<string | null>,
  refreshAccessToken: () => Promise<string | null>,
  request: (accessToken: string) => Promise<Response>,
): Promise<Response> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Your session expired. Sign in again.");

  const response = await request(accessToken);
  if (response.status !== 401) return response;

  const refreshedAccessToken = await refreshAccessToken();
  if (!refreshedAccessToken) {
    throw new Error("Your session expired. Sign in again.");
  }
  return request(refreshedAccessToken);
}
