import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Clock, Phone, Globe, ChevronDown, ChevronUp, Info, Workflow, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { TimePicker } from './TimePicker';
import { DatePicker } from './DatePicker';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

interface ScheduleDay {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface PhoneNumber {
  id: string;
  number: string;
  formatted: string;
  countryCode: string;
  flag: string;
  status: 'active' | 'inactive' | 'unverified';
}

interface Group {
  id: string;
  name: string;
  agentCount: number;
  status: 'active' | 'inactive';
}

interface FormData {
  name: string;
  ivr: string;
  phoneNumber: string;
  startDate: string;
  endDate: string;
  schedule: Record<string, ScheduleDay>;
  timezone: string;
  maxTries: number;
  retryInterval: string;
  concurrency: number;
  groupName: string;
  concurrentCallsPerAgent: number;
}

const WEEKDAYS = [
  { key: 'monday', label: 'Monday', short: 'Mon', dayIndex: 1 },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue', dayIndex: 2 },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed', dayIndex: 3 },
  { key: 'thursday', label: 'Thursday', short: 'Thu', dayIndex: 4 },
  { key: 'friday', label: 'Friday', short: 'Fri', dayIndex: 5 },
  { key: 'saturday', label: 'Saturday', short: 'Sat', dayIndex: 6 },
  { key: 'sunday', label: 'Sunday', short: 'Sun', dayIndex: 0 }
] as const;

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: -5 },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: -6 },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: -8 },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 0 },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 1 },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 9 },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: 11 }
] as const;

const IVR_OPTIONS = [
  'DefaultIVR1658315753',
  'PhonebotElevenlabs5',
  'PhonebotElevenlabs3',
  'AccountWorkingHours',
  'DefaultClient'
] as const;

const PHONE_NUMBERS: PhoneNumber[] = [
  {
    id: '1',
    number: '12029514012',
    formatted: '12029514012',
    countryCode: 'US',
    flag: '🇺🇸',
    status: 'active'
  },
  {
    id: '2',
    number: '12134234050',
    formatted: '12134234050',
    countryCode: 'US',
    flag: '🇺🇸',
    status: 'active'
  },
  {
    id: '3',
    number: '20221604225',
    formatted: '20221604225',
    countryCode: 'EG',
    flag: '🇪🇬',
    status: 'active'
  },
  {
    id: '4',
    number: '441617681737',
    formatted: '441617681737',
    countryCode: 'GB',
    flag: '🇬🇧',
    status: 'active'
  },
  {
    id: '5',
    number: '447418319716',
    formatted: '447418319716',
    countryCode: 'GB',
    flag: '🇬🇧',
    status: 'active'
  }
];

const GROUPS: Group[] = [
  { id: '1', name: 'Sales Team', agentCount: 12, status: 'active' },
  { id: '2', name: 'Support Team', agentCount: 8, status: 'active' },
  { id: '3', name: 'Marketing Team', agentCount: 5, status: 'active' },
  { id: '4', name: 'Customer Success', agentCount: 6, status: 'active' },
  { id: '5', name: 'Technical Team', agentCount: 4, status: 'inactive' }
];

// Helper functions
const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
};

const getCurrentTimeInTimezone = (timezone: string): string => {
  try {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

const formatTo12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const parts = time24.split(':');
  const hours = parts[0];
  const minutes = parts[1];
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${period}`;
};

const convertTo24Hour = (time12: string): string => {
  if (!time12 || !time12.includes(':')) return time12;
  
  const parts = time12.split(' ');
  const time = parts[0];
  const period = parts[1];
  const timeParts = time.split(':');
  const hours = timeParts[0];
  const minutes = timeParts[1];
  let hour24 = parseInt(hours, 10);
  
  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes}`;
};

const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addOneYear = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString + 'T00:00:00');
    date.setFullYear(date.getFullYear() + 1);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
};

const getDaysInDateRange = (startDate: string, endDate: string): Set<number> => {
  if (!startDate || !endDate) return new Set();
  
  try {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const daysInRange = new Set<number>();
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      daysInRange.add(currentDate.getDay());
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return daysInRange;
  } catch {
    return new Set();
  }
};
// Helper function to get filtered weekdays that exist within the date range
const getFilteredWeekdays = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return WEEKDAYS;
  
  const daysInRange = getDaysInDateRange(startDate, endDate);
  return WEEKDAYS.filter(day => daysInRange.has(day.dayIndex));
};

// Memoized TimeSlotInput component
const TimeSlotInput = React.memo<{
  dayKey: string;
  type: 'start' | 'end';
  value: string;
  enabled: boolean;
  onChange: (value: string) => void;
  hasError: boolean;
}>(({ dayKey, type, value, enabled, onChange, hasError }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleTimeChange = useCallback((newTime: string) => {
    const time24 = convertTo24Hour(newTime);
    onChange(time24);
    setIsOpen(false);
  }, [onChange]);

  const commonTimes = useMemo(() => [
    '12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM',
    '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
  ], []);

  const buttonClasses = useMemo(() => {
    const baseClasses = 'w-36 px-4 py-3 text-sm border rounded-lg transition-all duration-200 text-left';
    const enabledClasses = 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 cursor-pointer';
    const disabledClasses = 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed';
    const errorClasses = 'border-red-300';

    let classes = baseClasses;
    if (enabled) {
      classes += ' ' + enabledClasses;
    } else {
      classes += ' ' + disabledClasses;
    }
    if (hasError) {
      classes += ' ' + errorClasses;
    }
    
    return classes;
  }, [enabled, hasError]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => enabled && setIsOpen(!isOpen)}
        disabled={!enabled}
        className={buttonClasses}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {formatTo12Hour(value)}
          </span>
          {enabled && (
            <Clock className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isOpen && enabled && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-2">
              {type === 'start' ? 'Start Time' : 'End Time'}
            </div>
            <div className="space-y-1">
              {commonTimes.map(time => {
                const isSelected = formatTo12Hour(value) === time;
                const buttonClass = isSelected 
                  ? 'w-full px-3 py-2 text-left text-sm rounded bg-blue-100 text-blue-700 font-medium'
                  : 'w-full px-3 py-2 text-left text-sm rounded hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 text-gray-700';
                
                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeChange(time)}
                    className={buttonClass}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TimeSlotInput.displayName = 'TimeSlotInput';

// Memoized StepIndicator component
const StepIndicator = React.memo(({ currentStep }: { currentStep: number }) => {
  const stepLabels = useMemo(() => [
    'Campaign Info & Configurations',
    'Schedule Configuration'
  ], []);

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <div key={stepNumber} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : isCompleted 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }
              `}>
                {stepNumber}
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {label}
              </span>
              {index < stepLabels.length - 1 && (
                <div className="ml-4 w-8 h-0.5 bg-gray-200"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

StepIndicator.displayName = 'StepIndicator';

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ivr: '',
    phoneNumber: '',
    startDate: '',
    endDate: '',
    schedule: WEEKDAYS.reduce((acc, day) => ({
      ...acc,
      [day.key]: { enabled: false, startTime: '09:00', endTime: '17:00' }
    }), {}),
    timezone: getUserTimezone(),
    maxTries: 1,
    retryInterval: '00:00:00',
    concurrency: 1,
    groupName: '',
    concurrentCallsPerAgent: 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getUserTimezone());
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [isPhoneNumberDropdownOpen, setIsPhoneNumberDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isAdvancedConfigExpanded, setIsAdvancedConfigExpanded] = useState(false);
  const [isAdvancedConcurrencyEnabled, setIsAdvancedConcurrencyEnabled] = useState(false);

  // Memoized computed values
  const selectedPhoneNumber = useMemo(() => 
    PHONE_NUMBERS.find(phone => phone.id === formData.phoneNumber),
    [formData.phoneNumber]
  );

  const selectedGroup = useMemo(() => 
    GROUPS.find(group => group.id === formData.groupName),
    [formData.groupName]
  );

  const activeGroups = useMemo(() => 
    GROUPS.filter(group => group.status === 'active'),
    []
  );

  // Memoized validation functions
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Campaign name is required';
      }

      if (!formData.phoneNumber) {
        newErrors.phoneNumber = 'Phone number selection is required';
      }

      if (!formData.ivr) {
        newErrors.ivr = 'IVR selection is required';
      }

      const maxTriesNum = Number(formData.maxTries);
      if (maxTriesNum < 1 || maxTriesNum > 10) {
        newErrors.maxTries = 'Maximum tries must be between 1 and 10';
      }

      const concurrencyNum = Number(formData.concurrency);
      if (concurrencyNum < 1 || concurrencyNum > 100) {
        newErrors.concurrency = 'Concurrency must be between 1 and 100';
      }

      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
      if (!timeRegex.test(formData.retryInterval)) {
        newErrors.retryInterval = 'Invalid time format. Use HH:MM:SS (00:00:00 to 23:59:59)';
      }

      // Validate Advanced Configurations (Concurrency Auto-Scaling) when enabled
      if (formData.autoScaling?.enabled) {
        if (!formData.autoScaling.groupName?.trim()) {
          newErrors['autoScaling.groupName'] = 'Group Name is required when auto-scaling is enabled';
        }

        if (!formData.autoScaling.concurrentCallsPerOnlineAgent || 
            formData.autoScaling.concurrentCallsPerOnlineAgent < 1 || 
            formData.autoScaling.concurrentCallsPerOnlineAgent > 100) {
          newErrors['autoScaling.concurrentCallsPerOnlineAgent'] = 'Concurrent Calls per Online Agent must be between 1 and 100';
        }
      }
    }


    if (step === 2) {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      } else {
        const today = getTodayDate();
        if (formData.startDate < today) {
          newErrors.startDate = 'Start date cannot be in the past';
        }
      }

      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      } else if (formData.startDate) {
        if (formData.endDate <= formData.startDate) {
          newErrors.endDate = 'End date must be after start date';
        } else {
          const maxEndDate = addOneYear(formData.startDate);
          if (formData.endDate > maxEndDate) {
            newErrors.endDate = 'Campaign duration cannot exceed 1 year';
          }
        }
      }

      const hasEnabledDays = Object.values(formData.schedule).some(day => day.enabled);
      if (!hasEnabledDays) {
        newErrors.schedule = 'At least one day must be selected';
      }

      Object.entries(formData.schedule).forEach(([dayKey, day]) => {
        if (day.enabled) {
          const startTime = new Date(`2000-01-01T${day.startTime}:00`);
          const endTime = new Date(`2000-01-01T${day.endTime}:00`);
          
          if (startTime >= endTime) {
            newErrors[`schedule-${dayKey}`] = 'End time must be after start time';
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isAdvancedConfigExpanded]);

  const validateForm = useCallback((): boolean => {
    return validateStep(1) && validateStep(2);
  }, [validateStep]);

  // Event handlers
  const handleFormDataChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear related errors
    if (hasAttemptedSubmit && errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [hasAttemptedSubmit, errors]);

  const handleScheduleChange = useCallback((dayKey: string, field: keyof ScheduleDay, value: boolean | string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [dayKey]: {
          ...prev.schedule[dayKey],
          [field]: value
        }
      }
    }));
    
    const errorKey = `schedule-${dayKey}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  }, [errors]);

  const handleTimezoneSelect = useCallback((timezone: string) => {
    setSelectedTimezone(timezone);
    handleFormDataChange('timezone', timezone);
    setIsTimezoneDropdownOpen(false);
  }, [handleFormDataChange]);

  const handlePhoneNumberSelect = useCallback((phoneNumberId: string) => {
    handleFormDataChange('phoneNumber', phoneNumberId);
    setIsPhoneNumberDropdownOpen(false);
  }, [handleFormDataChange]);

  const handleGroupSelect = useCallback((groupId: string) => {
    handleFormDataChange('groupName', groupId);
    setIsGroupDropdownOpen(false);
  }, [handleFormDataChange]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 2));
    }
  }, [currentStep, validateStep]);

  const handlePrevious = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    
    if (validateForm()) {
      onSubmit(formData);
      setHasAttemptedSubmit(false);
      setErrors({});
      onClose();
    }
  }, [validateForm, onSubmit, formData, onClose]);

  const toggleAdvancedConfig = useCallback(() => {
    setIsAdvancedConfigExpanded(prev => {
      const newExpanded = !prev;
      
      // When toggling ON: enable advanced concurrency and set concurrency to 1
      if (newExpanded) {
        setIsAdvancedConcurrencyEnabled(true);
        handleFormDataChange('concurrency', 1);
      } else {
        // When toggling OFF: disable advanced concurrency
        setIsAdvancedConcurrencyEnabled(false);
      }
      
      return newExpanded;
    });
  }, []);

  // Effect to handle concurrency field behavior when advanced settings are enabled
  useEffect(() => {
    if (isAdvancedConcurrencyEnabled && isAdvancedConfigExpanded) {
      // Maintain concurrency at 1 when advanced settings are ON
      if (formData.concurrency !== 1) {
        handleFormDataChange('concurrency', 1);
      }
    }
  }, [isAdvancedConcurrencyEnabled, isAdvancedConfigExpanded, formData.concurrency, handleFormDataChange]);
  // Effects
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const daysInRange = getDaysInDateRange(formData.startDate, formData.endDate);
      
      setFormData(prev => ({
        ...prev,
        schedule: WEEKDAYS.reduce((acc, day) => {
          const shouldBeEnabled = daysInRange.has(day.dayIndex);
          return {
            ...acc,
            [day.key]: {
              ...prev.schedule[day.key],
              enabled: shouldBeEnabled
            }
          };
        }, {})
      }));
    } else {
      // Reset schedule when dates are cleared
      setFormData(prev => ({
        ...prev,
        schedule: WEEKDAYS.reduce((acc, day) => ({
          ...acc,
          [day.key]: { enabled: false, startTime: '09:00', endTime: '17:00' }
        }), {})
      }));
    }
  }, [formData.startDate, formData.endDate]);

  useEffect(() => {
    const updateTimes = () => {
      const times: Record<string, string> = {};
      TIMEZONES.forEach(tz => {
        times[tz.value] = getCurrentTimeInTimezone(tz.value);
      });
      setCurrentTimes(times);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHasAttemptedSubmit(false);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.timezone-dropdown-container')) {
        setIsTimezoneDropdownOpen(false);
      }
      if (!target.closest('.phone-number-dropdown-container')) {
        setIsPhoneNumberDropdownOpen(false);
      }
      if (!target.closest('.group-dropdown-container')) {
        setIsGroupDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to get error
  const getError = useCallback((field: string) => {
    return errors[field];
  }, [errors]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-heading-2">Create New Campaign</h2>
          <button
            onClick={onClose}
            className="icon-button"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Campaign Info & Configurations */}
              {currentStep === 1 && (
                <div className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <h3 className="text-heading-2 flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-blue-600" />
                      Campaign Info & Configurations
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700 mb-2">
                          Campaign Name
                        </label>
                        <input
                          id="campaign-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleFormDataChange('name', e.target.value)}
                          className="form-input"
                          placeholder="Enter campaign name"
                          aria-describedby={getError('name') ? "name-error" : undefined}
                        />
                        {getError('name') && <p id="name-error" className="text-red-500 text-sm mt-1">{getError('name')}</p>}
                      </div>

                      {/* Phone Number Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            Outbound Caller ID
                            <div className="relative ml-2 group">
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                This number will appear as the caller ID to recipients
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </label>
                        <div className="relative phone-number-dropdown-container">
                          <button
                            type="button"
                            onClick={() => setIsPhoneNumberDropdownOpen(!isPhoneNumberDropdownOpen)}
                            className={`w-full form-input text-left flex items-center justify-between ${
                              getError('phoneNumber') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                            aria-describedby={getError('phoneNumber') ? "phone-number-error" : undefined}
                          >
                            <div className="flex items-center">
                              <span className={selectedPhoneNumber ? 'text-gray-900' : 'text-gray-400'}>
                                {selectedPhoneNumber ? (
                                  <div className="flex items-center">
                                    <span className="text-lg mr-2">{selectedPhoneNumber.flag}</span>
                                    <span className="font-medium">{selectedPhoneNumber.formatted}</span>
                                  </div>
                                ) : (
                                  'Select phone number'
                                )}
                              </span>
                            </div>
                            {isPhoneNumberDropdownOpen ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {isPhoneNumberDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {PHONE_NUMBERS.map((phone, index) => {
                                const isSelected = formData.phoneNumber === phone.id;
                                const isLast = index === PHONE_NUMBERS.length - 1;
                                const buttonClasses = `w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors duration-200 ${
                                  !isLast ? 'border-b border-gray-100' : ''
                                } ${
                                  isSelected ? 'bg-blue-50 text-blue-700' : ''
                                }`;

                                return (
                                  <button
                                    key={phone.id}
                                    type="button"
                                    onClick={() => handlePhoneNumberSelect(phone.id)}
                                    className={buttonClasses}
                                  >
                                    <div className="flex items-center">
                                      <span className="text-lg mr-3">{phone.flag}</span>
                                      <span className="font-medium">{phone.formatted}</span>
                                    </div>
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {getError('phoneNumber') && <p id="phone-number-error" className="text-red-500 text-sm mt-1">{getError('phoneNumber')}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          This number will be displayed to call recipients as the caller ID
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Configurations Section */}
                  <div className="space-y-6">
                    {/* Row 1: IVR (left) and Concurrency (right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* IVR Selection */}
                      <div>
                        <label htmlFor="ivr-select" className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center">
                            <Workflow className="w-4 h-4 mr-1" />
                            IVR
                          </div>
                        </label>
                        <select
                          id="ivr-select"
                          value={formData.ivr}
                          onChange={(e) => handleFormDataChange('ivr', e.target.value)}
                          className={`form-select h-12 ${
                            getError('ivr') ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                          }`}
                          aria-describedby={getError('ivr') ? "ivr-error" : undefined}
                        >
                          <option value="">Select IVR</option>
                          {IVR_OPTIONS.map(ivr => (
                            <option key={ivr} value={ivr}>{ivr}</option>
                          ))}
                        </select>
                        {getError('ivr') && (
                          <p id="ivr-error" className="text-red-500 text-sm mt-1">{getError('ivr')}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Interactive Voice Response system for call handling
                        </p>
                      </div>

                      {/* Concurrency */}
                      <div>
                        <label htmlFor="concurrency" className="block text-sm font-medium text-gray-700 mb-2">
                          Concurrency
                        </label>
                        <input
                          id="concurrency"
                          type="number"
                          min="1"
                          max="100"
                          value={formData.concurrency}
                          onChange={(e) => {
                            // Only allow changes if advanced concurrency is not enabled
                            if (!isAdvancedConcurrencyEnabled) {
                              handleFormDataChange('concurrency', parseInt(e.target.value) || 1);
                            }
                          }}
                          className={`form-input h-12 ${
                            isAdvancedConcurrencyEnabled 
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                              : ''
                          }`}
                          disabled={isAdvancedConcurrencyEnabled}
                          aria-describedby={getError('concurrency') ? "concurrency-error" : undefined}
                        />
                        {getError('concurrency') && <p id="concurrency-error" className="text-red-500 text-sm mt-1">{getError('concurrency')}</p>}
                        {isAdvancedConcurrencyEnabled ? (
                          <p className="text-xs text-amber-600 mt-1">
                            <span className="font-medium">Auto-concurrency:</span> Concurrency is automatically disabled when Concurrency advanced Settings are enabled
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum simultaneous calls
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Maximum Tries (left) and Retry Interval (right) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Maximum Tries */}
                      <div>
                        <label htmlFor="max-tries" className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Tries
                        </label>
                        <input
                          id="max-tries"
                          type="number"
                          min="1"
                          max="10"
                          value={formData.maxTries}
                          onChange={(e) => handleFormDataChange('maxTries', parseInt(e.target.value) || 1)}
                          className="form-input h-12"
                          aria-describedby={getError('maxTries') ? "max-tries-error" : undefined}
                        />
                        {getError('maxTries') && <p id="max-tries-error" className="text-red-500 text-sm mt-1">{getError('maxTries')}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          Number of call attempts per contact
                        </p>
                      </div>

                      {/* Retry Interval with Time Picker */}
                      <div>
                        <TimePicker
                          value={formData.retryInterval}
                          onChange={(value) => handleFormDataChange('retryInterval', value)}
                          label="Retry Interval"
                          error={getError('retryInterval')}
                          helperText="Time to wait between retry attempts"
                          required
                        />
                      </div>
                    </div>

                    {/* Advanced Configurations Section */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Settings className="w-5 h-5 text-gray-600" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              Advanced Concurrency Settings <span className="text-gray-500 font-normal">(optional)</span>
                            </h4>
                            <p className="text-xs text-gray-600 mt-1">
                              Automate the number of concurrent outbound calls based on the count of online agents
                            </p>
                          </div>
                        </div>
                        
                        {/* Toggle Button */}
                        <button
                          type="button"
                          onClick={() => formData.ivr && toggleAdvancedConfig()}
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                            ${!formData.ivr 
                              ? 'bg-gray-200 cursor-not-allowed' 
                              : isAdvancedConfigExpanded 
                                ? 'bg-blue-600' 
                                : 'bg-gray-300'
                            }
                          `}
                          disabled={!formData.ivr}
                          role="switch"
                          aria-checked={isAdvancedConfigExpanded}
                          aria-label={!formData.ivr ? "Select an IVR to enable concurrency auto-scaling" : "Toggle concurrency auto-scaling"}
                        >
                          <span
                            className={`
                              inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out
                              ${!formData.ivr 
                                ? 'translate-x-1' 
                                : isAdvancedConfigExpanded 
                                  ? 'translate-x-6' 
                                  : 'translate-x-1'
                              }
                            `}
                          />
                        </button>
                      </div>
                      
                      {/* IVR Required Message */}
                      {!formData.ivr && (
                        <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-800">
                            <span className="font-medium">IVR selection required:</span> Please select an IVR in the configuration above to enable concurrency auto-scaling options.
                          </p>
                        </div>
                      )}

                      {isAdvancedConfigExpanded && formData.ivr && (
                        <div className="px-6 pb-6 border-t border-gray-200 bg-gray-50">
                          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Group Name Selection */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <div className="flex items-center">
                                  Group Name
                                  <div className="relative ml-2 group">
                                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-5 py-4 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 min-w-[320px] max-w-[400px]">
                                      <div className="whitespace-normal leading-relaxed text-left">
                                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                                </div>
                              </label>
                              <div className="relative group-dropdown-container">
                                <button
                                  type="button"
                                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                                  className="w-full form-input text-left flex items-center justify-between"
                                >
                                  <span className={selectedGroup ? 'text-gray-900' : 'text-gray-400'}>
                                    {selectedGroup ? (
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-medium">{selectedGroup.name}</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                          {selectedGroup.agentCount} agents
                                        </span>
                                      </div>
                                    ) : (
                                      'Select group'
                                    )}
                                  </span>
                                  {isGroupDropdownOpen ? (
                                    <ChevronUp className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                                  )}
                                </button>

                                {isGroupDropdownOpen && (
                                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    <button
                                      type="button"
                                      onClick={() => handleGroupSelect('')}
                                      className="w-full px-4 py-3 text-left hover:bg-gray-50 text-gray-500 border-b border-gray-100 transition-colors duration-200"
                                    >
                                      No group selected
                                    </button>
                                    {activeGroups.map((group, index) => {
                                      const isSelected = formData.groupName === group.id;
                                      const isLast = index === activeGroups.length - 1;
                                      const buttonClasses = `w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors duration-200 ${
                                        !isLast ? 'border-b border-gray-100' : ''
                                      } ${
                                        isSelected ? 'bg-blue-50 text-blue-700' : ''
                                      }`;

                                      return (
                                        <button
                                          key={group.id}
                                          type="button"
                                          onClick={() => handleGroupSelect(group.id)}
                                          className={buttonClasses}
                                        >
                                          <div>
                                            <div className="font-medium">{group.name}</div>
                                            <div className="text-xs text-gray-500">
                                              {group.agentCount} agents
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Assign campaign to a specific agent group
                              </p>
                            </div>

                            {/* Concurrent Calls per Online Agent */}
                            <div>
                              <label htmlFor="concurrent-calls-per-agent" className="block text-sm font-medium text-gray-700 mb-2">
                                Concurrent Calls per Online Agent
                              </label>
                              <input
                                id="concurrent-calls-per-agent"
                                type="number"
                                min="1"
                                max="50"
                                value={formData.concurrentCallsPerAgent}
                                onChange={(e) => handleFormDataChange('concurrentCallsPerAgent', parseInt(e.target.value) || 1)}
                                className="form-input h-12"
                                aria-describedby={getError('concurrentCallsPerAgent') ? "concurrent-calls-per-agent-error" : undefined}
                              />
                              {getError('concurrentCallsPerAgent') && (
                                <p id="concurrent-calls-per-agent-error" className="text-red-500 text-sm mt-1">
                                  {getError('concurrentCallsPerAgent')}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Maximum simultaneous calls per online agent
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule Configuration */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <h3 className="text-heading-2 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Schedule Configuration
                  </h3>

                  {/* Campaign Duration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DatePicker
                      value={formData.startDate}
                      onChange={(value) => {
                        handleFormDataChange('startDate', value);
                        if (errors.endDate) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.endDate;
                            return newErrors;
                          });
                        }
                      }}
                      label="Start Date"
                      error={getError('startDate')}
                      helperText="Campaign will begin on this date"
                      required
                      minDate={getTodayDate()}
                    />

                    <DatePicker
                      value={formData.endDate}
                      onChange={(value) => handleFormDataChange('endDate', value)}
                      label="End Date"
                      error={getError('endDate')}
                      helperText="Campaign will end on this date (max 1 year duration)"
                      required
                      minDate={formData.startDate || getTodayDate()}
                      maxDate={formData.startDate ? addOneYear(formData.startDate) : undefined}
                    />
                  </div>

                  {/* Timezone Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="w-4 h-4 inline mr-1" />
                      Timezone
                    </label>
                    <div className="relative timezone-dropdown-container">
                      <button
                        type="button"
                        onClick={() => setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen)}
                        className="w-full form-input text-left flex items-center justify-between"
                      >
                        <span>
                          {TIMEZONES.find(tz => tz.value === selectedTimezone)?.label || selectedTimezone}
                          {currentTimes[selectedTimezone] && (
                            <span className="ml-2 text-gray-500 font-mono">
                              ({currentTimes[selectedTimezone]})
                            </span>
                          )}
                        </span>
                        {isTimezoneDropdownOpen ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isTimezoneDropdownOpen && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {TIMEZONES.map(timezone => {
                            const isSelected = selectedTimezone === timezone.value;
                            const buttonClasses = `w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                              isSelected ? 'bg-blue-50 text-blue-700' : ''
                            }`;

                            return (
                              <button
                                key={timezone.value}
                                type="button"
                                onClick={() => handleTimezoneSelect(timezone.value)}
                                className={buttonClasses}
                              >
                                <span>{timezone.label}</span>
                                <span className="text-gray-500 font-mono text-sm">
                                  {currentTimes[timezone.value]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weekly Schedule with Date Range Validation */}
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Weekly Schedule
                    </label>
                    
                    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                      {/* Date Range Info */}
                      {formData.startDate && formData.endDate && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800">
                              <p className="font-medium mb-1">Weekdays filtered for selected date range</p>
                              <p className="text-blue-700">
                                Campaign runs from{' '}
                                <span className="font-medium">
                                  {new Date(formData.startDate + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                {' '}to{' '}
                                <span className="font-medium">
                                  {new Date(formData.endDate + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                Only weekdays that occur within this range are shown below.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        {WEEKDAYS.map(day => {
                          const isDayInDateRange = formData.startDate && formData.endDate 
                            ? getDaysInDateRange(formData.startDate, formData.endDate).has(day.dayIndex)
                            : true;
                          
                          if (!isDayInDateRange) return null;
                          
                          return (
                            <div key={day.key} className="space-y-2">
                              <div className="flex items-center justify-between">
                                {/* Day name and checkbox */}
                                <div className="flex items-center min-w-[120px]">
                                  <input
                                    type="checkbox"
                                    id={`schedule-${day.key}`}
                                    checked={formData.schedule[day.key].enabled}
                                    onChange={(e) => handleScheduleChange(day.key, 'enabled', e.target.checked)}
                                    className="w-4 h-4 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 text-blue-600 cursor-pointer"
                                  />
                                  <label 
                                    htmlFor={`schedule-${day.key}`} 
                                    className={`ml-3 text-sm font-medium select-none cursor-pointer ${
                                      formData.schedule[day.key].enabled
                                        ? 'text-gray-900'
                                        : 'text-gray-600'
                                    }`}
                                  >
                                    {day.label}
                                  </label>
                                </div>

                                {/* Time range inputs */}
                                <div className="flex items-center space-x-3">
                                  <TimeSlotInput
                                    dayKey={day.key}
                                    type="start"
                                    value={formData.schedule[day.key].startTime}
                                    enabled={formData.schedule[day.key].enabled}
                                    onChange={(value) => handleScheduleChange(day.key, 'startTime', value)}
                                    hasError={!!getError(`schedule-${day.key}`)}
                                  />
                                  
                                  <span className="text-gray-400 text-sm font-medium px-2">to</span>
                                  
                                  <TimeSlotInput
                                    dayKey={day.key}
                                    type="end"
                                    value={formData.schedule[day.key].endTime}
                                    enabled={formData.schedule[day.key].enabled}
                                    onChange={(value) => handleScheduleChange(day.key, 'endTime', value)}
                                    hasError={!!getError(`schedule-${day.key}`)}
                                  />
                                </div>
                              </div>
                              
                              {/* Error message for this specific day */}
                              {getError(`schedule-${day.key}`) && (
                                <p className="text-red-500 text-xs ml-7">{getError(`schedule-${day.key}`)}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Show message when no days are available */}
                      {(() => {
                        const filteredWeekdays = getFilteredWeekdays(formData.startDate, formData.endDate);
                        
                        if (filteredWeekdays.length === 0) {
                          return (
                            <div className="text-center py-4 mt-4 border-t border-gray-200">
                              <div className="flex flex-col items-center space-y-3">
                                <Calendar className="w-12 h-12 text-gray-400" />
                                <div className="text-gray-600">
                                  <p className="font-medium">
                                    {formData.startDate && formData.endDate 
                                      ? 'No weekdays available' 
                                      : 'Select campaign dates'
                                    }
                                  </p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {formData.startDate && formData.endDate 
                                      ? 'The selected date range does not contain any complete weekdays. Please adjust your start and end dates.'
                                      : 'Choose start and end dates above to configure your weekly schedule.'
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}
                    
                    {getError('schedule') && <p className="text-red-500 text-sm">{getError('schedule')}</p>}
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-600">
                        {formData.startDate && formData.endDate ? (
                          'Only weekdays that occur within your selected campaign date range are displayed. You can customize the time slots for each available day.'
                        ) : (
                          'Select campaign start and end dates above to see available weekdays. You can then customize the time slots for each day.'
                        )}
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrevious}
                      className="btn-secondary flex items-center"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  {currentStep < 2 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn-primary flex items-center"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      Create Campaign
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};