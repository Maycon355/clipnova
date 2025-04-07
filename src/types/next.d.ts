import { NextRequest as NextRequestType } from "next/server";

declare module "next/server" {
  export interface NextRequest extends NextRequestType {
    nextUrl: URL;
  }
  export class NextResponse extends Response {
    static json(body: any, init?: ResponseInit): NextResponse;
  }
}
