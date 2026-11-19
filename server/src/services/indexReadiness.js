import { isDeepStrictEqual } from "node:util";
import Booking from "../models/Booking.js";
import GuardAssignment from "../models/GuardAssignment.js";
import QRToken from "../models/QRToken.js";
import GateOperation from "../models/GateOperation.js";

export const domainModels = [Booking, GuardAssignment, QRToken, GateOperation];

export function assertTransactionSupport(hello) {
  if ((!hello.setName && hello.msg !== "isdbgrid") || hello.maxWireVersion < 8)
    throw new Error("MongoDB replica set/sharded deployment with transaction and partial-index support is required");
}

export async function assertRequiredIndexes(models = domainModels) {
  for (const model of models) {
    const actual = await model.collection.indexes();
    for (const [key, options] of model.schema.indexes()) {
      const match = actual.find((item) => isDeepStrictEqual(item.key, key) &&
        Boolean(item.unique) === Boolean(options.unique) &&
        isDeepStrictEqual(item.partialFilterExpression ?? null, options.partialFilterExpression ?? null));
      if (!match) throw new Error(`Required index unavailable on ${model.modelName}`);
    }
  }
}
