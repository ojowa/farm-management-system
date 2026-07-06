'use client';

import { useState, useCallback } from 'react';
import { cropStagesAPI, farmsAPI } from '@/lib/api';
import { useFetch } from '@/hooks/useFetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CalendarStage {
  id: string;
  cropName: string;
  stageName: string;
  startDate: string;
  endDate: string;
  color: string;
  farmId: string;
  farmName: string;
}

const stageColors = [
  'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function CropCalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [farmFilter, setFarmFilter] = useState('');

  const fetchKey = `crop-calendar-${currentYear}-${currentMonth}-${farmFilter}`;

  const { data, loading: isLoading } = useFetch<{ data: CalendarStage[] }>(
    fetchKey,
    useCallback(async () => {
      const month = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      return await cropStagesAPI.calendar({ month, farmId: farmFilter || undefined });
    }, [currentYear, currentMonth, farmFilter])
  );

  const { data: farmsData } = useFetch<{ data: any[] }>(
    'farms-list-for-calendar',
    useCallback(async () => await farmsAPI.list({ limit: 100 }), [])
  );

  const stages = data?.data || [];
  const farms = farmsData?.data || [];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const farmOptions = [
    { value: '', label: 'All Farms' },
    ...farms.map((f: any) => ({ value: f.id, label: f.name })),
  ];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const getStagesForDay = (day: number) => {
    const dateStr = formatDate(currentYear, currentMonth, day);
    return stages.filter((s) => s.startDate <= dateStr && s.endDate >= dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Crop Calendar</h1>
        </div>
        <Select value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)} options={farmOptions} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-lg">{monthName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayStages = getStagesForDay(day);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  return (
                    <div
                      key={day}
                      className={`h-20 rounded border p-1 text-xs overflow-hidden ${
                        isToday ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className={`text-right font-medium ${isToday ? 'text-primary' : ''}`}>{day}</div>
                      <div className="space-y-0.5 mt-1">
                        {dayStages.slice(0, 3).map((stage) => (
                          <div
                            key={stage.id}
                            className={`truncate rounded px-1 py-0.5 text-white text-[10px] ${stageColors[stages.indexOf(stage) % stageColors.length]}`}
                            title={`${stage.cropName} - ${stage.stageName}`}
                          >
                            {stage.cropName}
                          </div>
                        ))}
                        {dayStages.length > 3 && (
                          <div className="text-[10px] text-muted-foreground text-center">+{dayStages.length - 3}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {stages.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-3">Stage Legend</h3>
            <div className="flex flex-wrap gap-3">
              {[...new Set(stages.map((s) => s.cropName))].map((cropName, i) => (
                <div key={cropName} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${stageColors[i % stageColors.length]}`} />
                  <span className="text-sm">{cropName}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
