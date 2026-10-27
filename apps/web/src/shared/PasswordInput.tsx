import { useState, InputHTMLAttributes, forwardRef } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (v: string) => void;
};

export const PasswordInput = forwardRef<HTMLInputElement, Props>(function PasswordInput(
  { value, onValueChange, className, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={`input pr-11 ${className ?? ''}`}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1.5 text-base leading-none theme-muted theme-hover rounded"
        aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
        tabIndex={0}
      >
        {show ? '👁' : '🙈'}
      </button>
    </div>
  );
});
