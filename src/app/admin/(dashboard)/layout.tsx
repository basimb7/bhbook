import Link from "next/link";
import { logout } from "@/app/admin/actions";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold">
            Bookings admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-zinc-600 hover:text-zinc-900" target="_blank">
              View public page ↗
            </Link>
            <form action={logout}>
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-50">Sign out</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
