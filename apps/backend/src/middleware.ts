import { NextFunction, Request, Response } from "express";
import { supabase } from "./lib/supabase";
import { prisma } from "db";

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

    if (error || !user) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    const address = user.user_metadata?.custom_claims?.address as
      | string
      | undefined;

    if (!address) {
      return res.status(403).json({ message: "Incorrect credentials" });
    }

    const dbUser = await prisma.user.upsert({
      where: { address },
      update: {address},
      create: { address, usdBalance: 0 },
    });

    req.userId = dbUser.id;
    next();
  } catch {
    return res.status(403).json({ message: "Incorrect credentials" });
  }
}
