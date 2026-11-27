import { Suspense } from "react";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Admin sign in" };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Admin sign in</h1>
        <p className="mb-6 text-sm text-zinc-500">Manage booking enquiries.</p>
        <Suspense fallback={<LoginForm />}>
          <LoginWithParams searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginWithParams({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const sp = await searchParams;
  return <LoginForm notAdmin={sp.error === "not_admin"} />;
}
