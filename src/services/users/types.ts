
import { OidcProvider } from "../auth/oidc/providers";

export type AuthProvider = OidcProvider; // possibly add OauthProviders

export interface AuthProfile {
  email: string;
  provider: AuthProvider;
  providerUserId: string;
  roles?: string[];
  displayName?: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  display_name: string | null;
  provider: AuthProvider;
  provider_user_id: string;
  roles: string[];
  is_active: number;
  created_at: number;
  updated_at: number;
}
