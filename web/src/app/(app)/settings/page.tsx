"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { formatDate } from "@/lib/utils";
import { PasswordField } from "@/components/ui/PasswordField";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { isPasswordValid } from "@/lib/password";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink">{value || "—"}</p>
    </div>
  );
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    gender: "" as "" | "male" | "female" | "other",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      gender: user.gender ?? "",
    });
  }, [user]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        phone: profileForm.phone.trim() || null,
        gender: profileForm.gender || null,
      });
      push("success", "Profile updated.");
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (!isPasswordValid(newPassword) || newPassword !== confirmPassword) {
      push("error", "Enter a valid new password and confirm it correctly.");
      return;
    }
    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      push("success", "Password updated successfully.");
    } catch (error) {
      push(
        "error",
        error instanceof ApiRequestError
          ? error.message
          : "Could not update password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Account settings
        </h1>
        <p className="mt-1 text-sm text-ink-dim">Your account details.</p>
      </div>

      <Card>
        <CardBody className="flex items-center gap-4">
          <Avatar
            size="lg"
            firstName={user?.firstName}
            lastName={user?.lastName}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold text-ink">
                {user?.firstName} {user?.lastName}
              </p>
              <StatusPill status={user?.status} />
            </div>
            <p className="truncate text-sm text-ink-dim">{user?.email}</p>
            {user?.createdAt && (
              <p className="mt-0.5 text-xs text-ink-faint">
                Member since {formatDate(user.createdAt)}
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={saveProfile} className="max-w-md space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="First name"
                required
                value={profileForm.firstName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, firstName: e.target.value }))
                }
              />
              <Input
                label="Last name"
                required
                value={profileForm.lastName}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, lastName: e.target.value }))
                }
              />
            </div>
            <Input
              label="Phone"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
            <Select
              label="Gender"
              value={profileForm.gender}
              onChange={(e) =>
                setProfileForm((f) => ({
                  ...f,
                  gender: e.target.value as typeof f.gender,
                }))
              }
            >
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
            <Field label="Referral code" value={user?.referralCode ?? ""} />
            <Button type="submit" isLoading={isSavingProfile}>
              Save changes
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={changePassword} className="max-w-md space-y-4">
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <div>
              <PasswordField
                label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <PasswordStrength password={newPassword} />
            </div>
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" isLoading={isChangingPassword}>
              Update password
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
