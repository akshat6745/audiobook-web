import React, { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from "../services/googleIdentity";

interface GoogleButtonProps {
  /** Receives the Google ID token once the user picks an account. */
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "continue_with";
}

/**
 * Google's official sign-in button, rendered by Google Identity Services.
 *
 * Renders nothing when the build has no REACT_APP_GOOGLE_CLIENT_ID, so an
 * unconfigured deploy shows no button rather than one that always fails.
 */
const GoogleButton: React.FC<GoogleButtonProps> = ({
  onCredential,
  text = "continue_with",
}) => {
  const container = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Keep the latest callback without re-rendering the Google button.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGoogleIdentity()
      .then((google) => {
        if (cancelled || !container.current) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
          },
          ux_mode: "popup",
          auto_select: false,
        });
        google.renderButton(container.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          width: 320,
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("Google sign-in is unavailable right now");
      });

    return () => {
      cancelled = true;
    };
  }, [text]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div ref={container} data-testid="google-button" />
      {loadError && <p className="text-xs text-slate-400">{loadError}</p>}
    </div>
  );
};

export default GoogleButton;
