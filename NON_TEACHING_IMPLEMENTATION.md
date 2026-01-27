# Non-Teaching Candidate Application Flow - Implementation Summary

## Overview
Successfully implemented a unified Non-Teaching candidate application flow without code duplication. The solution uses conditional rendering based on the `formData.position` field to dynamically adjust form steps, validations, and UI labels.

## Architecture Decision
**Approach Selected:** Single Unified Codebase with Conditional Rendering  
**Reason:** Maintains cleaner code structure, easier to maintain, reduces code duplication, and allows for easy feature reuse between teaching and non-teaching flows.

---

## Changes Implemented

### 1. Position Selection (Step 1) ✅

**File:** `CombinedMultiStepForm.jsx`

#### Enabled Non-Teaching Dropdown
```javascript
<option value="teaching">Teaching</option>
<option value="non-teaching">Non-Teaching</option>  // No longer disabled
```

#### Added Non-Teaching Posts
```javascript
const nonTeachingPosts = [
  { id: 'admin_officer', name: 'Administrative Officer' },
  { id: 'it_support', name: 'IT Support' },
  { id: 'security_officer', name: 'Security Officer' },
  { id: 'lab_technician', name: 'Lab Technician' },
];
```

#### Dynamic Post Field Rendering
- **Teaching:** Shows "Teaching Post Applied For" dropdown with teaching posts
- **Non-Teaching:** Shows "Non-Teaching Post Applied For" dropdown with non-teaching posts

#### Branch Field
- **Teaching:** Branch/Domain field is shown (conditional rendering maintained)
- **Non-Teaching:** Branch field is hidden (already conditionally rendered for teaching only)

#### Validation Updates
Added validation for non-teaching post selection:
```javascript
if (formData.position === 'non-teaching' && !formData.nonTeachingPost) {
  newErrors.nonTeachingPost = 'Please select a non-teaching post';
}
```

---

### 2. Personal Information (Step 2) ✅
**No Changes Required** - This step remains identical for both flows.

---

### 3. Education Details (Step 3) ✅

#### PhD Section - Made Optional for Non-Teaching
- **Teaching:** PhD section visible with Status dropdown (Not done, Pursuing, Submitted, Awarded)
- **Non-Teaching:** Entire PhD section hidden using conditional rendering
  
```javascript
{formData.position === 'teaching' && (
  <>
    {/* PhD section content */}
  </>
)}
```

#### Bachelor's & Master's
- **Both flows:** Required (mandatory fields remain the same)

---

### 4. Experience (Step 4) ✅

#### Dynamic Section Heading
```javascript
{formData.position === 'teaching' ? 'Teaching Experience' : 'Non-Teaching Experience'}
```

#### Research Experience Section
- **Teaching:** Research Experience section fully visible with add/remove functionality
- **Non-Teaching:** Entire Research Experience section hidden using conditional rendering

```javascript
{formData.position === 'teaching' && (
  <>
    {/* Research Experience section */}
  </>
)}
```

#### Teaching Experience (Renamed to Non-Teaching Experience)
- Remains accessible for both flows but uses dynamic heading
- Fields: Post, Institution, Start Date, End Date, Calculated Duration

---

### 5. Research Information (Step 5) ✅

#### Dynamic Step Navigation
- **Teaching:** Step 5 shows Research Information (Scopus ID, ORCID, Google Scholar, Publication counts)
- **Non-Teaching:** Step 5 shows Documentation directly (skips Research Information)

#### Conditional Steps Array
```javascript
const getSteps = () => {
  const baseSteps = [
    { id: 1, name: 'Position Selection' },
    { id: 2, name: 'Personal Information' },
    { id: 3, name: 'Education Details' },
    { id: 4, name: 'Experience' },
    { id: 5, name: 'Research Information' },
    { id: 6, name: 'Documentation' },
  ];
  
  if (formData.position === 'non-teaching') {
    return [
      baseSteps[0], // 1: Position Selection
      baseSteps[1], // 2: Personal Information
      baseSteps[2], // 3: Education Details
      baseSteps[3], // 4: Experience
      { id: 5, name: 'Documentation', displayOrder: 5 }, // 5: Documentation (moved from 6)
    ];
  }
  return baseSteps;
};
```

---

### 6. Documentation (Step 6/5) ✅

#### Research Statement Upload
- **Teaching:** Required (marked with *)
- **Non-Teaching:** Hidden (not shown in form)

```javascript
{formData.position === 'teaching' && (
  <div className="form-field">
    <label>Research Statement * (Max 500 words)</label>
    {/* Research Statement upload */}
  </div>
)}
```

#### Published Papers
- **Teaching:** Required (marked with *)
- **Non-Teaching:** Optional (marked without *)

```javascript
<label>Best Published Papers{formData.position === 'teaching' ? '*' : ''} (up to 3 files)</label>
```

#### Validation Logic Updates
```javascript
// Research Statement only required for teaching
if (formData.position === 'teaching') {
  if (!(formData.researchStatement instanceof File) && !formData.existingResearchStatementPath) {
    newErrors.researchStatement = 'Research Statement is required';
  }
}

// Published Papers required for teaching, optional for non-teaching
if (formData.position === 'teaching') {
  if (!hasExistingOther && otherPublicationFiles.length === 0) {
    newErrors.otherPublications = 'Best published papers are required';
  }
}
```

---

## Navigation Flow Comparison

### Teaching Candidates
```
Step 1: Position Selection
  ↓
Step 2: Personal Information
  ↓
Step 3: Education Details (with PhD)
  ↓
Step 4: Experience (Teaching + Research)
  ↓
Step 5: Research Information
  ↓
Step 6: Documentation (Teaching Statement + Research Statement + Published Papers)
  ↓
Submit
```

### Non-Teaching Candidates
```
Step 1: Position Selection
  ↓
Step 2: Personal Information
  ↓
Step 3: Education Details (PhD hidden)
  ↓
Step 4: Experience (Non-Teaching only, Research hidden)
  ↓
Step 5: Documentation (Teaching Statement + Published Papers optional, no Research Statement)
  ↓
Submit
```

---

## Code Structure Benefits

### 1. Single Unified Codebase
- No file duplication
- Easier maintenance
- Consistent styling and error handling
- Single source of truth for business logic

### 2. Conditional Rendering Pattern
```javascript
{formData.position === 'teaching' && (
  // Teaching-specific content
)}

{formData.position === 'non-teaching' && (
  // Non-teaching-specific content
)}
```

### 3. Dynamic Labels
- Post field names change based on position
- Section titles update dynamically
- Required field markers (*) update based on flow

### 4. Validation is Position-Aware
- Different required fields for each flow
- Validation errors are context-specific
- Submission rules differ by candidate type

---

## Testing Checklist

- [x] Non-Teaching option appears in dropdown
- [x] Selecting Non-Teaching enables different post types
- [x] Branch field hidden for non-teaching
- [x] PhD section hidden for non-teaching candidates
- [x] Research Experience section hidden for non-teaching
- [x] Research Information step skipped for non-teaching
- [x] Research Statement field hidden for non-teaching in Documentation
- [x] Published Papers optional for non-teaching
- [x] Teaching flow remains unchanged
- [x] Form navigation works correctly for both flows
- [x] Validation works as expected for both flows
- [x] No syntax errors

---

## Data Flow

### Form Data Structure (formData object)
```javascript
{
  position: 'teaching' | 'non-teaching',
  teachingPost: string (teaching only),
  nonTeachingPost: string (non-teaching only),
  department: string (same for both),
  branch: string (teaching only),
  bachelorInstitute: string (both),
  masterInstitute: string (both),
  phdStatus: string (teaching only),
  teachingExperiences: array (both),
  researchExperiences: array (teaching only),
  scopusId: string (teaching only),
  googleScholarId: string (teaching only),
  teachingStatement: File (both),
  researchStatement: File (teaching only),
  cvPath: File (both),
  otherPublications: File[] (both, optional for non-teaching)
}
```

---

## Backward Compatibility

- ✅ All teaching candidate flows work exactly as before
- ✅ Existing data structures remain compatible
- ✅ Database schema unchanged
- ✅ No migration needed
- ✅ Teaching candidates see identical UI/UX

---

## Future Enhancements

1. **UI Polish:** Add visual indicators showing which step you're on for multi-step forms
2. **Data Persistence:** Ensure draft saving works correctly for non-teaching flow
3. **Analytics:** Track completion rates for teaching vs non-teaching applications
4. **Admin Dashboard:** Update admin panels to handle both application types
5. **Scoring System:** Update backend scoring algorithm for non-teaching candidates

---

## Implementation Notes

- All changes made to: `CombinedMultiStepForm.jsx`
- No new files created (single codebase approach)
- No database migrations needed
- Conditional logic based on `formData.position` field
- Teaching flow remains default and unchanged
- Non-teaching is fully integrated into existing form structure

---

## Files Modified

1. `/Users/anmolchaturvedi/hirewise/vite-admin/hirewise-admin-vite/src/components/Components/MultiStepForm/CombinedMultiStepForm.jsx`
   - Added Non-Teaching posts array
   - Updated PositionSelection component with non-teaching post dropdown
   - Made PhD section conditional on position
   - Made Research Experience section conditional on position
   - Updated Experience heading dynamically
   - Updated getSteps() to return conditional steps array
   - Modified renderStep() to handle both flows
   - Updated handleNext() and handlePrevious() for conditional navigation
   - Updated Documentation validation and UI for conditional fields

---

## Summary

The Non-Teaching candidate application flow is now fully implemented using a single unified codebase with intelligent conditional rendering. The teaching flow remains completely intact and unchanged, while non-teaching candidates experience a streamlined form with appropriate fields and requirements for their profile.

**Status:** ✅ Complete and tested
