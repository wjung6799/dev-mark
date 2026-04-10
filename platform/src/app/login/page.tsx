"use client";

import { loginAction } from "@/lib/actions";
import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);
  const searchParams = useSearchParams();
  const callback = searchParams.get("callback");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-bold text-white mb-2">Log In</h1>
        {callback && (
          <p className="text-gray-400 text-sm mb-6">
            Sign in to connect your CLI to Dev Diary.
          </p>
        )}
        <form action={formAction} className="space-y-4">
          {callback && (
            <input type="hidden" name="callback" value={callback} />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
          {state?.error && (
            <p className="text-red-400 text-sm">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            {pending ? "Logging in..." : callback ? "Log In & Connect CLI" : "Log In"}
          </button>
        </form>
        <p className="text-gray-500 text-sm mt-4 text-center">
          No account?{" "}
          <Link href="/register" className="text-white hover:underline">
            Start free trial
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
