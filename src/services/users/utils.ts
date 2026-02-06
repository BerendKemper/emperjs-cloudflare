
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export class OAuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = `OAuthConflictError`;
  }
}

export const isUniqueConstraintError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return /unique|constraint/i.test(error.message);
};
