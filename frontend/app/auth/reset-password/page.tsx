"use client"

import { Suspense, useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getAuthService } from "@/lib/auth-service"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get("token") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    if (!token) {
      setError("El enlace de recuperación no es válido o está incompleto.")
      return
    }

    if (!password || !confirmPassword) {
      setError("Introduce y confirma tu nueva contraseña.")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setIsSubmitting(true)
    try {
      await getAuthService().resetPassword(token, password, confirmPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.message || "No se pudo actualizar la contraseña. Solicita un nuevo enlace.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-cyan-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <Card className="w-full max-w-md relative z-10 border shadow-2xl bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-5 pb-8 pt-10">
          <div className="flex items-center justify-center">
            <Image src="/NexFit.png" alt="Logo de NEXFIT" width={220} height={66} quality={100} priority />
          </div>
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center">
            {success ? <CheckCircle className="w-7 h-7 text-white" /> : <Lock className="w-7 h-7 text-white" />}
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">
              {success ? "Contraseña actualizada" : "Nueva contraseña"}
            </CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">
              {success
                ? "Ya puedes iniciar sesión con tu nueva contraseña."
                : "Elige una contraseña nueva para recuperar el acceso a tu cuenta."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {success ? (
            <Button className="w-full h-12 rounded-xl" onClick={() => router.push("/auth")}>
              Ir al inicio de sesión
            </Button>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-12 pr-11 rounded-xl"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 pr-11 rounded-xl"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button className="w-full h-12 rounded-xl" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
              </Button>

              <Button variant="ghost" className="w-full h-12 rounded-xl" onClick={() => router.push("/auth")}>
                Volver al inicio de sesión
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
