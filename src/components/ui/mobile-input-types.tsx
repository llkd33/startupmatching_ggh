'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { TouchInput } from './mobile-optimized-form';

// Email input with proper keyboard
export const EmailInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={cn('lowercase', className)}
        {...props}
      />
    );
  }
);
EmailInput.displayName = 'EmailInput';

// Phone input with numeric keyboard
export const PhoneInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        pattern="[0-9]{3}-[0-9]{4}-[0-9]{4}"
        placeholder="010-1234-5678"
        className={className}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

// Number input with numeric keyboard
export const NumberInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        className={className}
        {...props}
      />
    );
  }
);
NumberInput.displayName = 'NumberInput';

// URL input with URL keyboard
export const URLInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="url"
        inputMode="url"
        autoComplete="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://example.com"
        className={cn('lowercase', className)}
        {...props}
      />
    );
  }
);
URLInput.displayName = 'URLInput';

// Search input with search keyboard
export const SearchInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        className={className}
        {...props}
      />
    );
  }
);
SearchInput.displayName = 'SearchInput';

// Date input with date picker
export const DateInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="date"
        className={className}
        {...props}
      />
    );
  }
);
DateInput.displayName = 'DateInput';

// Time input with time picker
export const TimeInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="time"
        className={className}
        {...props}
      />
    );
  }
);
TimeInput.displayName = 'TimeInput';

// Password input with proper security
export const PasswordInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="relative">
        <TouchInput
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          className={className}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
          aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
        >
          {showPassword ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

// Decimal input for prices/amounts
export const DecimalInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        pattern="[0-9]*[.,]?[0-9]*"
        className={className}
        {...props}
      />
    );
  }
);
DecimalInput.displayName = 'DecimalInput';

// Credit card input
export const CreditCardInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    const formatCreditCard = (value: string) => {
      const cleaned = value.replace(/\s+/g, '');
      const chunks = cleaned.match(/.{1,4}/g) || [];
      return chunks.join(' ');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCreditCard(e.target.value.replace(/\D/g, ''));
      e.target.value = formatted;
      props.onChange?.(e);
    };

    return (
      <TouchInput
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9\s]*"
        maxLength={19}
        placeholder="1234 5678 9012 3456"
        autoComplete="cc-number"
        onChange={handleChange}
        className={className}
        {...props}
      />
    );
  }
);
CreditCardInput.displayName = 'CreditCardInput';

// Postal code input (Korean)
export const PostalCodeInput = forwardRef<HTMLInputElement, React.ComponentProps<typeof TouchInput>>(
  ({ className, ...props }, ref) => {
    return (
      <TouchInput
        ref={ref}
        type="text"
        inputMode="numeric"
        pattern="[0-9]{5}"
        maxLength={5}
        placeholder="12345"
        autoComplete="postal-code"
        className={className}
        {...props}
      />
    );
  }
);
PostalCodeInput.displayName = 'PostalCodeInput';

// OTP/Verification code input
interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function OTPInput({ length = 6, value = '', onChange, className }: OTPInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const values = value.split('').concat(Array(length - value.length).fill(''));

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Handle paste
      const pastedValues = val.slice(0, length);
      onChange?.(pastedValues);
      const lastIndex = Math.min(pastedValues.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const newValues = [...values];
    newValues[index] = val;
    onChange?.(newValues.join('').slice(0, length));

    // Move to next input
    if (val && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={values[index]}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-12 text-center text-lg font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={`인증 코드 ${index + 1}번째 자리`}
        />
      ))}
    </div>
  );
}