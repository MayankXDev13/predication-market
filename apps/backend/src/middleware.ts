import { NextFunction, Request, Response } from "express";
import { supabase } from "./lib/supabase";

export async function middleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    const address = user?.user_metadata.custom_claims.address;

    if (address) {
      req.userId = address;
      next();
    } else {
      res.status(403).json({ message: "Incorrect credentials" });
    }
  } catch (error) {
    return res.status(403).json({ message: "Incorrect credentials" });
  }
}
