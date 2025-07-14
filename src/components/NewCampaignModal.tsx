Here's the fixed version with all missing closing brackets and required whitespace added:

[Previous code remains the same until the changes...]

```javascript
    // When toggling ON: enable advanced concurrency and set concurrency to 0
    if (newExpanded) {
      setIsAdvancedConcurrencyEnabled(true);
      handleFormDataChange('concurrency', 0);
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
    // Set concurrency to 0 when advanced settings are ON
    if (formData.concurrency !== 0) {
      handleFormDataChange('concurrency', 0);
    }
  }
}, [isAdvancedConcurrencyEnabled, isAdvancedConfigExpanded, formData.concurrency, handleFormDataChange]);

// Effect to update available weekdays based on date range
useEffect(() => {
  // Always show all weekdays regardless of date range
  setAvailableWeekdays(WEEKDAYS);
}, [formData.startDate, formData.endDate]);

[Rest of the code remains the same until...]

                        return null;
                      })()}
                      
                      <div className="text-sm text-gray-600 mt-6">
                        <p className="font-medium mb-1">Weekly Schedule Configuration</p>
                        <p>
                          Select the days and times when your campaign should be active. 
                          The campaign will only make calls during the specified time slots.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              [Rest of the component remains the same...]
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
```