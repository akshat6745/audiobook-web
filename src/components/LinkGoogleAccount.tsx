import React, { useState } from "react";
import { linkGoogleAccount } from "../services/api";
import { GOOGLE_CLIENT_ID } from "../services/googleIdentity";
import GoogleButton from "./GoogleButton";

/**
 * Lets a signed-in password account add Google as a second way in.
 *
 * The request carries the user's access token (proving they own this
 * account) plus a Google ID token (proving they own the Google account);
 * the backend needs both. Linking never changes who is signed in.
 */
const LinkGoogleAccount: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // No Google client configured for this build: offer nothing to click.
  if (!GOOGLE_CLIENT_ID) return null;

  const handleCredential = async (idToken: string) => {
    setBusy(true);
    setResult(null);
    try {
      const response = await linkGoogleAccount(idToken);
      if (!response?.linked) {
        throw new Error("Couldn't link your Google account");
      }
      setResult({
        ok: true,
        message: response.email
          ? `Linked ${response.email}. You can now sign in with Google.`
          : "Google account linked. You can now sign in with Google.",
      });
    } catch (err) {
      // The api interceptor turns the backend's `detail` (e.g. "That Google
      // account is already linked to another account") into the message.
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Couldn't link your Google account",
      });
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-modern px-4 py-2 glass border border-slate-600 text-slate-200 hover:text-white rounded-lg font-medium transition-all duration-300 focus-ring"
      >
        Link Google
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-google-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            className="glass-dark w-full max-w-sm rounded-2xl border border-slate-700/50 p-6 space-y-4 shadow-glow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="link-google-title" className="text-xl font-bold text-white">
              Link your Google account
            </h2>
            <p className="text-sm text-slate-300">
              Afterwards you can sign in with Google or with your username and
              password — both reach this same library.
            </p>

            {busy ? (
              <p className="text-sm text-slate-300 text-center">Linking…</p>
            ) : (
              !result?.ok && <GoogleButton onCredential={handleCredential} />
            )}

            {result && (
              <p
                role="status"
                className={`text-sm ${result.ok ? "text-emerald-300" : "text-red-300"}`}
              >
                {result.message}
              </p>
            )}

            <div className="text-right">
              <button
                type="button"
                onClick={close}
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                {result?.ok ? "Done" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LinkGoogleAccount;
