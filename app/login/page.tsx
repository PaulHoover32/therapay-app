import { LoginForm } from "@/components/login-form"

export default function Page() {
  return (
    <div className="flex flex-col min-h-svh">
      <header className="flex h-14 shrink-0 items-center border-b px-6">
        <span className="text-sm font-semibold">Therapay</span>
      </header>
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
