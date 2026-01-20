import * as React from 'react';
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, startOfYear, endOfYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateRangePickerWithPresetsProps extends React.HTMLAttributes<HTMLDivElement> {
  date?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
  numberOfMonths?: number;
}

export function DateRangePickerWithPresets({
  date,
  onDateChange,
  className,
  align = 'end',
  numberOfMonths = 2,
}: DateRangePickerWithPresetsProps) {
  const handlePresetChange = (value: string) => {
    const today = new Date();
    let newDateRange: DateRange | undefined;

    switch (value) {
      case 'today':
        newDateRange = { from: today, to: today };
        break;
      case 'last7days':
        newDateRange = { from: subDays(today, 6), to: today };
        break;
      case 'last30days':
        newDateRange = { from: subDays(today, 29), to: today };
        break;
      case 'thismonth':
        newDateRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case 'lastmonth':
        const lastMonthStart = startOfMonth(subDays(today, 30));
        const lastMonthEnd = endOfMonth(subDays(today, 30));
        newDateRange = { from: lastMonthStart, to: lastMonthEnd };
        break;
      case 'thisyear':
        newDateRange = { from: startOfYear(today), to: endOfYear(today) };
        break;
      case 'clear':
        newDateRange = undefined;
        break;
      default:
        newDateRange = undefined;
        break;
    }
    onDateChange(newDateRange);
  };

  const getPresetValue = () => {
    if (!date?.from || !date?.to) return 'custom';

    const today = new Date();
    if (isSameDay(date.from, today) && isSameDay(date.to, today)) return 'today';
    if (isSameDay(date.from, subDays(today, 6)) && isSameDay(date.to, today)) return 'last7days';
    if (isSameDay(date.from, subDays(today, 29)) && isSameDay(date.to, today)) return 'last30days';
    if (isSameDay(date.from, startOfMonth(today)) && isSameDay(date.to, endOfMonth(today))) return 'thismonth';

    const lastMonthStart = startOfMonth(subDays(today, 30));
    const lastMonthEnd = endOfMonth(subDays(today, 30));
    if (isSameDay(date.from, lastMonthStart) && isSameDay(date.to, lastMonthEnd)) return 'lastmonth';

    if (isSameDay(date.from, startOfYear(today)) && isSameDay(date.to, endOfYear(today))) return 'thisyear';

    return 'custom';
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd MMM yyyy', { locale: localeId })} -{' '}
                  {format(date.to, 'dd MMM yyyy', { locale: localeId })}
                </>
              ) : (
                format(date.from, 'dd MMM yyyy', { locale: localeId })
              )
            ) : (
              <span>Pilih Tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="flex flex-col gap-2 p-2">
            <Select onValueChange={handlePresetChange} value={getPresetValue()}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="last7days">7 Hari Terakhir</SelectItem>
                <SelectItem value="last30days">30 Hari Terakhir</SelectItem>
                <SelectItem value="thismonth">Bulan Ini</SelectItem>
                <SelectItem value="lastmonth">Bulan Lalu</SelectItem>
                <SelectItem value="thisyear">Tahun Ini</SelectItem>
                <SelectItem value="custom">Rentang Kustom</SelectItem>
              </SelectContent>
            </Select>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={numberOfMonths}
              locale={localeId}
            />
            {date?.from && (
              <Button variant="ghost" onClick={() => onDateChange(undefined)} className="w-full">
                Hapus Filter Tanggal
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}