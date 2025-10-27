import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/firebase/admin";

const SESSION_DURATION = 60 * 60; // 1 hora en segundos (expira al cerrar el navegador)

export async function POST(req: NextRequest) {
  try {
    console.log("[/api/auth/session] POST request received");
    const { idToken } = await req.json();
    console.log("[/api/auth/session] idToken received:", idToken ? "YES" : "NO");
    
    if (!idToken) {
      console.log("[/api/auth/session] Missing idToken");
      return NextResponse.json({ success: false, message: "Missing idToken" }, { status: 400 });
    }

    // Create session cookie
    console.log("[/api/auth/session] Creating session cookie...");
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION * 1000, // milliseconds
    });
    console.log("[/api/auth/session] Session cookie created successfully");

    // Set cookie in response
    const response = NextResponse.json({ success: true });
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      // No maxAge = la cookie expira al cerrar el navegador (sesión temporal)
    });
    console.log("[/api/auth/session] Cookie set in response");
    return response;
  } catch (error) {
    console.error("[/api/auth/session] Error setting session cookie:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}
