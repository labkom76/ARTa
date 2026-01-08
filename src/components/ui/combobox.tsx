"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

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

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  onCreate?: (value: string) => void;
  createLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string; // Allow external classes
}

export function Combobox({
  options,
  value,
  onValueChange,
  onCreate,
  createLabel = "Tambah",
  placeholder = "Select option...",
  disabled = false,
  className, // Destructure className
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const [popoverWidth, setPopoverWidth] = React.useState<number>(0)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (triggerRef.current) {
      setPopoverWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  const [search, setSearch] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          <span className="truncate">
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: popoverWidth > 0 ? `${popoverWidth}px` : 'auto' }}
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="Search option..."
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty className="py-2 px-2 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">No option found.</span>
            {onCreate && search && (
              <Button
                variant="ghost"
                className="h-8 justify-start text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 w-full px-2"
                onClick={() => {
                  onCreate(search);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check className="mr-2 h-3 w-3 opacity-0" />
                + {createLabel} "{search}"
              </Button>
            )}
          </CommandEmpty>
          <CommandList style={{ maxHeight: '300px', overflowY: 'auto', overflowX: 'hidden' }}>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentValue) => {
                    const selectedOption = options.find(o => o.label.toLowerCase() === currentValue.toLowerCase());
                    onValueChange(selectedOption ? selectedOption.value : "");
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
