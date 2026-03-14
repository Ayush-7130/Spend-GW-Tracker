"use client";

import React, { useState } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { LoadingSpinner } from "@/shared/components";

interface GroupSettingsProps {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  groupCode: string;
  requireApproval?: boolean;
  isAdmin?: boolean;
}

export function GroupSettings({
  groupId,
  groupName: initialName,
  groupDescription: initialDescription,
  groupCode,
  requireApproval: initialRequireApproval,
  isAdmin = false,
}: GroupSettingsProps) {
  const { updateGroup, isLoading } = useGroup();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [requireApproval, setRequireApproval] = useState(
    initialRequireApproval ?? true
  );
  const [errors, setErrors] = useState<{ name?: string; description?: string }>(
    {}
  );
  const [codeCopied, setCodeCopied] = useState(false);

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

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateGroup(groupId, {
        name: name.trim(),
        description: description.trim() || undefined,
        settings: {
          requireApproval,
        },
      } as any);
      setIsEditing(false);
      setErrors({});
    } catch (err: any) {
      setErrors({ name: err.message || "Failed to update group" });
    }
  };

  const handleCancel = () => {
    setName(initialName);
    setDescription(initialDescription || "");
    setRequireApproval(initialRequireApproval ?? true);
    setErrors({});
    setIsEditing(false);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(groupCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard API failed - user can copy manually
    }
  };

  return (
    <div className="card">
      <div className="card-header border-bottom">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-gear-fill text-primary"></i>
            Group Settings
          </h5>
          {!isEditing && isAdmin && (
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => setIsEditing(true)}
            >
              <i className="bi bi-pencil me-1"></i>
              Edit
            </button>
          )}
        </div>
      </div>
      <div className="card-body">
        {/* Group Code */}
        <div className="mb-4">
          <label htmlFor="group-code-input" className="form-label fw-semibold">
            Group Code
          </label>
          <div className="input-group">
            <input
              id="group-code-input"
              type="text"
              className="form-control text-center fw-bold"
              value={groupCode}
              readOnly
              aria-label="Group code"
              style={{
                letterSpacing: "0.2em",
                fontSize: "clamp(0.9rem, 4vw, 1.25rem)",
                fontFamily: "monospace",
              }}
            />
            <button
              className="btn btn-outline-secondary"
              onClick={handleCopyCode}
              title="Copy to clipboard"
              aria-label={
                codeCopied
                  ? "Group code copied"
                  : "Copy group code to clipboard"
              }
            >
              <i
                className={`bi ${codeCopied ? "bi-check-lg" : "bi-clipboard"}`}
                aria-hidden="true"
              ></i>
            </button>
          </div>
          <div className="form-text">
            <i className="bi bi-info-circle me-1"></i>
            Share this code with others to invite them to your group
          </div>
        </div>

        {/* Group Name */}
        <div className="mb-3">
          <label htmlFor="groupName" className="form-label fw-semibold">
            Group Name
          </label>
          {isEditing ? (
            <>
              <input
                type="text"
                className={`form-control ${errors.name ? "is-invalid" : ""}`}
                id="groupName"
                value={name}
                aria-label="Group Name"
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: undefined });
                }}
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
            </>
          ) : (
            <p className="form-control-plaintext fw-medium">{name}</p>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <label htmlFor="groupDescription" className="form-label fw-semibold">
            Description
          </label>
          {isEditing ? (
            <>
              <textarea
                className={`form-control ${errors.description ? "is-invalid" : ""}`}
                id="groupDescription"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description)
                    setErrors({ ...errors, description: undefined });
                }}
                rows={3}
                maxLength={200}
                disabled={isLoading}
                placeholder="Brief description of this group's purpose..."
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
            </>
          ) : (
            <p className="form-control-plaintext">
              {description || (
                <span className="text-muted fst-italic">No description</span>
              )}
            </p>
          )}
        </div>

        {/* Settings */}
        <div className="border-top pt-4">
          <h6 className="fw-semibold mb-3">Permissions</h6>

          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="requireApproval"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              disabled={!isEditing || isLoading}
            />
            <label className="form-check-label" htmlFor="requireApproval">
              Require admin approval for new members
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="d-flex gap-2 mt-4 pt-3 border-top">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isLoading}
              aria-label="Save Changes"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner
                    config={{ size: "small", variant: "light" }}
                  />
                  <span className="ms-2">Saving...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
