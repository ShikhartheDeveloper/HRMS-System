import React, { useState, useEffect } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { BookOpen, Award, CheckCircle, RefreshCw, BarChart2, Plus } from 'lucide-react';

const Training = () => {
  const { user } = useAuthStore();
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [skills, setSkills] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const courseRes = await api.get('/premium/training/courses');
      if (courseRes.data.success) {
        setCourses(courseRes.data.data);
      }
      const progressRes = await api.get('/premium/training/progress');
      if (progressRes.data.success) {
        setProgress(progressRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/premium/training/courses', {
        title,
        description,
        durationHours: Number(duration),
        skillsTaught: skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      if (res.data.success) {
        setShowCourseModal(false);
        setTitle('');
        setDescription('');
        setDuration('');
        setSkills('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const res = await api.post('/premium/training/enroll', { courseId });
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const skillsMatrix = progress.reduce((acc, prog) => {
    if (prog.status === 'Completed' && prog.courseId?.skillsTaught) {
      const name = prog.employeeId ? `${prog.employeeId.firstName} ${prog.employeeId.lastName}` : 'Me';
      prog.courseId.skillsTaught.forEach(skill => {
        if (!acc[skill]) acc[skill] = [];
        if (!acc[skill].includes(name)) acc[skill].push(name);
      });
    }
    return acc;
  }, {});

  return (
    <PageWrapper title="Learning & Development">
      <div className="space-y-6 animate-fade-in text-textPrimary">
        {/* Header bar */}
        <div className="flex justify-between items-center bg-surface border border-borderColor rounded-card p-6 shadow-card flex-wrap gap-4">
          <div>
            <h2 className="text-[14px] font-bold uppercase tracking-wider">Course Catalog & Training Programs</h2>
            <p className="text-[12px] text-textSecondary mt-0.5">Track employee course progresses, completed certifications, and skills matrix mapping.</p>
          </div>
          {user.role === 'HR_ADMIN' && (
            <button
              onClick={() => setShowCourseModal(true)}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-[13px] font-semibold rounded-button flex items-center gap-1.5 shadow-sm transition-all duration-150"
            >
              <Plus className="h-4 w-4" /> Add Training Course
            </button>
          )}
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog */}
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-borderColor pb-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-[14px] uppercase tracking-wider">Corporate Course Catalog</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.length === 0 ? (
                <p className="text-center py-6 text-textSecondary col-span-2">No courses created yet.</p>
              ) : (
                courses.map((course) => {
                  const isEnrolled = progress.some(p => p.courseId?._id === course._id);
                  const statusObj = progress.find(p => p.courseId?._id === course._id);
                  return (
                    <div key={course._id} className="border border-borderColor rounded-card p-4 bg-background/30 flex flex-col justify-between gap-3 text-[13px]">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold">{course.title}</h4>
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                            {course.durationHours} hrs
                          </span>
                        </div>
                        <p className="text-textSecondary text-[12px] line-clamp-2">{course.description || 'No description provided.'}</p>
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {course.skillsTaught?.map((skill, idx) => (
                            <span key={idx} className="bg-surface border border-borderColor px-1.5 py-0.5 rounded text-[10px] font-medium text-textSecondary">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-borderColor/60 pt-2 flex justify-between items-center">
                        {isEnrolled ? (
                          <span className={`text-[11px] font-bold uppercase ${
                            statusObj.status === 'Completed' ? 'text-success' : 'text-primary'
                          }`}>
                            {statusObj.status} ({statusObj.progressPercent}%)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleEnroll(course._id)}
                            className="text-primary hover:underline font-bold text-[12px]"
                          >
                            Enroll Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Progress / Skills Matrix side panel */}
          <div className="bg-surface border border-borderColor rounded-card p-6 shadow-card space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-borderColor pb-3">
                <BarChart2 className="h-5 w-5 text-accent" />
                <h3 className="font-bold text-[14px] uppercase tracking-wider">Skills Matrix</h3>
              </div>
              <div className="space-y-3 text-[12px]">
                {Object.keys(skillsMatrix).length === 0 ? (
                  <p className="text-textSecondary">No skills mapped yet. Complete courses to map skills.</p>
                ) : (
                  Object.entries(skillsMatrix).map(([skill, employees]) => (
                    <div key={skill} className="border border-borderColor rounded-card p-2.5 bg-background/50 space-y-1">
                      <span className="font-bold text-textPrimary uppercase tracking-wider text-[10px]">{skill}</span>
                      <p className="text-[11px] text-textSecondary">Certified: {employees.join(', ')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Course Modal */}
        {showCourseModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-surface border border-borderColor rounded-card p-6 w-full max-w-md shadow-lg space-y-4">
              <h3 className="text-base font-bold text-textPrimary">Create Corporate Course</h3>
              <form onSubmit={handleCreateCourse} className="space-y-3 text-[13px]">
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. React & State Management"
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-textSecondary font-semibold mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide overview details..."
                    className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none resize-none"
                  ></textarea>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Duration (Hours)</label>
                    <input
                      type="number"
                      required
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 10"
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-textSecondary font-semibold mb-1">Skills (Comma sep)</label>
                    <input
                      type="text"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      placeholder="React, CSS, Frontend"
                      className="w-full px-3 py-1.5 border border-borderColor rounded-input bg-background focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCourseModal(false)}
                    className="px-4 py-1.5 border border-borderColor text-textSecondary hover:bg-background rounded-button font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-primary text-white rounded-button font-semibold hover:bg-primary-hover"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Training;
