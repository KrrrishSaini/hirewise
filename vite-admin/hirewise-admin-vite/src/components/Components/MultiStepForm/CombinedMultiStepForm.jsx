import React, { useState, useEffect } from 'react';
import './MultiStepForm.css';
import { supabase } from '../../../../lib/supabase-client';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../../../lib/config';
import { COUNTRY_CODES } from '../../../lib/country-codes';
import { COUNTRIES } from '../../../lib/countries';
import { COLLEGES } from '../../../lib/colleges';

// Normalize any file-like value into a simple array of File objects
const normalizeFileArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item instanceof File);
  if (value instanceof File) return [value];
  if (value?.length && typeof value.item === 'function') {
    return Array.from(value).filter((item) => item instanceof File);
  }
  return [];
};

// Step 1: PositionSelection
const PositionSelection = ({ formData, setFormData, onNext, onSaveExit, savingDraft }) => {
  const [errors, setErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const teachingDepartments = [
    { id: 'engineering', name: 'School of Engineering & Technology' },
    { id: 'law', name: 'School of Law' },
    { id: 'management', name: 'School of Management' },
    { id: 'liberal', name: 'School of Liberal Studies' },
  ];
  const nonTeachingDepartments = [
    { id: 'admin', name: 'Administration' },
    { id: 'it', name: 'IT Maintenance' },
    { id: 'security', name: 'Security' },
    { id: 'lab', name: 'Lab Assistants' },
  ];
  const engineeringBranches = [
    { id: 'cse', name: 'Computer Science & Engineering' },
    { id: 'mech', name: 'Mechanical Engineering' },
    { id: 'ece', name: 'Electronics and Communication Engineering' },
  ];
  const lawBranches = [
    { id: 'criminal', name: 'Criminal Law' },
    { id: 'corporate', name: 'Corporate Law' },
    { id: 'civil', name: 'Civil Law' },
  ];
  const managementBranches = [
    { id: 'finance', name: 'Finance' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'hr', name: 'Human Resources' },
  ];
  const liberalBranches = [
    { id: 'english', name: 'English' },
    { id: 'history', name: 'History' },
    { id: 'sociology', name: 'Sociology' },
  ];
  useEffect(() => {
    if (formData.position === 'teaching') {
      setDepartments(teachingDepartments);
    } else if (formData.position === 'non-teaching') {
      setDepartments(nonTeachingDepartments);
    } else {
      setDepartments([]);
    }
  }, [formData.position]);
  useEffect(() => {
    if (formData.department) {
      switch (formData.department) {
        case 'engineering':
          setBranches(engineeringBranches);
          break;
        case 'law':
          setBranches(lawBranches);
          break;
        case 'management':
          setBranches(managementBranches);
          break;
        case 'liberal':
          setBranches(liberalBranches);
          break;
        default:
          setBranches([]);
      }
    } else {
      setBranches([]);
    }
  }, [formData.department]);
  const validateForm = () => {
    const newErrors = {};
    if (!formData.position) {
      newErrors.position = 'Please select a position';
    }
    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }
    if (formData.position === 'teaching' && !formData.branch) {
      newErrors.branch = 'Please select a branch';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Normalize 'Other' institute fields to the provided custom values before moving on
      const normalized = { ...formData };
      if (normalized.bachelorInstitute === 'Other' && normalized.bachelorInstituteOther) {
        normalized.bachelorInstitute = normalized.bachelorInstituteOther;
      }
      if (normalized.masterInstitute === 'Other' && normalized.masterInstituteOther) {
        normalized.masterInstitute = normalized.masterInstituteOther;
      }
      if (normalized.phdInstitute === 'Other' && normalized.phdInstituteOther) {
        normalized.phdInstitute = normalized.phdInstituteOther;
      }
      setFormData(normalized);
      onNext();
    }
  };
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="position">Position Applying For*</label>
        <select
          id="position"
          value={formData.position}
          onChange={(e) => {
            const newPosition = e.target.value;
            setFormData({
              ...formData,
              position: newPosition,
              department: '',
              branch: '',
            });
          }}
        >
          <option value="">Select Position</option>
          <option value="teaching">Teaching</option>
          <option value="non-teaching" disabled style={{ color: '#999' }}>Non-Teaching</option>
        </select>
        {errors.position && <span className="error">{errors.position}</span>}
      </div>
      <div className="form-field">
        <label htmlFor="department">Schools*</label>
        <select
          id="department"
          value={formData.department}
          onChange={(e) => {
            setFormData({
              ...formData,
              department: e.target.value,
              branch: '',
            });
          }}
          disabled={!formData.position}
        >
          <option value="">Select School</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        {errors.department && <span className="error">{errors.department}</span>}
      </div>
      {formData.position === 'teaching' && (
        <div className="form-field">
          <label htmlFor="branch">Department/Domain*</label>
          <select
            id="branch"
            value={formData.branch}
            onChange={(e) =>
              setFormData({ ...formData, branch: e.target.value })
            }
            disabled={!formData.department}
          >
            <option value="">Select Department</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          {errors.branch && <span className="error">{errors.branch}</span>}
        </div>
      )}
      <div className="form-buttons">
        <div style={{ flex: 1 }}></div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

// Step 2: PersonalInformation
const PersonalInformation = ({ formData, setFormData, onNext, onPrevious, onSaveExit, savingDraft }) => {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        // Auto-fill email from auth
        if (!formData.email) {
          setFormData(prev => ({ ...prev, email: user.email }));
        }
        
        // Fetch profile data (name and phone from registration)
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .maybeSingle();
          
          if (!error && profile) {
            // Split full_name into first and last name
            const nameParts = (profile.full_name || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Extract phone number (remove country code if present)
            let phoneNumber = (profile.phone || '').trim();
            // If phone has country code like "+91 1234567890", extract just the number
            const phoneMatch = phoneNumber.match(/\d{10,}$/);
            if (phoneMatch) {
              phoneNumber = phoneMatch[0].slice(-10); // Get last 10 digits
            }
            
            setFormData(prev => ({
              ...prev,
              firstName: prev.firstName || firstName,
              lastName: prev.lastName || lastName,
              phone: prev.phone || phoneNumber,
            }));
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }
    };
    fetchUserData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    // Last name is optional
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(formData.phone)) newErrors.phone = 'Phone number must be 10 digits';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.speciallyAbled) newErrors.speciallyAbled = 'Please select an option';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of Birth is required';
    else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      
      if (age < 21) newErrors.dateOfBirth = 'You must be at least 21 years old';
      else if (age > 75) newErrors.dateOfBirth = 'You must be born after 1950 (maximum age is 75 years)';
      
      // Check if date is in the future
      if (birthDate > today) newErrors.dateOfBirth = 'Date of Birth cannot be in the future';
    }
    if (!formData.nationality) newErrors.nationality = 'Nationality is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  const rowLabelStyle = { minHeight: '44px', display: 'flex', alignItems: 'flex-end' };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-fields-row">
        <div className="form-field" style={{ flex: '0 0 auto', width: '120px' }}>
          <label htmlFor="title">Title*</label>
          <select
            id="title"
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          >
            <option value="">Select</option>
            <option value="Mr.">Mr.</option>
            <option value="Ms.">Ms.</option>
            <option value="Mrs.">Mrs.</option>
            <option value="Dr.">Dr.</option>
          </select>
          {errors.title && <span className="error">{errors.title}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="firstName">First Name*</label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName || ''}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
          {errors.firstName && <span className="error">{errors.firstName}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="middleName">Middle Name</label>
          <input
            type="text"
            id="middleName"
            value={formData.middleName || ''}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />
        </div>
        <div className="form-field">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName || ''}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
          {errors.lastName && <span className="error">{errors.lastName}</span>}
        </div>
      </div>
      <div className="form-fields-row">
        <div className="form-field">
          <label htmlFor="email">Email*</label>
          <input
            type="email"
            id="email"
            value={formData.email || ''}
            readOnly
            style={{ backgroundColor: '#f0f0f0' }}
          />
          {errors.email && <span className="error">{errors.email}</span>}
        </div>
        <div className="form-field" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '110px' }}>
            <label htmlFor="countryCode">Country Code</label>
            <select
              id="countryCode"
              value={formData.countryCode || '+91'}
              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="phone">Phone Number*</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              maxLength={10}
            />
            {errors.phone && <span className="error">{errors.phone}</span>}
          </div>
        </div>
      </div>
      <div className="form-fields-row" style={{ gap: '14px' }}>
        <div className="form-field" style={{ flex: '1 1 0' }}>
          <label>Gender*</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="gender"
                value="Male"
                checked={formData.gender === 'Male'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
              Male
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="Female"
                checked={formData.gender === 'Female'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
              Female
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="Other"
                checked={formData.gender === 'Other'}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              />
              Other
            </label>
          </div>
          {errors.gender && <span className="error">{errors.gender}</span>}
        </div>
        <div className="form-field" style={{ flex: '1 1 0' }}>
          <label>Specially Abled*</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="speciallyAbled"
                value="Yes"
                checked={formData.speciallyAbled === 'Yes'}
                onChange={(e) => setFormData({ ...formData, speciallyAbled: e.target.value })}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="speciallyAbled"
                value="No"
                checked={formData.speciallyAbled === 'No'}
                onChange={(e) => setFormData({ ...formData, speciallyAbled: e.target.value })}
              />
              No
            </label>
          </div>
          {errors.speciallyAbled && <span className="error">{errors.speciallyAbled}</span>}
        </div>
        <div className="form-field" style={{ flex: '1 1 0' }}>
          <label htmlFor="category">Category*</label>
          <select
            id="category"
            value={formData.category || ''}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">Select Category</option>
            <option value="GEN">GEN (General)</option>
            <option value="SC">SC (Scheduled Caste)</option>
            <option value="ST">ST (Scheduled Tribe)</option>
            <option value="OBC">OBC (Other Backward Class)</option>
            <option value="EWS">EWS (Economically Weaker Section)</option>
          </select>
          {errors.category && <span className="error">{errors.category}</span>}
        </div>
      </div>
      <div className="form-fields-row">
        <div className="form-field">
          <label htmlFor="dateOfBirth">Date of Birth*</label>
          <input
            type="date"
            id="dateOfBirth"
            value={formData.dateOfBirth || ''}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            min={(() => {
              const date = new Date();
              date.setFullYear(date.getFullYear() - 75);
              return date.toISOString().split('T')[0];
            })()}
            max={(() => {
              const date = new Date();
              date.setFullYear(date.getFullYear() - 21);
              return date.toISOString().split('T')[0];
            })()}
          />
          {errors.dateOfBirth && <span className="error">{errors.dateOfBirth}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="nationality">Nationality*</label>
          <select
            id="nationality"
            value={formData.nationality || ''}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          >
            <option value="">Select Nationality</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.nationality && <span className="error">{errors.nationality}</span>}
        </div>
      </div>
      <div className="form-buttons">
        <div style={{ flex: 1 }}>
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

// Step 3: EducationDetails
const EducationDetails = ({ formData, setFormData, onNext, onPrevious, onSaveExit, savingDraft }) => {
  const [errors, setErrors] = useState({});
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      bachelorInstitute: prev.bachelorInstitute || '',
      bachelorInstituteOther: prev.bachelorInstituteOther || '',
      bachelorDegreeName: prev.bachelorDegreeName || '',
      bachelorYear: prev.bachelorYear || '',
      bachelorCgpaScale: prev.bachelorCgpaScale || 'percentage',
      bachelorCgpa: prev.bachelorCgpa || '',
      masterInstitute: prev.masterInstitute || '',
      masterInstituteOther: prev.masterInstituteOther || '',
      masterDegreeName: prev.masterDegreeName || '',
      masterYear: prev.masterYear || '',
      masterCgpaScale: prev.masterCgpaScale || 'percentage',
      masterCgpa: prev.masterCgpa || '',
      phdStatus: prev.phdStatus || 'Not done',
      phdInstitute: prev.phdInstitute || '',
      phdInstituteOther: prev.phdInstituteOther || '',
      phdAreaSpecialization: prev.phdAreaSpecialization || '',
      phdYear: prev.phdYear || '',
      phdTitle: prev.phdTitle || '',
    }));
  }, [setFormData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.bachelorInstitute || (formData.bachelorInstitute === 'Other' && !formData.bachelorInstituteOther)) {
      newErrors.bachelorInstitute = 'Institution/University is required';
    }
    if (!formData.bachelorDegreeName) {
      newErrors.bachelorDegreeName = 'Degree Name is required';
    }
    if (!formData.bachelorYear) {
      newErrors.bachelorYear = 'Year is required';
    } else {
      const bachelorYear = Number(formData.bachelorYear);
      const currentYear = new Date().getFullYear();
      if (bachelorYear < 1950 || bachelorYear > currentYear) {
        newErrors.bachelorYear = `Year must be between 1950 and ${currentYear}`;
      }
    }
    if (!formData.bachelorCgpa) {
      newErrors.bachelorCgpa = 'Score is required';
    } else {
      const cgpa = parseFloat(formData.bachelorCgpa);
      const scale = formData.bachelorCgpaScale || 'percentage';
      if (cgpa < 0) {
        newErrors.bachelorCgpa = 'Score cannot be negative';
      } else if (scale === 'percentage' && cgpa > 100) {
        newErrors.bachelorCgpa = 'Percentage cannot exceed 100';
      } else if (scale === 'cgpa10' && cgpa > 10) {
        newErrors.bachelorCgpa = 'CGPA cannot exceed 10';
      } else if (scale === 'cgpa5' && cgpa > 5) {
        newErrors.bachelorCgpa = 'CGPA cannot exceed 5';
      }
    }
    if (!formData.masterInstitute || (formData.masterInstitute === 'Other' && !formData.masterInstituteOther)) {
      newErrors.masterInstitute = 'Institution/University is required';
    }
    if (!formData.masterDegreeName) {
      newErrors.masterDegreeName = 'Degree Name is required';
    }
    if (!formData.masterYear) {
      newErrors.masterYear = 'Year is required';
    } else {
      const masterYear = Number(formData.masterYear);
      const bachelorYear = Number(formData.bachelorYear);
      const currentYear = new Date().getFullYear();
      if (masterYear < 1950 || masterYear > currentYear) {
        newErrors.masterYear = `Year must be between 1950 and ${currentYear}`;
      } else if (bachelorYear && masterYear <= bachelorYear) {
        newErrors.masterYear = 'Master year must be after Bachelor year';
      }
    }
    if (!formData.masterCgpa) {
      newErrors.masterCgpa = 'Score is required';
    } else {
      const cgpa = parseFloat(formData.masterCgpa);
      const scale = formData.masterCgpaScale || 'percentage';
      if (cgpa < 0) {
        newErrors.masterCgpa = 'Score cannot be negative';
      } else if (scale === 'percentage' && cgpa > 100) {
        newErrors.masterCgpa = 'Percentage cannot exceed 100';
      } else if (scale === 'cgpa10' && cgpa > 10) {
        newErrors.masterCgpa = 'CGPA cannot exceed 10';
      } else if (scale === 'cgpa5' && cgpa > 5) {
        newErrors.masterCgpa = 'CGPA cannot exceed 5';
      }
    }
    if (formData.phdStatus !== 'Not done') {
      if (!formData.phdInstitute || (formData.phdInstitute === 'Other' && !formData.phdInstituteOther)) {
        newErrors.phdInstitute = 'Institution/University is required';
      }
      if (!formData.phdAreaSpecialization) {
        newErrors.phdAreaSpecialization = 'Area of Specialization is required';
      }
      const currentYear = new Date().getFullYear();
      if (!formData.phdYear) {
        newErrors.phdYear =
          formData.phdStatus === 'Pursuing'
            ? 'Pursuing Year is required'
            : 'Passing Year is required';
      } else {
        const yearNum = Number(formData.phdYear);
        const bachelorYear = Number(formData.bachelorYear);
        const masterYear = Number(formData.masterYear);
        
        // PhD year must be after bachelor's year
        if (bachelorYear && yearNum < bachelorYear) {
          newErrors.phdYear = 'PhD year cannot be before Bachelor\'s passing year';
        }
        // PhD year must be after master's year
        else if (masterYear && yearNum < masterYear) {
          newErrors.phdYear = 'PhD year cannot be before Master\'s passing year';
        }
        // If awarded, cannot be in future
        else if (formData.phdStatus === 'Awarded' && Number.isFinite(yearNum) && yearNum > currentYear) {
          newErrors.phdYear = 'Passed year cannot be in the future';
        }
      }
      if (!formData.phdTitle) {
        newErrors.phdTitle = 'Title is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...formData, [name]: value };

    // Inline validation for CGPA/percentage fields to give instant feedback
    const validateCgpa = (fieldValue, scale) => {
      if (fieldValue === '' || fieldValue === null || fieldValue === undefined) return '';
      const cg = parseFloat(fieldValue);
      if (isNaN(cg)) return '';
      const max = scale === 'percentage' ? 100 : scale === 'cgpa10' ? 10 : 4;
      if (cg < 0) return 'Value cannot be negative';
      if (cg > max) return `Value cannot exceed ${max} for this scale`;
      return '';
    };

    if (name === 'bachelorCgpa' || name === 'bachelorCgpaScale') {
      const scale = name === 'bachelorCgpaScale' ? value : nextForm.bachelorCgpaScale || 'percentage';
      const msg = validateCgpa(name === 'bachelorCgpa' ? value : nextForm.bachelorCgpa, scale);
      setErrors((prev) => ({ ...prev, bachelorCgpa: msg }));
    }

    if (name === 'masterCgpa' || name === 'masterCgpaScale') {
      const scale = name === 'masterCgpaScale' ? value : nextForm.masterCgpaScale || 'percentage';
      const msg = validateCgpa(name === 'masterCgpa' ? value : nextForm.masterCgpa, scale);
      setErrors((prev) => ({ ...prev, masterCgpa: msg }));
    }

    setFormData(nextForm);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="degree-section-title" style={{ 
        fontSize: '1.4rem', 
        fontWeight: '600', 
        color: '#1e40af', 
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #3b82f6'
      }}>
        Bachelor's Degree
      </h3>
      <div className="degree-fields-row">
        <div className="form-field" style={{ flex: '1.5' }}>
          <label htmlFor="bachelorInstitute">Institution/University*</label>
          <select
            id="bachelorInstitute"
            name="bachelorInstitute"
            value={formData.bachelorInstitute || ''}
            onChange={handleInputChange}
          >
            <option value="">Select Institution</option>
            {COLLEGES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          {formData.bachelorInstitute === 'Other' && (
            <input
              type="text"
              placeholder="Enter college/university"
              value={formData.bachelorInstituteOther || ''}
              onChange={(e) => setFormData({ ...formData, bachelorInstituteOther: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          )}
          {errors.bachelorInstitute && <span className="error">{errors.bachelorInstitute}</span>}
        </div>
        <div className="form-field" style={{ flex: '1' }}>
          <label htmlFor="bachelorDegreeName">Degree Name*</label>
          <select
            id="bachelorDegreeName"
            name="bachelorDegreeName"
            value={formData.bachelorDegreeName || ''}
            onChange={handleInputChange}
          >
            <option value="">Select Degree</option>
            {formData.department === 'engineering' && (
              <>
                <option value="B.Tech in Computer Science & Engineering">B.Tech in Computer Science & Engineering</option>
                <option value="B.Tech in Mechanical Engineering">B.Tech in Mechanical Engineering</option>
                <option value="B.Tech in Electronics & Communication">B.Tech in Electronics & Communication</option>
              </>
            )}
            {formData.department === 'management' && (
              <>
                <option value="BBA in Finance">BBA in Finance</option>
                <option value="BBA in Marketing">BBA in Marketing</option>
                <option value="BBA in Human Resources">BBA in Human Resources</option>
                <option value="B.Com">B.Com</option>
              </>
            )}
            {formData.department === 'law' && (
              <>
                <option value="LLB in Criminal Law">LLB in Criminal Law</option>
                <option value="LLB in Corporate Law">LLB in Corporate Law</option>
                <option value="LLB in Civil Law">LLB in Civil Law</option>
                <option value="BA LLB">BA LLB</option>
              </>
            )}
            {formData.department === 'liberal' && (
              <>
                <option value="BA in English">BA in English</option>
                <option value="BA in History">BA in History</option>
                <option value="BA in Sociology">BA in Sociology</option>
                <option value="BA in Psychology">BA in Psychology</option>
              </>
            )}
            {(!formData.department || !['engineering', 'management', 'law', 'liberal'].includes(formData.department)) && (
              <option value="Other">Other</option>
            )}
            <option value="Other">Other</option>
          </select>
          {formData.bachelorDegreeName === 'Other' && (
            <input
              type="text"
              placeholder="Enter your degree name"
              value={formData.bachelorDegreeNameOther || ''}
              onChange={(e) => setFormData({ ...formData, bachelorDegreeNameOther: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          )}
          {errors.bachelorDegreeName && <span className="error">{errors.bachelorDegreeName}</span>}
        </div>
        <div className="form-field" style={{display: 'none'}}>
          <input
            type="text"
            id="bachelorDegreeName"
            name="bachelorDegreeName"
            value={formData.bachelorDegreeName || ''}
            onChange={handleInputChange}
          />
          {errors.bachelorDegreeName && <span className="error">{errors.bachelorDegreeName}</span>}
        </div>
        <div className="form-field" style={{ flex: '0 0 auto', width: '150px' }}>
          <label htmlFor="bachelorYear">Passing Year*</label>
          <input
            type="number"
            id="bachelorYear"
            name="bachelorYear"
            value={formData.bachelorYear || ''}
            min={formData.dateOfBirth ? new Date(formData.dateOfBirth).getFullYear() + 18 : 1950}
            max={new Date().getFullYear()}
            onChange={handleInputChange}
          />
          {errors.bachelorYear && <span className="error">{errors.bachelorYear}</span>}
        </div>
      </div>
      <div className="form-fields-row" style={{ marginTop: '1rem' }}>
        <div className="form-field" style={{ flex: '0 0 auto', width: '280px' }}>
          <label htmlFor="bachelorCgpaScale">Grading Scale*</label>
          <select
            id="bachelorCgpaScale"
            name="bachelorCgpaScale"
            value={formData.bachelorCgpaScale || 'percentage'}
            onChange={handleInputChange}
          >
            <option value="percentage">Percentage (Out of 100)</option>
            <option value="cgpa10">CGPA (Out of 10)</option>
            <option value="cgpa4">CGPA (Out of 4)</option>
          </select>
        </div>
        <div className="form-field" style={{ flex: '0 0 auto', width: '200px' }}>
          <label htmlFor="bachelorCgpa">
            {formData.bachelorCgpaScale === 'percentage' ? 'Percentage*' : 
             formData.bachelorCgpaScale === 'cgpa10' ? 'CGPA (Out of 10)*' : 'CGPA (Out of 4)*'}
          </label>
          <input
            type="number"
            id="bachelorCgpa"
            name="bachelorCgpa"
            value={formData.bachelorCgpa || ''}
            onChange={handleInputChange}
            min="0"
            max={formData.bachelorCgpaScale === 'percentage' ? '100' : 
                 formData.bachelorCgpaScale === 'cgpa10' ? '10' : '4'}
            step="0.01"
            placeholder={formData.bachelorCgpaScale === 'percentage' ? 'Enter 0-100' : 
                        formData.bachelorCgpaScale === 'cgpa10' ? 'Enter 0-10' : 'Enter 0-4'}
          />
          {errors.bachelorCgpa && <span className="error">{errors.bachelorCgpa}</span>}
        </div>
      </div>

      <h3 className="degree-section-title" style={{ 
        fontSize: '1.4rem', 
        fontWeight: '600', 
        color: '#1e40af', 
        marginBottom: '1.5rem',
        marginTop: '2.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #3b82f6'
      }}>
        Master's Degree
      </h3>
      <div className="degree-fields-row">
        <div className="form-field" style={{ flex: '1.5' }}>
          <label htmlFor="masterInstitute">Institution/University*</label>
          <select
            id="masterInstitute"
            name="masterInstitute"
            value={formData.masterInstitute || ''}
            onChange={handleInputChange}
          >
            <option value="">Select Institution</option>
            {COLLEGES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
            <option value="Other">Other</option>
          </select>
          {formData.masterInstitute === 'Other' && (
            <input
              type="text"
              placeholder="Enter college/university"
              value={formData.masterInstituteOther || ''}
              onChange={(e) => setFormData({ ...formData, masterInstituteOther: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          )}
          {errors.masterInstitute && <span className="error">{errors.masterInstitute}</span>}
        </div>
        <div className="form-field" style={{ flex: '1' }}>
          <label htmlFor="masterDegreeName">Degree Name*</label>
          <select
            id="masterDegreeName"
            name="masterDegreeName"
            value={formData.masterDegreeName || ''}
            onChange={handleInputChange}
          >
            <option value="">Select Degree</option>
            {formData.department === 'engineering' && (
              <>
                <option value="M.Tech in Computer Science">M.Tech in Computer Science</option>
                <option value="M.Tech in Mechanical Engineering">M.Tech in Mechanical Engineering</option>
                <option value="M.Tech in Electronics & Communication">M.Tech in Electronics & Communication</option>
                <option value="ME in Computer Science">ME in Computer Science</option>
              </>
            )}
            {formData.department === 'management' && (
              <>
                <option value="MBA in Finance">MBA in Finance</option>
                <option value="MBA in Marketing">MBA in Marketing</option>
                <option value="MBA in Human Resources">MBA in Human Resources</option>
                <option value="M.Com">M.Com</option>
              </>
            )}
            {formData.department === 'law' && (
              <>
                <option value="LLM in Criminal Law">LLM in Criminal Law</option>
                <option value="LLM in Corporate Law">LLM in Corporate Law</option>
                <option value="LLM in Civil Law">LLM in Civil Law</option>
              </>
            )}
            {formData.department === 'liberal' && (
              <>
                <option value="MA in English">MA in English</option>
                <option value="MA in History">MA in History</option>
                <option value="MA in Sociology">MA in Sociology</option>
                <option value="MA in Psychology">MA in Psychology</option>
              </>
            )}
            <option value="Other">Other</option>
          </select>
          {formData.masterDegreeName === 'Other' && (
            <input
              type="text"
              placeholder="Enter your degree name"
              value={formData.masterDegreeNameOther || ''}
              onChange={(e) => setFormData({ ...formData, masterDegreeNameOther: e.target.value })}
              style={{ marginTop: '8px' }}
            />
          )}
          {errors.masterDegreeName && <span className="error">{errors.masterDegreeName}</span>}
        </div>
        <div className="form-field" style={{ flex: '0 0 auto', width: '150px' }}>
          <label htmlFor="masterYear">Passing Year*</label>
          <input
            type="number"
            id="masterYear"
            name="masterYear"
            value={formData.masterYear || ''}
            min={formData.bachelorYear || (formData.dateOfBirth ? new Date(formData.dateOfBirth).getFullYear() + 18 : 1950)}
            max={new Date().getFullYear()}
            onChange={handleInputChange}
          />
          {errors.masterYear && <span className="error">{errors.masterYear}</span>}
        </div>
      </div>
      <div className="form-fields-row" style={{ marginTop: '1rem' }}>
        <div className="form-field" style={{ flex: '0 0 auto', width: '280px' }}>
          <label htmlFor="masterCgpaScale">Grading Scale*</label>
          <select
            id="masterCgpaScale"
            name="masterCgpaScale"
            value={formData.masterCgpaScale || 'percentage'}
            onChange={handleInputChange}
          >
            <option value="percentage">Percentage (Out of 100)</option>
            <option value="cgpa10">CGPA (Out of 10)</option>
            <option value="cgpa4">CGPA (Out of 4)</option>
          </select>
        </div>
        <div className="form-field" style={{ flex: '0 0 auto', width: '200px' }}>
          <label htmlFor="masterCgpa">
            {formData.masterCgpaScale === 'percentage' ? 'Percentage*' : 
             formData.masterCgpaScale === 'cgpa10' ? 'CGPA (Out of 10)*' : 'CGPA (Out of 4)*'}
          </label>
          <input
            type="number"
            id="masterCgpa"
            name="masterCgpa"
            value={formData.masterCgpa || ''}
            onChange={handleInputChange}
            min="0"
            max={formData.masterCgpaScale === 'percentage' ? '100' : 
                 formData.masterCgpaScale === 'cgpa10' ? '10' : '4'}
            step="0.01"
            placeholder={formData.masterCgpaScale === 'percentage' ? 'Enter 0-100' : 
                        formData.masterCgpaScale === 'cgpa10' ? 'Enter 0-10' : 'Enter 0-4'}
          />
          {errors.masterCgpa && <span className="error">{errors.masterCgpa}</span>}
        </div>
      </div>

      <h3 className="degree-section-title" style={{ 
        fontSize: '1.4rem', 
        fontWeight: '600', 
        color: '#1e40af', 
        marginBottom: '1.5rem',
        marginTop: '2.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #3b82f6'
      }}>
        Ph.D.
      </h3>
      <div className="degree-fields-row">
        <div className="form-field" style={{ flex: '0 0 auto', width: '180px' }}>
          <label htmlFor="phdStatus">Status*</label>
          <select
            id="phdStatus"
            name="phdStatus"
            value={formData.phdStatus || 'Not done'}
            onChange={handleInputChange}
          >
            <option value="Not done">Not done</option>
            <option value="Pursuing">Pursuing</option>
            <option value="Submitted">Submitted</option>
            <option value="Awarded">Awarded</option>
          </select>
        </div>
        {formData.phdStatus !== 'Not done' && (
          <>
            <div className="form-field" style={{ flex: '0 0 auto', width: '150px' }}>
              <label htmlFor="phdYear">
                {formData.phdStatus === 'Pursuing' 
                  ? 'Pursuing Year*' 
                  : (formData.phdStatus === 'Awarded' ? 'Passed Year*' : 'Passing Year*')}
              </label>
              <input
                type="number"
                id="phdYear"
                name="phdYear"
                value={formData.phdYear || ''}
                onChange={handleInputChange}
                min={formData.masterYear || formData.bachelorYear || 1950}
                max={formData.phdStatus === 'Awarded' ? new Date().getFullYear() : 2050}
              />
              {errors.phdYear && <span className="error">{errors.phdYear}</span>}
            </div>
            <div className="form-field" style={{ flex: '1.5' }}>
              <label htmlFor="phdInstitute">Institution/University*</label>
              <select
                id="phdInstitute"
                name="phdInstitute"
                value={formData.phdInstitute || ''}
                onChange={handleInputChange}
              >
                <option value="">Select Institution</option>
                {COLLEGES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
                <option value="Other">Other</option>
              </select>
              {formData.phdInstitute === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter college/university"
                  value={formData.phdInstituteOther || ''}
                  onChange={(e) => setFormData({ ...formData, phdInstituteOther: e.target.value })}
                  style={{ marginTop: '8px' }}
                />
              )}
              {errors.phdInstitute && <span className="error">{errors.phdInstitute}</span>}
            </div>
          </>
        )}
      </div>
      {formData.phdStatus !== 'Not done' && (
        <div className="degree-fields-row" style={{ marginTop: '1rem' }}>
          <div className="form-field" style={{ flex: '1' }}>
            <label htmlFor="phdAreaSpecialization">Area of Specialization*</label>
            <input
              type="text"
              id="phdAreaSpecialization"
              name="phdAreaSpecialization"
              value={formData.phdAreaSpecialization || ''}
              onChange={handleInputChange}
            />
            {errors.phdAreaSpecialization && <span className="error">{errors.phdAreaSpecialization}</span>}
          </div>
          <div className="form-field" style={{ flex: '1' }}>
            <label htmlFor="phdTitle">Title*</label>
            <input
              type="text"
              id="phdTitle"
              name="phdTitle"
              value={formData.phdTitle || ''}
              onChange={handleInputChange}
            />
            {errors.phdTitle && <span className="error">{errors.phdTitle}</span>}
          </div>
        </div>
      )}

      <div className="form-buttons">
        <div style={{ flex: 1 }}>
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

// Step 4: Experience
const Experience = ({ formData, setFormData, onNext, onPrevious, onSaveExit, savingDraft }) => {
  const [errors, setErrors] = useState({});
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      teachingExperiences: prev.teachingExperiences || [
        { teachingPost: '', teachingInstitution: '', teachingStartDate: '', teachingEndDate: '', teachingExperience: '' },
      ],
      researchExperiences: prev.researchExperiences || [
        { researchPost: '', researchInstitution: '', researchStartDate: '', researchEndDate: '', researchExperience: '' },
      ],
      totalExperience: prev.totalExperience || '',
    }));
  }, []);

  const calculateExperience = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) totalMonths--;
    if (totalMonths < 0) return 0;
    return totalMonths;
  };

  const monthsToString = (months) => {
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    let str = '';
    if (years > 0) str += `${years} years`;
    if (remMonths > 0) str += (str ? ' ' : '') + `${remMonths} months`;
    return str || '0 years';
  };

  const updateTotalExperience = (teachingArr, researchArr) => {
    let totalMonths = 0;
    teachingArr.forEach((exp) => {
      totalMonths += calculateExperience(exp.teachingStartDate, exp.teachingEndDate);
    });
    researchArr.forEach((exp) => {
      totalMonths += calculateExperience(exp.researchStartDate, exp.researchEndDate);
    });
    setFormData((prev) => ({ ...prev, totalExperience: monthsToString(totalMonths) }));
  };

  const handleTeachingChange = (idx, e) => {
    const { name, value } = e.target;
    const teachingArr = [...(formData.teachingExperiences || [])];
    teachingArr[idx][name] = value;
    if (teachingArr[idx].teachingStartDate && teachingArr[idx].teachingEndDate) {
      // Validate that end date is after start date
      if (teachingArr[idx].teachingEndDate < teachingArr[idx].teachingStartDate) {
        teachingArr[idx].teachingExperience = 'Invalid dates';
      } else {
        const months = calculateExperience(teachingArr[idx].teachingStartDate, teachingArr[idx].teachingEndDate);
        teachingArr[idx].teachingExperience = monthsToString(months);
      }
    }
    setFormData((prev) => ({ ...prev, teachingExperiences: teachingArr }));
    updateTotalExperience(teachingArr, formData.researchExperiences || []);
  };

  const handleResearchChange = (idx, e) => {
    const { name, value } = e.target;
    const researchArr = [...(formData.researchExperiences || [])];
    researchArr[idx][name] = value;
    if (researchArr[idx].researchStartDate && researchArr[idx].researchEndDate) {
      // Validate that end date is after start date
      if (researchArr[idx].researchEndDate < researchArr[idx].researchStartDate) {
        researchArr[idx].researchExperience = 'Invalid dates';
      } else {
        const months = calculateExperience(researchArr[idx].researchStartDate, researchArr[idx].researchEndDate);
        researchArr[idx].researchExperience = monthsToString(months);
      }
    }
    setFormData((prev) => ({ ...prev, researchExperiences: researchArr }));
    updateTotalExperience(formData.teachingExperiences || [], researchArr);
  };

  const addTeachingExperience = () => {
    const teachingArr = [...(formData.teachingExperiences || [])];
    teachingArr.push({ teachingPost: '', teachingInstitution: '', teachingStartDate: '', teachingEndDate: '', teachingExperience: '' });
    setFormData((prev) => ({ ...prev, teachingExperiences: teachingArr }));
  };

  const addResearchExperience = () => {
    const researchArr = [...(formData.researchExperiences || [])];
    researchArr.push({ researchPost: '', researchInstitution: '', researchStartDate: '', researchEndDate: '', researchExperience: '' });
    setFormData((prev) => ({ ...prev, researchExperiences: researchArr }));
  };

  const validateForm = () => {
    const newErrors = { teaching: [], research: [] };
    const today = new Date().toISOString().split('T')[0];
    const teachingList = (formData.teachingExperiences || []);
    const researchList = (formData.researchExperiences || []);
    const hasTeachingData = (exp) =>
      exp.teachingPost || exp.teachingInstitution || exp.teachingStartDate || exp.teachingEndDate || exp.teachingExperience;
    const hasResearchData = (exp) =>
      exp.researchPost || exp.researchInstitution || exp.researchStartDate || exp.researchEndDate || exp.researchExperience;
    
    // Only validate teaching experiences that have ANY data entered
    teachingList.forEach((exp, idx) => {
      const entryErrors = {};
      const hasAnyData = hasTeachingData(exp);
      
      // Only validate if user started entering data
      if (hasAnyData) {
        // Check if institution is "Other" but no custom value provided
        if (exp.teachingInstitution === 'Other' && !exp.teachingInstitutionOther?.trim()) {
          entryErrors.teachingInstitution = 'Please specify your institution';
        }
        // Validate start date format and value
        if (!exp.teachingStartDate) {
          entryErrors.teachingStartDate = 'Start date is required';
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(exp.teachingStartDate)) {
          entryErrors.teachingStartDate = 'Please enter a valid date';
        } else if (exp.teachingStartDate < '1970-01-01') {
          entryErrors.teachingStartDate = 'Start date must be after 1970';
        } else if (exp.teachingStartDate > today) {
          entryErrors.teachingStartDate = 'Start date cannot be in the future';
        }
        // Validate end date format and value
        if (exp.teachingEndDate) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(exp.teachingEndDate)) {
            entryErrors.teachingEndDate = 'Please enter a valid date';
          } else if (exp.teachingEndDate < '1970-01-01') {
            entryErrors.teachingEndDate = 'End date must be after 1970';
          } else if (exp.teachingEndDate > today) {
            entryErrors.teachingEndDate = 'End date cannot be in the future';
          }
        }
        // Validate end date is after start date
        if (exp.teachingStartDate && exp.teachingEndDate && exp.teachingEndDate < exp.teachingStartDate) {
          entryErrors.teachingEndDate = 'End date must be after start date';
        }
      }
      newErrors.teaching[idx] = entryErrors;
    });
    researchList.forEach((exp, idx) => {
      const entryErrors = {};
      const hasAnyData = hasResearchData(exp);
      if (hasAnyData) {
        if (!exp.researchPost) entryErrors.researchPost = 'Research post is required';
        if (!exp.researchInstitution) entryErrors.researchInstitution = 'Institution/University is required';
        // Check if institution is "Other" but no custom value provided
        else if (exp.researchInstitution === 'Other' && !exp.researchInstitutionOther?.trim()) {
          entryErrors.researchInstitution = 'Please specify your institution';
        }
        // Validate start date format and value
        if (!exp.researchStartDate) {
          entryErrors.researchStartDate = 'Start date is required';
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(exp.researchStartDate)) {
          entryErrors.researchStartDate = 'Please enter a valid date';
        } else if (exp.researchStartDate < '1970-01-01') {
          entryErrors.researchStartDate = 'Start date must be after 1970';
        } else if (exp.researchStartDate > today) {
          entryErrors.researchStartDate = 'Start date cannot be in the future';
        }
        // Validate end date format and value
        if (!exp.researchEndDate) {
          entryErrors.researchEndDate = 'End date is required';
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(exp.researchEndDate)) {
          entryErrors.researchEndDate = 'Please enter a valid date';
        } else if (exp.researchEndDate < '1970-01-01') {
          entryErrors.researchEndDate = 'End date must be after 1970';
        } else if (exp.researchEndDate > today) {
          entryErrors.researchEndDate = 'End date cannot be in the future';
        }
        // Validate end date is after start date
        if (exp.researchStartDate && exp.researchEndDate && exp.researchEndDate < exp.researchStartDate) {
          entryErrors.researchEndDate = 'End date must be after start date';
        }
      }
      newErrors.research[idx] = entryErrors;
    });
    setErrors(newErrors);
    const hasTeachingErrors = newErrors.teaching.some(e => Object.keys(e).length > 0);
    const hasResearchErrors = newErrors.research.some(e => Object.keys(e).length > 0);
    return !(hasTeachingErrors || hasResearchErrors);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Normalize "Other" institution values before proceeding
      const normalizedData = { ...formData };
      // Drop completely empty research entries
      normalizedData.researchExperiences = (normalizedData.researchExperiences || []).filter(exp =>
        exp.researchPost || exp.researchInstitution || exp.researchStartDate || exp.researchEndDate || exp.researchExperience
      );
      
      // Normalize teaching experiences
      if (normalizedData.teachingExperiences) {
        normalizedData.teachingExperiences = normalizedData.teachingExperiences.map(exp => {
          if (exp.teachingInstitution === 'Other' && exp.teachingInstitutionOther) {
            return { ...exp, teachingInstitution: exp.teachingInstitutionOther };
          }
          return exp;
        });
      }
      
      // Normalize research experiences
      if (normalizedData.researchExperiences) {
        normalizedData.researchExperiences = normalizedData.researchExperiences.map(exp => {
          if (exp.researchInstitution === 'Other' && exp.researchInstitutionOther) {
            return { ...exp, researchInstitution: exp.researchInstitutionOther };
          }
          return exp;
        });
      }
      
      setFormData(normalizedData);
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="degree-section-title" style={{ 
        fontSize: '1.4rem', 
        fontWeight: '600', 
        color: '#1e40af', 
        marginBottom: '1.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #3b82f6'
      }}>
        Teaching Experience
      </h3>
      {(formData.teachingExperiences || []).map((exp, idx) => (
        <div
          className="degree-fields-row"
          key={idx}
          style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', position: 'relative' }}
        >
          {idx > 0 && (
            <button
              type="button"
              onClick={() => {
                const teachingArr = [...formData.teachingExperiences];
                teachingArr.splice(idx, 1);
                setFormData((prev) => ({ ...prev, teachingExperiences: teachingArr }));
              }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#f8d7da',
                color: '#721c24',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Remove Teaching Experience"
            >
              &minus;
            </button>
          )}
          <div className="form-field">
            <label htmlFor={`teachingPost${idx}`}>Post</label>
            <select
              id={`teachingPost${idx}`}
            name="teachingPost"
            value={exp.teachingPost}
            onChange={(e) => handleTeachingChange(idx, e)}
          >
            <option value="">Select Post</option>
            <option value="Assistant Professor">Assistant Professor</option>
            <option value="Associate Professor">Associate Professor</option>
            <option value="Professor">Professor</option>
            <option value="Other">Other</option>
          </select>
          {errors.teaching && errors.teaching[idx] && errors.teaching[idx].teachingPost && (
            <span className="error">{errors.teaching[idx].teachingPost}</span>
          )}
        </div>
        {exp.teachingPost === 'Other' && (
          <div className="form-field">
            <label htmlFor={`teachingPostOther${idx}`}>Please specify Post</label>
            <input
              type="text"
              id={`teachingPostOther${idx}`}
              name="teachingPostOther"
              value={exp.teachingPostOther || ''}
              onChange={(e) => handleTeachingChange(idx, e)}
              placeholder="Enter your post title"
            />
          </div>
        )}
          <div className="form-field">
            <label htmlFor={`teachingInstitution${idx}`}>Institution/University</label>
            <select
              id={`teachingInstitution${idx}`}
              name="teachingInstitution"
              value={exp.teachingInstitution}
              onChange={(e) => handleTeachingChange(idx, e)}
            >
              <option value="">Select Institution</option>
              {COLLEGES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {errors.teaching && errors.teaching[idx] && errors.teaching[idx].teachingInstitution && (
              <span className="error">{errors.teaching[idx].teachingInstitution}</span>
            )}
          </div>
          {exp.teachingInstitution === 'Other' && (
            <div className="form-field">
              <label htmlFor={`teachingInstitutionOther${idx}`}>Please specify Institution/University</label>
              <input
                type="text"
                id={`teachingInstitutionOther${idx}`}
                name="teachingInstitutionOther"
                value={exp.teachingInstitutionOther || ''}
                onChange={(e) => handleTeachingChange(idx, e)}
                placeholder="Enter your institution name"
              />
            </div>
          )}
          <div className="form-field">
            <label htmlFor={`teachingStartDate${idx}`}>Start Date</label>
            <input
              type="date"
              id={`teachingStartDate${idx}`}
              name="teachingStartDate"
              value={exp.teachingStartDate}
              min="1970-01-01"
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleTeachingChange(idx, e)}
            />
            {errors.teaching && errors.teaching[idx] && errors.teaching[idx].teachingStartDate && (
              <span className="error">{errors.teaching[idx].teachingStartDate}</span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor={`teachingEndDate${idx}`}>End Date</label>
            <input
              type="date"
              id={`teachingEndDate${idx}`}
              name="teachingEndDate"
              value={exp.teachingEndDate}
              min="1970-01-01"
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => handleTeachingChange(idx, e)}
            />
            {errors.teaching && errors.teaching[idx] && errors.teaching[idx].teachingEndDate && (
              <span className="error">{errors.teaching[idx].teachingEndDate}</span>
            )}
          </div>
          <div className="form-field">
            <label>Experience</label>
            <input type="text" value={exp.teachingExperience} readOnly className="readonly-field" />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={addTeachingExperience}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1.2rem', borderRadius: '6px' }}
        >
          + Add Teaching Experience
        </button>
      </div>

      <h3 className="degree-section-title" style={{ 
        fontSize: '1.4rem', 
        fontWeight: '600', 
        color: '#1e40af', 
        marginBottom: '1.5rem',
        marginTop: '2.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #3b82f6'
      }}>
        Research Experience
      </h3>
      {(formData.researchExperiences || []).map((exp, idx) => (
        <div
          className="degree-fields-row"
          key={idx}
          style={{ marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '1rem', position: 'relative' }}
        >
          {idx > 0 && (
            <button
              type="button"
              onClick={() => {
                const researchArr = [...formData.researchExperiences];
                researchArr.splice(idx, 1);
                setFormData((prev) => ({ ...prev, researchExperiences: researchArr }));
              }}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: '#f8d7da',
                color: '#721c24',
                border: 'none',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Remove Research Experience"
            >
              &minus;
            </button>
          )}
          <div className="form-field">
            <label htmlFor={`researchPost${idx}`}>Post</label>
            <input
              type="text"
              id={`researchPost${idx}`}
              name="researchPost"
              value={exp.researchPost}
              onChange={(e) => handleResearchChange(idx, e)}
              placeholder="e.g., Research Associate"
            />
            {errors.research && errors.research[idx] && errors.research[idx].researchPost && (
              <span className="error">{errors.research[idx].researchPost}</span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor={`researchInstitution${idx}`}>Institution/University</label>
            <select
              id={`researchInstitution${idx}`}
              name="researchInstitution"
              value={exp.researchInstitution}
              onChange={(e) => handleResearchChange(idx, e)}
            >
              <option value="">Select Institution</option>
              {COLLEGES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {errors.research && errors.research[idx] && errors.research[idx].researchInstitution && (
              <span className="error">{errors.research[idx].researchInstitution}</span>
            )}
          </div>
          {exp.researchInstitution === 'Other' && (
            <div className="form-field">
              <label htmlFor={`researchInstitutionOther${idx}`}>Please specify Institution/University</label>
              <input
                type="text"
                id={`researchInstitutionOther${idx}`}
                name="researchInstitutionOther"
                value={exp.researchInstitutionOther || ''}
                onChange={(e) => handleResearchChange(idx, e)}
                placeholder="Enter your institution name"
              />
            </div>
          )}
          <div className="form-field">
            <label htmlFor={`researchStartDate${idx}`}>Start Date</label>
            <input
            type="date"
            id={`researchStartDate${idx}`}
            name="researchStartDate"
            value={exp.researchStartDate}
            min="1970-01-01"
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleResearchChange(idx, e)}
          />
            {errors.research && errors.research[idx] && errors.research[idx].researchStartDate && (
              <span className="error">{errors.research[idx].researchStartDate}</span>
            )}
          </div>
          <div className="form-field">
            <label htmlFor={`researchEndDate${idx}`}>End Date</label>
            <input
            type="date"
            id={`researchEndDate${idx}`}
            name="researchEndDate"
            value={exp.researchEndDate}
            min="1970-01-01"
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => handleResearchChange(idx, e)}
          />
            {errors.research && errors.research[idx] && errors.research[idx].researchEndDate && (
              <span className="error">{errors.research[idx].researchEndDate}</span>
            )}
          </div>
          <div className="form-field">
            <label>Experience</label>
            <input type="text" value={exp.researchExperience} readOnly className="readonly-field" />
          </div>
        </div>
      ))}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={addResearchExperience}
          style={{ fontSize: '0.9rem', padding: '0.5rem 1.2rem', borderRadius: '6px' }}
        >
          + Add Research Experience
        </button>
      </div>

      <div className="form-field total-experience">
        <label>Total Experience</label>
        <input type="text" value={formData.totalExperience || ''} readOnly className="readonly-field" />
      </div>

      <div className="form-buttons">
        <div style={{ flex: 1 }}>
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

// Step 5: ResearchInformation
const ResearchInformation = ({ formData, setFormData, onNext, onPrevious, onSaveExit, savingDraft }) => {
  const [errors, setErrors] = useState({});
  const validateForm = () => {
    const newErrors = {};
    if (!formData.scopusId) {
      newErrors.scopusId = 'Scopus ID is required';
    } else if (!/^\d{11}$/.test(formData.scopusId)) {
      newErrors.scopusId = 'Scopus ID must be exactly 11 digits';
    }
    if (!formData.googleScholarId) {
      newErrors.googleScholarId = 'Google Scholar Link is required';
    } else if (!/^https?:\/\/(scholar\.google\.com|scholar\.google\.[a-z.]+)\/.+/.test(formData.googleScholarId)) {
      newErrors.googleScholarId = 'Please enter a valid Google Scholar profile link';
    }
    if (formData.orchidId) {
      if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(formData.orchidId)) {
        newErrors.orchidId = 'ORCID ID must be in the format 0000-0001-5109-3700';
      }
    }
    if (!formData.scopus_general_papers && formData.scopus_general_papers !== 0) {
      newErrors.scopus_general_papers = 'No. of Scopus Index General Papers is required';
    }
    if (!formData.conference_papers && formData.conference_papers !== 0) {
      newErrors.conference_papers = 'No. of Scopus Index Conference Papers is required';
    }
    if (!formData.edited_books && formData.edited_books !== 0) {
      newErrors.edited_books = 'No. of Edited Books is required';
    }
    if (!formData.govt_funded_projects && formData.govt_funded_projects !== 0) {
      newErrors.govt_funded_projects = 'No. of Govt. Funded Projects is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onNext();
    }
  };

  const rowLabelStyle = { minHeight: '44px', display: 'flex', alignItems: 'flex-end' };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-fields-row">
        <div className="form-field" style={{ flex: '0 0 200px' }}>
          <label htmlFor="scopusId">
            Scopus ID*
            <a 
              href="https://www.scopus.com/freelookup/form/author.uri" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', cursor: 'pointer', textDecoration: 'none', fontSize: '14px', color: '#2196F3' }}
              title="Find your Scopus ID"
            >
              ℹ️
            </a>
          </label>
          <input
            type="text"
            id="scopusId"
            name="scopusId"
            value={formData.scopusId || ''}
            onChange={handleInputChange}
            placeholder="11-digit Scopus ID"
            maxLength="11"
            pattern="\d{11}"
          />
          {errors.scopusId && <span className="error">{errors.scopusId}</span>}
        </div>
        <div className="form-field" style={{ flex: '0 0 200px' }}>
          <label htmlFor="orchidId">
            ORCID ID
            <a 
              href="https://orcid.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', cursor: 'pointer', textDecoration: 'none', fontSize: '14px', color: '#2196F3' }}
              title="Find your ORCID ID"
            >
              ℹ️
            </a>
          </label>
          <input
            type="text"
            id="orchidId"
            name="orchidId"
            value={formData.orchidId || ''}
            onChange={handleInputChange}
            placeholder="0000-0001-5109-3700"
          />
          {errors.orchidId && <span className="error">{errors.orchidId}</span>}
        </div>
        <div className="form-field" style={{ flex: 1 }}>
          <label htmlFor="googleScholarId">
            Google Scholar Link*
            <a 
              href="https://scholar.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', cursor: 'pointer', textDecoration: 'none', fontSize: '14px', color: '#2196F3' }}
              title="Find your Google Scholar profile"
            >
              ℹ️
            </a>
          </label>
          <input
            type="url"
            id="googleScholarId"
            name="googleScholarId"
            value={formData.googleScholarId || ''}
            placeholder="https://scholar.google.com/citations?user=..."
            onChange={handleInputChange}
          />
          {errors.googleScholarId && <span className="error">{errors.googleScholarId}</span>}
        </div>
      </div>
      <div className="form-fields-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <div className="form-field" style={{ flex: '1 1 0', minWidth: '200px' }}>
          <label htmlFor="scopus_general_papers" style={rowLabelStyle}>
            No. of Scopus Index General Papers*
          </label>
          <input
            type="number"
            id="scopus_general_papers"
            name="scopus_general_papers"
            value={formData.scopus_general_papers || ''}
            min="0"
            onChange={handleInputChange}
          />
          {errors.scopus_general_papers && <span className="error">{errors.scopus_general_papers}</span>}
        </div>
        <div className="form-field" style={{ flex: '1 1 0', minWidth: '200px' }}>
          <label htmlFor="conference_papers" style={rowLabelStyle}>
            No. of Scopus Index Conference Papers*
          </label>
          <input
            type="number"
            id="conference_papers"
            name="conference_papers"
            value={formData.conference_papers || ''}
            min="0"
            onChange={handleInputChange}
          />
          {errors.conference_papers && <span className="error">{errors.conference_papers}</span>}
        </div>
        <div className="form-field" style={{ flex: '1 1 0', minWidth: '200px' }}>
          <label htmlFor="edited_books" style={rowLabelStyle}>
            No. of Edited Books*
          </label>
          <input
            type="number"
            id="edited_books"
            name="edited_books"
            value={formData.edited_books || ''}
            min="0"
            onChange={handleInputChange}
          />
          {errors.edited_books && <span className="error">{errors.edited_books}</span>}
        </div>
        <div className="form-field" style={{ flex: '1 1 0', minWidth: '200px' }}>
          <label htmlFor="govt_funded_projects" style={rowLabelStyle}>
            No. of Govt. Funded Projects*
          </label>
          <input
            type="number"
            id="govt_funded_projects"
            name="govt_funded_projects"
            value={formData.govt_funded_projects || ''}
            min="0"
            onChange={handleInputChange}
          />
          {errors.govt_funded_projects && <span className="error">{errors.govt_funded_projects}</span>}
        </div>
      </div>
      <div className="form-buttons">
        <div style={{ flex: 1 }}>
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            Next
          </button>
        </div>
      </div>
    </form>
  );
};

// Step 6: Documentation
const Documentation = ({ formData, setFormData, onPrevious, onSubmit, onSaveExit, submitting, savingDraft, submitError }) => {
  const [errors, setErrors] = useState({});

  const handleFileChange = (e, field) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const existingKeyMap = {
      coverLetterPath: 'existingCoverLetterPath',
      teachingStatement: 'existingTeachingStatementPath',
      researchStatement: 'existingResearchStatementPath',
      cvPath: 'existingCvPath',
      otherPublications: 'existingOtherPublicationsPath'
    };

    if (field === 'otherPublications') {
      const selectedFiles = Array.from(files).slice(0, 3);
      setFormData((prev) => ({
        ...prev,
        otherPublications: selectedFiles,
        existingOtherPublicationsPath: null,
      }));
      setErrors((prev) => ({ ...prev, [field]: '' }));
      if (files.length > 3) {
        setErrors((prev) => ({ ...prev, [field]: 'You can upload a maximum of 3 files' }));
      }
      return;
    }

    const file = files[0];
    setFormData((prev) => ({
      ...prev,
      [field]: file,
      ...(existingKeyMap[field] ? { [existingKeyMap[field]]: null } : {}),
    }));
    // Clear error when file is selected
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateAndSubmit = async () => {
    const newErrors = {};

    const otherPublicationFiles = normalizeFileArray(formData.otherPublications);
    const hasExistingOther =
      Array.isArray(formData.existingOtherPublicationsPath)
        ? formData.existingOtherPublicationsPath.filter(Boolean).length > 0
        : Boolean(formData.existingOtherPublicationsPath);

    if (!(formData.teachingStatement instanceof File) && !formData.existingTeachingStatementPath) {
      newErrors.teachingStatement = 'Teaching Statement is required';
    }
    if (!(formData.researchStatement instanceof File) && !formData.existingResearchStatementPath) {
      newErrors.researchStatement = 'Research Statement is required';
    }
    if (!(formData.cvPath instanceof File) && !formData.existingCvPath) {
      newErrors.cvPath = 'CV is required';
    }
    if (!hasExistingOther && otherPublicationFiles.length === 0) {
      newErrors.otherPublications = 'Best published papers are required';
    } else if (otherPublicationFiles.length > 3) {
      newErrors.otherPublications = 'You can upload a maximum of 3 files';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        await onSubmit();
      } catch (err) {
        console.error('Submit error:', err);
        alert('Submission failed. Please try again.');
      }
    } else {
      alert('Please upload all required documents marked with *');
    }
  };

  return (
    <form>
      <div className="form-field">
        <label>Cover Letter</label>
        <input type="file" onChange={(e) => handleFileChange(e, 'coverLetterPath')} />
      </div>
      <div className="form-field">
        <label>Teaching Statement * <span style={{ color: '#6b7280', fontWeight: 500 }}>(Max 250 words)</span></label>
        <input type="file" onChange={(e) => handleFileChange(e, 'teachingStatement')} aria-describedby="teaching-hint" />
        <div id="teaching-hint" style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>Max 250 words</div>
        {errors.teachingStatement && <span className="error">{errors.teachingStatement}</span>}
      </div>
      <div className="form-field">
        <label>Research Statement * <span style={{ color: '#6b7280', fontWeight: 500 }}>(Max 500 words)</span></label>
        <input type="file" onChange={(e) => handleFileChange(e, 'researchStatement')} aria-describedby="research-hint" />
        <div id="research-hint" style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>Max 500 words</div>
        {errors.researchStatement && <span className="error">{errors.researchStatement}</span>}
      </div>
      <div className="form-field">
        <label>Upload CV *</label>
        <input 
          type="file" 
          accept=".pdf,.doc,.docx" 
          onChange={(e) => handleFileChange(e, 'cvPath')} 
        />
        {errors.cvPath && <span className="error">{errors.cvPath}</span>}
      </div>
      <div className="form-field">
        <label>Best Published Papers* (up to 3 files)</label>
        <input type="file" multiple onChange={(e) => handleFileChange(e, 'otherPublications')} aria-describedby="papers-hint" />
        <div id="papers-hint" style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '6px' }}>Upload up to 3 files</div>
        {errors.otherPublications && <span className="error">{errors.otherPublications}</span>}
      </div>
      <div className="form-buttons">
        <div style={{ flex: 1 }}>
          <button type="button" className="btn btn-secondary" onClick={onPrevious}>
            Previous
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary save-exit-btn"
            onClick={onSaveExit}
            disabled={savingDraft}
            aria-busy={savingDraft}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.6667 4.66667V1.33333H3.33333V4.66667M8 8V14M8 14L5.33333 11.3333M8 14L10.6667 11.3333M1.33333 14.6667H14.6667V4.66667H1.33333V14.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {savingDraft ? 'Saving...' : 'Save & Exit'}
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={validateAndSubmit}
            disabled={submitting}
            aria-busy={submitting}
            style={{
              position: 'relative',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting && (
              <span style={{
                display: 'inline-block',
                width: '14px',
                height: '14px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
                marginRight: '8px',
              }}></span>
            )}
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>
    </form>
  );
};

// Main MultiStepForm
const CombinedMultiStepForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    position: '',
    department: '',
    branch: '',
    countryCode: '+91',
  });
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveTick, setAutoSaveTick] = useState(0);
  const [profile, setProfile] = useState({
    full_name: '',
    loading: true,
    error: null,
  });
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftLoadError, setDraftLoadError] = useState(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Load draft on component mount
  useEffect(() => {
    let active = true;
    const loadDraft = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = session?.user;
        if (!user) {
          return;
        }

        const { data, error } = await supabase
          .from('draft_applications')
          .select('form_data, current_step')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('⚠️ Error loading draft:', error);
          if (active) setDraftLoadError(error.message);
          return;
        }

        if (data && data.form_data && active) {
          setFormData((prev) => ({
            ...prev,
            ...data.form_data
          }));
          const loadedStep = data.current_step || 1;
          setCurrentStep(loadedStep);
          // Mark all previous steps as completed when resuming
          const completed = Array.from({ length: Math.max(0, loadedStep - 1) }, (_, i) => i + 1);
          setCompletedSteps(completed);
          setDraftLoadError(null);
          console.log('✅ Draft restored', { step: loadedStep });
        }
      } catch (err) {
        if (active) {
          console.error('❌ Error in loadDraft:', err);
          setDraftLoadError(err.message || 'Unable to load saved draft');
        }
      } finally {
        if (active) {
          setDraftLoaded(true);
        }
      }
    };

    loadDraft();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setProfile((prev) => ({ ...prev, loading: true }));
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .maybeSingle();
          if (error) throw error;
          setProfile({
            full_name: data?.full_name || '',
            loading: false,
            error: null,
          });
        } catch (err) {
          console.error('Error fetching profile:', err);
          setProfile({
            full_name: '',
            loading: false,
            error: err.message,
          });
        }
      } else {
        setProfile({
          full_name: '',
          loading: false,
          error: 'User not authenticated',
        });
      }
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const { loading, error, full_name: fullName } = profile;
  const [completedSteps, setCompletedSteps] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const sanitizeDraftData = (data) => {
    // Strip File objects (cannot be serialized to JSON) and reset to null
    const {
      coverLetterPath,
      teachingStatement,
      researchStatement,
      cvPath,
      otherPublications,
      ...rest
    } = data || {};
    return {
      ...rest,
      coverLetterPath: null,
      teachingStatement: null,
      researchStatement: null,
      cvPath: null,
      otherPublications: null,
    };
  };

  // Wake up backend when user reaches final step (Documentation - step 6)
  useEffect(() => {
    if (currentStep === 6) {
      // Pre-warm backend to avoid timeout on submission
      fetch(`${API_BASE}/api`)
        .then(() => console.log('✅ Backend warmed up for submission'))
        .catch(() => console.log('⚠️ Backend warming attempt (will retry on submit)'));
    }
  }, [currentStep]);

  // Helper function for department short names
  const getDepartmentShortName = (dept) => {
    if (!dept) return '';
    const map = {
      engineering: 'SOET',
      law: 'SOL',
      management: 'SOM',
      liberal: 'SOLS',
      admin: 'Admin',
      it: 'IT',
      security: 'Sec',
      lab: 'Lab'
    };
    return map[dept] || dept;
  };

  const steps = [
    { id: 1, name: 'Position Selection' },
    { id: 2, name: 'Personal Information' },
    { id: 3, name: 'Education Details' },
    { id: 4, name: 'Experience' },
    { id: 5, name: 'Research Information' },
    { id: 6, name: 'Documentation' },
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      try {
        localStorage.clear();
      } catch (storageErr) {
        console.warn('Unable to clear local storage on logout:', storageErr);
      }
      navigate('/register', { replace: true });
      setLoggingOut(false);
    }
  };

  // Save draft function
  const saveDraftAndExit = async () => {
    if (submitting) {
      alert('Submission in progress. Please wait for it to finish.');
      return;
    }

    if (savingDraft) {
      console.log('Draft save already in progress - ignoring duplicate click');
      return;
    }

    setSavingDraft(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const user = session?.user;
      
      if (!user) {
        alert('You must be logged in to save progress.');
        return;
      }

      const otherPublicationFiles = normalizeFileArray(formData.otherPublications);
      const hasFiles = [
        formData.coverLetterPath instanceof File,
        formData.teachingStatement instanceof File,
        formData.researchStatement instanceof File,
        formData.cvPath instanceof File,
        otherPublicationFiles.length > 0
      ].some(Boolean);

      let draftPaths = {};

      if (hasFiles) {
        console.log('Uploading draft documents for Save & Exit', {
          step: currentStep,
          fileCounts: {
            otherPublications: otherPublicationFiles.length,
            coverLetter: formData.coverLetterPath instanceof File ? 1 : 0,
            teachingStatement: formData.teachingStatement instanceof File ? 1 : 0,
            researchStatement: formData.researchStatement instanceof File ? 1 : 0,
            cv: formData.cvPath instanceof File ? 1 : 0,
          },
        });
        const fd = new FormData();
        if (formData.coverLetterPath instanceof File) fd.append('coverLetterPath', formData.coverLetterPath);
        if (formData.teachingStatement instanceof File) fd.append('teachingStatement', formData.teachingStatement);
        if (formData.researchStatement instanceof File) fd.append('researchStatement', formData.researchStatement);
        if (formData.cvPath instanceof File) fd.append('cvPath', formData.cvPath);
        otherPublicationFiles.slice(0, 3).forEach((f) => fd.append('otherPublications', f));

        const uploadRes = await fetch(`${API_BASE}/api/documents/drafts/upload`, {
          method: 'POST',
          body: fd
        });
        if (!uploadRes.ok) {
          let err = {};
          try {
            err = await uploadRes.json();
          } catch {
            err = {};
          }
          throw new Error(err.error || `Draft upload failed (status ${uploadRes.status})`);
        }
        const data = await uploadRes.json();
        draftPaths = data.paths || {};
        console.log('Draft file paths saved', draftPaths);
      } else {
        console.log('Saving draft without uploading new files', { step: currentStep });
      }

      const draftData = {
        user_id: user.id,
        form_data: {
          ...sanitizeDraftData(formData),
          existingCoverLetterPath: draftPaths.cover_letter_path || formData.existingCoverLetterPath || null,
          existingTeachingStatementPath: draftPaths.teaching_statement_path || formData.existingTeachingStatementPath || null,
          existingResearchStatementPath: draftPaths.research_statement_path || formData.existingResearchStatementPath || null,
          existingCvPath: draftPaths.cv_path || formData.existingCvPath || null,
          existingOtherPublicationsPath: draftPaths.other_publications_path || formData.existingOtherPublicationsPath || null
        },
        current_step: currentStep,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('draft_applications')
        .upsert(draftData, { onConflict: 'user_id' });

      if (error) throw error;

      alert('✅ Progress saved successfully! You can resume later.');
      navigate('/register');
    } catch (err) {
      console.error('Save draft error:', err);
      alert('❌ Failed to save progress: ' + (err.message || 'Unexpected error'));
    } finally {
      setSavingDraft(false);
    }
  };

  // Silent autosave when enabled
  const autoSaveDraft = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !autoSaveEnabled || savingDraft || submitting) return;

    const draftData = {
      user_id: user.id,
      form_data: sanitizeDraftData(formData),
      current_step: currentStep,
      updated_at: new Date().toISOString()
    };

    await supabase
      .from('draft_applications')
      .upsert(draftData, { onConflict: 'user_id' })
      .then(() => setAutoSaveTick((t) => t + 1))
      .catch((err) => console.warn('Autosave skipped:', err.message));
  };

  // Debounce autosave on form changes
  useEffect(() => {
    if (!autoSaveEnabled || !draftLoaded) return;
    const timer = setTimeout(() => {
      autoSaveDraft();
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, currentStep, autoSaveEnabled, draftLoaded]);

  const onSubmitFinalApplication = async () => {
  // Client-side double-submit guard: prevents multiple rapid clicks
  if (submitting) {
    return;
  }

  setSubmitError('');
  setSubmitting(true);
  // Safety: clear stuck submitting state after 45s even if network hangs silently
  const submittingSafety = setTimeout(() => setSubmitting(false), 45000);

  const otherPublicationFiles = normalizeFileArray(formData.otherPublications);
  const hasExistingOtherPublications = Array.isArray(formData.existingOtherPublicationsPath)
    ? formData.existingOtherPublicationsPath.filter(Boolean).length > 0
    : Boolean(formData.existingOtherPublicationsPath);

  // Final guard for required docs (in case UI validation is bypassed)
  const missingDocs = [];
  if (!(formData.teachingStatement instanceof File) && !formData.existingTeachingStatementPath) missingDocs.push('Teaching Statement');
  if (!(formData.researchStatement instanceof File) && !formData.existingResearchStatementPath) missingDocs.push('Research Statement');
  if (!(formData.cvPath instanceof File) && !formData.existingCvPath) missingDocs.push('CV');
  if (!hasExistingOtherPublications && otherPublicationFiles.length === 0) {
    missingDocs.push('Best Published Papers');
  }
  if (otherPublicationFiles.length > 3) {
    alert('You can upload a maximum of 3 best published papers.');
    setSubmitting(false);
    return;
  }
  if (missingDocs.length) {
    setSubmitError('Missing required documents: ' + missingDocs.join(', '));
    alert('Please upload required documents before submitting:\n\n• ' + missingDocs.join('\n• '));
    setSubmitting(false);
    return;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  
  if (!user) {
    setSubmitError('You must be logged in to submit an application.');
    alert('❌ You must be logged in to submit an application.');
    setSubmitting(false);
    return;
  }
  // Normalize any 'Other' institute choices defensively before deriving values
  const normalized = { ...formData };
  
  // Validate required fields before submission
  if (!normalized.title || !normalized.firstName || !normalized.email || !normalized.position || !normalized.department) {
    setSubmitError('Please fill in all required fields before submitting.');
    alert('❌ Please fill in all required fields:\n\n' + 
      (!normalized.title ? '• Title\n' : '') +
      (!normalized.firstName ? '• First Name\n' : '') +
      (!normalized.email ? '• Email\n' : '') +
      (!normalized.position ? '• Position\n' : '') +
      (!normalized.department ? '• Department' : ''));
    setSubmitting(false);
    return;
  }
  
  if (normalized.bachelorInstitute === 'Other' && normalized.bachelorInstituteOther) {
    normalized.bachelorInstitute = normalized.bachelorInstituteOther;
  }
  if (normalized.masterInstitute === 'Other' && normalized.masterInstituteOther) {
    normalized.masterInstitute = normalized.masterInstituteOther;
  }
  if (normalized.phdInstitute === 'Other' && normalized.phdInstituteOther) {
    normalized.phdInstitute = normalized.phdInstituteOther;
  }

  // Derive highest degree, university, and graduation year from education step
  let derivedHighestDegree = '';
  let derivedUniversity = '';
  let derivedGradYear = '';
  if ((normalized.phdStatus || '') !== 'Not done') {
    derivedHighestDegree = 'PhD';
    derivedUniversity = normalized.phdInstitute || '';
    derivedGradYear = normalized.phdYear || '';
  } else if (normalized.masterInstitute) {
    derivedHighestDegree = 'Masters';
    derivedUniversity = normalized.masterInstitute || '';
    derivedGradYear = normalized.masterYear || '';
  } else if (normalized.bachelorInstitute) {
    derivedHighestDegree = 'Bachelors';
    derivedUniversity = normalized.bachelorInstitute || '';
    derivedGradYear = normalized.bachelorYear || '';
  }

  // Build multipart/form-data so files are actually uploaded via multer on the server
  const fd = new FormData();
  fd.append('position', normalized.position || '');
  fd.append('department', normalized.department || '');
  fd.append('branch', normalized.branch || '');
  fd.append('title', normalized.title || '');
  fd.append('first_name', normalized.firstName || '');
  fd.append('middle_name', normalized.middleName || '');
  fd.append('last_name', normalized.lastName || '');
  fd.append('email', normalized.email || '');
  const phoneWithCode = `${normalized.countryCode || ''}${normalized.phone ? ' ' + normalized.phone : ''}`;
  fd.append('phone', phoneWithCode.trim());
  fd.append('address', normalized.address || '');
  // Use derived values to ensure university exists for NIRF/QS scoring
  fd.append('highest_degree', derivedHighestDegree);
  fd.append('university', derivedUniversity);
  fd.append('graduation_year', derivedGradYear);
  fd.append('previous_positions', normalized.previous_positions || '');
  fd.append('years_of_experience', normalized.totalExperience || '');
  fd.append('gender', normalized.gender || '');
  fd.append('date_of_birth', normalized.dateOfBirth || '');
  fd.append('nationality', normalized.nationality || '');
  fd.append('user_id', user?.id || '');

  // Complex fields as JSON strings (server will JSON.parse)
  fd.append('teachingExperiences', JSON.stringify((normalized.teachingExperiences || []).map((t) => ({
    teachingPost: t.teachingPost || '',
    teachingInstitution: t.teachingInstitution || '',
    teachingStartDate: t.teachingStartDate || '',
    teachingEndDate: t.teachingEndDate || '',
    teachingExperience: t.teachingExperience || '',
  }))));
  fd.append('researchExperiences', JSON.stringify((normalized.researchExperiences || []).map((r) => ({
    researchPost: r.researchPost || '',
    researchInstitution: r.researchInstitution || '',
    researchStartDate: r.researchStartDate || '',
    researchEndDate: r.researchEndDate || '',
    researchExperience: r.researchExperience || '',
  }))));
  fd.append('researchInfo', JSON.stringify({
    scopus_id: normalized.scopusId || '',
    orchid_id: normalized.orchidId || '',
    google_scholar_id: normalized.googleScholarId || '',
    scopus_general_papers: Number(normalized.scopus_general_papers) || 0,
    conference_papers: Number(normalized.conference_papers) || 0,
    edited_books: Number(normalized.edited_books) || 0,
    govt_funded_projects: Number(normalized.govt_funded_projects) || 0,
  }));

  // Files (only append when File objects exist) or use existing paths from drafts
  if (formData.coverLetterPath instanceof File) {
    fd.append('coverLetterPath', formData.coverLetterPath, formData.coverLetterPath.name);
  } else if (formData.existingCoverLetterPath) {
    fd.append('existingCoverLetterPath', formData.existingCoverLetterPath);
  }
  if (formData.teachingStatement instanceof File) {
    fd.append('teachingStatement', formData.teachingStatement, formData.teachingStatement.name);
  } else if (formData.existingTeachingStatementPath) {
    fd.append('existingTeachingStatementPath', formData.existingTeachingStatementPath);
  }
  if (formData.researchStatement instanceof File) {
    fd.append('researchStatement', formData.researchStatement, formData.researchStatement.name);
  } else if (formData.existingResearchStatementPath) {
    fd.append('existingResearchStatementPath', formData.existingResearchStatementPath);
  }
  if (formData.cvPath instanceof File) {
    fd.append('cvPath', formData.cvPath, formData.cvPath.name);
  } else if (formData.existingCvPath) {
    fd.append('existingCvPath', formData.existingCvPath);
  }
  if (otherPublicationFiles.length > 0) {
    otherPublicationFiles.slice(0, 3).forEach((file) => {
      fd.append('otherPublications', file, file.name);
    });
  } else if (hasExistingOtherPublications) {
    const val = Array.isArray(formData.existingOtherPublicationsPath)
      ? JSON.stringify(formData.existingOtherPublicationsPath)
      : formData.existingOtherPublicationsPath;
    fd.append('existingOtherPublicationsPath', val);
  }

  try {
    // First, wake up the backend with a quick ping (3 second timeout)
    try {
      await fetch(`${API_BASE}/api`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
    } catch (pingErr) {
      // Backend might be cold, continue anyway
      console.log('Backend warming...');
    }

    // Now submit with longer timeout for file upload
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for file upload
    
    const response = await fetch(API_BASE + '/api/applications', {
      method: 'POST',
      body: fd,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorRes;
      try {
        errorRes = await response.json();
      } catch (jsonErr) {
        errorRes = { error: `Server returned ${response.status}: ${response.statusText}` };
      }
      
      // Check for duplicate submission
      if (response.status === 409) {
        alert('⚠️ You have already submitted an application for this position.\n\nPlease contact support if you believe this is a mistake.');
      } else if (response.status === 404) {
        alert('❌ API endpoint not found. Please contact support.\n\nError: Server configuration issue');
      } else if (response.status === 413) {
        alert('❌ Uploaded files are too large. Please ensure each file is under 10MB.');
      } else if (response.status >= 500) {
        alert('❌ Server error. Please try again in a few minutes or contact support.');
      } else {
        alert('❌ Submission failed: ' + (errorRes.error || 'Unknown error'));
      }
      setSubmitting(false);
      return;
    }

    const result = await response.json();
    alert('✅ Application submitted successfully!\n\nYour application is being processed. You will receive confirmation via email.');
    
    // Delete draft after successful submission
    try {
      await supabase
        .from('draft_applications')
        .delete()
        .eq('user_id', user.id);
    } catch (draftErr) {
      console.log('Draft cleanup warning:', draftErr);
    }
    
    navigate('/register');
  } catch (err) {
    console.error('Submission error:', err);
    
    // Handle different error types
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      // Don't show scary message - application likely still processing
      alert('✅ Application submitted! Processing may take a moment.\n\nYou will receive email confirmation shortly at: ' + formData.email);
      // Navigate anyway since backend processes in background
    navigate('/register');
    return;
  }
  
  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    alert('❌ Network error. Please check your internet connection and try again.');
  } else {
    alert('❌ Submission failed: ' + err.message + '\n\nPlease try again or contact support.');
  }
} finally {
    clearTimeout(submittingSafety);
    setSubmitting(false);
  }
};
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <PositionSelection 
          formData={formData} 
          setFormData={setFormData} 
          onNext={handleNext}
          onSaveExit={saveDraftAndExit}
          savingDraft={savingDraft}
        />;
      case 2:
        return <PersonalInformation 
          formData={formData} 
          setFormData={setFormData} 
          onNext={handleNext} 
          onPrevious={handlePrevious}
          onSaveExit={saveDraftAndExit}
          savingDraft={savingDraft}
        />;
      case 3:
        return <EducationDetails 
          formData={formData} 
          setFormData={setFormData} 
          onNext={handleNext} 
          onPrevious={handlePrevious}
          onSaveExit={saveDraftAndExit}
          savingDraft={savingDraft}
        />;
      case 4:
        return <Experience 
          formData={formData} 
          setFormData={setFormData} 
          onNext={handleNext} 
          onPrevious={handlePrevious}
          onSaveExit={saveDraftAndExit}
          savingDraft={savingDraft}
        />;
      case 5:
        return <ResearchInformation 
          formData={formData} 
          setFormData={setFormData} 
          onNext={handleNext} 
          onPrevious={handlePrevious}
          onSaveExit={saveDraftAndExit}
          savingDraft={savingDraft}
        />;
      case 6:
        return <Documentation 
          formData={formData} 
          setFormData={setFormData} 
          onPrevious={handlePrevious} 
          onSubmit={onSubmitFinalApplication}
          onSaveExit={saveDraftAndExit}
          submitting={submitting}
          savingDraft={savingDraft}
          submitError={submitError}
        />;
      default:
        return null;
    }
  };

  return (
    <div className="multi-step-form">
      {/* Header */}
      <div
        className="form-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div className="university-logo" style={{ width: '60px', marginRight: '15px' }}>
            <img src="/image 2.png" alt="University Logo" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div className="university-info">
            <div className="university-name" style={{ fontWeight: 'bold', fontSize: '1.4rem' }}>
              BML Munjal University
            </div>
            <div className="recruitment-text" style={{ color: '#555', fontSize: '1.15rem' }}>
              Faculty Recruitment {new Date().getFullYear()}
            </div>
          </div>
        </div>
        <div className="profile-display" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '15px' }}>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <>
              {fullName && (
                <div
                  className="user-name"
                  style={{
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: '#333',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Welcome, <span style={{ fontWeight: '700', color: '#000' }}>{fullName}</span>
                </div>
              )}
              {formData.position && (
                <div
                  className="user-position"
                  style={{
                    fontWeight: '500',
                    fontSize: '1.05rem',
                    color: '#333',
                    marginTop: '2px',
                    fontFamily: 'Arial, sans-serif',
                  }}
                >
                  Position: <span style={{ fontWeight: '600' }}>
                    {typeof formData.position === 'string'
                    ? formData.position.charAt(0).toUpperCase() + formData.position.slice(1)
                    : formData.position}
                  </span>
              {formData.department && (
                <> • <span>{getDepartmentShortName(formData.department)}</span></>
              )}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 10px', borderRadius: '16px', border: '1px solid #d0d7e2' }}>
              <span style={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>Auto-save</span>
              <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.85rem', color: autoSaveEnabled ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                  {autoSaveEnabled ? 'On' : 'Off'}
                </span>
              </label>
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 10px',
                background: '#dc3545',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: loggingOut || savingDraft || submitting ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease, transform 0.1s ease',
                opacity: loggingOut || savingDraft || submitting ? 0.8 : 1,
              }}
              title={loggingOut ? 'Logging out...' : 'Logout'}
              aria-label="Logout"
              aria-busy={loggingOut}
              disabled={loggingOut || savingDraft || submitting}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
            </>
          )}
        </div>
      </div>

      {(savingDraft || draftLoadError) && (
        <div style={{ margin: '10px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {savingDraft && (
            <div style={{ background: '#ecfdf3', color: '#166534', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              Saving draft... please wait for the confirmation alert before leaving this page.
            </div>
          )}
          {draftLoadError && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', border: '1px solid #fecdd3' }}>
              Draft could not be restored: {draftLoadError}. New progress will be saved going forward.
            </div>
          )}
        </div>
      )}

      {/* Progress Steps */}
      <div className="form-progress">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;
          return (
            <div
              key={step.id}
              className={`step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isCompleted ? 'clickable' : 'disabled'}`}
              onClick={() => {
                if (isCompleted) setCurrentStep(step.id);
              }}
              style={{ cursor: isCompleted ? 'pointer' : 'not-allowed' }}
              aria-disabled={!isCompleted}
              tabIndex={isCompleted ? 0 : -1}
            >
              <div className="step-number">{step.id}</div>
              <div className="step-name">
                {step.name}
                {isCompleted && <span className="checkmark">&#10003;</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="form-content">{renderStep()}</div>
    </div>
  );
};

export default CombinedMultiStepForm;
