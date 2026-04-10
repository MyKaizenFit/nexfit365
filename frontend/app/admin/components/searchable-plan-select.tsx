"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface PlanOption {
  id: string
  name: string
}

interface SearchablePlanSelectProps {
  label: string
  value: string | null
  options: PlanOption[]
  onChange: (value: string | null) => void
  placeholder?: string
  emptyMessage?: string
  loading?: boolean
}

export function SearchablePlanSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Selecciona una opción...",
  emptyMessage = "No se encontraron resultados.",
  loading = false,
}: SearchablePlanSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedOption = React.useMemo(
    () => options.find((option) => option.id === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options

    const query = searchQuery.toLowerCase()
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                Cargando...
              </Badge>
            </div>
          )}
          {!loading && options.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {options.length} disponibles
            </Badge>
          )}
          {!loading && options.length === 0 && (
            <Badge variant="destructive" className="text-xs">
              Sin opciones
            </Badge>
          )}
        </div>
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-auto min-h-[40px] py-2"
            disabled={loading}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando...</span>
                </div>
              ) : selectedOption ? (
                <span className="truncate">{selectedOption.name}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2 shrink-0">
              {selectedOption && (
                <X
                  className="h-4 w-4 opacity-50 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(null)
                  }}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={`Buscar ${label.toLowerCase()}...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__EMPTY__"
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                    setSearchQuery("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === null ? "opacity-100" : "opacity-0"
                    )}
                  />
                  Sin plan asignado
                </CommandItem>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    onSelect={() => {
                      onChange(option.id)
                      setOpen(false)
                      setSearchQuery("")
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedOption && (
        <p className="text-xs text-muted-foreground">
          Seleccionado: {selectedOption.name}
        </p>
      )}
    </div>
  )
}

