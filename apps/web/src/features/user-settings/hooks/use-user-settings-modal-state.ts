import { useState } from "react";

export type UserSettingsPane = "profile" | "preferences" | "billing" | "account";

export function useUserSettingsModalState() {
  const [pane, setPane] = useState<UserSettingsPane>("profile");
  const [nameDraft, setNameDraft] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  return {
    pane,
    setPane,
    nameDraft,
    setNameDraft,
    nameDirty,
    setNameDirty,
    savingName,
    setSavingName,
    uploadingImage,
    setUploadingImage,
    signingOut,
    setSigningOut,
  };
}
