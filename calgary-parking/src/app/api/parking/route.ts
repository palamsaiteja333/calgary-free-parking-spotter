import { NextResponse } from "next/server";
import { getEdmontonNowParts, isFreeNowFromEnforceableTime } from "@/lib/calgaryParking";

type SocrataRow = {
  permit_zone?: string;
  address_desc?: string;
  zone_type?: string;
  enforceable_time?: string;
  status?: string;
  the_geom?: {
    type?: string;
    coordinates?: unknown;
  };
};

type GeoJsonFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
};

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const freeOnly = url.searchParams.get("freeOnly") === "1";
  const limit = Number(url.searchParams.get("limit") ?? "2000");

  const now = getEdmontonNowParts(new Date());

  // Calgary open data: On-Street Parking Zones with Rates
  const socrataUrl =
    "https://data.calgary.ca/resource/45az-7kh9.json" +
    `?$select=permit_zone,address_desc,zone_type,enforceable_time,the_geom,status` +
    `&$where=status%3D%27Active%27` +
    `&$limit=${Number.isFinite(limit) && limit > 0 ? limit : 2000}`;

  const res = await fetch(socrataUrl, {
    // Avoid caching; “free now” changes with time.
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Calgary parking data", details: await res.text() },
      { status: res.status }
    );
  }

  const rows = (await res.json()) as SocrataRow[];

  const features: GeoJsonFeature[] = [];

  for (const row of rows) {
    const geometry = row.the_geom;
    if (!geometry?.type || !geometry.coordinates) continue;
    if (geometry.type !== "MultiLineString") {
      // Dataset should be MultiLineString; keep this guard anyway.
      continue;
    }

    const isFreeNow = isFreeNowFromEnforceableTime(
      row.enforceable_time,
      now
    );

    if (freeOnly && !isFreeNow) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: geometry.type,
        coordinates: geometry.coordinates,
      },
      properties: {
        permit_zone: row.permit_zone ?? null,
        address_desc: row.address_desc ?? null,
        zone_type: row.zone_type ?? null,
        enforceable_time: row.enforceable_time ?? null,
        isFreeNow,
        // Used by the UI legend / tooltip.
        currentPriceUsd: isFreeNow ? 0 : 1,
      },
    });
  }

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  });
}

