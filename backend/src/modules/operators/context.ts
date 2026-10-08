import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors.js";
import { Operator } from "../../models/Operator.js";

type OperatorDoc = InstanceType<typeof Operator>;

declare module "express-serve-static-core" {
  interface Request {
    operator?: OperatorDoc;
  }
}

// Loads the signed-in user's operator profile. With `approvedOnly`, also requires admin approval.
export function operatorContext(opts: { approvedOnly: boolean }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const operator = await Operator.findOne({ user: req.user!.id });
    if (!operator) throw new AppError(403, "NOT_AN_OPERATOR", "Register as an operator first.");
    if (opts.approvedOnly && operator.status !== "approved") {
      throw new AppError(403, "OPERATOR_NOT_APPROVED", "Your operator account is not approved yet.", {
        status: operator.status,
      });
    }
    req.operator = operator;
    next();
  };
}
