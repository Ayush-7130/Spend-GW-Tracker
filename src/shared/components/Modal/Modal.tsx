"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { ModalProps, defaultModalConfig, modalSizeClasses } from "./config";

export default function Modal({
  show,
  onClose,
  title,
  children,
  footer,
  loading = false,
  size = defaultModalConfig.size,
  centered = defaultModalConfig.centered,
  scrollable = defaultModalConfig.scrollable,
  backdrop = defaultModalConfig.backdrop,
  keyboard = defaultModalConfig.keyboard,
  fade = defaultModalConfig.fade,
  className = "",
  headerClassName = "",
  bodyClassName = "",
  footerClassName = "",
  closeButton = true,
  onBackdropClick,
  titleId = "modal-title",
}: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!show || !keyboard) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [show, keyboard, onClose]);

  // Handle backdrop click via document listener
  const handleBackdropMouseDown = useCallback(
    (e: MouseEvent) => {
      if (backdropRef.current && e.target === backdropRef.current) {
        if (onBackdropClick) {
          onBackdropClick();
        } else if (backdrop === true) {
          onClose();
        }
      }
    },
    [onBackdropClick, backdrop, onClose]
  );

  useEffect(() => {
    if (!show) return;
    document.addEventListener("mousedown", handleBackdropMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleBackdropMouseDown);
  }, [show, handleBackdropMouseDown]);

  if (!show) return null;

  const modalClasses = [
    "modal",
    fade ? "fade" : "",
    show ? "show" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const dialogClasses = [
    "modal-dialog",
    size ? modalSizeClasses[size] : "",
    centered ? "modal-dialog-centered" : "",
    scrollable ? "modal-dialog-scrollable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={modalClasses}
        style={{
          display: "block",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          zIndex: 1055,
          overflowX: "hidden",
          overflowY: "auto",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={dialogClasses}>
          <div className="modal-content">
            {/* Header */}
            <div className={`modal-header ${headerClassName}`}>
              <h5 className="modal-title" id={titleId}>
                {title}
              </h5>
              {closeButton && (
                <button
                  type="button"
                  className="btn-close"
                  onClick={onClose}
                  disabled={loading}
                  aria-label="Close"
                />
              )}
            </div>

            {/* Body */}
            <div className={`modal-body ${bodyClassName}`}>{children}</div>

            {/* Footer */}
            {footer && (
              <div className={`modal-footer ${footerClassName}`}>{footer}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
