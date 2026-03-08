import React from "react";
import { FieldWrapperProps, FormGroupProps } from "./config";

// Field Wrapper Component
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = "",
  labelClassName = "",
  id,
}) => {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const helpId = helperText && !error ? `${fieldId}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`form-label ${labelClassName}`}>
          {label}
          {required && (
            <span
              className="ms-1"
              aria-hidden="true"
              style={{ color: "var(--status-error)" }}
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="position-relative">
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          "aria-describedby": describedBy,
          "aria-invalid": error ? "true" : undefined,
          "aria-required": required ? "true" : undefined,
          className:
            `${(children as React.ReactElement<any>).props.className || ""} ${
              error ? "is-invalid" : ""
            }`.trim(),
        })}

        {error && (
          <div
            id={errorId}
            className="invalid-feedback d-block"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}
      </div>

      {helperText && !error && (
        <div
          id={helpId}
          className="form-text"
          style={{ color: "var(--text-secondary)" }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
};

// Form Group Component
export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  title,
  description,
  className = "",
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const expanded = !isCollapsed;
  const expandedStr: "true" | "false" = expanded ? "true" : "false";

  return (
    <div className={`form-group-wrapper ${className}`}>
      {title && (
        <>
          {collapsible ? (
            <button
              type="button"
              className="form-group-header cursor-pointer"
              onClick={toggleCollapse}
              aria-expanded={expandedStr}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <h6 className="mb-1 d-flex align-items-center">
                {title}
                <i
                  className={`bi ${
                    isCollapsed ? "bi-chevron-right" : "bi-chevron-down"
                  } ms-2`}
                  aria-hidden="true"
                />
              </h6>
              {description && (
                <small style={{ color: "var(--text-secondary)" }}>
                  {description}
                </small>
              )}
            </button>
          ) : (
            <div className="form-group-header">
              <h6 className="mb-1 d-flex align-items-center">{title}</h6>
              {description && (
                <small style={{ color: "var(--text-secondary)" }}>
                  {description}
                </small>
              )}
            </div>
          )}
        </>
      )}

      <div
        className={`form-group-content ${
          collapsible && isCollapsed ? "d-none" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
};
