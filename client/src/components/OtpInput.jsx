import { useEffect, useRef } from 'react';

const LENGTH = 6;

export default function OtpInput({ value, onChange, onComplete, disabled }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || '');

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function update(next) {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH);
    onChange(clean);
    if (clean.length === LENGTH) onComplete?.(clean);
    return clean;
  }

  function handleChange(index, event) {
    const typed = event.target.value.replace(/\D/g, '');
    if (!typed) return;
    // Supports typing one digit or the browser autofilling several at once
    const next = (value.slice(0, index) + typed).slice(0, LENGTH);
    const clean = update(next);
    inputs.current[Math.min(clean.length, LENGTH - 1)]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const target = digits[index] ? index : Math.max(index - 1, 0);
      update(value.slice(0, target));
      inputs.current[target]?.focus();
    } else if (event.key === 'ArrowLeft' && index > 0) {
      inputs.current[index - 1]?.focus();
    } else if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const clean = update(event.clipboardData.getData('text'));
    inputs.current[Math.min(clean.length, LENGTH - 1)]?.focus();
  }

  return (
    <div className="otp-inputs" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className={`otp-box ${digit ? 'filled' : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? LENGTH : 1}
          value={digit}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
