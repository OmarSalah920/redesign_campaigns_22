import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Phone, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Workflow,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';

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
  automaticConcurrency: boolean;
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
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: -5 },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: -6 },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: -8 },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: 0 },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', offset: 1 },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: 9 },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: 11 }
];

const IVR_OPTIONS = [
  'DefaultIVR1658315753',
  'PhonebotElevenlabs5',
  'PhonebotElevenlabs3',
  'AccountWorkingHours',
  'DefaultClient'
];

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

const GROUP_OPTIONS = [
  'Sales Team',
  'Support Team',
  'Marketing Team',
  'Customer Success',
  'Technical Support'
];

// Helper function to get user's timezone
const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/New_York';
  }
};

// Helper function to get current time in a timezone
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

// Helper function to format time to 12-hour format
const formatTo12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return time24;
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${period}`;
};

// Helper function to convert 12-hour to 24-hour format
const convertTo24Hour = (time12: string): string => {
  if (!time12 || !time12.includes(':')) return time12;
  
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':');
  let hour24 = parseInt(hours, 10);
  
  if (period === 'PM' && hour24 !== 12) {
    hour24 += 12;
  } else if (period === 'AM' && hour24 === 12) {
    hour24 = 0;
  }
  
  return `${hour24.toString().padStart(2, '0')}:${minutes}`;
};

export const NewCampaignModal: React.FC<NewCampaignModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ivr: '',
    phoneNumber: '1', // Default to first phone number
    startDate: '',
    endDate: '',
    schedule: WEEKDAYS.reduce((acc, day) => ({
      ...acc,
      [day.key]: { enabled: true, startTime: '09:00', endTime: '17:00' }
    }), {}),
    timezone: getUserTimezone(),
    maxTries: 1,
    retryInterval: '00:00:00',
    concurrency: 1,
    automaticConcurrency: false,
    groupName: '',
    concurrentCallsPerAgent: 1
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentTimes, setCurrentTimes] = useState<Record<string, string>>({});
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getUserTimezone());
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [isPhoneNumberDropdownOpen, setIsPhoneNumberDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  // Update current times for timezones
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

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFormData({
        name: '',
        ivr: '',
        phoneNumber: '1',
        startDate: '',
        endDate: '',
        schedule: WEEKDAYS.reduce((acc, day) => ({
          ...acc,
          [day.key]: { enabled: true, startTime: '09:00', endTime: '17:00' }
        }), {}),
        timezone: getUserTimezone(),
        maxTries: 1,
        retryInterval: '00:00:00',
        concurrency: 1,
        automaticConcurrency: false,
        groupName: '',
        concurrentCallsPerAgent: 1
      });
      setErrors({});
      setSelectedTimezone(getUserTimezone());
    }
  }, [isOpen]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        newErrors.name = 'Campaign name is required';
      }
    }

    if (step === 2) {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }

      if (!formData.endDate) {
        newErrors.endDate = 'End date is required';
      }

      if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
        newErrors.endDate = 'End date must be after start date';
      }

      const hasEnabledDays = Object.values(formData.schedule).some(day => day.enabled);
      if (!hasEnabledDays) {
        newErrors.schedule = 'At least one day must be selected';
      }

      // Validate time ranges for enabled days
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

    if (step === 3) {
      if (!formData.ivr) {
        newErrors.ivr = 'IVR selection is required';
      }

      if (!formData.phoneNumber) {
        newErrors.phoneNumber = 'Phone number selection is required';
      }

      if (formData.maxTries < 1 || formData.maxTries > 10) {
        newErrors.maxTries = 'Maximum tries must be between 1 and 10';
      }

      // Validate retry interval format (HH:MM:SS)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
      if (!timeRegex.test(formData.retryInterval)) {
        newErrors.retryInterval = 'Invalid time format. Use HH:MM:SS (00:00:00 to 23:59:59)';
      }

      if (!formData.automaticConcurrency) {
        if (formData.concurrency < 1 || formData.concurrency > 100) {
          newErrors.concurrency = 'Concurrency must be between 1 and 100';
        }
      } else {
        if (!formData.groupName) {
          newErrors.groupName = 'Group name is required when automatic concurrency is enabled';
        }
        if (formData.concurrentCallsPerAgent < 1 || formData.concurrentCallsPerAgent > 10) {
          newErrors.concurrentCallsPerAgent = 'Concurrent calls per agent must be between 1 and 10';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
      onSubmit(formData);
      onClose();
    }
  };

  const handleScheduleChange = (dayKey: string, field: keyof ScheduleDay, value: boolean | string) => {
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
    
    // Clear any existing error for this day when making changes
    if (errors[`schedule-${dayKey}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`schedule-${dayKey}`];
        return newErrors;
      });
    }
  };

  const handleTimezoneSelect = (timezone: string) => {
    setSelectedTimezone(timezone);
    setFormData(prev => ({ ...prev, timezone }));
    setIsTimezoneDropdownOpen(false);
  };

  const handlePhoneNumberSelect = (phoneNumberId: string) => {
    setFormData(prev => ({ ...prev, phoneNumber: phoneNumberId }));
    setIsPhoneNumberDropdownOpen(false);
  };

  const handleGroupSelect = (groupName: string) => {
    setFormData(prev => ({ ...prev, groupName }));
    setIsGroupDropdownOpen(false);
  };

  // Get selected phone number
  const selectedPhoneNumber = PHONE_NUMBERS.find(phone => phone.id === formData.phoneNumber);

  // Close dropdowns when clicking outside
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

  // Enhanced Time Input Component
  const TimeSlotInput: React.FC<{
    dayKey: string;
    type: 'start' | 'end';
    value: string;
    enabled: boolean;
    onChange: (value: string) => void;
  }> = ({ dayKey, type, value, enabled, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const handleTimeChange = (newTime: string) => {
      const time24 = convertTo24Hour(newTime);
      onChange(time24);
      setIsOpen(false);
    };

    const commonTimes = [
      '12:00 AM', '1:00 AM', '2:00 AM', '3:00 AM', '4:00 AM', '5:00 AM',
      '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
      '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
      '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
    ];

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => enabled && setIsOpen(!isOpen)}
          disabled={!enabled}
          className={`
            w-36 px-4 py-3 text-sm border rounded-lg transition-all duration-200 text-left
            ${enabled 
              ? 'border-gray-300 bg-white text-gray-900 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 cursor-pointer' 
              : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
            }
            ${errors[`schedule-${dayKey}`] ? 'border-red-300' : ''}
          `}
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
                {commonTimes.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeChange(time)}
                    className={`
                      w-full px-3 py-2 text-left text-sm rounded hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200
                      ${formatTo12Hour(value) === time ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}
                    `}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tooltip component for disabled toggle
  const DisabledToggleTooltip: React.FC<{
    children: React.ReactNode;
    message: string;
  }> = ({ children, message }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
      setIsVisible(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 8
      });
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    return (
      <>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative"
        >
          {children}
        </div>
        {isVisible && (
          <div
            ref={tooltipRef}
            className="fixed z-[9999] px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap transform -translate-x-1/2 -translate-y-full"
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            {message}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-heading-3 mb-6">Campaign Details</h3>
              
              <div>
                <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Name
                </label>
                <input
                  id="campaign-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="Enter campaign name"
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && <p id="name-error" className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-heading-3 flex items-center mb-6">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Schedule Configuration
              </h3>

              {/* Campaign Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <DatePicker
                  value={formData.startDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
                  label="Start Date"
                  error={errors.startDate}
                  required
                  minDate={new Date().toISOString().split('T')[0]}
                />

                <DatePicker
                  value={formData.endDate}
                  onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
                  label="End Date"
                  error={errors.endDate}
                  required
                  minDate={formData.startDate || new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Timezone Selection */}
              <div className="mb-8">
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
                      {TIMEZONES.map(timezone => (
                        <button
                          key={timezone.value}
                          type="button"
                          onClick={() => handleTimezoneSelect(timezone.value)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                            selectedTimezone === timezone.value ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <span>{timezone.label}</span>
                          <span className="text-gray-500 font-mono text-sm">
                            {currentTimes[timezone.value]}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Schedule */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Weekly Schedule
                </label>
                
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <div className="space-y-4">
                    {WEEKDAYS.map(day => (
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
                            />
                            
                            <span className="text-gray-400 text-sm font-medium px-2">to</span>
                            
                            <TimeSlotInput
                              dayKey={day.key}
                              type="end"
                              value={formData.schedule[day.key].endTime}
                              enabled={formData.schedule[day.key].enabled}
                              onChange={(value) => handleScheduleChange(day.key, 'endTime', value)}
                            />
                          </div>
                        </div>
                        
                        {/* Error message for this specific day */}
                        {errors[`schedule-${day.key}`] && (
                          <p className="text-red-500 text-xs ml-7">{errors[`schedule-${day.key}`]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {errors.schedule && <p className="text-red-500 text-sm">{errors.schedule}</p>}
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600">
                    Customize the time slots for each day when the campaign should be active.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div>
              <h3 className="text-heading-3 flex items-center mb-6">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Campaign Info & Configurations
              </h3>

              {/* Phone Number Selection */}
              <div className="mb-6">
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
                      errors.phoneNumber ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                    aria-describedby={errors.phoneNumber ? "phone-number-error" : undefined}
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
                      {PHONE_NUMBERS.map((phone, index) => (
                        <button
                          key={phone.id}
                          type="button"
                          onClick={() => handlePhoneNumberSelect(phone.id)}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between transition-colors duration-200 ${
                            index !== PHONE_NUMBERS.length - 1 ? 'border-b border-gray-100' : ''
                          } ${
                            formData.phoneNumber === phone.id ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="text-lg mr-3">{phone.flag}</span>
                            <span className="font-medium">{phone.formatted}</span>
                          </div>
                          {formData.phoneNumber === phone.id && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.phoneNumber && <p id="phone-number-error" className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  This number will be displayed to call recipients as the caller ID
                </p>
              </div>

              {/* IVR Selection */}
              <div className="mb-6">
                <label htmlFor="ivr-select" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center">
                    <Workflow className="w-4 h-4 mr-1" />
                    IVR
                  </div>
                </label>
                <select
                  id="ivr-select"
                  value={formData.ivr}
                  onChange={(e) => setFormData(prev => ({ ...prev, ivr: e.target.value }))}
                  className="form-select h-12"
                  aria-describedby={errors.ivr ? "ivr-error" : undefined}
                >
                  <option value="">Select IVR</option>
                  {IVR_OPTIONS.map(ivr => (
                    <option key={ivr} value={ivr}>{ivr}</option>
                  ))}
                </select>
                {errors.ivr && <p id="ivr-error" className="text-red-500 text-sm mt-1">{errors.ivr}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  Interactive Voice Response system for call handling
                </p>
              </div>

              {/* Advanced Concurrency Settings */}
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-gray-900 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  Advanced Concurrency Settings
                </h4>

                {/* Understanding Automatic Concurrency Information Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="font-medium text-blue-900 mb-2">Understanding Automatic Concurrency</h5>
                      <div className="text-sm text-blue-800 space-y-3">
                        <p>
                          This feature automatically adjusts your campaign's concurrent outbound calls based on real-time agent availability. The system calculates concurrent calls using this formula:
                        </p>
                        
                        <div className="bg-blue-100 border border-blue-300 rounded-md p-3 font-mono text-center">
                          <strong>Total Concurrent Calls = Number of Online Agents × Concurrent Calls per Online Agent</strong>
                        </div>
                        
                        <div>
                          <p className="font-medium mb-2">For example:</p>
                          <ul className="space-y-1 ml-4">
                            <li>• If 5 agents are online and you set 3 concurrent calls per agent:</li>
                            <li className="ml-4 text-blue-700">5 agents × 3 calls = 15 total concurrent calls</li>
                            <li>• If agent availability changes to 3 agents:</li>
                            <li className="ml-4 text-blue-700">3 agents × 3 calls = 9 total concurrent calls</li>
                          </ul>
                        </div>
                        
                        <p className="text-xs">
                          <strong>Note:</strong> The system dynamically updates concurrent calls as agents are online, offline, or away, ensuring optimal call distribution and preventing queue overload.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automatic Concurrency Settings (optional) */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h5 className="text-base font-medium text-gray-900">Automatic Concurrency Settings (optional)</h5>
                      <p className="text-sm text-gray-600 mt-1">
                        Enable automatic concurrency based on agent availability
                      </p>
                    </div>
                    
                    {/* Toggle with conditional tooltip */}
                    {!formData.ivr ? (
                      <DisabledToggleTooltip message="Please select an IVR first to enable automatic concurrency">
                        <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-not-allowed opacity-50">
                          <span className="inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform translate-x-1" />
                        </div>
                      </DisabledToggleTooltip>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, automaticConcurrency: !prev.automaticConcurrency }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          formData.automaticConcurrency ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
                            formData.automaticConcurrency ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {formData.automaticConcurrency && formData.ivr && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      {/* Group Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            Group Name
                            <div className="relative ml-2 group">
                              <Info className="w-4 h-4 text-gray-400 cursor-help" />
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                                Select the agent group for which the outbound concurrency will be automatically calculated based on the number of its online agents.
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        </label>
                        <div className="relative group-dropdown-container">
                          <button
                            type="button"
                            onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                            className={`w-full form-input text-left flex items-center justify-between ${
                              errors.groupName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
                            }`}
                            aria-describedby={errors.groupName ? "group-name-error" : undefined}
                          >
                            <span className={formData.groupName ? 'text-gray-900' : 'text-gray-400'}>
                              {formData.groupName || 'Select group'}
                            </span>
                            {isGroupDropdownOpen ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {isGroupDropdownOpen && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {GROUP_OPTIONS.map((group, index) => (
                                <button
                                  key={group}
                                  type="button"
                                  onClick={() => handleGroupSelect(group)}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 ${
                                    index !== GROUP_OPTIONS.length - 1 ? 'border-b border-gray-100' : ''
                                  } ${
                                    formData.groupName === group ? 'bg-blue-50 text-blue-700' : ''
                                  }`}
                                >
                                  {group}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {errors.groupName && <p id="group-name-error" className="text-red-500 text-sm mt-1">{errors.groupName}</p>}
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
                          max="10"
                          value={formData.concurrentCallsPerAgent}
                          onChange={(e) => setFormData(prev => ({ ...prev, concurrentCallsPerAgent: parseInt(e.target.value) || 1 }))}
                          className="form-input h-12"
                          aria-describedby={errors.concurrentCallsPerAgent ? "concurrent-calls-per-agent-error" : undefined}
                        />
                        {errors.concurrentCallsPerAgent && <p id="concurrent-calls-per-agent-error" className="text-red-500 text-sm mt-1">{errors.concurrentCallsPerAgent}</p>}
                        <p className="text-xs text-gray-500 mt-1">
                          Number of concurrent calls each online agent can handle
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Manual Concurrency (when automatic is disabled) */}
                {!formData.automaticConcurrency && (
                  <div>
                    <label htmlFor="concurrency" className="block text-sm font-medium text-gray-700 mb-2">
                      Manual Concurrency
                    </label>
                    <input
                      id="concurrency"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.concurrency}
                      onChange={(e) => setFormData(prev => ({ ...prev, concurrency: parseInt(e.target.value) || 1 }))}
                      className="form-input h-12"
                      aria-describedby={errors.concurrency ? "concurrency-error" : undefined}
                    />
                    {errors.concurrency && <p id="concurrency-error" className="text-red-500 text-sm mt-1">{errors.concurrency}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Fixed number of simultaneous calls
                    </p>
                  </div>
                )}
              </div>

              {/* Other Configuration Fields */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTries: parseInt(e.target.value) || 1 }))}
                    className="form-input h-12"
                    aria-describedby={errors.maxTries ? "max-tries-error" : undefined}
                  />
                  {errors.maxTries && <p id="max-tries-error" className="text-red-500 text-sm mt-1">{errors.maxTries}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Number of call attempts per contact
                  </p>
                </div>

                {/* Retry Interval with Time Picker */}
                <div>
                  <TimePicker
                    value={formData.retryInterval}
                    onChange={(value) => setFormData(prev => ({ ...prev, retryInterval: value }))}
                    label="Retry Interval"
                    error={errors.retryInterval}
                    helperText="Time to wait between retry attempts"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return 'Campaign Details';
      case 2:
        return 'Schedule Configuration';
      case 3:
        return 'Campaign Info & Configurations';
      default:
        return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-heading-2">Create New Campaign</h2>
            <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 3: {getStepTitle()}</p>
          </div>
          <button
            onClick={onClose}
            className="icon-button"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-1 mx-2 transition-colors duration-200 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="p-6">
            {renderStepContent()}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                className="btn-primary"
              >
                Create Campaign
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};