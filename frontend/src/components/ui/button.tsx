import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  loading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-[#089981] text-white border border-[#089981] hover:bg-[#078772] shadow-xs",
  outline: "bg-white text-[#131722] border border-[#d1d4dc] hover:bg-[#f0f3fa] hover:border-[#b2b5be] shadow-xs",
  secondary: "bg-[#f0f3fa] text-[#131722] border border-[#e0e3eb] hover:bg-[#e0e3eb]",
  destructive: "bg-[#f23645] text-white border border-[#f23645] hover:bg-[#d82a38] shadow-xs",
  ghost: "bg-transparent text-[#787b86] hover:bg-[#f0f3fa] hover:text-[#131722]",
  link: "bg-transparent text-[#2962ff] underline-offset-4 hover:underline p-0 h-auto",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 py-2 text-sm",
  xs: "h-6 px-2 text-xs rounded",
  sm: "h-8 px-3 text-xs rounded-md",
  lg: "h-10 px-6 text-base rounded-md",
  icon: "size-9 p-0",
  "icon-xs": "size-6 p-0",
  "icon-sm": "size-8 p-0",
  "icon-lg": "size-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      loading = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    const baseStyle =
      "inline-flex items-center justify-center gap-1.5 font-medium rounded-md cursor-pointer select-none transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2962ff]";

    return (
      <button
        ref={ref}
        type={type}
        data-slot="button"
        disabled={disabled || loading}
        className={`${baseStyle} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim()}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-0.5 mr-1.5 size-3.5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

