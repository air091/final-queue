import { X } from "lucide-react";
import { useRef, useState } from "react";

type EditCommunityFormState = {
  profileUrl: string;
  communityName: string;
  description: string;
};

type EditCommunityModalProps = {
  profileUrl: string;
  communityName: string;
  description: string;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: EditCommunityFormState) => Promise<void>;
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image file."));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });

export default function EditCommunityModal({
  profileUrl,
  communityName,
  description,
  isSaving,
  error,
  onClose,
  onSave,
}: EditCommunityModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<EditCommunityFormState>({
    profileUrl,
    communityName,
    description,
  });
  const [imageError, setImageError] = useState<string | null>(null);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleSelectImage = () => {
    if (isSaving) return;

    setImageError(null);
    fileInputRef.current?.click();
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageError("Please choose an image smaller than 5 MB.");
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);
      setImageError(null);
      setForm((currentForm) => ({ ...currentForm, profileUrl: imageData }));
    } catch {
      setImageError("Failed to read image file.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave({
      profileUrl: form.profileUrl,
      communityName: form.communityName.trim(),
      description: form.description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[464px] rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Community settings
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="cursor-pointer rounded-full p-2 transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close community settings"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="flex items-center gap-x-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
              onChange={handleImageChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleSelectImage}
              disabled={isSaving}
              className="group relative h-[64px] w-[64px] shrink-0 cursor-pointer overflow-hidden rounded-full border disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Choose community image"
            >
              <img
                src={form.profileUrl}
                alt={form.communityName}
                className="block h-full w-full rounded-full object-cover object-center"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[10px] font-medium text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                Change
              </span>
            </button>

            <label className="block w-full">
              <span className="mb-2 block text-sm font-medium text-gray-700">
                Name
              </span>

              <input
                type="text"
                name="communityName"
                autoComplete="off"
                placeholder="Enter community name"
                value={form.communityName}
                onChange={handleChange}
                disabled={isSaving}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </label>
          </div>

          <p className="text-xs text-gray-500">
            Click the image to choose a new community photo from your device.
          </p>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </span>

            <textarea
              name="description"
              autoComplete="off"
              rows={5}
              placeholder="Write community description..."
              value={form.description}
              onChange={handleChange}
              disabled={isSaving}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </label>

          {imageError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {imageError}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="cursor-pointer rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
