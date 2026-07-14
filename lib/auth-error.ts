export type AuthAction = "signup" | "signin" | "resend" | "guest" | "callback";

const fallbackMessages: Record<AuthAction, string> = {
  signup: "We could not create your account right now. Please try again or continue anonymously.",
  signin: "We could not sign you in. Check your email and password, then try again.",
  resend: "A new verification email could not be sent right now. Please try again later.",
  guest: "Anonymous access is temporarily unavailable. Please try again later.",
  callback: "The verification link could not be completed. Please return to the account page and try again.",
};

export function readableAuthError(error: unknown, action: AuthAction): string {
  const message = extractMessage(error);
  if (!message) return fallbackMessages[action];

  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many verification emails were requested. Please wait a few minutes before trying again.";
  }
  if (normalized.includes("error sending") || normalized.includes("email") && normalized.includes("unavailable")) {
    return fallbackMessages[action];
  }
  if (normalized.includes("invalid login credentials")) {
    return "The email or password is incorrect. Please try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please verify your email before signing in.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account already exists for this email. Use Reader sign in instead.";
  }

  return message;
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return clean(error);
  if (error instanceof Error) return clean(error.message);
  if (typeof error === "object" && "message" in error) {
    const message = (error as {message?: unknown}).message;
    if (typeof message === "string") return clean(message);
  }
  return "";
}

function clean(message: string): string {
  const value = message.trim();
  if (!value || value === "{}" || value === "[object Object]") return "";
  return value;
}
