-- -- Department and Position Management System
-- -- Creates dynamic department/position management for admin

-- -- 1. Departments table
-- CREATE TABLE departments (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL UNIQUE,
--     display_name VARCHAR(255) NOT NULL,
--     type VARCHAR(50) NOT NULL CHECK (type IN ('teaching', 'non-teaching')),
--     is_active BOOLEAN DEFAULT true,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- -- 2. Positions table
-- CREATE TABLE positions (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     display_name VARCHAR(255) NOT NULL,
--     department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
--     type VARCHAR(50) NOT NULL CHECK (type IN ('teaching', 'non-teaching')),
--     is_active BOOLEAN DEFAULT true,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(name, department_id)
-- );

-- -- 3. Branches table (for teaching departments only)
-- CREATE TABLE branches (
--     id SERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     display_name VARCHAR(255) NOT NULL,
--     department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
--     is_active BOOLEAN DEFAULT true,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     UNIQUE(name, department_id)
-- );

-- -- Update trigger for timestamps
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- -- Triggers
-- CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -- Insert default data from current hardcoded values

-- -- Teaching Departments
-- INSERT INTO departments (name, display_name, type) VALUES
-- ('engineering', 'School of Engineering & Technology', 'teaching'),
-- ('law', 'School of Law', 'teaching'),
-- ('management', 'School of Management', 'teaching'),
-- ('liberal', 'School of Liberal Studies', 'teaching');

-- -- Non-Teaching Departments
-- INSERT INTO departments (name, display_name, type) VALUES
-- ('admin', 'Administration', 'non-teaching'),
-- ('it', 'IT Maintenance', 'non-teaching'),
-- ('security', 'Security', 'non-teaching'),
-- ('lab', 'Lab Assistants', 'non-teaching');

-- -- Teaching Positions (can be applied to any teaching department)
-- INSERT INTO positions (name, display_name, department_id, type) 
-- SELECT 'assistant_professor', 'Assistant Professor', id, 'teaching' FROM departments WHERE type = 'teaching'
-- UNION ALL
-- SELECT 'associate_professor', 'Associate Professor', id, 'teaching' FROM departments WHERE type = 'teaching'
-- UNION ALL
-- SELECT 'professor', 'Professor', id, 'teaching' FROM departments WHERE type = 'teaching'
-- UNION ALL
-- SELECT 'professor_of_practice', 'Professor of Practice', id, 'teaching' FROM departments WHERE type = 'teaching'
-- UNION ALL
-- SELECT 'lecturer', 'Lecturer', id, 'teaching' FROM departments WHERE type = 'teaching';

-- -- Non-Teaching Positions (specific to each department)
-- INSERT INTO positions (name, display_name, department_id, type) VALUES
-- ((SELECT id FROM departments WHERE name = 'admin' AND type = 'non-teaching'), 'admin_officer', 'Administrative Officer', 'non-teaching'),
-- ((SELECT id FROM departments WHERE name = 'it' AND type = 'non-teaching'), 'it_support', 'IT Support', 'non-teaching'),
-- ((SELECT id FROM departments WHERE name = 'security' AND type = 'non-teaching'), 'security_officer', 'Security Officer', 'non-teaching'),
-- ((SELECT id FROM departments WHERE name = 'lab' AND type = 'non-teaching'), 'lab_technician', 'Lab Technician', 'non-teaching');

-- -- Teaching Branches
-- -- Engineering branches
-- INSERT INTO branches (name, display_name, department_id) VALUES
-- ('cse', 'Computer Science & Engineering', (SELECT id FROM departments WHERE name = 'engineering')),
-- ('mech', 'Mechanical Engineering', (SELECT id FROM departments WHERE name = 'engineering')),
-- ('ece', 'Electronics and Communication Engineering', (SELECT id FROM departments WHERE name = 'engineering')),
-- ('math', 'Mathematics', (SELECT id FROM departments WHERE name = 'engineering')),
-- ('chemistry', 'Chemistry', (SELECT id FROM departments WHERE name = 'engineering')),
-- ('physics', 'Physics', (SELECT id FROM departments WHERE name = 'engineering'));

-- -- Law branches
-- INSERT INTO branches (name, display_name, department_id) VALUES
-- ('criminal', 'Criminal Law', (SELECT id FROM departments WHERE name = 'law')),
-- ('corporate', 'Corporate Law', (SELECT id FROM departments WHERE name = 'law')),
-- ('civil', 'Civil Law', (SELECT id FROM departments WHERE name = 'law'));

-- -- Management branches
-- INSERT INTO branches (name, display_name, department_id) VALUES
-- ('finance', 'Finance', (SELECT id FROM departments WHERE name = 'management')),
-- ('marketing', 'Marketing', (SELECT id FROM departments WHERE name = 'management')),
-- ('hr', 'Human Resources', (SELECT id FROM departments WHERE name = 'management'));

-- -- Liberal branches
-- INSERT INTO branches (name, display_name, department_id) VALUES
-- ('english', 'English', (SELECT id FROM departments WHERE name = 'liberal')),
-- ('history', 'History', (SELECT id FROM departments WHERE name = 'liberal')),
-- ('sociology', 'Sociology', (SELECT id FROM departments WHERE name = 'liberal'));

-- -- Create indexes for better performance
-- CREATE INDEX idx_departments_type ON departments(type);
-- CREATE INDEX idx_departments_active ON departments(is_active);
-- CREATE INDEX idx_positions_department ON positions(department_id);
-- CREATE INDEX idx_positions_type ON positions(type);
-- CREATE INDEX idx_positions_active ON positions(is_active);
-- CREATE INDEX idx_branches_department ON branches(department_id);
-- CREATE INDEX idx_branches_active ON branches(is_active);