"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Sparkles, Heart, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"

export default function AuthPage() {
  const searchParams = useSearchParams()
  const registerParam = searchParams.get('register')
  const [isLogin, setIsLogin] = useState(registerParam !== 'true')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    resetEmail: "",
  })

  const { login, register, isLoading, error, clearError } = useAuth()
  const router = useRouter()

  // Actualizar el modo (login/register) cuando cambie el parámetro de la URL
  useEffect(() => {
    const registerParam = searchParams.get('register')
    setIsLogin(registerParam !== 'true')
  }, [searchParams])

  // Limpiar errores cuando cambie el formulario
  useEffect(() => {
    if (error) {
      clearError()
    }
    // Limpiar errores de validación cuando cambie el formulario
    setValidationErrors({})
  }, [isLogin, error, clearError])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Limpiar error de validación del campo cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}
    
    if (isLogin) {
      if (!formData.email) errors.email = 'El email es requerido'
      if (!formData.password) errors.password = 'La contraseña es requerida'
    } else {
      if (!formData.name) errors.name = 'El nombre es requerido'
      if (!formData.email) errors.email = 'El email es requerido'
      if (!formData.password) errors.password = 'La contraseña es requerida'
      if (!formData.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña'
      if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Las contraseñas no coinciden'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async () => {
    if (!validateForm()) return

          try {
        await login({
          email: formData.email,
          password: formData.password,
        })
        // El contexto ya maneja las notificaciones y redirección
      } catch (error: any) {
        // El contexto ya maneja las notificaciones de error
        console.error('Error en login:', error)
      }
  }

  const handleRegister = async () => {
    if (!validateForm()) return

          try {
        // Registrar usuario
        await register({
          email: formData.email,
          password: formData.password,
          password_confirm: formData.confirmPassword,
          first_name: formData.name.split(' ')[0] || formData.name,
          last_name: formData.name.split(' ').slice(1).join(' ') || '',
          role: 'basic',
        })
        // El contexto ya maneja las notificaciones y redirección
      } catch (error: any) {
        // El contexto ya maneja las notificaciones de error
        console.error('Error en registro:', error)
      }
  }

  const handleForgotPassword = async () => {
    if (!formData.resetEmail) {
      setValidationErrors({ resetEmail: 'El email es requerido' })
      return
    }

    // TODO: Implementar forgotPassword cuando esté disponible en el contexto
    setShowForgotPassword(false)
  }


  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-cyan-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/80 border-0 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl flex items-center justify-center animate-bounce">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="text-gray-600">
              Ingresa tu correo y te enviaremos un enlace mágico ✨
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="reset-email" className="text-gray-700 font-medium">
                Correo electrónico
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="tu@correo.com"
                value={formData.resetEmail}
                onChange={(e) => handleInputChange("resetEmail", e.target.value)}
                className={`h-12 border-2 transition-all duration-300 rounded-xl ${
                  validationErrors.resetEmail ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-rose-400'
                }`}
              />
              {validationErrors.resetEmail && (
                <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                  {validationErrors.resetEmail}
                </p>
              )}
            </div>

            <Button
              className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enviando...
                </div>
              ) : (
                "Enviar enlace mágico ✨"
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full h-12 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-300"
              onClick={() => setShowForgotPassword(false)}
            >
              ← Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-teal-50 to-violet-50 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-200/30 to-cyan-200/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-violet-200/20 to-purple-200/20 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Floating elements */}
        <div className="absolute top-20 left-20 w-4 h-4 bg-rose-300/50 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-40 right-32 w-3 h-3 bg-teal-300/50 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-32 left-32 w-5 h-5 bg-violet-300/50 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-pink-300/50 rounded-full animate-bounce delay-500"></div>
      </div>

      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm bg-white/80 border-0 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center animate-bounce">
            <Target className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            {isLogin ? "¡Hola de nuevo! 👋" : "¡Únete a nosotros! 🎉"}
          </CardTitle>
          <CardDescription className="text-gray-600 text-lg">
            {isLogin ? "Nos alegra verte de vuelta" : "Comienza tu transformación hoy"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isLogin && (
            <div className="space-y-3 animate-in slide-in-from-right-4 duration-500">
              <Label htmlFor="name" className="text-gray-700 font-medium">
                Nombre completo
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`h-12 border-2 transition-all duration-300 rounded-xl ${
                  validationErrors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                }`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                  {validationErrors.name}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3 animate-in slide-in-from-left-4 duration-500 delay-100">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className={`h-12 border-2 transition-all duration-300 rounded-xl ${
                validationErrors.email ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
              }`}
            />
            {validationErrors.email && (
              <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                {validationErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-3 animate-in slide-in-from-right-4 duration-500 delay-200">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Tu contraseña segura"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`h-12 border-2 transition-all duration-300 rounded-xl pr-12 ${
                  validationErrors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </Button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-3 animate-in slide-in-from-left-4 duration-500 delay-300">
              <Label htmlFor="confirm-password" className="text-gray-700 font-medium">
                Confirmar contraseña
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirma tu contraseña"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  className={`h-12 border-2 transition-all duration-300 rounded-xl pr-12 ${
                    validationErrors.confirmPassword ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-teal-400'
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </Button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 animate-in slide-in-from-top-1 duration-200">
                  {validationErrors.confirmPassword}
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl animate-in zoom-in-50 duration-500 delay-400"
            onClick={isLogin ? handleLogin : handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {isLogin ? "Iniciando sesión..." : "Creando cuenta..."}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {isLogin ? "Entrar a mi cuenta" : "Crear mi cuenta"}
              </div>
            )}
          </Button>

          {isLogin && (
            <Button
              variant="ghost"
              className="w-full h-12 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-300 animate-in fade-in-0 duration-500 delay-500"
              onClick={() => setShowForgotPassword(true)}
            >
              ¿Olvidaste tu contraseña? 🤔
            </Button>
          )}

          <div className="text-center animate-in fade-in-0 duration-500 delay-600">
            <Button
              variant="ghost"
              className="text-gray-600 hover:text-gray-800 transition-colors duration-300 font-medium"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "¿Primera vez aquí? ¡Regístrate! 🎉" : "¿Ya tienes cuenta? ¡Inicia sesión! 👋"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
