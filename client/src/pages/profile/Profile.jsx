import React, { useState, useEffect, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import { User, Mail, Shield, BadgeCheck, Phone, Briefcase, Landmark, Camera, Loader2 } from 'lucide-react';

const Profile = () => {
  const { user, profileImageUrl, setProfileImageUrl } = useAuthStore();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // Fetch profile image on mount
  useEffect(() => {
    if (user?.employee?._id && !profileImageUrl) {
      fetchProfileImage();
    }
  }, [user?.employee?._id, profileImageUrl]);

  const fetchProfileImage = async () => {
    try {
      const res = await api.get(`/uploads/profile-image/${user.employee._id}`);
      if (res.data.success && res.data.data.signedUrl) {
        setProfileImageUrl(res.data.data.signedUrl);
      }
    } catch (err) {
      // silently fail — no image
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadMsg('Only JPEG, PNG, and WebP images are allowed');
      setTimeout(() => setUploadMsg(''), 4000);
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg('Image must be under 5MB');
      setTimeout(() => setUploadMsg(''), 4000);
      return;
    }

    setUploading(true);
    setUploadMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post(
        `/uploads/profile-image/${user.employee._id}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (res.data.success) {
        setProfileImageUrl(res.data.data.signedUrl);
        setUploadMsg('Profile image updated!');
        setTimeout(() => setUploadMsg(''), 3000);
      }
    } catch (err) {
      setUploadMsg(err.response?.data?.error?.message || 'Failed to upload image');
      setTimeout(() => setUploadMsg(''), 4000);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-textMain">My Profile</h1>
          <p className="text-sm text-textSub font-medium mt-1">Manage and view your employee profile information</p>
        </div>

        {/* Upload Feedback */}
        {uploadMsg && (
          <div className={`text-xs font-semibold px-4 py-2.5 rounded-lg border ${
            uploadMsg.includes('updated') || uploadMsg.includes('success')
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {uploadMsg}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-cardBg border border-borderSoft rounded-xl overflow-hidden shadow-sm">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent relative">
            <div className="absolute -bottom-10 left-8">
              {/* Avatar with Upload Overlay */}
              <div
                className="h-20 w-20 rounded-xl bg-primary flex items-center justify-center text-white text-3xl font-bold border-4 border-cardBg shadow-md relative group cursor-pointer overflow-hidden"
                onClick={handleImageClick}
                title="Click to change profile image"
              >
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  user?.employee
                    ? `${user.employee.firstName[0] || ''}${user.employee.lastName[0] || ''}`.toUpperCase()
                    : (user?.email ? user.email.substring(0, 2).toUpperCase() : 'U')
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </div>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="pt-14 pb-8 px-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-textMain">
                {user?.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user?.email?.split('@')[0]}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 text-textSub text-xs font-semibold">
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {user?.role}
                </span>
                <span>•</span>
                <span>Active Member</span>
              </div>
            </div>

            <hr className="border-borderSoft" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-textMain uppercase tracking-wider">Account Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <Mail className="h-4.5 w-4.5 text-textSub" />
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <Shield className="h-4.5 w-4.5 text-textSub" />
                    <span>Role Access: <strong className="text-textMain">{user?.role}</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <BadgeCheck className="h-4.5 w-4.5 text-textSub" />
                    <span>Account ID: <code className="text-textMain bg-background px-1.5 py-0.5 rounded text-xs">{user?.employee?.employeeId || 'N/A'}</code></span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-textMain uppercase tracking-wider">Role & Contact</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <Briefcase className="h-4.5 w-4.5 text-textSub" />
                    <span>{user?.employee?.designation || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <Phone className="h-4.5 w-4.5 text-textSub" />
                    <span>{user?.employee?.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-textSub font-medium">
                    <Landmark className="h-4.5 w-4.5 text-textSub" />
                    <span>{user?.employee?.department || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Profile;
