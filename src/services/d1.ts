
import { Environment } from "../types/env";

const getUserRole = async (email: string, env: Environment) => {
  const res = env.USERS.prepare(`SELECT role FROM admins WHERE email = ?`).bind(email).first();
  return res?.role || `user`;
};
