/**
 * Google Identity Services (GIS) — Google's own browser sign-in library.
 *
 * GIS renders Google's official button and hands back an ID token, which the
 * backend verifies against the same Web client ID. Loaded as a script tag on
 * demand rather than bundled, so pages that never show a Google button never
 * fetch it.
 *
 * The Web client ID is supplied at build time:
 *   REACT_APP_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
 * It is not a secret (OAuth client IDs are public), just environment
 * configuration. The page's origin must be listed under "Authorized
 * JavaScript origins" on that client in Google Cloud, or GIS refuses to load
 * the button.
 */

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

const GIS_SRC = "https://accounts.google.com/gsi/client";

/** The subset of the GIS API this app uses. */
export interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
    auto_select?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: "standard" | "icon";
      theme?: "outline" | "filled_blue" | "filled_black";
      size?: "large" | "medium" | "small";
      text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      shape?: "rectangular" | "pill" | "circle" | "square";
      width?: number;
    }
  ) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

let loading: Promise<GoogleIdApi> | null = null;

/** Load the GIS script once and resolve with its `accounts.id` API. */
export const loadGoogleIdentity = (): Promise<GoogleIdApi> => {
  const ready = window.google?.accounts?.id;
  if (ready) return Promise.resolve(ready);

  if (!loading) {
    loading = new Promise<GoogleIdApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const api = window.google?.accounts?.id;
        if (api) {
          resolve(api);
        } else {
          reject(new Error("Google sign-in failed to load"));
        }
      };
      script.onerror = () => {
        // Allow a later retry (e.g. after the network comes back).
        loading = null;
        reject(new Error("Google sign-in failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
};

/**
 * Stop Google from silently re-selecting the last account on the next
 * sign-in, so signing out actually lets the user choose again.
 */
export const forgetGoogleSelection = (): void => {
  window.google?.accounts?.id?.disableAutoSelect();
};
