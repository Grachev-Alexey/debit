import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  value?: { from: string; to: string };
  onChange: (range: { from: string; to: string } | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Выберите диапазон",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const dateRange: DateRange | undefined = value
    ? {
        from: value.from ? new Date(value.from) : undefined,
        to: value.to ? new Date(value.to) : undefined,
      }
    : undefined;

  const handleSelect = (range: DateRange | undefined) => {
    if (!range) {
      onChange(undefined);
      return;
    }

    // If both from and to are set, close the popover
    if (range.from && range.to) {
      onChange({
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
      });
      setOpen(false);
    } else if (range.from && !range.to) {
      // First click: set from and to to the same date but keep popover open
      // This allows the user to either click a second date for a range or click outside to confirm single date
      onChange({
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.from, "yyyy-MM-dd"),
      });
    }
  };

  const handleClear = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ('stopPropagation' in e) e.stopPropagation();
    if ('preventDefault' in e) e.preventDefault();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal w-full",
            !dateRange && "text-muted-foreground",
            className
          )}
          data-testid="button-date-range-picker"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange?.from ? (
            <span className="flex items-center gap-2 flex-1">
              <span>
                {format(dateRange.from, "d MMM yyyy", { locale: ru })}
                {dateRange.to && ` - ${format(dateRange.to, "d MMM yyyy", { locale: ru })}`}
              </span>
              <span
                className="ml-auto h-5 w-5 flex items-center justify-center rounded-sm hover:bg-muted cursor-pointer"
                onClick={handleClear}
                data-testid="button-clear-date-range"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleClear(e);
                  }
                }}
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ru}
        />
      </PopoverContent>
    </Popover>
  );
}
