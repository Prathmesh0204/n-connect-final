import React, { useState, useEffect } from 'react';
import API_CONFIG from '../config/apiConfig';
import './AdminDashboard.css';

const AdminDashboard = ({ token, username, userStatus, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [flats, setFlats] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bills, setBills] = useState([]);
  const [cameraRequests, setCameraRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: ''
  });

  const [flatForm, setFlatForm] = useState({
    flat_number: '',
    floor: '',
    area_sqft: '',
    bedrooms: '1',
    bathrooms: '1',
    building: '',
    monthly_rent: ''
  });

  const [assignmentForm, setAssignmentForm] = useState({
    user_id: '',
    flat_id: '',
    assignment_type: 'tenant',
    notes: ''
  });

  const [billForm, setBillForm] = useState({
    flat_id: '',
    bill_type: 'maintenance',
    amount: '',
    bill_month: new Date().getMonth() + 1,
    bill_year: new Date().getFullYear(),
    due_date: ''
  });

  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    notification_type: 'general'
  });

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadActiveTabData();
    }, 30000);

    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    loadDashboardData();
    loadActiveTabData();
  }, [activeTab, token]);

  const loadActiveTabData = () => {
    switch (activeTab) {
      case 'users':
        loadUsers();
        break;
      case 'flats':
        loadFlats();
        break;
      case 'vehicles':
        loadVehicles();
        break;
      case 'complaints':
        loadComplaints();
        break;
      case 'bills':
        loadBills();
        break;
      case 'camera-requests':
        loadCameraRequests();
        break;
      case 'notifications':
        loadNotifications();
        break;
      default:
        break;
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load all data for dashboard stats
      await Promise.all([
        loadUsers(),
        loadFlats(),
        loadVehicles(),
        loadComplaints(),
        loadBills(),
        loadCameraRequests(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadFlats = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/flats/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setFlats(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading flats:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/vehicles/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadComplaints = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/complaints/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setComplaints(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
    }
  };

  const loadBills = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bills/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setBills(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  const loadCameraRequests = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/camera-requests/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setCameraRequests(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading camera requests:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/`, {
        headers: API_CONFIG.getHeaders(token)
      });
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // This view doesn't handle files, so JSON is correct.
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/`, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(token),
        body: JSON.stringify(userForm)
      });

      if (response.ok) {
        alert('User created successfully!');
        setUserForm({ username: '', email: '', first_name: '', last_name: '', password: '' });
        loadUsers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert('Error creating user');
    } finally {
      setLoading(false);
    }
  };

  // This view doesn't handle files, so JSON is correct.
  const handleCreateFlat = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/flats/`, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(token),
        body: JSON.stringify({
          ...flatForm,
          floor: flatForm.floor ? parseInt(flatForm.floor) : null,
          area_sqft: flatForm.area_sqft ? parseInt(flatForm.area_sqft) : null,
          bedrooms: parseInt(flatForm.bedrooms),
          bathrooms: parseInt(flatForm.bathrooms),
          monthly_rent: flatForm.monthly_rent ? parseFloat(flatForm.monthly_rent) : null
        })
      });

      if (response.ok) {
        alert('Flat created successfully!');
        setFlatForm({
          flat_number: '',
          floor: '',
          area_sqft: '',
          bedrooms: '1',
          bathrooms: '1',
          building: '',
          monthly_rent: ''
        });
        loadFlats();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert('Error creating flat');
    } finally {
      setLoading(false);
    }
  };

  // This view doesn't handle files, so JSON is correct.
  const handleAssignFlat = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/users/${assignmentForm.user_id}/assign_flat/`, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(token),
        body: JSON.stringify({
            flat_id: assignmentForm.flat_id,
            assignment_type: assignmentForm.assignment_type,
            notes: assignmentForm.notes
        })
      });

      if (response.ok) {
        alert('Flat assigned successfully!');
        setAssignmentForm({ user_id: '', flat_id: '', assignment_type: 'tenant', notes: '' });
        loadFlats();
        loadUsers();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert('Error assigning flat');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Using FormData for Bill Creation
  const handleCreateBill = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    // ✅ FIX: Changed key from 'flat' to 'flat_id' to match serializer
    formData.append('flat_id', billForm.flat_id);
    formData.append('bill_type', billForm.bill_type);
    formData.append('amount', billForm.amount);
    formData.append('bill_month', billForm.bill_month);
    formData.append('bill_year', billForm.bill_year);
    formData.append('due_date', billForm.due_date);
    formData.append('status', 'unpaid');

    const headers = API_CONFIG.getHeaders(token);
    delete headers['Content-Type'];

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/bills/`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (response.ok) {
        alert('Bill created successfully!');
        setBillForm({
          flat_id: '',
          bill_type: 'maintenance',
          amount: '',
          bill_month: new Date().getMonth() + 1,
          bill_year: new Date().getFullYear(),
          due_date: ''
        });
        loadBills();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert('Error creating bill');
    } finally {
      setLoading(false);
    }
  };

  // This view doesn't handle files, so JSON is correct.
  const handleCreateNotification = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/notifications/`, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(token),
        body: JSON.stringify({
          title: notificationForm.title,
          message: notificationForm.message,
          priority: notificationForm.priority,
          notification_type: notificationForm.notification_type,
          recipients: users.map(u => u.id)
        })
      });

      if (response.ok) {
        alert('Notification sent successfully!');
        setNotificationForm({
          title: '',
          message: '',
          priority: 'normal',
          notification_type: 'general'
        });
        loadNotifications();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert('Error sending notification');
    } finally {
      setLoading(false);
    }
  };

  // Using FormData for Updating Complaint Status
  const handleUpdateComplaintStatus = async (complaintId, newStatus) => {
    try {
      const adminResponse = newStatus === 'resolved'
        ? prompt('Enter admin response (optional):') || 'Resolved by admin'
        : '';

      const formData = new FormData();
      formData.append('status', newStatus);
      formData.append('admin_response', adminResponse);
      if (newStatus === 'resolved') {
        formData.append('resolved_at', new Date().toISOString());
      }

      const headers = API_CONFIG.getHeaders(token);
      delete headers['Content-Type'];

      const response = await fetch(`${API_CONFIG.BASE_URL}/complaints/${complaintId}/update_status/`, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (response.ok) {
        alert('Complaint status updated!');
        loadComplaints();
      } else {
        alert('Error updating complaint status');
      }
    } catch (error) {
      alert('Error updating complaint status');
    }
  };

  // Using FormData for Approving Camera Request
  const handleApproveCameraRequest = async (requestId) => {
    try {
      const accessLink = prompt('Enter camera access link:') || 'http://camera.access.link';

      const formData = new FormData();
      formData.append('status', 'approved');
      formData.append('access_link', accessLink);

      const headers = API_CONFIG.getHeaders(token);
      delete headers['Content-Type'];

      const response = await fetch(`${API_CONFIG.BASE_URL}/camera-requests/${requestId}/`, {
        method: 'PATCH',
        headers: headers,
        body: formData
      });

      if (response.ok) {
        alert('Camera request approved!');
        loadCameraRequests();
      } else {
        alert('Error approving camera request');
      }
    } catch (error) {
      alert('Error approving camera request');
    }
  };

  // Using FormData for Rejecting Camera Request
  const handleRejectCameraRequest = async (requestId) => {
    try {
      const formData = new FormData();
      formData.append('status', 'rejected');

      const headers = API_CONFIG.getHeaders(token);
      delete headers['Content-Type'];

      const response = await fetch(`${API_CONFIG.BASE_URL}/camera-requests/${requestId}/`, {
        method: 'PATCH',
        headers: headers,
        body: formData
      });

      if (response.ok) {
        alert('Camera request rejected!');
        loadCameraRequests();
      } else {
        alert('Error rejecting camera request');
      }
    } catch (error) {
      alert('Error rejecting camera request');
    }
  };

  // ... (No changes to exportToCSV, filter functions, or stats calculation)

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8,"
      + Object.keys(data[0]).join(',') + '\n'
      + data.map(row => Object.values(row).map(val =>
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter functions
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFlats = flats.filter(flat =>
    flat.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (flat.building && flat.building.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredComplaints = complaints.filter(complaint =>
    complaint.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === '' || complaint.status === filterStatus) &&
    (filterPriority === '' || complaint.priority === filterPriority)
  );

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.resident && vehicle.resident.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredBills = bills.filter(bill =>
    bill.flat && bill.flat.flat_number.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterStatus === '' || bill.status === filterStatus)
  );

  // Calculate stats for dashboard
  const stats_calculated = {
    total_users: users.length,
    total_flats: flats.length,
    occupied_flats: flats.filter(f => f.is_occupied).length,
    total_vehicles: vehicles.length,
    pending_complaints: complaints.filter(c => c.status !== 'resolved').length,
    overdue_bills: bills.filter(b => b.status === 'overdue').length,
    pending_camera_requests: cameraRequests.filter(r => r.status === 'pending').length,
    active_notifications: notifications.length,
    total_revenue: bills.reduce((total, bill) => total + parseFloat(bill.amount || '0'), 0)
  };

  return (
    // ... (The entire JSX/HTML structure remains unchanged)
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <div className="admin-logo">
              <span>NC</span>
            </div>
            <div className="header-info">
              <h1>N-Connect Admin</h1>
              <p>Society Management System</p>
            </div>
          </div>
          <div className="header-right">
            <span className="admin-badge">
              Admin: {userStatus?.first_name || username}
            </span>
            <button onClick={onLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="admin-layout">
        {/* Sidebar */}
        <div className="admin-sidebar">
          <div className="sidebar-content">
            <div className="sidebar-menu">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                { id: 'users', label: 'User Management', icon: '👥' },
                { id: 'flats', label: 'Flat Management', icon: '🏢' },
                { id: 'assign-flats', label: 'Assign Flats', icon: '🔗' },
                { id: 'complaints', label: 'Complaints', icon: '📝' },
                { id: 'bills', label: 'Billing', icon: '💰' },
                { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
                { id: 'camera-requests', label: 'Camera Requests', icon: '📹' },
                { id: 'notifications', label: 'Notifications', icon: '📢' },
                { id: 'reports', label: 'Reports', icon: '📈' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="admin-main">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <h2 className="page-title">Admin Dashboard Overview</h2>

              {/* Admin Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">Total Users</p>
                      <p className="stat-value">{stats_calculated.total_users}</p>
                    </div>
                    <div className="stat-icon blue">
                      <span>👥</span>
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">Total Flats</p>
                      <p className="stat-value">{stats_calculated.total_flats}</p>
                    </div>
                    <div className="stat-icon green">
                      <span>🏢</span>
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">Pending Complaints</p>
                      <p className="stat-value">{stats_calculated.pending_complaints}</p>
                    </div>
                    <div className="stat-icon yellow">
                      <span>📝</span>
                    </div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">Overdue Bills</p>
                      <p className="stat-value">{stats_calculated.overdue_bills}</p>
                    </div>
                    <div className="stat-icon red">
                      <span>💰</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Quick Actions */}
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3 className="card-title">🚀 Admin Quick Actions</h3>
                  <div className="quick-actions">
                    <button onClick={() => setActiveTab('users')} className="quick-action-btn">
                      <span>👤 Create New User</span>
                    </button>
                    <button onClick={() => setActiveTab('flats')} className="quick-action-btn">
                      <span>🏠 Add New Flat</span>
                    </button>
                    <button onClick={() => setActiveTab('bills')} className="quick-action-btn">
                      <span>💳 Generate Bills</span>
                    </button>
                    <button onClick={() => setActiveTab('notifications')} className="quick-action-btn">
                      <span>📢 Send Notification</span>
                    </button>
                  </div>
                </div>

                <div className="dashboard-card">
                  <h3 className="card-title">📊 System Status</h3>
                  <div className="system-status">
                    <div className="status-item">
                      <span className="status-label">Occupied Flats:</span>
                      <span className="status-value">
                        {stats_calculated.occupied_flats}/{stats_calculated.total_flats}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Total Vehicles:</span>
                      <span className="status-value">{stats_calculated.total_vehicles}</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Camera Requests:</span>
                      <span className="status-value">{stats_calculated.pending_camera_requests}</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">Total Revenue:</span>
                      <span className="status-value">₹{stats_calculated.total_revenue.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="users-content">
              <h2 className="page-title">👥 User Management</h2>

              {/* Create User Form */}
              <div className="content-card">
                <h3 className="card-title">Create New User</h3>
                <form onSubmit={handleCreateUser} className="form-grid">
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      placeholder="Enter username"
                      value={userForm.username}
                      onChange={(e) => setUserForm({...userForm, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      value={userForm.first_name}
                      onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      value={userForm.last_name}
                      onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <button type="submit" disabled={loading} className="primary-btn">
                      {loading ? 'Creating...' : '✅ Create User'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Search Users */}
              <div className="content-card">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search users by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <button
                    onClick={() => exportToCSV(filteredUsers, 'users.csv')}
                    className="export-btn"
                  >
                    📥 Export Users CSV
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="content-card">
                <h3 className="card-title">All Users ({filteredUsers.length})</h3>
                {filteredUsers.length === 0 ? (
                  <p className="no-data">No users found</p>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Email</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id}>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>{user.first_name} {user.last_name}</td>
                            <td>
                              <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td>
                              {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Flat Management Tab */}
          {activeTab === 'flats' && (
            <div className="flats-content">
              <h2 className="page-title">🏢 Flat Management</h2>

              {/* Create Flat Form */}
              <div className="content-card">
                <h3 className="card-title">Add New Flat</h3>
                <form onSubmit={handleCreateFlat} className="form-grid">
                  <div className="form-group">
                    <label>Flat Number</label>
                    <input
                      type="text"
                      placeholder="e.g., A101"
                      value={flatForm.flat_number}
                      onChange={(e) => setFlatForm({...flatForm, flat_number: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Floor</label>
                    <input
                      type="number"
                      placeholder="Floor number"
                      value={flatForm.floor}
                      onChange={(e) => setFlatForm({...flatForm, floor: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Area (sq ft)</label>
                    <input
                      type="number"
                      placeholder="Area in square feet"
                      value={flatForm.area_sqft}
                      onChange={(e) => setFlatForm({...flatForm, area_sqft: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bedrooms</label>
                    <select
                      value={flatForm.bedrooms}
                      onChange={(e) => setFlatForm({...flatForm, bedrooms: e.target.value})}
                    >
                      <option value="1">1 Bedroom</option>
                      <option value="2">2 Bedrooms</option>
                      <option value="3">3 Bedrooms</option>
                      <option value="4">4 Bedrooms</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bathrooms</label>
                    <select
                      value={flatForm.bathrooms}
                      onChange={(e) => setFlatForm({...flatForm, bathrooms: e.target.value})}
                    >
                      <option value="1">1 Bathroom</option>
                      <option value="2">2 Bathrooms</option>
                      <option value="3">3 Bathrooms</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Building</label>
                    <input
                      type="text"
                      placeholder="e.g., Tower A"
                      value={flatForm.building}
                      onChange={(e) => setFlatForm({...flatForm, building: e.target.value})}
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">
                      {loading ? 'Creating...' : '✅ Create Flat'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Search Flats */}
              <div className="content-card">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search flats by number or building..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <button
                    onClick={() => exportToCSV(filteredFlats, 'flats.csv')}
                    className="export-btn"
                  >
                    📥 Export Flats CSV
                  </button>
                </div>
              </div>

              {/* Flats List */}
              <div className="content-card">
                <h3 className="card-title">All Flats ({filteredFlats.length})</h3>
                {filteredFlats.length === 0 ? (
                  <p className="no-data">No flats found</p>
                ) : (
                  <div className="flats-grid">
                    {filteredFlats.map(flat => (
                      <div key={flat.id} className="flat-item">
                        <div className="flat-header">
                          <h4>Flat {flat.flat_number}</h4>
                          <span className={`status-badge ${flat.is_occupied ? 'inactive' : 'active'}`}>
                            {flat.is_occupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </div>
                        <div className="flat-details">
                          {flat.floor && <p>🏢 Floor: {flat.floor}</p>}
                          {flat.area_sqft && <p>📐 Area: {flat.area_sqft} sq ft</p>}
                          {flat.building && <p>🏗️ Building: {flat.building}</p>}
                          {flat.bedrooms && <p>🛏️ Bedrooms: {flat.bedrooms}</p>}
                          {flat.bathrooms && <p>🚿 Bathrooms: {flat.bathrooms}</p>}
                          {flat.monthly_rent && <p>💰 Rent: ₹{flat.monthly_rent}/month</p>}
                          {flat.owner && (
                            <p className="owner-info">👤 Owner: {flat.owner.username}</p>
                          )}
                          {flat.tenants && flat.tenants.length > 0 && (
                            <p className="tenant-info">
                              🏠 Tenants: {flat.tenants.map(t => t.username).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assign Flats Tab */}
          {activeTab === 'assign-flats' && (
            <div className="assign-flats-content">
              <h2 className="page-title">🔗 Assign Flats to Users</h2>

              <div className="content-card">
                <h3 className="card-title">Assign Flat</h3>
                <form onSubmit={handleAssignFlat} className="form-grid">
                  <div className="form-group">
                    <label>Select User</label>
                    <select
                      value={assignmentForm.user_id}
                      onChange={(e) => setAssignmentForm({...assignmentForm, user_id: e.target.value})}
                      required
                    >
                      <option value="">Select User</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.username} - {user.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Select Flat</label>
                    <select
                      value={assignmentForm.flat_id}
                      onChange={(e) => setAssignmentForm({...assignmentForm, flat_id: e.target.value})}
                      required
                    >
                      <option value="">Select Flat</option>
                      {flats.map(flat => (
                        <option key={flat.id} value={flat.id}>
                          {flat.flat_number} ({flat.building || 'No Building'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assignment Type</label>
                    <select
                      value={assignmentForm.assignment_type}
                      onChange={(e) => setAssignmentForm({...assignmentForm, assignment_type: e.target.value})}
                    >
                      <option value="owner">Owner</option>
                      <option value="tenant">Tenant</option>
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <label>Notes (Optional)</label>
                    <textarea
                      value={assignmentForm.notes}
                      onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
                      rows={3}
                      placeholder="Add any notes about the assignment..."
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">
                      {loading ? 'Assigning...' : '✅ Assign Flat'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Complaints Management */}
          {activeTab === 'complaints' && (
            <div className="complaints-content">
              <h2 className="page-title">📝 Complaints Management</h2>

              {/* Filters */}
              <div className="content-card">
                <div className="filters-grid">
                  <input
                    type="text"
                    placeholder="Search complaints..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                  >
                    <option value="">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <button
                    onClick={() => exportToCSV(filteredComplaints, 'complaints.csv')}
                    className="export-btn"
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>

              {/* Complaints List */}
              <div className="content-card">
                <h3 className="card-title">All Complaints ({filteredComplaints.length})</h3>
                {filteredComplaints.length === 0 ? (
                  <p className="no-data">No complaints found</p>
                ) : (
                  <div className="complaints-list">
                    {filteredComplaints.map(complaint => (
                      <div key={complaint.id} className="complaint-item">
                        <div className="complaint-header">
                          <div className="complaint-info">
                            <h4>{complaint.title}</h4>
                            <p>{complaint.description}</p>
                            <div className="complaint-meta">
                              {complaint.flat && <span>📍 Flat: {complaint.flat.flat_number}</span>}
                              <span>👤 By: {complaint.author.username}</span>
                              <span>📅 {new Date(complaint.created_at).toLocaleDateString()}</span>
                              <span>📁 {complaint.category}</span>
                            </div>
                          </div>
                          <div className="complaint-badges">
                            <span className={`priority-badge ${complaint.priority}`}>
                              {complaint.priority}
                            </span>
                            <span className={`status-badge ${complaint.status.replace('_', '-')}`}>
                              {complaint.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        {/* ✅ ADMIN ACTIONS */}
                        {complaint.status !== 'resolved' && (
                          <div className="complaint-actions">
                            <button
                              onClick={() => handleUpdateComplaintStatus(complaint.id, 'in_progress')}
                              className="action-btn progress"
                            >
                              🔄 In Progress
                            </button>
                            <button
                              onClick={() => handleUpdateComplaintStatus(complaint.id, 'resolved')}
                              className="action-btn resolve"
                            >
                              ✅ Resolve
                            </button>
                          </div>
                        )}

                        {complaint.admin_response && (
                          <div className="admin-response">
                            <p><strong>Admin Response:</strong> {complaint.admin_response}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bills Management */}
          {activeTab === 'bills' && (
            <div className="bills-content">
              <h2 className="page-title">💰 Billing Management</h2>

              {/* Create Bill Form */}
              <div className="content-card">
                <h3 className="card-title">Generate New Bill</h3>
                <form onSubmit={handleCreateBill} className="form-grid">
                  <div className="form-group">
                    <label>Select Flat</label>
                    <select
                      value={billForm.flat_id}
                      onChange={(e) => setBillForm({...billForm, flat_id: e.target.value})}
                      required
                    >
                      <option value="">Select Flat</option>
                      {flats.map(flat => (
                        <option key={flat.id} value={flat.id}>
                          {flat.flat_number} ({flat.building || 'No Building'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bill Type</label>
                    <select
                      value={billForm.bill_type}
                      onChange={(e) => setBillForm({...billForm, bill_type: e.target.value})}
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="electricity">Electricity</option>
                      <option value="water">Water</option>
                      <option value="gas">Gas</option>
                      <option value="parking">Parking</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={billForm.amount}
                      onChange={(e) => setBillForm({...billForm, amount: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Month</label>
                    <select
                      value={billForm.bill_month}
                      onChange={(e) => setBillForm({...billForm, bill_month: parseInt(e.target.value)})}
                    >
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={i+1}>
                          {new Date(2023, i).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Year</label>
                    <input
                      type="number"
                      value={billForm.bill_year}
                      onChange={(e) => setBillForm({...billForm, bill_year: parseInt(e.target.value)})}
                      min="2023"
                      max="2030"
                    />
                  </div>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      value={billForm.due_date}
                      onChange={(e) => setBillForm({...billForm, due_date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">
                      {loading ? 'Generating...' : '✅ Generate Bill'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Bills Filter */}
              <div className="content-card">
                <div className="filters-grid">
                  <input
                    type="text"
                    placeholder="Search by flat number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <button
                    onClick={() => exportToCSV(filteredBills, 'bills.csv')}
                    className="export-btn"
                  >
                    📥 Export Bills CSV
                  </button>
                </div>
              </div>

              {/* Bills List */}
              <div className="content-card">
                <h3 className="card-title">All Bills ({filteredBills.length})</h3>
                {filteredBills.length === 0 ? (
                  <p className="no-data">No bills found</p>
                ) : (
                  <div className="bills-list">
                    {filteredBills.map(bill => (
                      <div key={bill.id} className="bill-item">
                        <div className="bill-header">
                          <div className="bill-info">
                            <h4>🏠 Flat {bill.flat.flat_number} - {bill.bill_type.charAt(0).toUpperCase() + bill.bill_type.slice(1)} Bill</h4>
                            <p className="bill-amount">₹{bill.amount}</p>
                            <div className="bill-meta">
                              <span>📅 Period: {String(bill.bill_month).padStart(2, '0')}/{bill.bill_year}</span>
                              <span>⏰ Due: {new Date(bill.due_date).toLocaleDateString()}</span>
                              {bill.payment_date && (
                                <span>✅ Paid: {new Date(bill.payment_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <span className={`status-badge ${bill.status}`}>
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vehicles Management */}
          {activeTab === 'vehicles' && (
            <div className="vehicles-content">
              <h2 className="page-title">🚗 Vehicle Management</h2>

              {/* Vehicle Search */}
              <div className="content-card">
                <div className="search-bar">
                  <input
                    type="text"
                    placeholder="Search by vehicle number, owner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <button
                    onClick={() => exportToCSV(filteredVehicles, 'vehicles.csv')}
                    className="export-btn"
                  >
                    📥 Export Vehicles CSV
                  </button>
                </div>
              </div>

              {/* Vehicles List */}
              <div className="content-card">
                <h3 className="card-title">All Vehicles ({filteredVehicles.length})</h3>
                {filteredVehicles.length === 0 ? (
                  <p className="no-data">No vehicles found</p>
                ) : (
                  <div className="vehicles-grid">
                    {filteredVehicles.map(vehicle => (
                      <div key={vehicle.id} className="vehicle-item">
                        <div className="vehicle-header">
                          <h4>{vehicle.vehicle_number}</h4>
                          <span className={`status-badge ${vehicle.is_active ? 'active' : 'inactive'}`}>
                            {vehicle.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="vehicle-details">
                          <p>🚗 {vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}</p>
                          {vehicle.brand && <p>🏭 {vehicle.brand} ({vehicle.color})</p>}
                          <p className="vehicle-owner">👤 Owner: {vehicle.resident ? vehicle.resident.username : 'Unknown'}</p>
                          <p>📅 Registered: {new Date(vehicle.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera Requests Management */}
          {activeTab === 'camera-requests' && (
            <div className="camera-requests-content">
              <h2 className="page-title">📹 Camera Access Requests</h2>

              <div className="content-card">
                <div className="content-header">
                  <h3 className="card-title">All Requests ({cameraRequests.length})</h3>
                  <button
                    onClick={() => exportToCSV(cameraRequests, 'camera_requests.csv')}
                    className="export-btn"
                  >
                    📥 Export CSV
                  </button>
                </div>
                {cameraRequests.length === 0 ? (
                  <p className="no-data">No camera requests found</p>
                ) : (
                  <div className="requests-list">
                    {cameraRequests.map(request => (
                      <div key={request.id} className="request-item">
                        <div className="request-header">
                          <div className="request-info">
                            <h4>📹 {request.requester.username} - Flat {request.flat.flat_number}</h4>
                            <p>{request.reason}</p>
                            <div className="request-meta">
                              <span>📅 Date: {new Date(request.requested_date).toLocaleDateString()}</span>
                              <span>⏰ Duration: {request.duration_hours} hours</span>
                              <span>📝 Requested: {new Date(request.requested_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className={`status-badge ${request.status}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>

                        {/* ✅ ADMIN ACTIONS */}
                        {request.status === 'pending' && (
                          <div className="request-actions">
                            <button
                              onClick={() => handleApproveCameraRequest(request.id)}
                              className="action-btn approve"
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleRejectCameraRequest(request.id)}
                              className="action-btn reject"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}

                        {request.access_link && (
                          <div className="access-link">
                            <p>
                              <strong>Access Link:</strong>
                              <a href={request.access_link} target="_blank" rel="noopener noreferrer">
                                {request.access_link}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Management */}
          {activeTab === 'notifications' && (
            <div className="notifications-content">
              <h2 className="page-title">📢 Notifications Management</h2>

              {/* Create Notification Form */}
              <div className="content-card">
                <h3 className="card-title">Send New Notification</h3>
                <form onSubmit={handleCreateNotification} className="form-grid">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      placeholder="Notification Title"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={notificationForm.notification_type}
                      onChange={(e) => setNotificationForm({...notificationForm, notification_type: e.target.value})}
                    >
                      <option value="general">General</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="billing">Billing</option>
                      <option value="security">Security</option>
                      <option value="event">Event</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={notificationForm.priority}
                      onChange={(e) => setNotificationForm({...notificationForm, priority: e.target.value})}
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <label>Message</label>
                    <textarea
                      placeholder="Notification Message"
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">
                      {loading ? 'Sending...' : '✅ Send Notification to All Users'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Notifications List */}
              <div className="content-card">
                <div className="content-header">
                  <h3 className="card-title">Sent Notifications ({notifications.length})</h3>
                  <button
                    onClick={() => exportToCSV(notifications, 'notifications.csv')}
                    className="export-btn"
                  >
                    📥 Export CSV
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="no-data">No notifications found</p>
                ) : (
                  <div className="notifications-list">
                    {notifications.map(notification => (
                      <div key={notification.id} className="notification-item">
                        <div className="notification-header">
                          <div className="notification-info">
                            <h4>{notification.title}</h4>
                            <p>{notification.message}</p>
                            <div className="notification-meta">
                              <span>📅 Sent: {new Date(notification.created_at).toLocaleDateString()}</span>
                              <span>👤 By: {notification.created_by.username}</span>
                              <span>👥 Recipients: {notification.recipients.length}</span>
                            </div>
                          </div>
                          <div className="notification-badges">
                            <span className={`priority-badge ${notification.priority}`}>
                              {notification.priority}
                            </span>
                            <span className="type-badge">
                              {notification.notification_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reports & Analytics */}
          {activeTab === 'reports' && (
            <div className="reports-content">
              <h2 className="page-title">📈 Reports & Analytics</h2>

              <div className="reports-grid">
                {/* Monthly Summary */}
                <div className="report-card">
                  <h3 className="card-title">📊 Monthly Summary</h3>
                  <div className="report-stats">
                    <div className="report-stat">
                      <span className="stat-label">New Users This Month:</span>
                      <span className="stat-value">{users.length}</span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Complaints Resolved:</span>
                      <span className="stat-value">
                        {complaints.filter(c => c.status === 'resolved').length}
                      </span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Bills Generated:</span>
                      <span className="stat-value">{bills.length}</span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Collection Rate:</span>
                      <span className="stat-value">
                        {bills.length > 0 ? Math.round((bills.filter(b => b.status === 'paid').length / bills.length) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="report-card">
                  <h3 className="card-title">🏥 System Health</h3>
                  <div className="report-stats">
                    <div className="report-stat">
                      <span className="stat-label">Occupancy Rate:</span>
                      <span className="stat-value">
                        {flats.length > 0 ? Math.round((flats.filter(f => f.is_occupied).length / flats.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Response Time:</span>
                      <span className="stat-value">{'< 24 hrs'}</span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">User Satisfaction:</span>
                      <span className="stat-value">95%</span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">System Uptime:</span>
                      <span className="stat-value">99.9%</span>
                    </div>
                  </div>
                </div>

                {/* Export Options */}
                <div className="report-card">
                  <h3 className="card-title">📥 Export All Data</h3>
                  <div className="export-actions">
                    <button
                      onClick={() => exportToCSV(users, 'all_users.csv')}
                      className="export-action-btn"
                    >
                      📊 Export All Users
                    </button>
                    <button
                      onClick={() => exportToCSV(flats, 'all_flats.csv')}
                      className="export-action-btn"
                    >
                      🏢 Export All Flats
                    </button>
                    <button
                      onClick={() => exportToCSV(bills, 'all_bills.csv')}
                      className="export-action-btn"
                    >
                      💰 Export All Bills
                    </button>
                    <button
                      onClick={() => exportToCSV(complaints, 'all_complaints.csv')}
                      className="export-action-btn"
                    >
                      📝 Export All Complaints
                    </button>
                  </div>
                </div>

                {/* Revenue Stats */}
                <div className="report-card">
                  <h3 className="card-title">⚡ Financial Overview</h3>
                  <div className="report-stats">
                    <div className="report-stat">
                      <span className="stat-label">Total Revenue:</span>
                      <span className="stat-value">
                        ₹{bills.reduce((total, bill) => total + parseFloat(bill.amount || '0'), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Pending Amount:</span>
                      <span className="stat-value pending-amount">
                        ₹{bills.filter(b => b.status !== 'paid').reduce((total, bill) => total + parseFloat(bill.amount || '0'), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Avg Response Time:</span>
                      <span className="stat-value">18 hours</span>
                    </div>
                    <div className="report-stat">
                      <span className="stat-label">Active Vehicles:</span>
                      <span className="stat-value">
                        {vehicles.filter(v => v.is_active).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

