import { Request, Response } from "express";
import Room from "../models/Room";
import { ApiResponse, catchAsync } from "../utils/apiHelpers";

export const searchRooms = catchAsync(async (req: Request, res: Response) => {
  const {
    city,
    guests,
    page = "1",
    limit = "9",
    sort = "availability",
  } = req.query as Record<string, string>;

  const filter: any = {
    isActive: true,
  };

  if (guests) {
    filter["capacity.adults"] = {
      $gte: Number(guests),
    };
  }

  const rooms = await Room.find(filter)
    .populate({
      path: "hotel",
      match: {
        status: "approved",
        ...(city
          ? {
              "address.city": {
                $regex: new RegExp(`^${city}$`, "i"),
              },
            }
          : {}),
      },
    })
    .lean();

  const filteredRooms = rooms.filter((r) => r.hotel);

  switch (sort) {
    case "price_low":
      filteredRooms.sort(
        (a: any, b: any) =>
          (a.price.discounted ?? a.price.base) -
          (b.price.discounted ?? b.price.base)
      );
      break;

    case "price_high":
      filteredRooms.sort(
        (a: any, b: any) =>
          (b.price.discounted ?? b.price.base) -
          (a.price.discounted ?? a.price.base)
      );
      break;

    default:
      break;
  }

  const pageNo = Number(page);
  const limitNo = Number(limit);

  const start = (pageNo - 1) * limitNo;

  const paginated = filteredRooms.slice(start, start + limitNo);

  return ApiResponse.success(res, {
    rooms: paginated,
    pagination: {
      page: pageNo,
      limit: limitNo,
      total: filteredRooms.length,
      pages: Math.ceil(filteredRooms.length / limitNo),
    },
  });
});