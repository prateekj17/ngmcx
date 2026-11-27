import {NextResponse} from "next/server";
import {neon} from "@neondatabase/serverless";
export const dynamic="force-dynamic";
export async function GET(){
 const url=process.env.DATABASE_URL;
 if(!url)return NextResponse.json({status:"NOT_CONFIGURED"},{status:503});
 try{
 const sql=neon(url);
 const rows=await sql`SELECT 1 AS connected`;
 if(Number(rows[0]?.connected)!==1)throw Error("Unexpected result");
 return NextResponse.json({status:"OK",database:"PostgreSQL",checkedAt:new Date().toISOString(),test:"read-only connectivity"});
 }catch{return NextResponse.json({status:"CONNECTION_FAILED"},{status:503});}
}
