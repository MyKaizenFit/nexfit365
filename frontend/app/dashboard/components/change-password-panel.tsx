"use client"

import type React from "react"

import { useState } from "react"
import { Lock, Eye, EyeOff, Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"

export function ChangePasswordPanel() {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  const getPasswordStrength = (password: string) => {
    let strength = 0
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    strength = Object.values(checks).filter(Boolean).length
    return { strength: (strength / 5) * 100, checks }
  }

  const { strength, checks } = getPasswordStrength(passwords.new)

  const getStrengthColor = (strength: number) => {
    if (strength < 40) return "bg-red-500"
    if (strength < 70) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = (strength: number) => {
    if (strength < 40) return "Débil"
    if (strength < 70) return "Media"
    return "Fuerte"
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validaciones
    if (!passwords.current) {
      toast({
        title: "❌ Error",
        description: "Debes ingresar tu contraseña actual",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (passwords.new !== passwords.confirm) {
      toast({
        title: "❌ Error",
        description: "Las contraseñas nuevas no coinciden",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (strength < 70) {
      toast({
        title: "❌ Contraseña débil",
        description: "Tu nueva contraseña debe ser más segura",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Simular cambio de contraseña
    setTimeout(() => {
      toast({
        title: "✅ Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada correctamente",
      })
      setPasswords({ current: "", new: "", confirm: "" })
      setIsLoading(false)
    }, 2000)
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
            <Lock className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>Actualiza tu contraseña para mantener tu cuenta segura</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contraseña actual */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Contraseña actual</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-red-400 pr-10"
                  placeholder="Ingresa tu contraseña actual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("current")}
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, new: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-red-400 pr-10"
                  placeholder="Ingresa tu nueva contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("new")}
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Indicador de fortaleza */}
              {passwords.new && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fortaleza de la contraseña:</span>
                    <span
                      className={`text-sm font-medium ${strength < 40 ? "text-red-600" : strength < 70 ? "text-yellow-600" : "text-green-600"}`}
                    >
                      {getStrengthText(strength)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength)}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwords.confirm}
                  onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                  className="border-2 border-gray-200 focus:border-red-400 pr-10"
                  placeholder="Confirma tu nueva contraseña"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility("confirm")}
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Validación de coincidencia */}
              {passwords.confirm && (
                <div className="flex items-center gap-2 text-sm">
                  {passwords.new === passwords.confirm ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Las contraseñas coinciden</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600">Las contraseñas no coinciden</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !passwords.current || !passwords.new || passwords.new !== passwords.confirm}
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0"
            >
              {isLoading ? "Actualizando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Requisitos de seguridad */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            <Shield className="h-5 w-5" />
            Requisitos de Seguridad
          </CardTitle>
          <CardDescription>Tu contraseña debe cumplir con los siguientes requisitos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: "length", text: "Al menos 8 caracteres", check: checks.length },
              { key: "uppercase", text: "Al menos una letra mayúscula", check: checks.uppercase },
              { key: "lowercase", text: "Al menos una letra minúscula", check: checks.lowercase },
              { key: "numbers", text: "Al menos un número", check: checks.numbers },
              { key: "symbols", text: "Al menos un símbolo especial", check: checks.symbols },
            ].map((requirement) => (
              <div key={requirement.key} className="flex items-center gap-3">
                {requirement.check ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-sm ${requirement.check ? "text-green-600" : "text-gray-600"}`}>
                  {requirement.text}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consejos de seguridad */}
      <Card className="backdrop-blur-sm bg-white/80 border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
            <AlertTriangle className="h-5 w-5" />
            Consejos de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Usa una contraseña única que no hayas usado en otros sitios</p>
            <p>• Considera usar un gestor de contraseñas</p>
            <p>• Cambia tu contraseña regularmente</p>
            <p>• No compartas tu contraseña con nadie</p>
            <p>• Activa la autenticación de dos factores cuando esté disponible</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
