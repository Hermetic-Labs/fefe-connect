import { BlobServiceClient } from "@azure/storage-blob";
import { azureCredential } from "./credential";
import { loadConfig } from "./config";
import { HttpError } from "./errors";

const containerName = "upload-quarantine";
let serviceClient: BlobServiceClient | undefined;

function service(): BlobServiceClient {
  if (serviceClient) return serviceClient;
  const config = loadConfig();
  serviceClient = config.storageConnectionString
    ? BlobServiceClient.fromConnectionString(config.storageConnectionString)
    : config.storageBlobEndpoint
      ? new BlobServiceClient(config.storageBlobEndpoint, azureCredential())
      : undefined;
  if (!serviceClient) throw new HttpError(503, "storage_not_configured", "Private profile photos are not available yet.");
  return serviceClient;
}

export function privatePhotoBlobName(accountId: string): string {
  return `profiles/${accountId}/private-draft`;
}

export async function uploadPrivatePhoto(accountId: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const blobName = privatePhotoBlobName(accountId);
  const client = service().getContainerClient(containerName).getBlockBlobClient(blobName);
  await client.uploadData(bytes, {
    blobHTTPHeaders: {
      blobContentType: contentType,
      blobCacheControl: "private, no-store",
    },
    metadata: { state: "private-draft" },
  });
  return blobName;
}

export async function downloadPrivatePhoto(blobName: string): Promise<Uint8Array> {
  if (!/^profiles\/[a-f0-9]{40}\/private-draft$/.test(blobName)) {
    throw new HttpError(404, "photo_not_found", "No private profile photo is stored.");
  }
  try {
    return await service().getContainerClient(containerName).getBlobClient(blobName).downloadToBuffer();
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404) throw new HttpError(404, "photo_not_found", "No private profile photo is stored.");
    throw error;
  }
}
