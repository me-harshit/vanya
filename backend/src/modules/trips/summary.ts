// Shared by public search and the operator's trip list: trip summaries without the full seat list.

export function availableCondition(now: Date) {
  // A seat is free if it is available, or its hold has run out.
  return {
    $or: [
      { $eq: ["$$s.status", "available"] },
      { $and: [{ $eq: ["$$s.status", "held"] }, { $lte: ["$$s.heldUntil", now] }] },
    ],
  };
}

export function summaryProject(now: Date) {
  return {
    $project: {
      operatorName: 1,
      busInfo: 1,
      fromCity: 1,
      toCity: 1,
      fromCityName: 1,
      toCityName: 1,
      distanceKm: 1,
      durationMinutes: 1,
      departureAt: 1,
      arrivalAt: 1,
      status: 1,
      cancellationPolicy: 1,
      "boardingPoints.point": 1,
      "boardingPoints.name": 1,
      "boardingPoints.time": 1,
      "droppingPoints.point": 1,
      "droppingPoints.name": 1,
      "droppingPoints.time": 1,
      totalSeats: { $size: "$seats" },
      availableSeats: {
        $size: { $filter: { input: "$seats", as: "s", cond: availableCondition(now) } },
      },
      fareFrom: { $min: "$seats.price" },
    },
  };
}

type Row = Record<string, any> & { _id: unknown };

export function serializeSummary(row: Row) {
  const { _id, ...rest } = row;
  return {
    id: String(_id),
    ...rest,
    fromCity: String(row.fromCity),
    toCity: String(row.toCity),
    boardingPoints: (row.boardingPoints ?? []).map((p: Row) => ({ id: String(p.point), name: p.name, time: p.time })),
    droppingPoints: (row.droppingPoints ?? []).map((p: Row) => ({ id: String(p.point), name: p.name, time: p.time })),
  };
}
