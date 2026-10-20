import { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

const emptyForm = {
  name: "",
  email: "",
  department: "",
  position: "",
  salary: "",
  status: "Active"
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadEmployees = useCallback(async (query) => {
    setLoading(true);
    setError("");

    try {
      const data = await api(
        `/api/employees?search=${encodeURIComponent(query)}`
      );
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadEmployees(search), 250);
    return () => clearTimeout(timer);
  }, [search, loadEmployees]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(item => item.status === "Active").length,
    departments: new Set(employees.map(item => item.department)).size,
    payroll: employees.reduce(
      (sum, item) => sum + Number(item.salary || 0), 0
    )
  }), [employees]);

  function updateField(event) {
    setForm(current => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function editEmployee(employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      email: employee.email,
      department: employee.department,
      position: employee.position,
      salary: String(employee.salary),
      status: employee.status
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const payload = {
      ...form,
      salary: Number(form.salary)
    };

    try {
      if (editingId !== null) {
        await api(`/api/employees/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setNotice("Employee updated successfully.");
      } else {
        await api("/api/employees", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setNotice("Employee added successfully.");
      }

      resetForm();
      await loadEmployees(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(employee) {
    if (!window.confirm(`Delete ${employee.name}? This cannot be undone.`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await api(`/api/employees/${employee.id}`, {
        method: "DELETE"
      });

      setNotice("Employee deleted successfully.");

      if (String(editingId) === String(employee.id)) {
        resetForm();
      }

      await loadEmployees(search);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/">
          <span className="brand-mark">E</span>
          <span>People<span className="brand-light">Desk</span></span>
        </a>
        <span className="workspace"><span className="status-dot" /> Employee workspace</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PEOPLE OPERATIONS</p>
          <h1>Employee management</h1>
          <p className="hero-copy">
            Keep your team directory organized in one place.
          </p>
        </div>
        <div className="hero-icon">✳</div>
      </section>

      {error && <div className="alert error" role="alert">{error}</div>}
      {notice && <div className="alert success" role="status">{notice}</div>}

      <section className="stats-grid">
        <article className="stat-card">
          <span>Employees shown</span>
          <strong>{stats.total}</strong>
          <small>Matching your search</small>
        </article>
        <article className="stat-card">
          <span>Active employees</span>
          <strong>{stats.active}</strong>
          <small>Currently active</small>
        </article>
        <article className="stat-card">
          <span>Departments</span>
          <strong>{stats.departments}</strong>
          <small>Across shown employees</small>
        </article>
        <article className="stat-card">
          <span>Shown payroll</span>
          <strong className="payroll">{formatMoney(stats.payroll)}</strong>
          <small>Total salary for shown employees</small>
        </article>
      </section>

      <section className="content-grid">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                {editingId !== null ? "UPDATE RECORD" : "NEW RECORD"}
              </p>
              <h2>{editingId !== null ? "Edit employee" : "Add an employee"}</h2>
            </div>
            {editingId !== null && (
              <button className="button secondary" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={submitForm}>
            <label>
              Full name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="e.g. Asha Kumar"
                maxLength="120"
                required
              />
            </label>

            <label>
              Work email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="asha@company.com"
                maxLength="255"
                required
              />
            </label>

            <div className="field-row">
              <label>
                Department
                <input
                  name="department"
                  value={form.department}
                  onChange={updateField}
                  placeholder="Engineering"
                  maxLength="100"
                  required
                />
              </label>
              <label>
                Position
                <input
                  name="position"
                  value={form.position}
                  onChange={updateField}
                  placeholder="Software Engineer"
                  maxLength="120"
                  required
                />
              </label>
            </div>

            <div className="field-row">
              <label>
                Annual salary (₹)
                <input
                  name="salary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salary}
                  onChange={updateField}
                  placeholder="600000"
                  required
                />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={updateField}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <button className="button primary submit-button" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save changes"
                  : "Add employee"}
            </button>
          </form>
        </section>

        <section className="panel directory-panel">
          <div className="panel-heading directory-heading">
            <div>
              <p className="eyebrow">TEAM DIRECTORY</p>
              <h2>Employees</h2>
            </div>
            <span className="count-pill">{employees.length} shown</span>
          </div>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search name, email, department..."
              aria-label="Search employees"
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty-state">Loading employees...</div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">♧</div>
              <strong>{search ? "No matching employees" : "No employees yet"}</strong>
              <p>
                {search
                  ? "Try another search term."
                  : "Add your first employee using the form."}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department / role</th>
                    <th>Salary</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => (
                    <tr key={employee.id}>
                      <td>
                        <div className="person-cell">
                          <span className="avatar">
                            {employee.name.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{employee.name}</strong>
                            <small>{employee.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <strong>{employee.department}</strong>
                        <small className="role-subtitle">{employee.position}</small>
                      </td>
                      <td>{formatMoney(employee.salary)}</td>
                      <td>
                        <span className={`status-pill ${
                          employee.status === "Active" ? "active" : "inactive"
                        }`}>
                          {employee.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => editEmployee(employee)}
                            aria-label={`Edit ${employee.name}`}
                          >✎</button>
                          <button
                            className="icon-button delete-button"
                            type="button"
                            onClick={() => deleteEmployee(employee)}
                            aria-label={`Delete ${employee.name}`}
                          >×</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="panel-footer">
            Changes are saved to your PostgreSQL database.
          </div>
        </section>
      </section>

      <footer className="footer">PeopleDesk · Employee workspace</footer>
    </main>
  );
}
