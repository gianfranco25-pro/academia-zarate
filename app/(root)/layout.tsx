import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated, signOut } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();

  return (
    <div className="root-layout">
      <nav className="flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Academia Zarate Consultas Logo" width={38} height={32} />
          <h2 className="text-primary-100">Academia Zarate Consultas</h2>
        </Link>
        {isUserAuthenticated && (
          <form action={async () => {
            'use server';
            await signOut();
            redirect('/sign-in');
          }}>
            <button type="submit" className="px-4 py-2 bg-primary-100 text-white rounded">
              Cerrar sesión
            </button>
          </form>
        )}
      </nav>

      {children}
    </div>
  );
};

export default Layout;
