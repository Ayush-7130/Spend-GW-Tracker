import React, { useEffect, useState } from "react";

export interface NotificationProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface NotificationItemProps extends NotificationProps {
  isVisible: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  isVisible,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        if (newProgress <= 0) {
          clearInterval(interval);
          onClose(id);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, duration, id, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          bgClass: "alert-success",
          icon: "bi-check-circle-fill",
          borderColor: "var(--notification-success-border)",
        };
      case "error":
        return {
          bgClass: "alert-danger",
          icon: "bi-x-circle-fill",
          borderColor: "var(--notification-error-border)",
        };
      case "warning":
        return {
          bgClass: "alert-warning",
          icon: "bi-exclamation-triangle-fill",
          borderColor: "var(--notification-warning-border)",
        };
      case "info":
        return {
          bgClass: "alert-info",
          icon: "bi-info-circle-fill",
          borderColor: "var(--notification-info-border)",
        };
      default:
        return {
          bgClass: "alert-secondary",
          icon: "bi-bell-fill",
          borderColor: "var(--border-secondary)",
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className={`alert ${config.bgClass} alert-dismissible d-flex align-items-start mb-3 shadow-sm notification-item ${
        isVisible ? "slide-in" : "slide-out"
      }`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${config.borderColor}`,
        borderRadius: "8px",
        animation: isVisible
          ? "slideInRight 0.3s ease-out"
          : "slideOutRight 0.3s ease-in",
        wordBreak: "break-word",
        minWidth: 0, // Allow flex item to shrink below content size
      }}
    >
      <i
        className={`bi ${config.icon} me-3 flex-shrink-0`}
        style={{ fontSize: "1.2em", marginTop: "2px" }}
        aria-hidden="true"
      ></i>
      <div
        className="flex-grow-1"
        style={{ minWidth: 0, paddingRight: "2rem" }}
      >
        <div
          className="fw-bold"
          style={{ wordBreak: "break-word", lineHeight: "1.3" }}
        >
          {title}
        </div>
        {message && (
          <div
            className="small mt-1"
            style={{ wordBreak: "break-word", lineHeight: "1.4" }}
          >
            {message}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn-close flex-shrink-0"
        onClick={() => onClose(id)}
        aria-label="Close"
        style={{ position: "absolute", top: "8px", right: "8px" }}
      ></button>

      {/* Progress bar */}
      <div
        className="position-absolute bottom-0 start-0"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Notification auto-dismiss timer"
        style={{
          height: "3px",
          backgroundColor: "var(--overlay-light)",
          width: `${progress}%`,
          transition: "width 0.1s linear",
        }}
      ></div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .notification-item {
          transition: all 0.3s ease;
        }

        .notification-item:hover {
          transform: translateX(-5px);
          box-shadow: var(--shadow-lg) !important;
        }

        /* Mobile responsive text and spacing */
        @media (max-width: 576px) {
          .notification-item {
            font-size: 0.9rem;
          }

          .notification-item .fw-bold {
            font-size: 0.95rem;
          }

          .notification-item .small {
            font-size: 0.8rem;
          }
        }

        @media (max-width: 375px) {
          .notification-item {
            padding: 0.5rem !important;
          }

          .notification-item .fw-bold {
            font-size: 0.85rem !important;
          }

          .notification-item .small {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
};

interface NotificationContainerProps {
  notifications: NotificationProps[];
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>(
    []
  );

  useEffect(() => {
    // Show new notifications
    const newNotificationIds = notifications
      .map((n) => n.id)
      .filter((id) => !visibleNotifications.includes(id));

    if (newNotificationIds.length > 0) {
      setVisibleNotifications((prev) => [...prev, ...newNotificationIds]);
    }
  }, [notifications, visibleNotifications]);

  const handleClose = (id: string) => {
    // Remove from visible list first (for animation)
    setVisibleNotifications((prev) => prev.filter((notifId) => notifId !== id));

    // Then remove from notifications after animation
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className="position-fixed notification-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      style={{
        top: "20px",
        right: "20px",
        zIndex: 9999,
        maxWidth: "420px",
        width: "calc(100vw - 40px)", // Responsive width with padding
      }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          {...notification}
          isVisible={visibleNotifications.includes(notification.id)}
          onClose={handleClose}
        />
      ))}

      <style jsx>{`
        /* Responsive width adjustments */
        @media (min-width: 1400px) {
          .notification-container {
            max-width: 480px !important;
          }
        }

        @media (min-width: 992px) and (max-width: 1399px) {
          .notification-container {
            max-width: 420px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 991px) {
          .notification-container {
            max-width: 380px !important;
          }
        }

        @media (min-width: 576px) and (max-width: 767px) {
          .notification-container {
            max-width: 360px !important;
            top: 15px !important;
            right: 15px !important;
          }
        }

        @media (max-width: 575px) {
          .notification-container {
            top: 10px !important;
            right: 10px !important;
            left: 10px !important;
            width: calc(100vw - 20px) !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};
