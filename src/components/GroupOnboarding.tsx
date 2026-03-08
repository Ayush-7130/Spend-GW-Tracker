"use client";

import { useState, useEffect } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Modal, InputField } from "@/shared/components";

export default function GroupOnboarding() {
  const {
    groups,
    isLoading: groupsLoading,
    createGroup,
    joinGroup,
  } = useGroup();
  const { isAuthenticated, user } = useAuth();
  const { showSuccess } = useNotification();
  const [showModal, setShowModal] = useState(false);
  const [groupAction, setGroupAction] = useState<"create" | "join" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupData, setGroupData] = useState({
    groupName: "",
    groupDescription: "",
    joinCode: "",
  });
  const [groupErrors, setGroupErrors] = useState<{ [key: string]: string }>({});
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    // Only show modal if:
    // 1. User is authenticated
    // 2. Groups have finished loading
    // 3. User has no groups
    // 4. Initial check not done yet (prevents flash on refresh)
    if (isAuthenticated && !groupsLoading && user && !initialCheckDone) {
      setInitialCheckDone(true);
      if (groups.length === 0) {
        setShowModal(true);
      }
    }

    // Auto-close if groups are added
    if (groups.length > 0 && showModal) {
      setShowModal(false);
    }
  }, [
    isAuthenticated,
    groupsLoading,
    groups.length,
    user,
    initialCheckDone,
    showModal,
  ]);

  const handleGroupAction = async () => {
    if (!groupAction) return;

    const newGroupErrors: { [key: string]: string } = {};

    if (groupAction === "create") {
      if (!groupData.groupName.trim()) {
        newGroupErrors.groupName = "Group name is required";
      } else if (groupData.groupName.length < 2) {
        newGroupErrors.groupName = "Group name must be at least 2 characters";
      } else if (groupData.groupName.length > 100) {
        newGroupErrors.groupName = "Group name must not exceed 100 characters";
      }

      if (
        groupData.groupDescription &&
        groupData.groupDescription.length > 500
      ) {
        newGroupErrors.groupDescription =
          "Description must not exceed 500 characters";
      }
    } else if (groupAction === "join") {
      if (!groupData.joinCode.trim()) {
        newGroupErrors.joinCode = "Group code is required";
      }
    }

    setGroupErrors(newGroupErrors);
    if (Object.keys(newGroupErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (groupAction === "create") {
        // Use context method instead of direct API call
        await createGroup(
          groupData.groupName.trim(),
          groupData.groupDescription.trim() || undefined
        );

        // Success! Close the modal
        setShowModal(false);
        // No need to reload - GroupContext handles the refresh
      } else if (groupAction === "join") {
        // Use context method instead of direct API call
        await joinGroup(groupData.joinCode.trim());

        // Success! Close the modal
        setShowModal(false);
        // No need to reload - GroupContext handles the refresh
      }
    } catch {
      // Error is already shown by the context via notification
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    showSuccess("You can create or join a group anytime from your profile.");
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <Modal
      show={showModal}
      onClose={() => {}}
      title="Welcome! Let's Set Up Your Group"
      size="md"
      closeButton={false}
      backdrop="static"
    >
      <div className="modal-body">
        {!groupAction ? (
          <>
            <p className="text-muted mb-4">
              <i className="bi bi-info-circle me-2"></i>
              Spend Tracker works best with groups. Choose how you&apos;d like
              to get started:
            </p>
            <div className="d-grid gap-3">
              <button
                className="btn btn-outline-primary btn-lg text-start d-flex align-items-center gap-3 p-3"
                onClick={() => setGroupAction("create")}
              >
                <i className="bi bi-plus-circle fs-3"></i>
                <div>
                  <div className="fw-bold">Create a New Group</div>
                  <small className="text-muted">
                    Start fresh and invite others to join
                  </small>
                </div>
              </button>
              <button
                className="btn btn-outline-primary btn-lg text-start d-flex align-items-center gap-3 p-3"
                onClick={() => setGroupAction("join")}
              >
                <i className="bi bi-box-arrow-in-right fs-3"></i>
                <div>
                  <div className="fw-bold">Join an Existing Group</div>
                  <small className="text-muted">
                    Enter a group code to send a join request
                  </small>
                </div>
              </button>
            </div>
          </>
        ) : groupAction === "create" ? (
          <>
            <div className="mb-3">
              <button
                className="btn btn-link text-decoration-none p-0 mb-3"
                onClick={() => setGroupAction(null)}
              >
                <i className="bi bi-arrow-left me-1"></i>
                Back
              </button>
            </div>
            <InputField
              label="Group Name"
              type="text"
              id="groupName"
              value={groupData.groupName}
              onChange={(value) =>
                setGroupData({ ...groupData, groupName: value as string })
              }
              placeholder="e.g., Family, Roommates, Friends"
              error={groupErrors.groupName}
              required
            />
            <div className="mb-3">
              <label htmlFor="groupDescription" className="form-label">
                Description <span className="text-muted">(Optional)</span>
              </label>
              <textarea
                id="groupDescription"
                className="form-control"
                rows={3}
                value={groupData.groupDescription}
                onChange={(e) =>
                  setGroupData({
                    ...groupData,
                    groupDescription: e.target.value,
                  })
                }
                placeholder="Briefly describe this group..."
                maxLength={500}
              />
              {groupErrors.groupDescription && (
                <small className="text-danger d-block mt-1">
                  {groupErrors.groupDescription}
                </small>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3">
              <button
                className="btn btn-link text-decoration-none p-0 mb-3"
                onClick={() => setGroupAction(null)}
              >
                <i className="bi bi-arrow-left me-1"></i>
                Back
              </button>
            </div>
            <InputField
              label="Group Code"
              type="text"
              id="joinCode"
              value={groupData.joinCode}
              onChange={(value) =>
                setGroupData({ ...groupData, joinCode: value as string })
              }
              placeholder="Enter the group code"
              error={groupErrors.joinCode}
              required
            />
            <div className="alert alert-info">
              <i className="bi bi-info-circle me-2"></i>
              You&apos;ll need approval from a group admin before you can access
              the group.
            </div>
          </>
        )}
      </div>
      <div className="d-flex gap-2 justify-content-end mt-3">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleSkip}
          disabled={isSubmitting}
        >
          Skip for Now
        </button>
        {groupAction && (
          <button
            type="button"
            className="btn btn-primary d-inline-flex align-items-center justify-content-center"
            onClick={handleGroupAction}
            disabled={isSubmitting}
            aria-label={
              groupAction === "create" ? "Create Group" : "Send Join Request"
            }
            style={{ minWidth: "160px" }}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                />
                {groupAction === "create"
                  ? "Creating..."
                  : "Sending Request..."}
              </>
            ) : (
              <>
                {groupAction === "create" ? (
                  <>
                    <i className="bi bi-plus-circle me-1"></i>
                    Create Group
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    Send Join Request
                  </>
                )}
              </>
            )}
          </button>
        )}
      </div>
    </Modal>
  );
}
