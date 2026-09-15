"use client"

import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SubmitButtonProps = {
  texto: string
  textoCargando?: string
  className?: string
}

function SubmitButton({ texto, textoCargando = "Procesando…", className }: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={cn("w-full", className)}>
      {pending ? textoCargando : texto}
    </Button>
  )
}

export { SubmitButton }