import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, CheckCircle } from 'lucide-react';

interface AddressSuggestion {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
  placeholder?: string;
  disabled?: boolean;
  dataTestId?: string;
  className?: string;
}

export function AddressAutocompleteInput({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  disabled = false,
  dataTestId,
  className = ""
}: AddressAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch address suggestions
  const fetchSuggestions = async (input: string) => {
    if (input.length < 4) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/address-autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuggestions(result.suggestions || []);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Address suggestions error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate and select address
  const validateAndSelectAddress = async (suggestion: AddressSuggestion) => {
    try {
      const response = await fetch('/api/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: suggestion.description }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.isValid) {
          setValidationStatus('valid');
          onChange(result.streetAddress || suggestion.description.split(',')[0].trim());
          
          // Call the callback with full address data
          if (onAddressSelect) {
            onAddressSelect({
              street: result.streetAddress || suggestion.description.split(',')[0].trim(),
              city: result.city || '',
              state: result.state || '',
              zipCode: result.zipCode || ''
            });
          }
          
          setShowSuggestions(false);
          setSuggestions([]);
        } else {
          setValidationStatus('invalid');
        }
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setValidationStatus('invalid');
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setValidationStatus('idle');
    
    if (newValue && newValue.length >= 4) {
      fetchSuggestions(newValue);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0 && selectedIndex >= 0) {
        validateAndSelectAddress(suggestions[selectedIndex]);
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          data-testid={dataTestId}
          className={`pr-8 ${
            validationStatus === 'valid'
              ? 'border-green-500 bg-green-50'
              : validationStatus === 'invalid'
              ? 'border-red-500'
              : ''
          } ${className}`}
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
        {validationStatus === 'valid' && (
          <CheckCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
        )}
        {validationStatus === 'invalid' && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 bg-red-500 rounded-full" />
        )}
      </div>

      {/* Address suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
              onClick={() => validateAndSelectAddress(suggestion)}
            >
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="font-medium text-sm">
                    {suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0]}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
                    <div className="text-xs text-gray-500">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
