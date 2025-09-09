// UserDashboard.js (version 1.1.0 - Merged)
import React, { useState, useEffect, useCallback } from 'react';
import API_CONFIG from '../config/apiConfig';
import {
  FaChartBar, FaHome, FaClipboardList, FaMoneyBillAlt, FaCar,
  FaVideo, FaBell, FaUser, FaSignOutAlt, FaBuilding,
  FaBed, FaBath, FaRulerCombined, FaUserCircle, FaUsers,
  FaExclamationCircle, FaClock, FaCheckCircle, FaTimesCircle, FaLink,
  FaPaperPlane, FaCreditCard, FaRocket,
  FaCog, FaInfoCircle, FaTag, FaCalendarAlt, FaBars
} from 'react-icons/fa';
import './UserDashboard.css';

const UserDashboard = ({ token, username, userStatus, onLogout }) => {
  // Get initial tab from URL hash for better UX (back button support, sharable links)
  const getTabFromHash = () => window.location.hash.replace('#', '') || 'dashboard';

  const [activeTab, setActiveTab] = useState(getTabFromHash());
  const [flats, setFlats] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bills, setBills] = useState([]);
  const [cameraRequests, setCameraRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form states
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '', priority: 'medium', category: 'maintenance', flat_id: '' });
  const [vehicleForm, setVehicleForm] = useState({ vehicle_number: '', vehicle_type: 'car', brand: '', color: '' });
  const [cameraRequestForm, setCameraRequestForm] = useState({ reason: '', requested_date: '', duration_hours: 1, flat_id: '' });
  const [profileForm, setProfileForm] = useState({ first_name: userStatus?.first_name || '', last_name: userStatus?.last_name || '', email: userStatus?.email || '', phone: '', emergency_contact: '', emergency_contact_name: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // --- NEW: Refactored & Optimized Logic from v2.0.0 ---

  const loadActiveTabData = useCallback(() => {
    const currentTab = getTabFromHash();
    switch (currentTab) {
      case 'dashboard':
        loadFlats();
        loadComplaints();
        loadBills();
        loadNotifications();
        break;
      case 'flats': loadFlats(); break;
      case 'vehicles': loadVehicles(); break;
      case 'complaints': loadComplaints(); break;
      case 'bills': loadBills(); break;
      case 'camera-requests': loadCameraRequests(); break;
      case 'notifications': loadNotifications(); break;
      default:
        // Redirect to dashboard if hash is invalid
        if (currentTab !== 'dashboard') {
          window.location.hash = 'dashboard';
        }
        break;
    }
  }, [token, username, userStatus]);

  // Effect for handling browser navigation (back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTab(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Effect to load data when the active tab (from hash) changes
  useEffect(() => {
    loadActiveTabData();
  }, [activeTab, loadActiveTabData]);

  // Auto-refresh interval
  useEffect(() => {
    const interval = setInterval(loadActiveTabData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [loadActiveTabData]);

  // Set default flat ID in forms once flats are loaded
  useEffect(() => {
    if (flats.length > 0) {
      setComplaintForm(prev => ({ ...prev, flat_id: prev.flat_id || flats[0].id }));
      setCameraRequestForm(prev => ({ ...prev, flat_id: prev.flat_id || flats[0].id }));
    }
  }, [flats]);

  // Generic helper for fetching data (GET requests)
  const fetchData = async (url, setter) => {
    try {
      const response = await fetch(url, { headers: API_CONFIG.getHeaders(token) });
      const data = await response.json();
      setter(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error(`Error loading data from ${url}:`, error);
    }
  };

  // API call functions using the generic fetcher
  const loadFlats = () => fetchData(`${API_CONFIG.BASE_URL}/flats/?resident=${userStatus.id}`, setFlats);
  const loadVehicles = () => fetchData(`${API_CONFIG.BASE_URL}/vehicles/?resident__username=${username}`, setVehicles);
  const loadComplaints = () => fetchData(`${API_CONFIG.BASE_URL}/complaints/?author__username=${username}`, setComplaints);
  const loadBills = () => fetchData(`${API_CONFIG.BASE_URL}/bills/?flat__owner__username=${username}`, setBills);
  const loadCameraRequests = () => fetchData(`${API_CONFIG.BASE_URL}/camera-requests/?requester__username=${username}`, setCameraRequests);
  const loadNotifications = () => fetchData(`${API_CONFIG.BASE_URL}/notifications/`, setNotifications);

  // Generic helper for submitting form data (POST/PUT/PATCH)
  const postFormData = async (url, formData, onSuccess, method = 'POST') => {
    setLoading(true);
    const headers = API_CONFIG.getHeaders(token);
    delete headers['Content-Type']; // Let browser set Content-Type for FormData
    try {
      const response = await fetch(url, { method, headers, body: formData });
      if (response.ok) {
        onSuccess();
      } else {
        const errorData = await response.json();
        alert(`Error: ${JSON.stringify(errorData)}`);
      }
    } catch (error) {
      alert(`An error occurred: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Form submission handlers using the generic poster
  const handleSubmitComplaint = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(complaintForm).forEach(key => formData.append(key, complaintForm[key]));
    postFormData(`${API_CONFIG.BASE_URL}/complaints/`, formData, () => {
      alert('Complaint submitted successfully!');
      setComplaintForm({ title: '', description: '', priority: 'medium', category: 'maintenance', flat_id: flats.length > 0 ? flats[0].id : '' });
      loadComplaints();
    });
  };

  const handleRegisterVehicle = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(vehicleForm).forEach(key => formData.append(key, vehicleForm[key]));
    postFormData(`${API_CONFIG.BASE_URL}/vehicles/`, formData, () => {
      alert('Vehicle registered successfully!');
      setVehicleForm({ vehicle_number: '', vehicle_type: 'car', brand: '', color: '' });
      loadVehicles();
    });
  };

  const handleRequestCameraAccess = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.keys(cameraRequestForm).forEach(key => formData.append(key, cameraRequestForm[key]));
    postFormData(`${API_CONFIG.BASE_URL}/camera-requests/`, formData, () => {
      alert('Camera access request submitted successfully!');
      setCameraRequestForm({ reason: '', requested_date: '', duration_hours: 1, flat_id: flats.length > 0 ? flats[0].id : '' });
      loadCameraRequests();
    });
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(profileForm).forEach(([key, value]) => formData.append(key, value));
    postFormData(`${API_CONFIG.BASE_URL}/profile/update/`, formData, () => {
      alert('Profile updated successfully!');
    }, 'PUT');
  };

  const handlePayBill = (billId) => {
    const formData = new FormData();
    formData.append('status', 'paid');
    formData.append('payment_date', new Date().toISOString());
    postFormData(`${API_CONFIG.BASE_URL}/bills/${billId}/`, formData, () => {
      alert('Bill payment processed successfully!');
      loadBills();
    }, 'PATCH');
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      await fetch(`${API_CONFIG.BASE_URL}/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: API_CONFIG.getHeaders(token)
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // --- End of Refactored Logic Section ---

  // Filtered data (using the more comprehensive search from v1.1.0)
  const filteredComplaints = complaints.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.category.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredBills = bills.filter(b => b.bill_type.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredNotifications = notifications.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.message.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredVehicles = vehicles.filter(v => v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()));

  // Dashboard stats
  const stats = {
    total_complaints: complaints.length,
    pending_complaints: complaints.filter(c => c.status !== 'resolved').length,
    total_bills: bills.length,
    unpaid_bills: bills.filter(b => b.status !== 'paid').length,
    total_vehicles: vehicles.length,
    unread_notifications: notifications.filter(n => !n.is_read).length
  };

  // Tab navigation handler that updates URL hash
  const handleTabClick = (tabId) => {
    window.location.hash = tabId;
    setSidebarOpen(false);
  };

  return (
    <div className="user-dashboard">
      {/* Header from v1.1.0 */}
      <header className="user-header">
        <div className="header-content">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <div className="user-logo"><span>NC</span></div>
            <div className="header-info">
              <h1>N-Connect Resident</h1>
              <p>Welcome, {userStatus?.first_name || username}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="notification-bell">
              <button onClick={() => handleTabClick('notifications')} className="bell-btn">
                <FaBell />
                {stats.unread_notifications > 0 && (
                  <span className="notification-badge">{stats.unread_notifications}</span>
                )}
              </button>
            </div>
            <span className="user-badge"><FaUserCircle /> {username}</span>
            <button onClick={onLogout} className="logout-btn"><FaSignOutAlt /> Logout</button>
          </div>
        </div>
      </header>

      <div className="user-layout">
        {/* Sidebar from v1.1.0, adapted for hash navigation */}
        <div className={`user-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-content">
            <div className="sidebar-menu">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <FaChartBar /> },
                { id: 'flats', label: 'My Flats', icon: <FaHome /> },
                { id: 'complaints', label: 'Complaints', icon: <FaClipboardList /> },
                { id: 'bills', label: 'Bills & Payments', icon: <FaMoneyBillAlt /> },
                { id: 'vehicles', label: 'My Vehicles', icon: <FaCar /> },
                { id: 'camera-requests', label: 'Camera Access', icon: <FaVideo /> },
                { id: 'notifications', label: 'Notifications', icon: <FaBell /> },
                { id: 'profile', label: 'My Profile', icon: <FaUser /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)} // NEW: Use hash navigation handler
                  className={`sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="sidebar-icon">{tab.icon}</span>
                  <span className="sidebar-label">{tab.label}</span>
                  {tab.id === 'notifications' && stats.unread_notifications > 0 && (
                    <span className="sidebar-badge">{stats.unread_notifications}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

        {/* --- Main Content: All complete JSX from v1.1.0 is restored below --- */}
        <main className="user-main">
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <h2 className="page-title"><FaChartBar /> Dashboard Overview</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">My Complaints</p>
                      <p className="stat-value">{stats.total_complaints}</p>
                      <p className="stat-sub">{stats.pending_complaints} pending</p>
                    </div>
                    <div className="stat-icon orange"><FaClipboardList /></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">My Bills</p>
                      <p className="stat-value">{stats.total_bills}</p>
                      <p className="stat-sub">{stats.unpaid_bills} unpaid</p>
                    </div>
                    <div className="stat-icon red"><FaMoneyBillAlt /></div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-content">
                    <div className="stat-info">
                      <p className="stat-label">My Vehicles</p>
                      <p className="stat-value">{stats.total_vehicles}</p>
                      <p className="stat-sub">Registered</p>
                    </div>
                    <div className="stat-icon blue"><FaCar /></div>
                  </div>
                </div>
              </div>
              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3 className="card-title"><FaRocket /> Quick Actions</h3>
                  <div className="quick-actions">
                    <button onClick={() => handleTabClick('complaints')} className="quick-action-btn"><span><FaClipboardList /> Submit New Complaint</span></button>
                    <button onClick={() => handleTabClick('vehicles')} className="quick-action-btn"><span><FaCar /> Register Vehicle</span></button>
                    <button onClick={() => handleTabClick('bills')} className="quick-action-btn"><span><FaCreditCard /> Pay Bills</span></button>
                    <button onClick={() => handleTabClick('camera-requests')} className="quick-action-btn"><span><FaVideo /> Request Camera Access</span></button>
                  </div>
                </div>
                <div className="dashboard-card">
                  <h3 className="card-title"><FaBell /> Recent Notifications</h3>
                  <div className="recent-notifications">
                    {notifications.slice(0, 3).map(notification => (
                      <div key={notification.id} className="notification-item">
                        <h4>{notification.title}</h4>
                        <p>{notification.message.substring(0, 100)}...</p>
                        <span className="notification-date">{new Date(notification.created_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {notifications.length === 0 && <p className="no-data">No recent notifications</p>}
                  </div>
                </div>
              </div>
              <div className="dashboard-card">
                <h3 className="card-title"><FaHome /> My Flats</h3>
                {flats.length === 0 ? <p className="no-data">No flats assigned to you</p> : (
                  <div className="flats-grid">
                    {flats.map(flat => (
                      <div key={flat.id} className="flat-card">
                        <h4><FaBuilding /> Flat {flat.flat_number}</h4>
                        <div className="flat-details">
                          {flat.building && <p><FaBuilding /> {flat.building}</p>}
                          {flat.floor && <p><FaInfoCircle /> Floor {flat.floor}</p>}
                          {flat.bedrooms && flat.bathrooms && <p><FaBed /> {flat.bedrooms} BHK, <FaBath /> {flat.bathrooms} Bath</p>}
                          {flat.area_sqft && <p><FaRulerCombined /> {flat.area_sqft} sq ft</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'flats' && (
            <div className="flats-content">
              <h2 className="page-title"><FaHome /> My Flats</h2>
              <div className="content-card">
                <h3 className="card-title">Assigned Flats ({flats.length})</h3>
                {flats.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaHome /></div>
                    <p>No flats assigned to you</p>
                    <span>Contact admin for flat assignment</span>
                  </div>
                ) : (
                  <div className="flats-detailed-grid">
                    {flats.map(flat => (
                      <div key={flat.id} className="flat-detailed-card">
                        <div className="flat-header">
                          <h4>Flat {flat.flat_number}</h4>
                          <span className={`occupancy-badge ${flat.is_occupied ? 'occupied' : 'vacant'}`}>{flat.is_occupied ? 'Occupied' : 'Vacant'}</span>
                        </div>
                        <div className="flat-info">
                          {flat.building && <div className="info-item"><span><FaBuilding /></span><span>Building: {flat.building}</span></div>}
                          {flat.floor && <div className="info-item"><span><FaInfoCircle /></span><span>Floor: {flat.floor}</span></div>}
                          {flat.bedrooms && flat.bathrooms && <div className="info-item"><span><FaBed /></span><span>{flat.bedrooms} Bedrooms, {flat.bathrooms} Bathrooms</span></div>}
                          {flat.area_sqft && <div className="info-item"><span><FaRulerCombined /></span><span>Area: {flat.area_sqft} sq ft</span></div>}
                          {flat.monthly_rent && <div className="info-item"><span><FaMoneyBillAlt /></span><span>Rent: ₹{flat.monthly_rent}/month</span></div>}
                          <div className="ownership-info">
                            {flat.owner && <div className="info-item owner"><span><FaUserCircle /></span><span>Owner: {flat.owner.username}</span></div>}
                            {flat.tenants && flat.tenants.length > 0 && <div className="info-item tenants"><span><FaUsers /></span><span>Tenants: {flat.tenants.map(t => t.username).join(', ')}</span></div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'complaints' && (
            <div className="complaints-content">
              <h2 className="page-title"><FaClipboardList /> My Complaints</h2>
              <div className="content-card">
                <h3 className="card-title">Submit New Complaint</h3>
                <form onSubmit={handleSubmitComplaint} className="form-grid">
                  <div className="form-group">
                    <label>Select Flat</label>
                    <select value={complaintForm.flat_id} onChange={(e) => setComplaintForm({...complaintForm, flat_id: e.target.value})} required>
                      <option value="">-- Select your flat --</option>
                      {flats.map(flat => <option key={flat.id} value={flat.id}>{flat.flat_number} ({flat.building || 'N/A'})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" placeholder="Brief description of the issue" value={complaintForm.title} onChange={(e) => setComplaintForm({...complaintForm, title: e.target.value})} required/>
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={complaintForm.category} onChange={(e) => setComplaintForm({...complaintForm, category: e.target.value})}>
                      <option value="maintenance">Maintenance</option>
                      <option value="plumbing">Plumbing</option>
                      <option value="electrical">Electrical</option>
                      <option value="security">Security</option>
                      <option value="cleanliness">Cleanliness</option>
                      <option value="noise">Noise</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select value={complaintForm.priority} onChange={(e) => setComplaintForm({...complaintForm, priority: e.target.value})}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <label>Description</label>
                    <textarea placeholder="Detailed description of the complaint..." value={complaintForm.description} onChange={(e) => setComplaintForm({...complaintForm, description: e.target.value})} rows={4} required/>
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading || !complaintForm.flat_id} className="primary-btn">{loading ? 'Submitting...' : <><FaPaperPlane /> Submit Complaint</>}</button>
                  </div>
                </form>
              </div>
              <div className="content-card">
                <input type="text" placeholder="Search complaints by title or category..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
              </div>
              <div className="content-card">
                <h3 className="card-title">My Complaints ({filteredComplaints.length})</h3>
                {filteredComplaints.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaClipboardList /></div>
                    <p>No complaints found</p>
                    <span>Submit your first complaint above</span>
                  </div>
                ) : (
                  <div className="complaints-list">
                    {filteredComplaints.map(complaint => (
                      <div key={complaint.id} className="complaint-item">
                        <div className="complaint-header">
                          <div className="complaint-info">
                            <h4>{complaint.title}</h4>
                            <p>{complaint.description}</p>
                            <div className="complaint-meta">
                              <span><FaTag /> {complaint.category}</span>
                              <span><FaCalendarAlt /> {new Date(complaint.created_at).toLocaleDateString()}</span>
                              {complaint.resolved_at && <span><FaCheckCircle /> Resolved: {new Date(complaint.resolved_at).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="complaint-badges">
                            <span className={`priority-badge ${complaint.priority}`}>{complaint.priority}</span>
                            <span className={`status-badge ${complaint.status.replace('_', '-')}`}>{complaint.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        {complaint.admin_response && <div className="admin-response"><p><strong>Admin Response:</strong> {complaint.admin_response}</p></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'bills' && (
            <div className="bills-content">
              <h2 className="page-title"><FaMoneyBillAlt /> Bills & Payments</h2>
              <div className="content-card">
                <input type="text" placeholder="Search bills by type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
              </div>
              <div className="content-card">
                <h3 className="card-title">All Bills ({filteredBills.length})</h3>
                {filteredBills.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaMoneyBillAlt /></div>
                    <p>No bills found</p>
                    <span>Bills will appear here when generated by admin</span>
                  </div>
                ) : (
                  <div className="bills-list">
                    {filteredBills.map(bill => (
                      <div key={bill.id} className="bill-item">
                        <div className="bill-header">
                          <div className="bill-info">
                            <h4>{bill.bill_type.charAt(0).toUpperCase() + bill.bill_type.slice(1)} Bill</h4>
                            <p className="bill-amount">₹{bill.amount}</p>
                            <div className="bill-meta">
                              <span><FaHome /> Flat {bill.flat.flat_number}</span>
                              <span><FaCalendarAlt /> Period: {String(bill.bill_month).padStart(2, '0')}/{bill.bill_year}</span>
                              <span><FaClock /> Due: {new Date(bill.due_date).toLocaleDateString()}</span>
                              {bill.payment_date && <span><FaCheckCircle /> Paid: {new Date(bill.payment_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="bill-actions">
                            <span className={`status-badge ${bill.status}`}>{bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}</span>
                            {bill.status !== 'paid' && <button onClick={() => handlePayBill(bill.id)} className="pay-btn" disabled={loading}>{loading ? 'Processing...' : <><FaCreditCard /> Pay Now</>}</button>}
                          </div>
                        </div>
                        <div className="bill-status-indicator">
                          {bill.status === 'paid' ? <div className="status-message paid"><span><FaCheckCircle /></span><span>Payment completed on {new Date(bill.payment_date).toLocaleDateString()}</span></div>
                            : bill.status === 'overdue' ? <div className="status-message overdue"><span><FaExclamationCircle /></span><span>Payment overdue - please pay immediately</span></div>
                            : <div className="status-message pending"><span><FaClock /></span><span>Payment pending - due by {new Date(bill.due_date).toLocaleDateString()}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="vehicles-content">
              <h2 className="page-title"><FaCar /> My Vehicles</h2>
              <div className="content-card">
                <h3 className="card-title">Register New Vehicle</h3>
                <form onSubmit={handleRegisterVehicle} className="form-grid">
                  <div className="form-group">
                    <label>Vehicle Number</label>
                    <input type="text" placeholder="e.g., MH 01 AB 1234" value={vehicleForm.vehicle_number} onChange={(e) => setVehicleForm({...vehicleForm, vehicle_number: e.target.value.toUpperCase()})} required/>
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select value={vehicleForm.vehicle_type} onChange={(e) => setVehicleForm({...vehicleForm, vehicle_type: e.target.value})}>
                      <option value="car">Car</option>
                      <option value="motorcycle">Motorcycle</option>
                      <option value="bicycle">Bicycle</option>
                      <option value="scooter">Scooter</option>
                      <option value="suv">SUV</option>
                      <option value="truck">Truck</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Brand</label>
                    <input type="text" placeholder="e.g., Honda, Toyota, Bajaj" value={vehicleForm.brand} onChange={(e) => setVehicleForm({...vehicleForm, brand: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input type="text" placeholder="e.g., White, Black, Blue" value={vehicleForm.color} onChange={(e) => setVehicleForm({...vehicleForm, color: e.target.value})}/>
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">{loading ? 'Registering...' : 'Register Vehicle'}</button>
                  </div>
                </form>
              </div>
              <div className="content-card">
                <input type="text" placeholder="Search by vehicle number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
              </div>
              <div className="content-card">
                <h3 className="card-title">Registered Vehicles ({filteredVehicles.length})</h3>
                {filteredVehicles.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaCar /></div>
                    <p>No vehicles registered</p>
                    <span>Register your first vehicle above</span>
                  </div>
                ) : (
                  <div className="vehicles-grid">
                    {filteredVehicles.map(vehicle => (
                      <div key={vehicle.id} className="vehicle-item">
                        <div className="vehicle-header">
                          <h4>{vehicle.vehicle_number}</h4>
                          <span className={`status-badge ${vehicle.is_active ? 'active' : 'inactive'}`}>{vehicle.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        <div className="vehicle-details">
                          <div className="detail-item"><span><FaCar /></span><span>{vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}</span></div>
                          {vehicle.brand && <div className="detail-item"><span><FaCog /></span><span>{vehicle.brand}</span></div>}
                          {vehicle.color && <div className="detail-item"><span><FaTag /></span><span>{vehicle.color}</span></div>}
                          <div className="detail-item"><span><FaCalendarAlt /></span><span>Registered: {new Date(vehicle.created_at).toLocaleDateString()}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'camera-requests' && (
            <div className="camera-requests-content">
              <h2 className="page-title"><FaVideo /> Camera Access Requests</h2>
              <div className="content-card">
                <h3 className="card-title">Request Camera Access</h3>
                <form onSubmit={handleRequestCameraAccess} className="form-grid">
                  <div className="form-group">
                    <label>Select Flat for Request</label>
                    <select value={cameraRequestForm.flat_id} onChange={(e) => setCameraRequestForm({...cameraRequestForm, flat_id: e.target.value})} required>
                      <option value="">-- Select a flat --</option>
                      {flats.map(flat => <option key={flat.id} value={flat.id}>{flat.flat_number} ({flat.building || 'N/A'})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Request Date</label>
                    <input type="date" value={cameraRequestForm.requested_date} onChange={(e) => setCameraRequestForm({...cameraRequestForm, requested_date: e.target.value})} required/>
                  </div>
                  <div className="form-group">
                    <label>Duration (Hours)</label>
                    <select value={cameraRequestForm.duration_hours} onChange={(e) => setCameraRequestForm({...cameraRequestForm, duration_hours: parseInt(e.target.value)})}>
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={4}>4 Hours</option>
                      <option value={8}>8 Hours</option>
                      <option value={24}>24 Hours</option>
                    </select>
                  </div>
                  <div className="form-group form-group-full">
                    <label>Reason for Request</label>
                    <textarea placeholder="Please provide a valid reason for camera access request..." value={cameraRequestForm.reason} onChange={(e) => setCameraRequestForm({...cameraRequestForm, reason: e.target.value})} rows={3} required/>
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading || !cameraRequestForm.flat_id} className="primary-btn">{loading ? 'Submitting...' : 'Submit Request'}</button>
                  </div>
                </form>
              </div>
              <div className="content-card">
                <h3 className="card-title">My Requests ({cameraRequests.length})</h3>
                {cameraRequests.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaVideo /></div>
                    <p>No camera access requests</p>
                    <span>Submit your first request above</span>
                  </div>
                ) : (
                  <div className="requests-list">
                    {cameraRequests.map(request => (
                      <div key={request.id} className="request-item">
                        <div className="request-header">
                          <div className="request-info">
                            <h4>Camera Access for Flat {request.flat.flat_number}</h4>
                            <p>{request.reason}</p>
                            <div className="request-meta">
                              <span><FaCalendarAlt /> Date: {new Date(request.requested_date).toLocaleDateString()}</span>
                              <span><FaClock /> Duration: {request.duration_hours} hours</span>
                              <span><FaPaperPlane /> Requested: {new Date(request.requested_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className={`status-badge ${request.status}`}>{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                        </div>
                        {request.status === 'approved' && request.access_link && (
                          <div className="access-link-section">
                            <p className="access-approved"><strong><FaCheckCircle /> Request Approved!</strong></p>
                            <a href={request.access_link} target="_blank" rel="noopener noreferrer" className="access-link"><FaLink /> Access Camera Feed</a>
                          </div>
                        )}
                        {request.status === 'rejected' && (
                          <div className="rejection-message">
                            <p><strong><FaTimesCircle /> Request Rejected</strong></p>
                            <p>Please contact admin for more information.</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="notifications-content">
              <h2 className="page-title"><FaBell /> Notifications</h2>
              <div className="content-card">
                <input type="text" placeholder="Search notifications..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input"/>
              </div>
              <div className="content-card">
                <h3 className="card-title">All Notifications ({filteredNotifications.length})</h3>
                {filteredNotifications.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><FaBell /></div>
                    <p>No notifications found</p>
                    <span>Notifications will appear here when sent by admin</span>
                  </div>
                ) : (
                  <div className="notifications-list">
                    {filteredNotifications.map(notification => (
                      <div key={notification.id} className={`notification-item ${notification.is_read ? 'read' : 'unread'}`} onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}>
                        <div className="notification-header">
                          <div className="notification-info">
                            <div className="notification-title">
                              <h4>{notification.title}</h4>
                              {!notification.is_read && <span className="unread-dot"></span>}
                            </div>
                            <p>{notification.message}</p>
                            <div className="notification-meta">
                              <span><FaCalendarAlt /> {new Date(notification.created_at).toLocaleDateString()}</span>
                              <span><FaTag /> {notification.notification_type}</span>
                            </div>
                          </div>
                          <div className="notification-priority">
                            <span className={`priority-badge ${notification.priority}`}>{notification.priority}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-content">
              <h2 className="page-title"><FaUser /> My Profile</h2>
              <div className="content-card">
                <div className="profile-header">
                  <div className="profile-avatar">{userStatus?.first_name?.charAt(0) || username.charAt(0).toUpperCase()}</div>
                  <div className="profile-basic">
                    <h3>{userStatus?.first_name} {userStatus?.last_name}</h3>
                    <p>@{username}</p>
                    <p>{userStatus?.email}</p>
                  </div>
                </div>
                <form onSubmit={handleUpdateProfile} className="form-grid">
                  <div className="form-group">
                    <label>First Name</label>
                    <input type="text" value={profileForm.first_name} onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input type="text" value={profileForm.last_name} onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}/>
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})} placeholder="+91 98765 43210"/>
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Name</label>
                    <input type="text" value={profileForm.emergency_contact_name} onChange={(e) => setProfileForm({...profileForm, emergency_contact_name: e.target.value})} placeholder="Emergency contact name"/>
                  </div>
                  <div className="form-group">
                    <label>Emergency Contact Number</label>
                    <input type="tel" value={profileForm.emergency_contact} onChange={(e) => setProfileForm({...profileForm, emergency_contact: e.target.value})} placeholder="+91 98765 43210"/>
                  </div>
                  <div className="form-group form-group-full">
                    <button type="submit" disabled={loading} className="primary-btn">{loading ? 'Updating...' : 'Update Profile'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="dashboard-footer">
        <div className="footer-content">
          <span>Powered by DY Business Solutions</span>
          <span>Version 1.1.0</span>
        </div>
      </footer>
    </div>
  );
};

export default UserDashboard;