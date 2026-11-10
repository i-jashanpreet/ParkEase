import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import LoginPage from "../src/pages/LoginPage.jsx";
import RegisterPage from "../src/pages/RegisterPage.jsx";
import AuthProvider from "../src/context/AuthContext.jsx";
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateConfirmPassword,
  validateTerms,
  validateLoginForm,
  validateRegisterForm,
} from "../src/utils/validation.js";

function renderWithRouter(element) {
  return renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(AuthProvider, null, element)
    )
  );
}

test("Validation: Email format validation rules", () => {
  assert.equal(validateEmail(""), "Email address is required.");
  assert.equal(validateEmail("   "), "Email address is required.");
  assert.equal(validateEmail("not-an-email"), "Please enter a valid email address (e.g. name@example.com).");
  assert.equal(validateEmail("test@"), "Please enter a valid email address (e.g. name@example.com).");
  assert.equal(validateEmail("test@domain"), "Please enter a valid email address (e.g. name@example.com).");
  assert.equal(validateEmail("valid.driver@parkease.com"), null);
});

test("Validation: Password requirements", () => {
  assert.equal(validatePassword(""), "Password is required.");
  assert.equal(validatePassword("short"), "Password must be at least 8 characters long.");
  assert.equal(validatePassword("1234567"), "Password must be at least 8 characters long.");
  assert.equal(validatePassword("securePass123"), null);
});

test("Validation: Name and Phone requirements", () => {
  assert.equal(validateName(""), "Full name is required.");
  assert.equal(validateName("A"), "Full name must be at least 2 characters long.");
  assert.equal(validateName("Alex Morgan"), null);

  assert.equal(validatePhone(""), "Phone number is required.");
  assert.equal(validatePhone("12345"), "Please enter a valid phone number (at least 10 digits).");
  assert.equal(validatePhone("9876543210"), null);
  assert.equal(validatePhone("+91 98765 43210"), null);
});

test("Validation: Password confirmation matching and Terms acceptance", () => {
  assert.equal(validateConfirmPassword("", "password123"), "Please confirm your password.");
  assert.equal(validateConfirmPassword("mismatchPass", "password123"), "Passwords do not match.");
  assert.equal(validateConfirmPassword("password123", "password123"), null);

  assert.equal(validateTerms(false), "You must accept the Terms of Service to continue.");
  assert.equal(validateTerms(true), null);
});

test("Validation: Full Login form validation", () => {
  const emptyResult = validateLoginForm({});
  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.email);
  assert.ok(emptyResult.errors.password);

  const invalidEmailResult = validateLoginForm({ email: "invalid", password: "validPassword123" });
  assert.equal(invalidEmailResult.isValid, false);
  assert.ok(invalidEmailResult.errors.email);
  assert.equal(invalidEmailResult.errors.password, undefined);

  const validResult = validateLoginForm({ email: "driver@example.com", password: "validPassword123" });
  assert.equal(validResult.isValid, true);
  assert.deepEqual(validResult.errors, {});
});

test("Validation: Full Registration form validation", () => {
  const emptyResult = validateRegisterForm({});
  assert.equal(emptyResult.isValid, false);
  assert.ok(emptyResult.errors.name);
  assert.ok(emptyResult.errors.email);
  assert.ok(emptyResult.errors.phone);
  assert.ok(emptyResult.errors.password);
  assert.ok(emptyResult.errors.confirmPassword);
  assert.ok(emptyResult.errors.agreeTerms);

  const mismatchResult = validateRegisterForm({
    name: "Alex Morgan",
    email: "alex@example.com",
    phone: "9876543210",
    password: "securePassword123",
    confirmPassword: "differentPassword",
    agreeTerms: true,
  });
  assert.equal(mismatchResult.isValid, false);
  assert.equal(mismatchResult.errors.confirmPassword, "Passwords do not match.");

  const validResult = validateRegisterForm({
    name: "Alex Morgan",
    email: "alex@example.com",
    phone: "9876543210",
    password: "securePassword123",
    confirmPassword: "securePassword123",
    agreeTerms: true,
  });
  assert.equal(validResult.isValid, true);
  assert.deepEqual(validResult.errors, {});
});

test("LoginPage rendering: branding, inputs, controls, links, and accessibility", () => {
  const html = renderWithRouter(React.createElement(LoginPage));

  // Branding & Titles
  assert.match(html, /ParkEase/);
  assert.match(html, /Welcome back/);
  assert.match(html, /Sign in to manage parking reservations/);

  // Form inputs
  assert.match(html, /id="login-email"/);
  assert.match(html, /type="email"/);
  assert.match(html, /id="login-password"/);
  assert.match(html, /type="password"/);

  // Password visibility button with ARIA label
  assert.match(html, /aria-label="Show password"/);

  // Remember me checkbox
  assert.match(html, /name="rememberMe"/);
  assert.match(html, /Remember me/);

  // Forgot password link
  assert.match(html, /Forgot password\?/);

  // Submit button
  assert.match(html, /Sign In/);

  // Navigation link to registration
  assert.match(html, /href="\/register"/);
  assert.match(html, /Create an account/);
});

test("RegisterPage rendering: branding, inputs, role notice, terms, links", () => {
  const html = renderWithRouter(React.createElement(RegisterPage));

  // Branding & Titles
  assert.match(html, /ParkEase/);
  assert.match(html, /Create an account/);

  // Standard role notice (no self-assigning Admin/Guard)
  assert.match(html, /Standard User/);
  assert.match(html, /Driver &amp; visitor account/);

  // Form inputs
  assert.match(html, /id="register-name"/);
  assert.match(html, /id="register-email"/);
  assert.match(html, /id="register-phone"/);
  assert.match(html, /id="register-password"/);
  assert.match(html, /id="register-confirm-password"/);

  // Show password toggle buttons
  assert.match(html, /aria-label="Show password"/);

  // Terms and conditions
  assert.match(html, /name="agreeTerms"/);
  assert.match(html, /Terms of Service/);

  // Submit button
  assert.match(html, /Create Account/);

  // Navigation link to login
  assert.match(html, /href="\/login"/);
  assert.match(html, /Sign in/);
});
