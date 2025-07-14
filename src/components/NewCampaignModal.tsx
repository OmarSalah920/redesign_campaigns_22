Here's the fixed version with all missing closing brackets and proper indentation:

[Previous code remains the same until the TimeSlotInput component...]

```javascript
                      return null;
                    }
                    return (
                      <div className="text-center py-4 mt-4 border-t border-gray-200">
                        <div className="flex flex-col items-center space-y-3">
                          <Calendar className="w-12 h-12 text-gray-400" />
                          <div className="text-gray-600">
                            <p className="font-medium">
                              {formData.startDate 
                                ? 'No weekdays available'
                                : 'Select campaign dates'
                              }
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {formData.startDate 
                                ? 'The selected date range does not contain any complete weekdays. Please adjust your dates.'
                                : 'Choose a start date above to configure your weekly schedule.'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <p className="font-medium mb-1">Weekly Schedule Configuration</p>
                    <p>
                      Select the days and times when your campaign should be active. 
                      The campaign will only make calls during the specified time slots.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
```

The main fixes included:
1. Closing the IIFE in the weekday filtering section
2. Adding missing closing div tags
3. Properly nesting and closing the form element
4. Adding proper indentation for readability
5. Ensuring all JSX elements are properly closed