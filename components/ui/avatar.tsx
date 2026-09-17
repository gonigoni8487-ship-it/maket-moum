import * as React from "react"

import { cn } from "@/lib/utils"

const AVATAR_PALETTE = [
  "bg-[#7A2E3C] text-white",
  "bg-[#C08552] text-white",
  "bg-[#4A2A2E] text-white",
  "bg-[#8B7570] text-white",
  "bg-[#B3413F] text-white",
]

function paletteIndex(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return hash % AVATAR_PALETTE.length
}

function Avatar({
  name,
  className,
  size = "default",
}: {
  name: string
  className?: string
  size?: "sm" | "default" | "lg"
}) {
  const initial = name?.trim()?.[0] ?? "?"
  const sizeCls =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-14 text-lg" : "size-10 text-sm"
  return (
    <div
      data-slot="avatar"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-heading font-semibold",
        sizeCls,
        AVATAR_PALETTE[paletteIndex(name || "?")],
        className
      )}
    >
      {initial}
    </div>
  )
}

export { Avatar }
