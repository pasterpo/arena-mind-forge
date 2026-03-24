declare module "@lovable.dev/cloud-auth-js" {
  export type OAuthProvider = "google" | "apple";

  export interface SignInWithOAuthOptions {
    redirect_uri?: string;
    extraParams?: Record<string, string>;
  }

  export interface SignInWithOAuthResult {
    redirected?: boolean;
    error?: Error;
    tokens?: {
      access_token: string;
      refresh_token: string;
    };
  }

  export function createLovableAuth(): {
    signInWithOAuth: (
      provider: OAuthProvider,
      options?: SignInWithOAuthOptions,
    ) => Promise<SignInWithOAuthResult>;
  };
}
