"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  InputField,
  CheckboxField,
  AuthPageSkeleton,
} from "@/shared/components";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });
  const [mfaToken, setMfaToken] = useState("");
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // Use full page reload to ensure cookies are properly set
      window.location.replace("/");
    }
  }, [isAuthenticated, loading]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(
        formData.email,
        formData.password,
        formData.rememberMe,
        showMfaInput ? mfaToken : undefined
      );

      if (result.requiresMfa) {
        // Show MFA input field
        setShowMfaInput(true);
        showError("Please enter your 6-digit authentication code");
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        showSuccess("Login successful! Welcome back.");
        // Redirect will happen via useEffect when isAuthenticated becomes true
      } else {
        showError(result.error || "Login failed");
      }
    } catch {
      showError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <AuthPageSkeleton />;
  }

  return (
    <div className="auth-page-bg">
      {/* Theme Toggle */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1050 }}>
        <ThemeToggle />
      </div>

      <div className="min-vh-100 d-flex align-items-center">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-6 col-lg-5">
              <div className="auth-card">
                <div
                  className="card-header text-white text-center"
                  style={{
                    background: "var(--btn-primary-bg-gradient)",
                    borderColor: "var(--border-primary)",
                  }}
                >
                  <h4 className="mb-0">
                    <i className="bi bi-wallet2 me-2"></i>
                    Spend Tracker
                  </h4>
                  <p className="mb-0 small opacity-75">
                    Sign in to your account
                  </p>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleSubmit}>
                    <InputField
                      label="Email Address"
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(value) =>
                        setFormData({ ...formData, email: value as string })
                      }
                      placeholder="Enter your email"
                      disabled={isSubmitting}
                      error={errors.email}
                      required
                      autoComplete="email"
                    />

                    <InputField
                      label="Password"
                      type="password"
                      id="password"
                      value={formData.password}
                      onChange={(value) =>
                        setFormData({ ...formData, password: value as string })
                      }
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      error={errors.password}
                      required
                      autoComplete="current-password"
                    />

                    {showMfaInput && (
                      <InputField
                        label="Authentication Code"
                        type="text"
                        id="mfaToken"
                        value={mfaToken}
                        onChange={(value) =>
                          setMfaToken(
                            (value as string).replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        placeholder="Enter 6-digit code"
                        disabled={isSubmitting}
                        error={errors.mfaToken}
                        maxLength={6}
                        autoComplete="one-time-code"
                      />
                    )}

                    <div className="mb-3">
                      <CheckboxField
                        label="Remember me"
                        checked={formData.rememberMe}
                        onChange={(checked) =>
                          setFormData({ ...formData, rememberMe: checked })
                        }
                        disabled={isSubmitting}
                        id="rememberMe"
                      />
                      <small
                        className="d-block"
                        style={{
                          marginLeft: "1.5rem",
                          marginTop: "-0.5rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Stay signed in for{" "}
                        {formData.rememberMe ? "7 days" : "1 day"}
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary w-100 mb-3 d-inline-flex align-items-center justify-content-center"
                      disabled={
                        isSubmitting || (showMfaInput && mfaToken.length !== 6)
                      }
                      aria-label="Sign in"
                    >
                      {isSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-box-arrow-in-right me-1"></i>
                          {showMfaInput ? "Verify & Sign In" : "Sign In"}
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center">
                    <p className="mb-2">
                      <Link
                        href="/auth/forgot-password"
                        className="text-decoration-none"
                      >
                        Forgot password?
                      </Link>
                    </p>
                    {process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" && (
                      <p className="mb-0 text-muted small">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-decoration-none">
                          Sign up here
                        </Link>
                      </p>
                    )}
                    {process.env.NEXT_PUBLIC_ENABLE_SIGNUP !== "true" && (
                      <p className="mb-0 text-muted small">
                        Welcome back! Please sign in to continue.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
