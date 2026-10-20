import "server-only";

export type RcapBankEnvironment = Record<string, string | undefined>;

export type RcapBankSourceCategory =
  | "configuration"
  | "bucket"
  | "object"
  | "workbook";

export type RcapBankSourceReasonCode =
  | "storage_location_missing"
  | "storage_location_incomplete"
  | "bucket_lookup_failed"
  | "bucket_not_private"
  | "object_download_failed"
  | "object_empty"
  | "workbook_parse_or_validation_failed";

export type RcapBankSource =
  | { kind: "private-storage"; bucket: string; object: string }
  | { kind: "local-file"; path: string };

export class RcapBankSourceError extends Error {
  constructor(
    message: string,
    readonly category: RcapBankSourceCategory,
    readonly reasonCode: RcapBankSourceReasonCode,
  ) {
    super(message);
    this.name = "RcapBankSourceError";
  }
}

export function resolveRcapBankSource(
  environment: RcapBankEnvironment,
  defaultLocalPath: string,
): RcapBankSource {
  const bucket = environment.RCAP_BANK_STORAGE_BUCKET?.trim();
  const object = environment.RCAP_BANK_STORAGE_OBJECT?.trim();

  if (bucket || object) {
    if (!bucket || !object) {
      throw new RcapBankSourceError(
        "Set both RCAP_BANK_STORAGE_BUCKET and RCAP_BANK_STORAGE_OBJECT.",
        "configuration",
        "storage_location_incomplete",
      );
    }
    return { kind: "private-storage", bucket, object };
  }

  if (environment.NODE_ENV === "production") {
    throw new RcapBankSourceError(
      "RCAP_BANK_STORAGE_BUCKET and RCAP_BANK_STORAGE_OBJECT are required in production.",
      "configuration",
      "storage_location_missing",
    );
  }

  return {
    kind: "local-file",
    path: environment.RCAP_BANK_PATH?.trim() || defaultLocalPath,
  };
}

type PrivateStorageClient = {
  getBucket: (
    bucket: string,
  ) => Promise<{ data: { public: boolean } | null; error: unknown | null }>;
  from: (bucket: string) => {
    download: (
      object: string,
    ) => Promise<{
      data: { arrayBuffer: () => Promise<ArrayBuffer> } | null;
      error: unknown | null;
    }>;
  };
};

export async function downloadRcapBankFromPrivateStorage(
  storage: PrivateStorageClient,
  bucket: string,
  object: string,
): Promise<Uint8Array> {
  let bucketInfo: Awaited<ReturnType<PrivateStorageClient["getBucket"]>>;
  try {
    bucketInfo = await storage.getBucket(bucket);
  } catch {
    throw new RcapBankSourceError(
      "The configured RCAP Storage bucket could not be verified.",
      "bucket",
      "bucket_lookup_failed",
    );
  }

  if (bucketInfo.error || !bucketInfo.data) {
    throw new RcapBankSourceError(
      "The configured RCAP Storage bucket must exist and be private.",
      "bucket",
      "bucket_lookup_failed",
    );
  }
  if (bucketInfo.data.public !== false) {
    throw new RcapBankSourceError(
      "The configured RCAP Storage bucket must exist and be private.",
      "bucket",
      "bucket_not_private",
    );
  }

  let bytes: Uint8Array;
  try {
    const { data, error } = await storage.from(bucket).download(object);
    if (error || !data) {
      throw new Error();
    }
    bytes = new Uint8Array(await data.arrayBuffer());
  } catch {
    throw new RcapBankSourceError(
      "The private RCAP examiner workbook could not be retrieved.",
      "object",
      "object_download_failed",
    );
  }

  if (bytes.length === 0) {
    throw new RcapBankSourceError(
      "The private RCAP examiner workbook could not be retrieved.",
      "object",
      "object_empty",
    );
  }
  return bytes;
}
