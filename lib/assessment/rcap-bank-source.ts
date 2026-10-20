import "server-only";

export type RcapBankEnvironment = Record<string, string | undefined>;

export type RcapBankSource =
  | { kind: "private-storage"; bucket: string; object: string }
  | { kind: "local-file"; path: string };

export class RcapBankSourceError extends Error {
  constructor(message: string) {
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
      );
    }
    return { kind: "private-storage", bucket, object };
  }

  if (environment.NODE_ENV === "production") {
    throw new RcapBankSourceError(
      "RCAP_BANK_STORAGE_BUCKET and RCAP_BANK_STORAGE_OBJECT are required in production.",
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
    );
  }

  if (bucketInfo.error || bucketInfo.data?.public !== false) {
    throw new RcapBankSourceError(
      "The configured RCAP Storage bucket must exist and be private.",
    );
  }

  try {
    const { data, error } = await storage.from(bucket).download(object);
    if (error || !data) {
      throw new Error();
    }
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error();
    }
    return bytes;
  } catch {
    throw new RcapBankSourceError(
      "The private RCAP examiner workbook could not be retrieved.",
    );
  }
}
