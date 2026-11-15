import { NextResponse } from "next/server";
import { getEiaStatus, sources } from "@/lib/sources";
export const dynamic="force-dynamic";
export async function GET(){ const eia=await getEiaStatus(); return NextResponse.json({asOf:new Date().toISOString(),sources:[...sources.filter(s=>s.name!=="EIA storage"),eia]}); }