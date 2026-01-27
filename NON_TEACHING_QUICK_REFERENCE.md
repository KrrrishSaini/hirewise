# Non-Teaching Implementation - Quick Reference Guide

## What Was Changed?

### Single File Modified
**Location:** `CombinedMultiStepForm.jsx`

All changes use conditional rendering: `if (formData.position === 'non-teaching')` or `if (formData.position === 'teaching')`

---

## Step-by-Step Changes

### ✅ Step 1: Position Selection
| Feature | Teaching | Non-Teaching |
|---------|----------|--------------|
| Post Types | 5 teaching posts | 4 non-teaching posts |
| Post Dropdown Label | "Teaching Post Applied For" | "Non-Teaching Post Applied For" |
| Branch/Domain | Visible | Hidden |

**Key Code:**
```javascript
{formData.position === 'non-teaching' && (
  <div className="form-field">
    <label htmlFor="nonTeachingPost">Non-Teaching Post Applied For*</label>
    {/* dropdown with non-teaching posts */}
  </div>
)}
```

---

### ✅ Step 2: Personal Information
**No Changes** - Same for both flows

---

### ✅ Step 3: Education Details
| Component | Teaching | Non-Teaching |
|-----------|----------|--------------|
| Bachelor's | ✅ Required | ✅ Required |
| Master's | ✅ Required | ✅ Required |
| PhD | ✅ Optional | ❌ Hidden |

**Key Code:**
```javascript
{formData.position === 'teaching' && (
  <>
    <h3>Ph.D.</h3>
    {/* PhD section */}
  </>
)}
```

---

### ✅ Step 4: Experience
| Feature | Teaching | Non-Teaching |
|---------|----------|--------------|
| Section Title | "Teaching Experience" | "Non-Teaching Experience" |
| Teaching Exp | ✅ Visible | ✅ Visible |
| Research Exp | ✅ Visible | ❌ Hidden |

**Key Code:**
```javascript
// Dynamic heading
{formData.position === 'teaching' ? 'Teaching Experience' : 'Non-Teaching Experience'}

// Hide research for non-teaching
{formData.position === 'teaching' && (
  <>
    <h3>Research Experience</h3>
    {/* research fields */}
  </>
)}
```

---

### ✅ Step 5: Research Information
| Flow | Action |
|------|--------|
| Teaching | Shows Research Information (Scopus, ORCID, Google Scholar) |
| Non-Teaching | Skipped - Goes directly to Documentation |

**Navigation:**
- Teaching: Step 1 → 2 → 3 → 4 → 5 (Research) → 6 (Documentation)
- Non-Teaching: Step 1 → 2 → 3 → 4 → 5 (Documentation)

---

### ✅ Step 6/5: Documentation
| Field | Teaching | Non-Teaching |
|-------|----------|--------------|
| Teaching Statement | ✅ Required * | ✅ Required * |
| Research Statement | ✅ Required * | ❌ Hidden |
| CV | ✅ Required * | ✅ Required * |
| Published Papers | ✅ Required * | ⚠️ Optional |

**Key Code:**
```javascript
// Hide research statement for non-teaching
{formData.position === 'teaching' && (
  <div className="form-field">
    <label>Research Statement * (Max 500 words)</label>
    {/* research statement upload */}
  </div>
)}

// Conditional required marker for published papers
<label>Best Published Papers{formData.position === 'teaching' ? '*' : ''}</label>
```

---

## Form Data Structure

```javascript
formData = {
  // Position Type (determines which flow)
  position: 'teaching' | 'non-teaching',
  
  // Position Details
  teachingPost: string,        // Only for teaching
  nonTeachingPost: string,     // Only for non-teaching
  department: string,          // Same for both
  branch: string,              // Only for teaching
  
  // Education (Steps same but PhD hidden for non-teaching)
  bachelorInstitute: string,   // Required for both
  masterInstitute: string,     // Required for both
  phdStatus: string,           // Only for teaching
  
  // Experience
  teachingExperiences: [],     // Both flows
  researchExperiences: [],     // Only for teaching
  
  // Research (Teaching only)
  scopusId: string,
  googleScholarId: string,
  orchidId: string,
  
  // Documentation
  teachingStatement: File,     // Required for both
  researchStatement: File,     // Only for teaching
  cvPath: File,                // Required for both
  otherPublications: [],       // Required for teaching, optional for non-teaching
}
```

---

## Validation Rules

### Teaching Flow
- PhD: Optional (validated only if status ≠ 'Not done')
- Research Statement: **Required**
- Published Papers: **Required**

### Non-Teaching Flow
- PhD: **Not shown**
- Research Statement: **Not shown**
- Published Papers: **Optional**

---

## Navigation Logic

```javascript
const getSteps = () => {
  if (formData.position === 'non-teaching') {
    // Skip Research Information step
    return [
      { id: 1, name: 'Position Selection' },
      { id: 2, name: 'Personal Information' },
      { id: 3, name: 'Education Details' },
      { id: 4, name: 'Experience' },
      { id: 5, name: 'Documentation' },  // Documentation is step 5
    ];
  }
  
  // Teaching flow - all 6 steps
  return [
    { id: 1, name: 'Position Selection' },
    { id: 2, name: 'Personal Information' },
    { id: 3, name: 'Education Details' },
    { id: 4, name: 'Experience' },
    { id: 5, name: 'Research Information' },
    { id: 6, name: 'Documentation' },
  ];
};
```

---

## Key Implementation Pattern

All conditional logic follows this pattern:

```javascript
{formData.position === 'teaching' && (
  // Show for teaching only
)}

{formData.position === 'non-teaching' && (
  // Show for non-teaching only
)}

// For fields shown in both flows but with different requirements:
label: formData.position === 'teaching' ? 'Required Label' : 'Optional Label'
```

---

## Testing Checklist

✅ Non-Teaching option enabled in dropdown  
✅ Non-Teaching posts appear correctly  
✅ PhD section hidden for non-teaching  
✅ Research Experience hidden for non-teaching  
✅ Research Information step skipped for non-teaching  
✅ Documentation step appears at position 5 for non-teaching  
✅ Research Statement field hidden for non-teaching  
✅ Published Papers marked optional for non-teaching  
✅ Teaching flow unchanged  
✅ All validations working correctly  
✅ No syntax errors  

---

## How to Test

### Test Teaching Flow
1. Click "Position Applying For"
2. Select "Teaching"
3. Select teaching post
4. Proceed through all 6 steps
5. Verify Research Information appears at step 5
6. Verify Research Statement is required in Documentation

### Test Non-Teaching Flow
1. Click "Position Applying For"
2. Select "Non-Teaching"
3. Select non-teaching post
4. Notice branch dropdown is hidden
5. Proceed through steps - only 5 steps total
6. At step 3 (Education), notice PhD section is hidden
7. At step 4 (Experience), see "Non-Teaching Experience" heading
8. Notice Research Experience section is missing
9. At step 5 (Documentation), notice:
   - Research Statement is hidden
   - Published Papers is optional (no *)
   - Teaching Statement is still required

---

## Database

**No database changes needed** - All logic is UI-level conditional rendering

---

## Performance

- ✅ No additional database queries
- ✅ No file bloat (single unified file)
- ✅ No code duplication
- ✅ Minimal conditional overhead
- ✅ Same bundle size as before

---

## Backward Compatibility

- ✅ All existing teaching applications work
- ✅ No data migration needed
- ✅ Existing users unaffected
- ✅ Database schema unchanged
- ✅ API endpoints unchanged

---

## Support

For testing or modifications:
- File: `CombinedMultiStepForm.jsx`
- Search for: `formData.position === 'non-teaching'`
- All non-teaching logic is localized in these conditionals

