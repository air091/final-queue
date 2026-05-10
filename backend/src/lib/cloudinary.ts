import crypto from "node:crypto";

const parseCloudinaryUrl = (value?: string) => {
  const cloudinaryUrl = value?.trim();
  if (!cloudinaryUrl) return null;

  try {
    const parsedUrl = new URL(cloudinaryUrl);

    if (parsedUrl.protocol !== "cloudinary:") {
      return null;
    }

    const apiKey = decodeURIComponent(parsedUrl.username);
    const apiSecret = decodeURIComponent(parsedUrl.password);
    const cloudName = parsedUrl.hostname.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
};

const getCloudinaryConfig = () => {
  const cloudinaryUrlConfig = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (cloudinaryUrlConfig) {
    return cloudinaryUrlConfig;
  }

  if (!cloudName) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME is missing. Do not use CLOUDINARY_KEY_NAME as the cloud name.",
    );
  }

  if (!apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET must both be configured.",
    );
  }

  return { cloudName, apiKey, apiSecret };
};

const signUploadParams = (
  params: Record<string, string | undefined>,
  apiSecret: string,
) => {
  const serializedParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${serializedParams}${apiSecret}`)
    .digest("hex");
};

type UploadImageOptions = {
  dataUri: string;
  publicId: string;
};

export const uploadImageToCloudinary = async ({
  dataUri,
  publicId,
}: UploadImageOptions) => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signUploadParams(
    {
      invalidate: "true",
      overwrite: "true",
      public_id: publicId,
      timestamp,
    },
    apiSecret,
  );

  const formData = new FormData();
  formData.set("file", dataUri);
  formData.set("api_key", apiKey);
  formData.set("invalidate", "true");
  formData.set("overwrite", "true");
  formData.set("public_id", publicId);
  formData.set("signature", signature);
  formData.set("timestamp", timestamp);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = (await uploadResponse.json()) as {
    error?: { message?: string };
    secure_url?: string;
  };

  if (!uploadResponse.ok || !payload.secure_url) {
    throw new Error(
      payload.error?.message ?? "Failed to upload image to Cloudinary",
    );
  }

  return payload.secure_url;
};
