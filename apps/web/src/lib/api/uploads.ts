import { tokenStore } from "../api-client";
import { ApiRequestError } from "../api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/**
 * Uploads an image file (task-completion screenshot proof, etc.) and
 * returns the URL it was stored at. Separate from the JSON `api` helper
 * in api-client.ts since this needs multipart/form-data, not a JSON body.
 */
export const uploadsApi = {
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const accessToken = tokenStore.getAccess();

    const res = await fetch(`${API_URL}/uploads/image`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      body: formData,
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      throw new ApiRequestError(json?.error?.message ?? "Could not upload image.", res.status, json?.error?.errors);
    }

    return json.data as { url: string };
  },
};
