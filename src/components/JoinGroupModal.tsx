"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { LoadingSpinner } from "@/shared/components";

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinGroupModal({ isOpen, onClose }: JoinGroupModalProps) {
  const { joinGroup, isLoading } = useGroup();
  const [groupCode, setGroupCode] = useState("");
  const [error, setError] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!groupCode.trim()) {
      setError("Please enter a group code");
      return;
    }

    // Validate format: 6 alphanumeric characters
    if (!/^[A-Z0-9]{6}$/.test(groupCode.toUpperCase())) {
      setError("Group code must be 6 characters (letters and numbers only)");
      return;
    }

    try {
      await joinGroup(groupCode.toUpperCase());
      setGroupCode("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to join group");
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to uppercase and limit to 6 characters
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setGroupCode(value);
    setError("");
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Join a Group"
        aria-labelledby="join-group-modal-title"
        style={{ backgroundColor: "var(--backdrop-modal)" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-bottom">
              <h5
                className="modal-title d-flex align-items-center gap-2"
                id="join-group-modal-title"
              >
                <i
                  className="bi bi-box-arrow-in-right text-primary"
                  aria-hidden="true"
                ></i>
                Join a Group
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isLoading}
                aria-label="Close"
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Enter the 6-character group code to join an existing group.
                  You can find this code in the group settings.
                </p>

                <div className="mb-3">
                  <label htmlFor="groupCode" className="form-label fw-semibold">
                    Group Code <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control form-control-lg text-center fw-bold ${
                      error ? "is-invalid" : ""
                    }`}
                    id="groupCode"
                    ref={codeInputRef}
                    value={groupCode}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    maxLength={6}
                    disabled={isLoading}
                    style={{
                      letterSpacing: "0.3em",
                      fontSize: "1.5rem",
                      fontFamily: "monospace",
                    }}
                  />
                  {error && (
                    <div className="invalid-feedback d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {error}
                    </div>
                  )}
                  <div className="form-text mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    The code is case-insensitive and contains only letters and
                    numbers
                  </div>
                </div>

                <div className="alert alert-info d-flex align-items-start gap-2 mb-0">
                  <i className="bi bi-lightbulb flex-shrink-0 mt-1"></i>
                  <div>
                    <strong>Need help?</strong>
                    <p className="mb-0 small">
                      Ask a group admin to share the group code with you. They
                      can find it in the group settings page.
                    </p>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading || groupCode.length !== 6}
                  aria-label="Join Group"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner
                        config={{
                          size: "small",
                          variant: "light",
                          noContainer: true,
                          showText: false,
                        }}
                      />
                      <span className="ms-2">Joining...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Join Group
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
