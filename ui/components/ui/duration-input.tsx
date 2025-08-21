'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface DurationInputProps {
  value?: number; // Total duration in seconds
  onChange: (totalSeconds: number) => void;
  minMinutes?: number;
  maxDays?: number;
  disabled?: boolean;
  className?: string;
}

interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

export const DurationInput: React.FC<DurationInputProps> = ({
  value = 0,
  onChange,
  minMinutes = 1,
  maxDays = 365,
  disabled = false,
  className = ''
}) => {
  const [duration, setDuration] = useState<DurationParts>({
    days: 0,
    hours: 0,
    minutes: 0
  });

  // Convert seconds to duration parts
  const secondsToDuration = (totalSeconds: number): DurationParts => {
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    
    return { days, hours, minutes };
  };

  // Convert duration parts to total seconds
  const durationToSeconds = (parts: DurationParts): number => {
    return (parts.days * 24 * 60 * 60) + (parts.hours * 60 * 60) + (parts.minutes * 60);
  };

  // Initialize duration from value prop
  useEffect(() => {
    if (value > 0) {
      setDuration(secondsToDuration(value));
    }
  }, [value]);

  // Update individual duration part
  const updateDuration = (field: keyof DurationParts, newValue: number) => {
    const updatedDuration = { ...duration, [field]: newValue };
    
    // Validate constraints
    if (field === 'days') {
      updatedDuration.days = Math.max(0, Math.min(maxDays, newValue));
    } else if (field === 'hours') {
      updatedDuration.hours = Math.max(0, Math.min(23, newValue));
    } else if (field === 'minutes') {
      updatedDuration.minutes = Math.max(0, Math.min(59, newValue));
    }

    setDuration(updatedDuration);
    
    // Calculate total seconds and call onChange
    const totalSeconds = durationToSeconds(updatedDuration);
    onChange(totalSeconds);
  };

  // Format display text
  const formatDuration = (): string => {
    const parts: string[] = [];
    
    if (duration.days > 0) {
      parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
    }
    if (duration.hours > 0) {
      parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
    }
    if (duration.minutes > 0) {
      parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
      return 'No duration set';
    }
    
    return parts.join(', ');
  };

  // Check if duration meets minimum requirements
  const isValidDuration = (): boolean => {
    const totalMinutes = (duration.days * 24 * 60) + (duration.hours * 60) + duration.minutes;
    const maxMinutes = maxDays * 24 * 60;
    return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
  };

  return (
    <div className={className}>
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Campaign Duration</Label>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="days" className="text-xs text-muted-foreground">
                  Days
                </Label>
                <Input
                  id="days"
                  type="number"
                  min="0"
                  max={maxDays}
                  value={duration.days}
                  onChange={(e) => updateDuration('days', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-center"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-xs text-muted-foreground">
                  Hours
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={duration.hours}
                  onChange={(e) => updateDuration('hours', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-center"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minutes" className="text-xs text-muted-foreground">
                  Minutes
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  value={duration.minutes}
                  onChange={(e) => updateDuration('minutes', parseInt(e.target.value) || 0)}
                  disabled={disabled}
                  className="text-center"
                />
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Duration:</span>
                <span className={`text-sm font-medium ${isValidDuration() ? 'text-foreground' : 'text-destructive'}`}>
                  {formatDuration()}
                </span>
              </div>
              
              {/* {!isValidDuration() && (
                <p className="text-xs text-destructive mt-1">
                  Duration must be at least {minMinutes} minute{minMinutes !== 1 ? 's' : ''} and at most {maxDays} days
                </p>
              )} */}
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>• Minimum: {minMinutes} minute{minMinutes !== 1 ? 's' : ''}</p>
              <p>• Maximum: {maxDays} day{maxDays !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Utility functions for external use
export const convertDaysToSeconds = (days: number): number => {
  return days * 24 * 60 * 60;
};

export const convertSecondsToDays = (seconds: number): number => {
  return seconds / (24 * 60 * 60);
};

export const formatDurationFromSeconds = (totalSeconds: number): string => {
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  
  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : '0 minutes';
};
