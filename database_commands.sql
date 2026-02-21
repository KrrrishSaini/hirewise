-- ========================================
-- DEPARTMENT & POSITION MANAGEMENT SYSTEM
-- Supabase PostgreSQL Commands
-- ========================================

-- DROP OLD TABLES IF THEY EXIST
-- Execute these first to clean up any previous implementation
-- ========================================

DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ========================================
-- CREATE NEW TABLES
-- ========================================

-- 1️⃣ DEPARTMENTS TABLE
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('TEACHING', 'NON_TEACHING')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, type)
);

-- 2️⃣ BRANCHES TABLE (Teaching departments only)
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, department_id)
);

-- 3️⃣ POSITIONS TABLE
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('TEACHING', 'NON_TEACHING')),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_departments_type ON departments(type);
CREATE INDEX idx_departments_status ON departments(status);
CREATE INDEX idx_branches_department ON branches(department_id);
CREATE INDEX idx_branches_status ON branches(status);
CREATE INDEX idx_positions_department ON positions(department_id);
CREATE INDEX idx_positions_branch ON positions(branch_id);
CREATE INDEX idx_positions_type ON positions(type);
CREATE INDEX idx_positions_status ON positions(status);

-- ========================================
-- CREATE UPDATE TRIGGER FOR TIMESTAMPS
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at 
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at 
    BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- INSERT DEFAULT DATA
-- ========================================

-- Teaching Departments
INSERT INTO departments (name, type, status) VALUES
('School of Engineering & Technology', 'TEACHING', 'ACTIVE'),
('School of Law', 'TEACHING', 'ACTIVE'),
('School of Management', 'TEACHING', 'ACTIVE'),
('School of Liberal Studies', 'TEACHING', 'ACTIVE');

-- Non-Teaching Departments
INSERT INTO departments (name, type, status) VALUES
('Administration', 'NON_TEACHING', 'ACTIVE'),
('IT Maintenance', 'NON_TEACHING', 'ACTIVE'),
('Security', 'NON_TEACHING', 'ACTIVE'),
('Lab Assistants', 'NON_TEACHING', 'ACTIVE');

-- Branches for School of Engineering & Technology
INSERT INTO branches (name, department_id, status)
SELECT 'Computer Science & Engineering', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology'
UNION ALL
SELECT 'Mechanical Engineering', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology'
UNION ALL
SELECT 'Electronics and Communication Engineering', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology'
UNION ALL
SELECT 'Mathematics', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology'
UNION ALL
SELECT 'Chemistry', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology'
UNION ALL
SELECT 'Physics', id, 'ACTIVE' FROM departments WHERE name = 'School of Engineering & Technology';

-- Branches for School of Law
INSERT INTO branches (name, department_id, status)
SELECT 'Criminal Law', id, 'ACTIVE' FROM departments WHERE name = 'School of Law'
UNION ALL
SELECT 'Corporate Law', id, 'ACTIVE' FROM departments WHERE name = 'School of Law'
UNION ALL
SELECT 'Civil Law', id, 'ACTIVE' FROM departments WHERE name = 'School of Law';

-- Branches for School of Management
INSERT INTO branches (name, department_id, status)
SELECT 'Finance', id, 'ACTIVE' FROM departments WHERE name = 'School of Management'
UNION ALL
SELECT 'Marketing', id, 'ACTIVE' FROM departments WHERE name = 'School of Management'
UNION ALL
SELECT 'Human Resources', id, 'ACTIVE' FROM departments WHERE name = 'School of Management';

-- Branches for School of Liberal Studies
INSERT INTO branches (name, department_id, status)
SELECT 'English', id, 'ACTIVE' FROM departments WHERE name = 'School of Liberal Studies'
UNION ALL
SELECT 'History', id, 'ACTIVE' FROM departments WHERE name = 'School of Liberal Studies'
UNION ALL
SELECT 'Sociology', id, 'ACTIVE' FROM departments WHERE name = 'School of Liberal Studies';

-- Teaching Positions (Not linked to specific department/branch - Admin will link them)
INSERT INTO positions (name, type, status) VALUES
('Assistant Professor', 'TEACHING', 'ACTIVE'),
('Associate Professor', 'TEACHING', 'ACTIVE'),
('Professor', 'TEACHING', 'ACTIVE'),
('Professor of Practice', 'TEACHING', 'ACTIVE'),
('Lecturer', 'TEACHING', 'ACTIVE');

-- Non-Teaching Positions (Linked to departments)
INSERT INTO positions (name, type, department_id, status)
SELECT 'Administrative Officer', 'NON_TEACHING', id, 'ACTIVE' FROM departments WHERE name = 'Administration'
UNION ALL
SELECT 'IT Support', 'NON_TEACHING', id, 'ACTIVE' FROM departments WHERE name = 'IT Maintenance'
UNION ALL
SELECT 'Security Officer', 'NON_TEACHING', id, 'ACTIVE' FROM departments WHERE name = 'Security'
UNION ALL
SELECT 'Lab Technician', 'NON_TEACHING', id, 'ACTIVE' FROM departments WHERE name = 'Lab Assistants';

-- ========================================
-- VERIFICATION QUERIES (Optional - to check data)
-- ========================================

-- Check departments
-- SELECT * FROM departments ORDER BY type, name;

-- Check branches
-- SELECT b.name as branch_name, d.name as department_name, b.status 
-- FROM branches b 
-- JOIN departments d ON b.department_id = d.id 
-- ORDER BY d.name, b.name;

-- Check positions
-- SELECT p.name as position_name, p.type, d.name as department_name, b.name as branch_name, p.status
-- FROM positions p
-- LEFT JOIN departments d ON p.department_id = d.id
-- LEFT JOIN branches b ON p.branch_id = b.id
-- ORDER BY p.type, p.name;
