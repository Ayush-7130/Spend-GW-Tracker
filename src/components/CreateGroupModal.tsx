"use client";

import React, { useState, useRef, useEffect } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { LoadingSpinner } from "@/shared/components";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { createGroup, isLoading } = useGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Group name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Group name must be at least 3 characters";
    } else if (name.trim().length > 50) {
      newErrors.name = "Group name must be less than 50 characters";
    }

    if (description.trim().length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createGroup(name.trim(), description.trim() || undefined);
      setName("");
      setDescription("");
      setErrors({});
      onClose();
    } catch (err: any) {
      setErrors({ name: err.message || "Failed to create group" });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setDescription(e.target.value);
    if (errors.description) {
      setErrors({ ...errors, description: undefined });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Create New Group"
        aria-labelledby="create-group-modal-title"
        style={{ backgroundColor: "var(--backdrop-modal)" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-bottom">
              <h5
                className="modal-title d-flex align-items-center gap-2"
                id="create-group-modal-title"
              >
                <i
                  className="bi bi-plus-circle text-primary"
                  aria-hidden="true"
                ></i>
                Create New Group
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
                <p className="text-muted mb-4">
                  Create a new group to track expenses with your family,
                  friends, or colleagues. You&apos;ll be the admin of this
                  group.
                </p>

                <div className="mb-3">
                  <label htmlFor="groupName" className="form-label fw-semibold">
                    Group Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                    id="groupName"
                    ref={nameInputRef}
                    value={name}
                    onChange={handleNameChange}
                    placeholder="e.g., Family Budget, Roommates, Work Team"
                    maxLength={50}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <div className="invalid-feedback d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {errors.name}
                    </div>
                  )}
                  <div className="form-text">{name.length}/50 characters</div>
                </div>

                <div className="mb-3">
                  <label
                    htmlFor="groupDescription"
                    className="form-label fw-semibold"
                  >
                    Description{" "}
                    <span className="text-muted small">(optional)</span>
                  </label>
                  <textarea
                    className={`form-control ${errors.description ? "is-invalid" : ""}`}
                    id="groupDescription"
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="Brief description of this group's purpose..."
                    rows={3}
                    maxLength={200}
                    disabled={isLoading}
                  />
                  {errors.description && (
                    <div className="invalid-feedback d-block">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {errors.description}
                    </div>
                  )}
                  <div className="form-text">
                    {description.length}/200 characters
                  </div>
                </div>

                <div className="alert alert-success d-flex align-items-start gap-2 mb-0">
                  <i className="bi bi-check-circle flex-shrink-0 mt-1"></i>
                  <div>
                    <strong>After creation:</strong>
                    <p className="mb-0 small">
                      You&apos;ll get a unique 6-character group code to share
                      with others. You can invite members anytime from the group
                      settings.
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
                  disabled={isLoading || !name.trim()}
                  aria-label="Create Group"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner
                        config={{ size: "small", variant: "light" }}
                      />
                      <span className="ms-2">Creating...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Group
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
