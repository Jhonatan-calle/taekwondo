"use client"

import { useFormStatus } from "react-dom"

import { Button, type buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { VariantProps } from "class-variance-authority"

type SubmitButtonProps = {
  texto: string
  textoCargando?: string
  className?: string
} & VariantProps<typeof buttonVariants>

function SubmitButton({
  texto,
  textoCargando = "Procesando…",
  className,
  variant = "default",
  size,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={cn("w-full", className)}
    >
      {pending ? textoCargando : texto}
    </Button>
  )
}

export { SubmitButton }