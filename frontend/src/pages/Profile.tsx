import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import type { FriendPerson } from "../components/FriendPersonRow";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type FriendItem = {
  friendshipId: string;
  friendsSince: string;
  friend: FriendPerson;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error)
    ? (error.response?.data?.message ?? fallback)
    : fallback;

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

export default function Profile() {
  const { user, updateCurrentUser } = useAuth();
  const [openEditImage, setOpenEditImage] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);
  const [friendCountError, setFriendCountError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setFriendCountError(null);
        const response = await api.get("/api/friends");
        setFriends(response.data.friends as FriendItem[]);
      } catch (error) {
        setFriendCountError(getErrorMessage(error, "Unable to load friends."));
      } finally {
        setIsLoadingFriends(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenEditImage(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleEditImage = () => {
    if (isSavingImage) return;
    setOpenEditImage((prev) => !prev);
  };

  const handleSelectPhoto = () => {
    if (isSavingImage) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    fileInputRef.current?.click();
  };

  const handleUploadProfileImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("Please choose an image smaller than 5 MB.");
      return;
    }

    try {
      setIsSavingImage(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const imageData = await readFileAsDataUrl(file);
      const response = await api.patch("/api/auth/profile-image", {
        imageData,
      });

      updateCurrentUser(response.data.user, response.data.accessToken);
      setOpenEditImage(false);
      setSuccessMessage("Profile photo updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Unable to update profile photo.",
        );
      } else {
        setErrorMessage("Unable to update profile photo.");
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await handleUploadProfileImage(file);
  };

  const handleRemovePhoto = async () => {
    try {
      setIsSavingImage(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await api.patch("/api/auth/profile-image", {
        removeImage: true,
      });

      updateCurrentUser(response.data.user, response.data.accessToken);
      setOpenEditImage(false);
      setSuccessMessage("Profile photo removed.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Unable to remove profile photo.",
        );
      } else {
        setErrorMessage("Unable to remove profile photo.");
      }
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleUpdateUsername = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const cleanedUsername = String(formData.get("username") ?? "").trim();

    if (!cleanedUsername) {
      setErrorMessage("Username is required.");
      return;
    }

    if (cleanedUsername === user?.username) {
      setSuccessMessage("Username is already up to date.");
      setErrorMessage(null);
      return;
    }

    try {
      setIsSavingUsername(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await api.patch("/api/auth/profile", {
        username: cleanedUsername,
      });

      updateCurrentUser(response.data.user, response.data.accessToken);
      setSuccessMessage("Username updated.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ?? "Unable to update username.",
        );
      } else {
        setErrorMessage("Unable to update username.");
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <div className="w-full px-2 py-2 sm:px-4">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_80px_rgba(12,9,12,0.08)]">
          <div className="bg-[linear-gradient(135deg,#0c090c_0%,#2f1f12_100%)] px-6 py-10 text-white sm:px-10">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">
              Account
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl font-semibold sm:text-4xl">Profile</h1>
              <Link
                to="/profile/friends-list"
                className="inline-flex items-center rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-stone-950"
              >
                Friend list {isLoadingFriends ? "" : `(${friends.length})`}
              </Link>
            </div>
          </div>

          <div className="px-6 py-8 sm:px-10">
            <div
              ref={dropdownRef}
              className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#fff4df] bg-[#fff4df] shadow-sm sm:h-32 sm:w-32">
                  <img
                    src={user?.profileUrl}
                    alt={user?.username}
                    className="block h-full w-full object-cover object-center"
                  />
                </div>

                <div>
                  <div className="text-2xl font-semibold text-text sm:text-3xl">
                    {user?.username}
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {user?.email}
                  </div>
                </div>
              </div>

              <div className="relative self-start md:self-center">
                <button
                  type="button"
                  onClick={handleToggleEditImage}
                  disabled={isSavingImage}
                  className="rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingImage ? "Saving..." : "Change photo"}
                </button>

                <EditImageDropdown
                  open={openEditImage}
                  isSubmitting={isSavingImage}
                  onRemove={handleRemovePhoto}
                  onUpload={handleSelectPhoto}
                />
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
              <form
                onSubmit={handleUpdateUsername}
                className="rounded-3xl border border-orange-100 bg-[#fffaf4] p-5"
              >
                <div className="flex flex-col gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-text">
                      Username
                    </span>
                    <input
                      key={user?.username}
                      name="username"
                      type="text"
                      defaultValue={user?.username ?? ""}
                      disabled={isSavingUsername}
                      maxLength={30}
                      className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="submit"
                      disabled={isSavingUsername}
                      className="rounded-2xl border border-[#ff6900] px-4 py-2 text-sm font-semibold text-[#ff6900] transition hover:bg-[#ff6900] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingUsername ? "Saving..." : "Save username"}
                    </button>
                  </div>
                </div>
              </form>

              <div className="rounded-3xl border border-orange-100 bg-white p-5">
                <p className="text-sm font-semibold text-text">Account type</p>
                <div className="mt-3 inline-flex rounded-full bg-[#fff4df] px-3 py-1 text-sm font-medium capitalize text-[#ff6900]">
                  {user?.role}
                </div>
              </div>
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />

            {errorMessage ? (
              <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </p>
            ) : null}
          </div>
        </div>

        {friendCountError ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {friendCountError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type EditImageDropdownProps = {
  open: boolean;
  isSubmitting: boolean;
  onRemove: () => void;
  onUpload: () => void;
};

function EditImageDropdown({
  open,
  isSubmitting,
  onRemove,
  onUpload,
}: EditImageDropdownProps) {
  return (
    <nav
      className={`absolute right-0 top-[calc(100%+12px)] z-20 w-52 rounded-2xl border border-orange-100 bg-white p-2 shadow-xl transition-all duration-150 ${
        open
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            onClick={onUpload}
            disabled={isSubmitting}
            className="block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm text-text transition hover:bg-[#fff4df] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Upload a photo...
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onRemove}
            disabled={isSubmitting}
            className="block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm text-text transition hover:bg-[#fff4df] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove photo
          </button>
        </li>
      </ul>
    </nav>
  );
}
